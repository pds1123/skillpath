#!/usr/bin/env python3
"""Extract AWS CLF-C02 questions from the PDF into questions_aws.ts.

The PDF format is:
    Question #N Topic 1
    <question text on multiple lines>
    A. option A
    B. option B
    C. option C
    D. option D
    [E. option E]
    Correct Answer: X   or  XY   or  XYZ
    [Community vote distribution]
    X (N%) Y (N%)
    <discussion comments — ignored>
"""

import re
import json
import sys
import os
from pathlib import Path

import pdfplumber

PDF = Path('/Users/disi/Downloads/study/CLF-C02+题目+答案+讨论+719道题.pdf')
OUT = Path('/Users/disi/Desktop/projects/1/src/data/questions_aws.ts')

# Domain classification by keyword — CLF-C02 has 4 official domains
DOMAIN_KEYWORDS = {
    'Cloud Concepts': [
        'benefit', 'advantage', 'tco', 'total cost of ownership', 'shared responsibility',
        'well-architected', 'well architected', 'six pillars', 'pillars of', 'capital expenditure',
        'operational expenditure', 'capex', 'opex', 'aws cloud offer', 'aws cloud provide',
        'economies of scale', 'agility', 'elasticity',
    ],
    'Security & Compliance': [
        'iam', 'identity', 'security', 'mfa', 'multi-factor', 'root user', 'access key',
        'compliance', 'artifact', 'guardduty', 'shield', 'waf', 'kms', 'inspector',
        'secrets manager', 'macie', 'trust', 'penetration test', 'encryption',
        'shared responsibility', 'principle of least privilege',
    ],
    'Cloud Technology & Services': [
        'ec2', 's3', 'ebs', 'efs', 'rds', 'dynamodb', 'aurora', 'redshift', 'lambda',
        'fargate', 'ecs', 'eks', 'vpc', 'route 53', 'cloudfront', 'api gateway',
        'sns', 'sqs', 'kinesis', 'sagemaker', 'sage maker', 'polly', 'rekognition',
        'snowball', 'storage gateway', 'direct connect', 'transit gateway', 'workspaces',
        'workmail', 'connect', 'elasticache', 'cloudformation', 'auto scaling',
        'load balancer', 'elb', 'beanstalk', 'lightsail', 'batch', 'step functions',
        'edge location', 'availability zone', 'region', 'azs',
    ],
    'Billing, Pricing & Support': [
        'billing', 'pricing', 'cost explorer', 'budget', 'savings plan', 'reserved instance',
        'spot instance', 'on-demand', 'free tier', 'support plan', 'basic support',
        'developer support', 'business support', 'enterprise support', 'tam',
        'technical account manager', 'consolidated billing', 'organization', 'organizations',
        'concierge', 'trusted advisor',
    ],
}


def classify_domain(text: str) -> str:
    """Assign a CLF-C02 domain based on question content."""
    lower = text.lower()
    scores = {}
    for domain, kws in DOMAIN_KEYWORDS.items():
        scores[domain] = sum(1 for kw in kws if kw in lower)
    best = max(scores.items(), key=lambda kv: kv[1])
    return best[0] if best[1] > 0 else 'Cloud Concepts'  # default


def extract_all_text() -> str:
    print('Extracting text from PDF…', file=sys.stderr)
    parts = []
    with pdfplumber.open(PDF) as pdf:
        for i, page in enumerate(pdf.pages):
            if (i + 1) % 100 == 0:
                print(f'  page {i+1}/{len(pdf.pages)}', file=sys.stderr)
            t = page.extract_text() or ''
            parts.append(t)
    return '\n\n'.join(parts)


