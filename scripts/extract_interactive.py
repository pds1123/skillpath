#!/usr/bin/env python3
"""
Use Claude vision to extract structured interactive data from hotspot/drag-drop
question images. Output goes to src/data/interactiveData.ts.

Schema per question:
  {
    "kind": "match" | "dropdown" | "yesno",
    "pool":    [string],      # match only: items the user drags
    "prompts": [
      {"text": str, "options": [str]?, "correct": str}
    ]
  }

Rules:
  - "match"   → drag items from `pool` onto labeled slots; each prompt has `correct` from pool.
  - "dropdown"→ each prompt has its own `options` list and a `correct` value.
  - "yesno"   → each prompt's correct is "Yes" or "No"; options implicit.

Cost: ~$3-5 total (Haiku vision, 256 questions).

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 scripts/extract_interactive.py
  python3 scripts/extract_interactive.py --resume
  python3 scripts/extract_interactive.py --limit 5    # smoke test
"""
import argparse
import base64
import json
import os
import re
import time

import anthropic

QUESTIONS_TS = "/Users/disi/Desktop/projects/1/src/data/questions.ts"
IMAGES_TS = "/Users/disi/Desktop/projects/1/src/data/questionImages.ts"
IMAGES_DIR = "/Users/disi/Desktop/projects/1/public/qimages"
OUT_TS = "/Users/disi/Desktop/projects/1/src/data/interactiveData.ts"
CHECKPOINT = "/Users/disi/Desktop/projects/1/scripts/interactive_checkpoint.json"

MODEL = "claude-haiku-4-5-20251001"

PROMPT = """You are extracting a structured exam question from an image.

The exam item shown is either a "drag and drop / matching" question or a "hotspot" question (with dropdowns or Yes/No statements).

Look at the QUESTION image (the exam item as the test-taker sees it) and the ANSWER image (the same item filled in with the correct answers).

Output ONE JSON object — no markdown fences, no commentary — matching ONE of these shapes:

1. Matching / drag-drop:
{
  "kind": "match",
  "pool": ["Item A", "Item B", "Item C", "Item D"],
  "prompts": [
    {"text": "description of slot 1", "correct": "Item B"},
    {"text": "description of slot 2", "correct": "Item D"}
  ]
}

2. Hotspot with per-statement dropdown:
{
  "kind": "dropdown",
  "prompts": [
    {"text": "Statement / sentence with the blank described", "options": ["choice 1", "choice 2", "choice 3"], "correct": "choice 2"}
  ]
}

3. Hotspot Yes/No:
{
  "kind": "yesno",
  "prompts": [
    {"text": "Statement 1", "correct": "Yes"},
    {"text": "Statement 2", "correct": "No"}
  ]
}

Rules:
- Pick the shape that best matches what's actually in the image.
- Copy text VERBATIM from the image (don't paraphrase). Trim trailing whitespace.
- For "match", every `correct` must appear verbatim in `pool`.
- Keep `text` short — strip surrounding boilerplate like "Hot Area:" or "Answer:".
- If the image is genuinely uninterpretable, output: {"kind": "unknown"}
- Output ONLY the JSON object. No prose."""


def load_questions():
    with open(QUESTIONS_TS) as f:
        txt = f.read()
    start = txt.index("= [") + 2
    depth = 0
    end = -1
    for i in range(start, len(txt)):
        if txt[i] == "[":
            depth += 1
        elif txt[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    return json.loads(txt[start:end])


def load_image_map():
    with open(IMAGES_TS) as f:
        txt = f.read()
    pat = re.compile(
        r"(\d+):\s*\{\s*question_img:\s*\"([^\"]+)\"(?:,\s*answer_img:\s*\"([^\"]+)\")?",
    )
    out = {}
    for m in pat.finditer(txt):
        out[int(m.group(1))] = {"q": m.group(2), "a": m.group(3) or None}
    return out


def img_b64(path: str):
    abs_path = os.path.join(IMAGES_DIR, os.path.basename(path))
    with open(abs_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("ascii")


def media_type(path: str) -> str:
    ext = path.lower().rsplit(".", 1)[-1]
    return "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"


def parse_json(text: str):
    text = text.strip()
    # strip markdown fences if any
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
    # Extract first JSON object (handle trailing text)
    if "{" in text:
        depth = 0
        start = text.index("{")
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    text = text[start : i + 1]
                    break
    data = json.loads(text)
    # Normalize bad kind values
    if isinstance(data, dict) and data.get("kind") == "hotspot":
        prompts = data.get("prompts", [])
        if prompts and all(p.get("correct") in ("Yes", "No") for p in prompts):
            data["kind"] = "yesno"
        elif prompts and all(isinstance(p.get("options"), list) for p in prompts):
            data["kind"] = "dropdown"
        else:
            # Image-click hotspot — no text options, can't render interactively
            data = {"kind": "unknown"}
    return data


def build_content(q: dict, imgs: dict):
    parts = [
        {"type": "text", "text": f"Question text:\n{q['question'][:600]}\n\nQUESTION image:"},
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type(imgs["q"]),
                "data": img_b64(imgs["q"]),
            },
        },
    ]
    if imgs.get("a"):
        parts.append({"type": "text", "text": "ANSWER image (same item filled in):"})
        parts.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type(imgs["a"]),
                    "data": img_b64(imgs["a"]),
                },
            }
        )
    parts.append({"type": "text", "text": PROMPT})
    return parts


