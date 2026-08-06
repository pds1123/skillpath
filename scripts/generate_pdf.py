#!/usr/bin/env python3
"""Generate a PDF from the cleaned AZ-900 question bank.

Reads questions.ts + interactiveData.ts + questionImages.ts and renders each
question with its options, correct answer, explanation, references, and any
question/answer images.
"""
import re
import os
import sys
import json
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage,
    Table, TableStyle, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT

REPO = Path('/Users/disi/Desktop/projects/1')
QS_TS = REPO / 'src/data/questions.ts'
INT_TS = REPO / 'src/data/interactiveData.ts'
IMG_TS = REPO / 'src/data/questionImages.ts'
QIMG_DIR = REPO / 'public/qimages'
OUT_PDF = REPO / 'AZ-900_QuestionBank.pdf'


def _extract_array_block(text: str, start_marker: str) -> str:
    """Extract a JSON-like block starting from start_marker until matching bracket."""
    idx = text.find(start_marker)
    if idx < 0:
        return ''
    # Skip past the `=` that introduces the value (avoid type annotation like `Question[]`)
    eq_idx = text.find('=', idx)
    if eq_idx < 0:
        return ''
    bracket_idx = text.find('[', eq_idx)
    if bracket_idx < 0:
        return ''
    depth = 0
    in_str = False
    escape = False
    for i in range(bracket_idx, len(text)):
        c = text[i]
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return text[bracket_idx:i + 1]
    return ''


def _sanitize_invalid_escapes(s: str) -> str:
    """Replace JSON-invalid backslash escapes (e.g. `\\ `, `\\W`) with the literal
    character so json.loads stops choking on PDF-encoded artifacts."""
    valid = set('"\\/bfnrtu')
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == '\\' and i + 1 < n:
            nxt = s[i + 1]
            if nxt in valid:
                out.append(c)
                out.append(nxt)
                i += 2
                continue
            # Drop the stray backslash, keep the next char
            i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def parse_questions():
    text = QS_TS.read_text()
    block = _extract_array_block(text, 'export const QUESTIONS')
    if not block:
        sys.exit('Could not extract QUESTIONS array')
    block = _sanitize_invalid_escapes(block)
    return json.loads(block)


def parse_interactive():
    text = INT_TS.read_text()
    # Find the INTERACTIVE_DATA = { ... } object
    idx = text.find('export const INTERACTIVE_DATA')
    if idx < 0:
        return {}
    brace_idx = text.find('{', idx)
    depth = 0
    in_str = False
    escape = False
    for i in range(brace_idx, len(text)):
        c = text[i]
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                block = text[brace_idx:i + 1]
                break
    else:
        return {}
    # Strip line comments OUTSIDE strings (so we don't break URLs like https://)
    block = _strip_line_comments(block)
    # Convert TypeScript {17: {...}, 18: {...}} → JSON with quoted keys
    block_json = re.sub(r'(\s|^|{)(\d+):', r'\1"\2":', block)
    # Remove trailing comma before closing brace (TS allows it)
    block_json = re.sub(r',(\s*[}\]])', r'\1', block_json)
    try:
        data = json.loads(block_json)
    except json.JSONDecodeError as e:
        print(f"JSON decode error in interactive data: {e}", file=sys.stderr)
        return {}
    return {int(k): v for k, v in data.items()}


