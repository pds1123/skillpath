#!/usr/bin/env python3
"""
Scrape Reference URLs from ExamTopics answer explanations and append them
to answer_text in questions.ts — without touching any existing content.

Usage:
  python3 scripts/scrape_references.py --cookie "_examtopics_session=XXXX"

Or via env var:
  export EXAMTOPICS_COOKIE="_examtopics_session=XXXX"
  python3 scripts/scrape_references.py
"""

import argparse
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

QUESTIONS_TS = "/Users/disi/Desktop/projects/1/src/data/questions.ts"
BASE_URL = "https://www.examtopics.com/exams/microsoft/az-900/view/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.examtopics.com/",
}


def make_session(cookie_str: str) -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    if cookie_str:
        for part in cookie_str.split(";"):
            part = part.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                s.cookies.set(k.strip(), v.strip(), domain="www.examtopics.com")
    return s


def fetch_page(session: requests.Session, page_num: int) -> str | None:
    url = BASE_URL if page_num == 1 else f"{BASE_URL}{page_num}/"
    try:
        r = session.get(url, timeout=25)
        if r.status_code == 200:
            if "Unlock All Questions" in r.text and page_num > 1:
                print(f"  ⚠ Login wall on page {page_num} — need valid cookies", file=sys.stderr)
                return None
            return r.text
        print(f"  HTTP {r.status_code} for page {page_num}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error fetching page {page_num}: {e}", file=sys.stderr)
        return None


def extract_refs_from_page(html: str) -> dict[int, str]:
    """Return {question_id: reference_url} for all questions on the page."""
    soup = BeautifulSoup(html, "html.parser")
    result: dict[int, str] = {}

    for card in soup.select(".exam-question-card"):
        # Get question ID
        header = card.select_one(".card-header")
        if not header:
            continue
        m = re.search(r'#\s*(\d+)', header.get_text())
        if not m:
            continue
        qid = int(m.group(1))

        # Get explanation text
        desc_el = card.select_one(".answer-description")
        if not desc_el:
            continue
        text = desc_el.get_text(separator="\n")

        # Extract Reference(s): URL
        ref_match = re.search(r'References?:\s*(https?://\S+)', text, re.IGNORECASE)
        if ref_match:
            url = ref_match.group(1).rstrip('.,)')
            result[qid] = url

    return result


def load_questions_ts() -> str:
    with open(QUESTIONS_TS) as f:
        return f.read()


def already_has_ref(answer_text: str) -> bool:
    return bool(re.search(r'References?:\s*https?://', answer_text, re.IGNORECASE))


def patch_answer_text(ts_content: str, qid: int, ref_url: str) -> tuple[str, bool]:
    """Append ' References: <url>' to the answer_text of question qid.
    Only modifies questions that don't already have a Reference URL.
    Returns (new_content, changed)."""

    # Match the specific question block's answer_text field
    # Pattern: find "id": <qid>, then find its answer_text value
    pattern = re.compile(
        r'("id":\s*' + str(qid) + r'\b.*?"answer_text":\s*")(.*?)(")',
        re.DOTALL
    )
    m = pattern.search(ts_content)
    if not m:
        return ts_content, False

    prefix = m.group(1)
    current_val = m.group(2)
    suffix = m.group(3)

    if already_has_ref(current_val):
        return ts_content, False  # already has reference, skip

    new_val = current_val.rstrip() + f' References: {ref_url}'
    new_content = ts_content[:m.start()] + prefix + new_val + suffix + ts_content[m.end():]
    return new_content, True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cookie", default="", help="Cookie string from browser")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between page requests (seconds)")
    parser.add_argument("--pages", default="", help="Comma-separated page numbers to scrape (default: all)")
    args = parser.parse_args()

    cookie = args.cookie or os.environ.get("EXAMTOPICS_COOKIE", "")
    if not cookie:
        print("Error: provide --cookie or set EXAMTOPICS_COOKIE", file=sys.stderr)
        sys.exit(1)

    session = make_session(cookie)

    # Determine pages to scrape
    if args.pages:
        pages = [int(p.strip()) for p in args.pages.split(",") if p.strip()]
    else:
        # AZ-900 has ~474 questions, 10 per page → ~48 pages
        pages = list(range(1, 49))

    ts_content = load_questions_ts()
    total_updated = 0

    for page_num in pages:
        print(f"Page {page_num}...", end=" ", flush=True)
        html = fetch_page(session, page_num)
        if not html:
            print("skipped")
            continue

        refs = extract_refs_from_page(html)
        page_updated = 0
        for qid, url in refs.items():
            ts_content, changed = patch_answer_text(ts_content, qid, url)
            if changed:
                page_updated += 1
                total_updated += 1
                print(f"\n  Q{qid}: → {url}")

        print(f"found {len(refs)} refs, added {page_updated}")
        time.sleep(args.delay)

    with open(QUESTIONS_TS, "w") as f:
        f.write(ts_content)

    print(f"\n✓ Done. Added reference URLs to {total_updated} questions.")


if __name__ == "__main__":
    main()