def validate(data: dict) -> bool:
    if not isinstance(data, dict):
        return False
    kind = data.get("kind")
    if kind not in ("match", "dropdown", "yesno"):
        return False
    prompts = data.get("prompts")
    if not isinstance(prompts, list) or not prompts:
        return False
    for p in prompts:
        if not isinstance(p, dict):
            return False
        if not p.get("text") or not p.get("correct"):
            return False
        if kind == "yesno" and p["correct"] not in ("Yes", "No"):
            return False
        if kind == "dropdown":
            opts = p.get("options")
            if not isinstance(opts, list) or len(opts) < 2:
                return False
            if p["correct"] not in opts:
                return False
    if kind == "match":
        pool = data.get("pool")
        if not isinstance(pool, list) or len(pool) < 2:
            return False
        for p in prompts:
            if p["correct"] not in pool:
                return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--delay", type=float, default=0.4)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--ids", type=str, default="", help="Comma-separated question IDs to (re)process")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("Error: set ANTHROPIC_API_KEY")
        return

    client = anthropic.Anthropic(api_key=api_key)
    questions = load_questions()
    images = load_image_map()

    targets = [
        q for q in questions
        if q["type"] in ("hotspot", "drag_drop") and q["id"] in images
    ]
    if args.ids:
        wanted = {int(s) for s in args.ids.split(",") if s.strip()}
        targets = [q for q in targets if q["id"] in wanted]
    if args.limit:
        targets = targets[: args.limit]

    results: dict = {}
    if args.resume and os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            results = {int(k): v for k, v in json.load(f).items()}
        print(f"Resumed: {len(results)} cached")

    total = len(targets)
    errors = 0
    for i, q in enumerate(targets):
        qid = q["id"]
        if qid in results and not args.ids:
            print(f"[{i + 1}/{total}] Q{qid} skipped (cached)")
            continue

        try:
            content = build_content(q, images[qid])
            msg = client.messages.create(
                model=MODEL,
                max_tokens=1500,
                messages=[{"role": "user", "content": content}],
            )
            text = msg.content[0].text
            data = parse_json(text)
            if data.get("kind") == "unknown":
                results[qid] = {"kind": "unknown"}
                print(f"[{i + 1}/{total}] Q{qid} ◌ unknown")
            elif validate(data):
                results[qid] = data
                k = data["kind"]
                n = len(data["prompts"])
                print(f"[{i + 1}/{total}] Q{qid} ✓ {k} ({n} prompts)")
            else:
                errors += 1
                print(f"[{i + 1}/{total}] Q{qid} ✗ invalid: {text[:120]}")
        except Exception as e:
            errors += 1
            print(f"[{i + 1}/{total}] Q{qid} ERROR: {e}")

        if (i + 1) % 5 == 0:
            with open(CHECKPOINT, "w") as f:
                json.dump(results, f)

        time.sleep(args.delay)

    with open(CHECKPOINT, "w") as f:
        json.dump(results, f)

    # Emit TypeScript
    lines = [
        "// Auto-generated — do not edit manually",
        "// Source: scripts/extract_interactive.py",
        "",
        "export type InteractivePrompt = {",
        "  text: string;",
        "  options?: string[];",
        "  correct: string;",
        "};",
        "",
        "export type InteractiveData =",
        "  | { kind: 'match'; pool: string[]; prompts: InteractivePrompt[] }",
        "  | { kind: 'dropdown'; prompts: InteractivePrompt[] }",
        "  | { kind: 'yesno'; prompts: InteractivePrompt[] }",
        "  | { kind: 'click'; label: string; correct: { x: number; y: number; w: number; h: number } }
  | { kind: 'self_grade' };",
        "",
        "export const INTERACTIVE_DATA: Record<number, InteractiveData> = {",
    ]
    for qid in sorted(results.keys()):
        data = results[qid]
        if data.get("kind") == "unknown":
            continue
        lines.append(f"  {qid}: {json.dumps(data, ensure_ascii=False)},")
    lines.append("};")
    with open(OUT_TS, "w") as f:
        f.write("\n".join(lines) + "\n")

    good = sum(1 for v in results.values() if v.get("kind") != "unknown")
    print(f"\n✓ {good}/{total} extracted successfully ({errors} errors)")
    print(f"  Wrote {OUT_TS}")


if __name__ == "__main__":
    main()