def _strip_line_comments(src: str) -> str:
    """Remove // ... line comments that appear OUTSIDE of string literals."""
    out = []
    i = 0
    n = len(src)
    in_str = False
    escape = False
    while i < n:
        c = src[i]
        if in_str:
            out.append(c)
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            # Skip until newline
            while i < n and src[i] != '\n':
                i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def parse_images():
    text = IMG_TS.read_text()
    # Find QUESTION_IMAGES = { ... }
    idx = text.find('export const QUESTION_IMAGES')
    if idx < 0:
        return {}
    eq_idx = text.find('=', idx)
    if eq_idx < 0:
        return {}
    brace_idx = text.find('{', eq_idx)
    depth = 0
    in_str = False
    escape = False
    for i in range(brace_idx, len(text)):
        c = text[i]
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                block = text[brace_idx:i + 1]
                break
    else:
        return {}
    block = _strip_line_comments(block)
    # Convert numeric keys: 1: → "1":
    block_json = re.sub(r'(\s|^|{)(\d+):', r'\1"\2":', block)
    # Convert identifier keys (question_img, answer_img, etc.) → quoted
    block_json = re.sub(r'([\s{,])([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', block_json)
    block_json = re.sub(r',(\s*[}\]])', r'\1', block_json)
    try:
        data = json.loads(block_json)
    except json.JSONDecodeError as e:
        print(f"Image JSON error: {e}", file=sys.stderr)
        return {}
    return {int(k): v for k, v in data.items()}


# -------------------------------------------------------------------------
# Rendering
# -------------------------------------------------------------------------

def make_styles():
    base = getSampleStyleSheet()
    styles = {
        'title': ParagraphStyle('title', parent=base['Title'], fontSize=22, leading=26,
                                spaceAfter=12, textColor=HexColor('#1f3864')),
        'subtitle': ParagraphStyle('subtitle', parent=base['Normal'], fontSize=11,
                                   leading=14, alignment=1,
                                   textColor=HexColor('#666666')),
        'qheader': ParagraphStyle('qheader', parent=base['Normal'], fontSize=11,
                                  leading=14, textColor=HexColor('#1f3864'),
                                  fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4),
        'qbody': ParagraphStyle('qbody', parent=base['Normal'], fontSize=10,
                                leading=13, spaceAfter=6),
        'option': ParagraphStyle('option', parent=base['Normal'], fontSize=10,
                                 leading=13, leftIndent=14, spaceAfter=2),
        'option_correct': ParagraphStyle('option_correct', parent=base['Normal'], fontSize=10,
                                         leading=13, leftIndent=14, spaceAfter=2,
                                         textColor=HexColor('#15803d'),
                                         fontName='Helvetica-Bold'),
        'answer_label': ParagraphStyle('answer_label', parent=base['Normal'], fontSize=10,
                                       leading=13, spaceBefore=4, textColor=HexColor('#9a3412'),
                                       fontName='Helvetica-Bold'),
        'answer_body': ParagraphStyle('answer_body', parent=base['Normal'], fontSize=9.5,
                                      leading=12.5, textColor=HexColor('#333333'),
                                      spaceAfter=4),
        'meta': ParagraphStyle('meta', parent=base['Normal'], fontSize=8.5, leading=11,
                               textColor=HexColor('#666666'), spaceAfter=2),
        'reference': ParagraphStyle('reference', parent=base['Normal'], fontSize=8.5,
                                    leading=11, textColor=HexColor('#1d4ed8'),
                                    spaceAfter=2),
        'domain_chip': ParagraphStyle('domain_chip', parent=base['Normal'], fontSize=8.5,
                                      leading=11, textColor=HexColor('#374151'),
                                      spaceAfter=0),
    }
    return styles


def html_escape(s: str) -> str:
    return (s.replace('&', '&amp;')
             .replace('<', '&lt;')
             .replace('>', '&gt;'))


def clean_answer_text(raw: str) -> tuple[str, list[str]]:
    """Split answer_text into prose and references list."""
    if not raw:
        return '', []
    s = raw
    if re.match(r'^:\s*References?:', s, re.IGNORECASE):
        return '', extract_refs(raw)
    # Strip leading ": "
    s = re.sub(r'^:\s*', '', s)
    # Pull out References section
    refs = extract_refs(raw)
    s = re.sub(r'\s*References?:.*$', '', s, flags=re.DOTALL)
    # Don't render letter-only text like "AC" or "BD"
    if re.match(r'^[A-E]{1,5}$', s.strip()):
        return '', refs
    return s.strip(), refs


