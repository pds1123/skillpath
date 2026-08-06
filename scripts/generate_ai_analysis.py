#!/usr/bin/env python3
"""
Batch-generate AI analysis for all AZ-900 questions.
Calls claude-haiku-4-5 once per question, saves to src/data/aiAnalysis.ts.

Cost estimate: ~$0.50 total for 474 questions.

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 scripts/generate_ai_analysis.py

  # Resume from a checkpoint (if interrupted):
  python3 scripts/generate_ai_analysis.py --resume
"""

import json
import os
import re
import time
import argparse
import anthropic

QUESTIONS_TS = "/Users/disi/Desktop/projects/1/src/data/questions.ts"
OUT_TS = "/Users/disi/Desktop/projects/1/src/data/aiAnalysis.ts"
CHECKPOINT = "/Users/disi/Desktop/projects/1/scripts/ai_analysis_checkpoint.json"


def load_questions(path: str) -> list[dict]:
    with open(path) as f:
        txt = f.read()
    start = txt.index("[")
    end = txt.rindex("]") + 1
    return json.loads(txt[start:end])


def build_prompt(q: dict) -> str:
    opt_text = "\n".join(f"{k}. {v}" for k, v in q.get("options", {}).items())
    if q.get("correct_answer") and q.get("options"):
        answer_info = "Correct answer: " + ", ".join(
            f'{l}. {q["options"].get(l, "")}' for l in q["correct_answer"]
        )
    elif q.get("answer_text"):
        answer_info = f'Answer: {q["answer_text"][:300]}'
    else:
        answer_info = "Answer: see image/diagram"

    question_text = q['question'][:500]
    options_section = ("Options:\n" + opt_text) if opt_text else ""
    return f"""You are an AZ-900 Azure Fundamentals exam tutor. Explain this question concisely (under 120 words).

Question: {question_text}

{options_section}
{answer_info}

Explain WHY the correct answer is right, why wrong answers are wrong (if applicable), and give a brief real-world Azure context. Be direct and clear."""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between calls (seconds)")
    parser.add_argument("--limit", type=int, default=0, help="Only process N questions (0 = all)")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("Error: set ANTHROPIC_API_KEY environment variable")
        return

    client = anthropic.Anthropic(api_key=api_key)
    questions = load_questions(QUESTIONS_TS)
    if args.limit:
        questions = questions[: args.limit]

    # Load checkpoint
    results: dict[int, str] = {}
    if args.resume and os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            results = {int(k): v for k, v in json.load(f).items()}
        print(f"Resuming: {len(results)} already done")

    total = len(questions)
    errors = 0

    for i, q in enumerate(questions):
        qid = q["id"]
        if qid in results:
            print(f"[{i+1}/{total}] Q{qid} — skipped (cached)")
            continue

        prompt = build_prompt(q)
        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            text = msg.content[0].text.strip()
            results[qid] = text
            print(f"[{i+1}/{total}] Q{qid} ✓ ({len(text)} chars)")
        except Exception as e:
            print(f"[{i+1}/{total}] Q{qid} ERROR: {e}")
            errors += 1
            results[qid] = ""

        # Save checkpoint every 10 questions
        if (i + 1) % 10 == 0:
            with open(CHECKPOINT, "w") as f:
                json.dump(results, f)

        time.sleep(args.delay)

    # Final checkpoint save
    with open(CHECKPOINT, "w") as f:
        json.dump(results, f)

    # Write TypeScript output
    lines = [
        "// Auto-generated — do not edit manually",
        "// Run scripts/generate_ai_analysis.py to regenerate",
        "export const AI_ANALYSIS: Record<number, string> = {",
    ]
    for qid in sorted(results.keys()):
        text = results[qid].replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
        lines.append(f"  {qid}: `{text}`,")
    lines.append("};")

    with open(OUT_TS, "w") as f:
        f.write("\n".join(lines) + "\n")

    done = sum(1 for v in results.values() if v)
    print(f"\n✓ Done! {done}/{total} questions written to {OUT_TS}")
    if errors:
        print(f"  {errors} errors — run with --resume to retry")


if __name__ == "__main__":
    main()
