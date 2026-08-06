#!/usr/bin/env python3
"""
Compare src/data/questions.ts against questions_raw.json and re-fill any
questions where raw has data that the TS is missing.

Preserves TS-only fields (domain, mode, cleaned answer_text). Only fills in:
- question text (when TS is empty)
- options (when TS is empty and raw has them)
- correct_answer (when TS is empty and raw has it)
- community_vote (when TS is empty and raw has it)
"""
import json
import re

TS_PATH = "/Users/disi/Desktop/projects/1/src/data/questions.ts"
RAW_PATH = "/Users/disi/Desktop/projects/1/questions_raw.json"


def load_ts():
    with open(TS_PATH) as f:
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
    return txt, start, end, json.loads(txt[start:end])


def main():
    full_text, arr_start, arr_end, ts = load_ts()
    with open(RAW_PATH) as f:
        raw = json.load(f)
    raw_by_id = {q["id"]: q for q in raw}

    fills = []
    for q in ts:
        qid = q["id"]
        r = raw_by_id.get(qid)
        if not r:
            continue

        changed = []

        if not q.get("question", "").strip() and r.get("question", "").strip():
            q["question"] = r["question"]
            changed.append("question")

        if not q.get("options") and r.get("options"):
            q["options"] = r["options"]
            changed.append("options")

        if not q.get("correct_answer") and r.get("correct_answer"):
            q["correct_answer"] = r["correct_answer"]
            changed.append("correct_answer")

        if not q.get("community_vote", "").strip() and r.get("community_vote", "").strip():
            # Only take the vote portion (first line) — raw often has comments after
            cv = r["community_vote"].split("\n")[0].strip()
            q["community_vote"] = cv
            changed.append("community_vote")

        if changed:
            fills.append((qid, changed))

    print(f"Filled missing data on {len(fills)} questions:")
    for qid, fields in fills[:30]:
        print(f"  Q{qid}: {fields}")
    if len(fills) > 30:
        print(f"  ... and {len(fills) - 30} more")

    if not fills:
        print("Nothing to do.")
        return

    # Re-emit the array with the same formatting
    new_arr = json.dumps(ts, indent=2, ensure_ascii=False)
    new_text = full_text[:arr_start] + new_arr + full_text[arr_end:]
    with open(TS_PATH, "w") as f:
        f.write(new_text)
    print(f"\nWrote {TS_PATH}")


if __name__ == "__main__":
    main()
