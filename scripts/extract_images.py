#!/usr/bin/env python3
"""
Extract question/answer images from AZ-900 PDF for drag-drop and hotspot questions.
Outputs images to public/qimages/ and generates src/data/questionImages.ts
"""

import fitz
import os
import re
import json

PDF = "/Users/disi/Downloads/AZ-900 474题 题目+答案+讨论.pdf"
OUT_DIR = "/Users/disi/Desktop/projects/1/public/qimages"
TS_OUT = "/Users/disi/Desktop/projects/1/src/data/questionImages.ts"

os.makedirs(OUT_DIR, exist_ok=True)

doc = fitz.open(PDF)
total_pages = len(doc)
print(f"PDF: {total_pages} pages")

# Map: question_id -> {question_img, answer_img}
q_images: dict[int, dict] = {}

current_q_id = None
img_count_for_q = 0

for pg_num in range(total_pages):
    page = doc[pg_num]
    text = page.get_text()
    images = page.get_images(full=False)

    # Detect question number on this page
    m = re.search(r'Question\s+#(\d+)', text)
    if m:
        current_q_id = int(m.group(1))
        img_count_for_q = 0

    if not images or current_q_id is None:
        continue

    # Only process pages that look like drag-drop or hotspot
    is_drag = 'DRAG DROP' in text or 'Select and Place' in text or 'drag' in text.lower()
    is_hot = 'HOTSPOT' in text or 'Yes if' in text or 'select Yes' in text.lower()
    has_img_keyword = 'in-exam-image' in text or 'Options' in text or 'Answer Area' in text

    if not (is_drag or is_hot or has_img_keyword) and len(images) < 1:
        continue

    for img_meta in images:
        xref = img_meta[0]
        try:
            base = doc.extract_image(xref)
        except Exception:
            continue

        w, h = base["width"], base["height"]
        # Skip tiny images (logos, icons) — question images are typically large
        if w < 200 or h < 100:
            continue

        ext = base["ext"]
        data = base["image"]

        if current_q_id not in q_images:
            q_images[current_q_id] = {}

        entry = q_images[current_q_id]
        if "question_img" not in entry:
            fname = f"q{current_q_id}_question.{ext}"
            fpath = os.path.join(OUT_DIR, fname)
            open(fpath, "wb").write(data)
            entry["question_img"] = f"/qimages/{fname}"
            print(f"  Q{current_q_id} question img: {w}x{h} -> {fname}")
        elif "answer_img" not in entry:
            fname = f"q{current_q_id}_answer.{ext}"
            fpath = os.path.join(OUT_DIR, fname)
            open(fpath, "wb").write(data)
            entry["answer_img"] = f"/qimages/{fname}"
            print(f"  Q{current_q_id} answer img:   {w}x{h} -> {fname}")
        # skip any further images on the same question

doc.close()

print(f"\nExtracted images for {len(q_images)} questions")

# Write TypeScript map
lines = [
    "// Auto-generated — question images extracted from PDF",
    "export const QUESTION_IMAGES: Record<number, { question_img?: string; answer_img?: string }> = {",
]
for qid in sorted(q_images.keys()):
    entry = q_images[qid]
    parts = []
    if "question_img" in entry:
        parts.append(f'  question_img: "{entry["question_img"]}"')
    if "answer_img" in entry:
        parts.append(f'  answer_img: "{entry["answer_img"]}"')
    lines.append(f"  {qid}: {{ {', '.join(parts)} }},")
lines.append("};")

with open(TS_OUT, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"Written: {TS_OUT}")
print(f"Total image files in {OUT_DIR}: {len(os.listdir(OUT_DIR))}")
