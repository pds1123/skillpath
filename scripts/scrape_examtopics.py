#!/usr/bin/env python3
"""
Scrape AZ-900 questions from ExamTopics.

ExamTopics requires login for pages 2+. To use:
1. Log into examtopics.com in Chrome/Safari
2. Open DevTools → Application → Cookies → examtopics.com
3. Copy the values of: _examtopics_session  (and optionally: remember_user_token)
4. Run: python3 scripts/scrape_examtopics.py --cookie "_examtopics_session=XXXX"

Or set the EXAMTOPICS_COOKIE env var:
  export EXAMTOPICS_COOKIE="_examtopics_session=XXXX"
  python3 scripts/scrape_examtopics.py

Outputs: scripts/examtopics_raw.json
"""

import json
import time
import re
import sys
import os
import argparse
import requests
from bs4 import BeautifulSoup

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


def make_session(cookie_str) -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    if cookie_str:
        # Parse "key=val; key2=val2" format
        for part in cookie_str.split(";"):
            part = part.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                s.cookies.set(k.strip(), v.strip(), domain="www.examtopics.com")
    return s


def fetch_page(session, page_num):
    url = BASE_URL if page_num == 1 else f"{BASE_URL}{page_num}/"
    try:
        r = session.get(url, timeout=25)
        if r.status_code == 200:
            # Check if we hit login wall
            if "Unlock All Questions" in r.text and page_num > 1:
                print(f"\n  ⚠ Login wall on page {page_num} — need valid cookies", file=sys.stderr)
                return None
            return r.text
        print(f"  HTTP {r.status_code} for page {page_num}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error fetching page {page_num}: {e}", file=sys.stderr)
        return None


def parse_questions(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    questions = []

    for card in soup.select(".exam-question-card"):
        q: dict = {}

        # Question number from header
        header = card.select_one(".card-header")
        if header:
            m = re.search(r'#\s*(\d+)', header.get_text())
            if m:
                q["id"] = int(m.group(1))

        # Question text
        body = card.select_one(".question-body p.card-text")
        if body:
            # Remove image tags, clean up br tags
            for img in body.find_all("img"):
                img.replace_with(f"[IMAGE: {img.get('src', '')}]")
            q["question"] = body.get_text(separator="\n").strip()
            # Clean up DRAG DROP / HOTSPOT prefixes
            q["question"] = re.sub(r'^(DRAG DROP|HOTSPOT)\s*[-–]\s*', '', q["question"]).strip()

        # Answer options — look for list items with letters
        options: dict[str, str] = {}
        for li in card.select(".question-choices li, ul.question-choices li"):
            text = li.get_text(separator=" ").strip()
            m = re.match(r'^([A-F])\.\s*(.+)', text)
            if m:
                options[m.group(1)] = m.group(2).strip()
        if options:
            q["options"] = options

        # Correct answer
        ans_el = card.select_one(".correct-answer")
        if ans_el:
            # Check if it contains an image (DRAG DROP / HOTSPOT)
            img = ans_el.select_one("img")
            if img:
                q["correct_answer"] = ""
                q["answer_image"] = img.get("src", "")
            else:
                q["correct_answer"] = ans_el.get_text().strip()

        # Answer description / explanation
        desc_el = card.select_one(".answer-description")
        if desc_el and desc_el.get_text().strip():
            q["explanation"] = desc_el.get_text(separator="\n").strip()

        # Community vote (voted-answers span)
        vote_el = card.select_one(".voted-answers-tally, [class*='community-vote']")
        if vote_el:
            q["community_vote"] = vote_el.get_text().strip()

        if q.get("question"):
            questions.append(q)

    return questions


def detect_total_pages(html: str) -> int:
    """Estimate total pages. ExamTopics doesn't always show all pagination."""
    # Look for the highest /view/N/ link
    nums = [int(x) for x in re.findall(r'/view/(\d+)/', html)]
    if nums:
        return max(nums)
    return 1


def main():
    parser = argparse.ArgumentParser(description="Scrape AZ-900 from ExamTopics")
    parser.add_argument("--cookie", default=os.environ.get("EXAMTOPICS_COOKIE", ""),
                        help="Cookie string from logged-in browser session")
    parser.add_argument("--pages", type=int, default=0,
                        help="Max pages to scrape (0 = auto-detect)")
    parser.add_argument("--start", type=int, default=1, help="Start page")
    parser.add_argument("--delay", type=float, default=3.0, help="Delay between pages (seconds)")
    parser.add_argument("--out", default="scripts/examtopics_raw.json")
    args = parser.parse_args()

    session = make_session(args.cookie)

    # Fetch page 1 to detect total pages
    print("Fetching page 1...")
    html1 = fetch_page(session, 1)
    if not html1:
        print("Failed to fetch page 1. Aborting.")
        sys.exit(1)

    detected = detect_total_pages(html1)
    total_pages = args.pages if args.pages > 0 else max(detected, 50)
    print(f"Total pages to scrape: {total_pages} (detected max link: {detected})")

    all_questions = []

    if args.start == 1:
        qs = parse_questions(html1)
        print(f"Page 1: {len(qs)} questions")
        all_questions.extend(qs)

    for page in range(max(args.start, 2), total_pages + 1):
        print(f"Page {page}/{total_pages}...", end=" ", flush=True)
        html = fetch_page(session, page)
        if html is None:
            print("STOPPED (login wall or error)")
            if not args.cookie:
                print("\nTip: Run with --cookie to bypass login wall. See script header for instructions.")
            break
        qs = parse_questions(html)
        if not qs:
            print("0 questions (may be past last page)")
            # Try one more page before giving up
            if page > detected + 5:
                break
        else:
            print(f"{len(qs)} questions")
            all_questions.extend(qs)
        time.sleep(args.delay)

    # Deduplicate by id
    seen: dict[int, dict] = {}
    for q in all_questions:
        qid = q.get("id")
        if qid and qid not in seen:
            seen[qid] = q
    unique = sorted(seen.values(), key=lambda x: x.get("id", 0))

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(unique, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Done! {len(unique)} unique questions saved to {args.out}")
    if unique:
        ids = [q["id"] for q in unique]
        print(f"  ID range: {min(ids)}–{max(ids)}")


if __name__ == "__main__":
    main()