def parse_questions(text: str):
    """Return list of dicts."""
    # Split on Question # markers
    blocks = re.split(r'(?=Question #\d+\s*Topic \d+)', text)
    questions = []
    for block in blocks:
        m = re.match(r'Question #(\d+)\s*Topic \d+\s*(.*?)(?=Correct Answer:|$)', block, re.DOTALL)
        if not m:
            continue
        qid = int(m.group(1))
        body = m.group(2).strip()

        # Extract options: lines starting with A. / B. / C. etc.
        # We split the body: question text is before the first "A." line
        # Options run until "Correct Answer:" (already stripped)
        opts_match = re.search(r'\n\s*A\.\s+', body)
        if not opts_match:
            # No options in expected format; skip
            continue
        q_text = body[:opts_match.start()].strip()
        opts_text = body[opts_match.start():].strip()

        # Parse each option
        options = {}
        # Find A. / B. / C. lines (they should start on a new line or after whitespace)
        opt_re = re.compile(r'(?:^|\n)\s*([A-G])\.\s+(.+?)(?=(?:\n\s*[A-G]\.\s+)|\Z)', re.DOTALL)
        for om in opt_re.finditer(opts_text):
            letter = om.group(1)
            opt_body = re.sub(r'\s+', ' ', om.group(2)).strip()
            options[letter] = opt_body

        if not options:
            continue

        # Now find "Correct Answer: X" in the block
        ca_match = re.search(r'Correct Answer:\s*([A-G]+)', block)
        correct = list(ca_match.group(1)) if ca_match else []

        # Find community vote distribution — the first "X (NN%)" or "XY (NN%)" line
        vote = ''
        vote_match = re.search(
            r'Community vote distribution\s*\n\s*([A-G]+\s*\(\d+%\)(?:\s+[A-G]+\s*\(\d+%\))*)',
            block,
        )
        if vote_match:
            vote = vote_match.group(1).strip()

        questions.append({
            'id': qid,
            'question': q_text,
            'options': options,
            'correct_letters': correct,
            'community_vote': vote,
        })
    return questions


def choose_final_answer(q: dict) -> list[str]:
    """Return the final correct_answer list, preferring community 100% consensus
    when it disagrees with the official answer."""
    official = q['correct_letters']
    vote = q['community_vote']
    if not vote:
        return official
    # Extract the top vote combo
    m = re.match(r'([A-G]+)\s*\((\d+)%\)', vote)
    if not m:
        return official
    top_letters = list(m.group(1))
    top_pct = int(m.group(2))
    # If community strongly disagrees (>=70%), use community
    if top_pct >= 70 and set(top_letters) != set(official):
        return top_letters
    return official


def infer_type(q: dict) -> str:
    return 'multiple_choice'  # CLF-C02 is all MC (single or multi)


def format_ts(questions: list[dict]) -> str:
    """Format as TypeScript array literal."""
    lines = [
        '// Auto-generated from AWS CLF-C02 PDF — do not edit manually.',
        '// Source: scripts/extract_aws_questions.py',
        '',
        'import type { Question } from \'./questions\';',
        '',
        'export const QUESTIONS_AWS: Question[] = [',
    ]
    for q in questions:
        final_answer = choose_final_answer(q)
        # Build TypeScript object
        opts_str = ',\n      '.join(
            f'{json.dumps(k)}: {json.dumps(v)}' for k, v in q['options'].items()
        )
        ca_str = ',\n      '.join(json.dumps(l) for l in final_answer)
        domain = classify_domain(q['question'])
        obj = f"""  {{
    "id": {q['id']},
    "certification": "CLF-C02",
    "type": {json.dumps(infer_type(q))},
    "question": {json.dumps(q['question'])},
    "options": {{
      {opts_str}
    }},
    "correct_answer": [
      {ca_str}
    ],
    "answer_text": "",
    "community_vote": {json.dumps(q['community_vote'])},
    "domain": {json.dumps(domain)},
    "mode": "quiz"
  }},"""
        lines.append(obj)
    lines.append('];')
    return '\n'.join(lines) + '\n'


def main():
    text = extract_all_text()
    with open('/tmp/aws_pdf_raw.txt', 'w') as f:
        f.write(text)
    print(f'  wrote /tmp/aws_pdf_raw.txt ({len(text)} chars)', file=sys.stderr)

    questions = parse_questions(text)
    print(f'Parsed {len(questions)} questions', file=sys.stderr)

    # Deduplicate by id
    seen = {}
    for q in questions:
        seen[q['id']] = q  # last wins
    questions = sorted(seen.values(), key=lambda q: q['id'])
    print(f'After dedup: {len(questions)} unique questions', file=sys.stderr)

    ts = format_ts(questions)
    OUT.write_text(ts)
    print(f'Wrote {OUT} ({len(ts)} chars)', file=sys.stderr)

    # Stats
    from collections import Counter
    doms = Counter(classify_domain(q['question']) for q in questions)
    print('\nDomain distribution:', file=sys.stderr)
    for d, n in doms.most_common():
        print(f'  {d}: {n}', file=sys.stderr)

    multi = sum(1 for q in questions if len(choose_final_answer(q)) > 1)
    print(f'\nMulti-answer questions: {multi}', file=sys.stderr)

    with_vote = sum(1 for q in questions if q['community_vote'])
    print(f'Questions with community vote: {with_vote}', file=sys.stderr)

    diverged = sum(
        1 for q in questions
        if q['community_vote']
        and set(choose_final_answer(q)) != set(q['correct_letters'])
    )
    print(f'Questions where community overrides official: {diverged}', file=sys.stderr)


if __name__ == '__main__':
    main()
