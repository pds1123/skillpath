# SkillPath

An interactive learning web application for cloud fundamentals. Built as a
single-page app with a rich, custom interactive-question engine, timed exam
simulation, and per-cert progress tracking — all client-side.

## Tech stack

- **React 19** + **TypeScript**
- **Vite** for the build & dev server
- **Tailwind CSS** for styling
- **Anthropic Claude API** for on-demand contextual explanations
- **Python** (`pdfplumber`, `PyMuPDF`) for source-content extraction

## What's inside

- **Multi-cert architecture** — the same UI hosts multiple certification
  tracks (starting with Azure and AWS fundamentals). Certs are switched from
  a compact dropdown in the header; all progress, exam history, and browse
  state is scoped per-cert via `localStorage`.
- **Seven interactive question formats** built on a shared render engine:
  multiple-choice, yes/no matrix, dropdown fill-in-the-blank, drag-and-drop
  match, image hotspot, inline formula composition, and image-based self-grade.
- **Study by Module** — long-form study notes per domain with an inline
  practice pane so learners can read and immediately test.
- **Timed exam simulation** — configurable question count, per-question
  navigation, review screen, and per-domain scoring. Attempt history is
  browsable with a full review of each answered question.
- **AI analysis** — a per-question "explain this" call to Claude with a
  strict prompt that respects the authoritative answer key. Responses are
  cached client-side to avoid re-billing.
- **PDF extraction pipeline** — the `scripts/` folder contains the Python
  extractors used to normalise structured source content into the app's
  TypeScript data model.

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Bootstrap the sample data files (only needed on first clone)
./scripts/bootstrap.sh

# 3. Start the dev server
npm run dev
```

Then open <http://localhost:5173>.

### Optional: AI explanations

The "AI Analysis" button on each question calls the Claude API. Provide your
own API key in the in-app **Settings** page — it's stored only in your
browser's `localStorage`.

## Project structure

```
src/
  components/       # Shared UI (InteractiveExam, Timer, QuestionCard)
  data/             # Question data + study notes
    *.example.ts    # Sample data included in the repo
    *.ts            # Real data (gitignored — bring your own)
  hooks/            # useProgress, useCertification
  pages/            # HomePage, BrowsePage, ModulesPage, ExamPage, ExamReviewPage
scripts/            # Python PDF-extraction utilities + bootstrap helper
public/             # favicon & static assets
```

## About the content

The full question banks used during development are **not** committed to this
repository. The `src/data/*.example.ts` stubs provide a handful of
hand-written sample questions so the app runs end-to-end after `git clone`.
Bring your own question data by editing the real `.ts` files (which are
gitignored).

## License

MIT — see [LICENSE](LICENSE).