def extract_refs(raw: str) -> list[str]:
    m = re.search(r'References?:\s*([\s\S]*)$', raw, re.IGNORECASE)
    if not m:
        return []
    urls = re.findall(r'https?://\S+', m.group(1))
    return [u.rstrip('.,;|)]') for u in urls]


def add_image(story, img_path: str, max_w_inches: float = 5.5):
    if not img_path:
        return
    p = REPO / 'public' / img_path.lstrip('/')
    if not p.exists():
        return
    try:
        from PIL import Image as PILImage
        pil = PILImage.open(p)
        w, h = pil.size
        max_w = max_w_inches * inch
        ratio = h / w
        target_w = min(max_w, w)
        target_h = target_w * ratio
        # Cap height at 4 inches
        if target_h > 4 * inch:
            target_h = 4 * inch
            target_w = target_h / ratio
        story.append(Spacer(1, 4))
        story.append(RLImage(str(p), width=target_w, height=target_h))
        story.append(Spacer(1, 4))
    except Exception as exc:
        print(f"Failed to embed image {p}: {exc}", file=sys.stderr)


def render_question(story, q, interactive, images, styles):
    qid = q['id']
    typ = q.get('type', '')

    # Header: #ID + domain + type
    header_html = (
        f"<b>Question #{qid}</b> "
        f"<font color='#6b7280'>· {html_escape(q.get('domain', ''))}"
        f" · {typ.replace('_', ' ')}</font>"
    )
    story.append(Paragraph(header_html, styles['qheader']))

    # Question text (with embedded table support and <u> support preserved as <u>)
    qtext = q.get('question', '').replace('\n', '<br/>')
    # Allow <u> tags by NOT escaping them; but escape everything else
    # We do a token-aware escape: split on <u>...</u>
    parts = re.split(r'(<u>[^<]*</u>)', qtext)
    rendered_parts = []
    for part in parts:
        if part.startswith('<u>'):
            rendered_parts.append('<u>' + html_escape(part[3:-4]) + '</u>')
        else:
            rendered_parts.append(html_escape(part).replace('&lt;br/&gt;', '<br/>'))
    story.append(Paragraph(''.join(rendered_parts), styles['qbody']))

    # Optional inline table
    if isinstance(q.get('table'), dict):
        headers = q['table'].get('headers', [])
        rows = q['table'].get('rows', [])
        if headers and rows:
            data = [headers] + rows
            tbl = Table(data, hAlign='LEFT')
            tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f3f4f6')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#9ca3af')),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 6))

    # Question image (skip if it's a table image since we have the structured table)
    qimg_entry = images.get(qid, {})
    if 'question_img' in qimg_entry:
        add_image(story, qimg_entry['question_img'])

    # Options (MC)
    options = q.get('options', {})
    correct_set = set(q.get('correct_answer', []))
    if options and not interactive.get(qid):
        for letter, text in options.items():
            style = styles['option_correct'] if letter in correct_set else styles['option']
            marker = '●' if letter in correct_set else '○'
            story.append(Paragraph(
                f"{marker} <b>{letter}.</b> {html_escape(text)}",
                style,
            ))

    # Interactive structure
    inter = interactive.get(qid)
    if inter:
        kind = inter.get('kind')
        if kind == 'yesno' and inter.get('prompts'):
            for i, p in enumerate(inter['prompts'], 1):
                ans = p.get('correct', '')
                color = '#15803d' if ans.lower() == 'yes' else '#b91c1c'
                story.append(Paragraph(
                    f"<font color='{color}'><b>{i}. [{ans}]</b></font> "
                    f"{html_escape(p.get('text', ''))}",
                    styles['option'],
                ))
        elif kind == 'dropdown' and inter.get('prompts'):
            if inter.get('layout') == 'url' and inter.get('urlTemplate'):
                tmpl = inter['urlTemplate']
                rendered = tmpl
                for i, p in enumerate(inter['prompts']):
                    rendered = rendered.replace(
                        '{' + str(i) + '}', f"[{html_escape(p.get('correct', ''))}]"
                    )
                story.append(Paragraph(
                    f"<font color='#15803d'>{html_escape(rendered)}</font>",
                    styles['option_correct'],
                ))
            else:
                for i, p in enumerate(inter['prompts'], 1):
                    story.append(Paragraph(
                        f"<b>{i}.</b> {html_escape(p.get('text', ''))} → "
                        f"<font color='#15803d'><b>{html_escape(p.get('correct', ''))}</b></font>",
                        styles['option'],
                    ))
        elif kind == 'match' and inter.get('prompts'):
            for i, p in enumerate(inter['prompts'], 1):
                story.append(Paragraph(
                    f"<b>{i}.</b> {html_escape(p.get('text', ''))} → "
                    f"<font color='#15803d'><b>{html_escape(p.get('correct', ''))}</b></font>",
                    styles['option'],
                ))
        elif kind == 'click':
            story.append(Paragraph(
                f"<i>Click hotspot — {html_escape(inter.get('label', ''))}</i>",
                styles['option'],
            ))
        elif kind == 'self_grade':
            story.append(Paragraph("<i>(Self-graded question)</i>", styles['meta']))

    # Correct answer letters summary (when MC)
    if correct_set and options:
        letters = ', '.join(sorted(correct_set))
        story.append(Paragraph(f"<b>Correct Answer:</b> {letters}", styles['answer_label']))

    # Explanation
    prose, refs = clean_answer_text(q.get('answer_text', ''))
    if prose:
        # Normalize whitespace
        prose_html = html_escape(re.sub(r'\s+', ' ', prose))
        story.append(Paragraph("<b>Explanation:</b>", styles['answer_label']))
        story.append(Paragraph(prose_html, styles['answer_body']))

    # References
    for r in refs:
        story.append(Paragraph(
            f"🔗 <font color='#1d4ed8'><u>{html_escape(r)}</u></font>",
            styles['reference'],
        ))

    # Answer image
    if 'answer_img' in qimg_entry:
        add_image(story, qimg_entry['answer_img'])

    # Community vote (compact)
    vote = q.get('community_vote', '')
    if vote:
        # Show only the leading "X (NN%)" portion
        m = re.match(r'^[A-Z, ]+\s*\(\d+%\)(?:\s+\d+%)?', vote)
        compact = m.group(0) if m else vote.splitlines()[0]
        story.append(Paragraph(
            f"<i>Community vote: {html_escape(compact)}</i>",
            styles['meta'],
        ))

    story.append(Spacer(1, 8))


def main():
    print('Parsing data...', file=sys.stderr)
    questions = parse_questions()
    interactive = parse_interactive()
    images = parse_images()
    print(f"  {len(questions)} questions, {len(interactive)} interactive, "
          f"{len(images)} image entries", file=sys.stderr)

    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=LETTER,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title='AZ-900 Question Bank',
        author='Personal study compilation',
    )

    story = []
    story.append(Paragraph('AZ-900 Question Bank', styles['title']))
    story.append(Paragraph(
        f'{len(questions)} questions · Compiled from cleaned community materials',
        styles['subtitle'],
    ))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        '<i>Unofficial study compilation. Not affiliated with or endorsed by Microsoft. '
        'For personal study only.</i>',
        styles['meta'],
    ))
    story.append(PageBreak())

    for i, q in enumerate(questions):
        render_question(story, q, interactive, images, styles)
        if (i + 1) % 5 == 0 and i + 1 < len(questions):
            # Soft visual break every 5 questions — but keep the page flow natural
            pass

    print('Rendering PDF…', file=sys.stderr)
    doc.build(story)
    print(f'Wrote {OUT_PDF}', file=sys.stderr)


if __name__ == '__main__':
    main()
