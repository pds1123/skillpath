import { questionsForCert } from '../data/questions';
import { INTERACTIVE_DATA } from '../data/interactiveData';
import type { ProgressState } from '../hooks/useProgress';
import type { Question } from '../data/questions';
import { AppHeader } from '../components/AppHeader';

interface Props {
  progress: ProgressState;
  attemptId: string;
  onNavigate: (page: string) => void;
}

export function ExamReviewPage({ progress, attemptId, onNavigate }: Props) {
  const attempt = progress.examHistory.find(a => a.id === attemptId);

  if (!attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sp-canvas)] px-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-[var(--sp-border)]">
          <p className="mb-4 text-[var(--sp-ink)]">Assessment attempt not found.</p>
          <button
            onClick={() => onNavigate('tutorial')}
            className="rounded-xl bg-[var(--sp-primary-700)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)]"
          >
            Back to learning
          </button>
        </div>
      </div>
    );
  }

  const qIds = attempt.questionIds ?? [];
  const questionPool = questionsForCert(attempt.certification ?? 'AZ-900');
  const questions = qIds
    .map(id => questionPool.find(q => q.id === id))
    .filter((q): q is Question => !!q);
  const answers = attempt.answers ?? {};
  const correctAnswers = attempt.correctAnswers ?? {};
  const pct = Math.round((attempt.score / attempt.total) * 100);
  const pass = pct >= 70;

  function isCorrectAnswer(q: Question, idx: number): boolean {
    const ans = answers[idx];
    if (ans === 'correct') return true;
    if (ans === 'incorrect') return false;
    const correct = correctAnswers[q.id] ?? [];
    if (Array.isArray(ans) && correct.length > 0) {
      return ans.length === correct.length && ans.every(a => correct.includes(a));
    }
    return false;
  }

  function renderUserAnswer(q: Question, idx: number) {
    const ans = answers[idx];
    if (ans === 'correct' || ans === 'incorrect') {
      const inter = INTERACTIVE_DATA[q.legacyId ?? q.id];
      if (!inter) return <span className="text-gray-400 italic">No answer</span>;
      // Show the prompt structure with correct labels — graded yes/no/dropdown/match
      if (inter.kind === 'yesno' || inter.kind === 'dropdown' || inter.kind === 'match') {
        return (
          <div className="space-y-1">
            {inter.prompts.map((p, i) => (
              <p key={i} className="text-xs text-gray-700">
                <span className="text-gray-500">{p.text}:</span>{' '}
                <span className="font-semibold text-green-700">{p.correct}</span>
              </p>
            ))}
            <p className="text-[11px] text-gray-400 italic mt-1">
              ({ans === 'correct' ? 'You answered correctly' : 'You answered incorrectly — exact picks not recorded'})
            </p>
          </div>
        );
      }
      if (inter.kind === 'click') {
        return <span className="text-xs text-gray-700">Click hotspot: {inter.label} (self-graded)</span>;
      }
      if (inter.kind === 'self_grade') {
        return <span className="text-xs text-gray-700">Self-graded: {ans === 'correct' ? 'correct' : 'wrong'}</span>;
      }
      return null;
    }
    if (Array.isArray(ans)) {
      if (ans.length === 0) return <span className="text-gray-400 italic">No answer</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {ans.map(letter => (
            <span key={letter} className="inline-block rounded-lg bg-[var(--sp-primary-100)] px-2 py-1 text-xs font-semibold text-[var(--sp-primary-800)]">
              {letter}. {q.options[letter] ?? ''}
            </span>
          ))}
        </div>
      );
    }
    return <span className="text-gray-400 italic">No answer</span>;
  }

  function renderCorrectAnswer(q: Question) {
    const inter = INTERACTIVE_DATA[q.legacyId ?? q.id];
    if (inter && (inter.kind === 'yesno' || inter.kind === 'dropdown' || inter.kind === 'match')) {
      return (
        <div className="space-y-1">
          {inter.prompts.map((p, i) => (
            <p key={i} className="text-xs text-gray-700">
              <span className="text-gray-500">{p.text}:</span>{' '}
              <span className="font-semibold text-green-700">{p.correct}</span>
            </p>
          ))}
        </div>
      );
    }
    const correct = correctAnswers[q.id] ?? [];
    if (correct.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {correct.map(letter => (
            <span key={letter} className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold">
              {letter}. {q.options[letter] ?? ''}
            </span>
          ))}
        </div>
      );
    }
    return <span className="text-gray-400 italic">—</span>;
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="learning" onNavigate={onNavigate} />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <button
            onClick={() => onNavigate('tutorial')}
            className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
            </svg>
            My Learning
          </button>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)] sm:text-4xl">Assessment review</h1>
          </div>
          <p className="text-xs text-[var(--sp-muted)]">{new Date(attempt.date).toLocaleString()}</p>
        </div>

        <section className="mb-5 overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--sp-border)]" aria-labelledby="review-summary-title">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="text-4xl font-semibold tracking-[-0.04em] text-[var(--sp-ink-strong)]">{pct}%</div>
            <div className="flex-1 text-sm text-[var(--sp-muted)]">
              <h2 id="review-summary-title" className="font-semibold text-[var(--sp-ink-strong)]">Mock assessment</h2>
              <p className="mt-1">{attempt.score} of {attempt.total} correct · {Math.floor(attempt.durationSec / 60)} min {attempt.durationSec % 60}s</p>
            </div>
            <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
              {pass ? 'Passed' : 'More practice recommended'}
            </span>
          </div>
          <div className="border-t border-[var(--sp-border)] px-6 py-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--sp-ink-strong)]">By topic</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(attempt.domainScores).map(([domain, s]) => {
              const dpct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={domain} className="flex items-center gap-3 text-xs">
                  <span className="flex-1 text-[var(--sp-ink)]">{domain}</span>
                  <span className="text-[var(--sp-muted)]">{s.correct}/{s.total}</span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--sp-primary-100)]">
                    <div
                      className={`h-full ${dpct >= 70 ? 'bg-green-500' : 'bg-[var(--sp-primary-500)]'}`}
                      style={{ width: `${dpct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </section>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const correct = isCorrectAnswer(q, i);
            const ans = answers[i];
            const answered = ans !== undefined;
            return (
              <article key={i} className="rounded-2xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sp-primary-100)] text-xs font-bold text-[var(--sp-primary-800)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs text-[var(--sp-muted)]">#{q.id} · {q.domain}</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--sp-ink-strong)]">{q.question}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      !answered ? 'bg-[var(--sp-primary-50)] text-[var(--sp-muted)]' : correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {!answered ? 'Unanswered' : correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="ml-0 grid gap-4 border-t border-[var(--sp-border)] pt-4 sm:ml-10 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sp-muted)]">Your answer</p>
                    {renderUserAnswer(q, i)}
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sp-muted)]">Correct answer</p>
                    {renderCorrectAnswer(q)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
