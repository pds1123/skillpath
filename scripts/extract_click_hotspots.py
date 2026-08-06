#!/usr/bin/env python3
"""
Extract click-target bounding boxes for image-click hotspot questions.
Asks Claude vision to compare question_img + answer_img, identify the
highlighted/selected region, and return normalized coordinates.

Adds 'click' kind entries to src/data/interactiveData.ts (merges with existing data).

Usage:
  ANTHROPIC_API_KEY=... python3 scripts/extract_click_hotspots.py --ids 168,199,215,328
"""
import argparse
import base64
import json
import os
import re

import anthropic

OUT_TS = "/Users/disi/Desktop/projects/1/src/data/interactiveData.ts"
IMAGES_DIR = "/Users/disi/Desktop/projects/1/public/qimages"
IMAGES_TS = "/Users/disi/Desktop/projects/1/src/data/questionImages.ts"
QUESTIONS_TS = "/Users/disi/Desktop/projects/1/src/data/questions.ts"

PROMPT = """You see two images of an exam item:
1. The QUESTION image — the test-taker views this and must click on a specific spot.
2. The ANSWER image — the same screen with the correct spot highlighted/selected/circled.

By comparing the two images, find the bounding rectangle of the HIGHLIGHTED region in the answer image.
Map it back to the QUESTION image's coordinate space. Output ONE JSON object — no markdown, no commentary:

{
  "label": "what to click (e.g. 'Help + support')",
  "correct": { "x": 0.05, "y": 0.62, "w": 0.30, "h": 0.06 }
}

x, y, w, h are normalized (0.0 to 1.0) — fractions of the image's width/height.
- (x, y) is the TOP-LEFT corner of the rectangle
- (w, h) is its width and height

If the question and answer images appear identical (no visible highlight), output {"kind": "unknown"}.
Output ONLY the JSON object."""


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


def img_b64(path):
    abs_path = os.path.join(IMAGES_DIR, os.path.basename(path))
    with open(abs_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("ascii")


def media_type(path):
    return "image/jpeg" if path.lower().rsplit(".", 1)[-1] in ("jpg", "jpeg") else "image/png"


def parse_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
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
    return json.loads(text)


def load_existing():
    """Load existing INTERACTIVE_DATA entries from interactiveData.ts."""
    with open(OUT_TS) as f:
        txt = f.read()
    out = {}
    # Match each "  ID: { ... },"
    pat = re.compile(r"^\s*(\d+):\s*(\{.*?\}),?\s*$", re.M)
    for m in pat.finditer(txt):
        try:
            out[int(m.group(1))] = json.loads(m.group(2))
        except Exception:
            pass
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", required=True, help="Comma-separated question IDs")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("Error: set ANTHROPIC_API_KEY")
        return

    client = anthropic.Anthropic(api_key=api_key)
    images = load_image_map()
    existing = load_existing()
    print(f"Loaded {len(existing)} existing entries")

    target_ids = [int(s.strip()) for s in args.ids.split(",") if s.strip()]
    new_count = 0

    for qid in target_ids:
        if qid not in images:
            print(f"Q{qid}: no image")
            continue
        imgs = images[qid]
        if not imgs.get("a"):
            print(f"Q{qid}: no answer image — can't extract click target")
            continue

        content = [
            {"type": "text", "text": "QUESTION image:"},
            {"type": "image", "source": {"type": "base64", "media_type": media_type(imgs["q"]), "data": img_b64(imgs["q"])}},
            {"type": "text", "text": "ANSWER image:"},
            {"type": "image", "source": {"type": "base64", "media_type": media_type(imgs["a"]), "data": img_b64(imgs["a"])}},
            {"type": "text", "text": PROMPT},
        ]

        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=400,
                messages=[{"role": "user", "content": content}],
            )
            text = msg.content[0].text
            data = parse_json(text)
            if data.get("kind") == "unknown":
                print(f"Q{qid}: ◌ unknown (no visible highlight diff)")
                continue
            c = data.get("correct", {})
            if not all(0 <= c.get(k, -1) <= 1 for k in ("x", "y", "w", "h")):
                print(f"Q{qid}: ✗ invalid coords: {data}")
                continue
            entry = {"kind": "click", "label": data.get("label", ""), "correct": c}
            existing[qid] = entry
            new_count += 1
            print(f"Q{qid}: ✓ click → '{entry['label']}' at ({c['x']:.2f},{c['y']:.2f}) {c['w']:.2f}×{c['h']:.2f}")
        except Exception as e:
            print(f"Q{qid}: ERROR {e}")

    # Write merged file
    lines = [
        "// Auto-generated — do not edit manually",
        "// Source: scripts/extract_interactive.py + scripts/extract_click_hotspots.py",
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
    for qid in sorted(existing.keys()):
        lines.append(f"  {qid}: {json.dumps(existing[qid], ensure_ascii=False)},")
    lines.append("};")
    with open(OUT_TS, "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n✓ {new_count} click entries added. Wrote {OUT_TS}")


if __name__ == "__main__":
    main()
