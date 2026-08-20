import { CERTIFICATIONS, questionsForCert } from '../data/questions';
import type { CertificationKey } from '../data/questions';
import type { ProgressState } from '../hooks/useProgress';

interface Props {
  progress: ProgressState;
  activeCert: CertificationKey;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function CertificationPage({ progress, activeCert, onNavigate }: Props) {
  const certification = CERTIFICATIONS.find(item => item.key === activeCert)!;
  const questions = questionsForCert(activeCert);
  const questionIds = new Set(questions.map(question => question.id));
  const attemptedQuestions = questions.filter(question => (progress.results[question.id] ?? []).length > 0);
  const latestCorrect = attemptedQuestions.filter(question => {
    const attempts = progress.results[question.id] ?? [];
    return attempts[attempts.length - 1]?.correct;
  }).length;
  const coverage = Math.round((attemptedQuestions.length / Math.max(questions.length, 1)) * 100);
  const accuracy = Math.round((latestCorrect / Math.max(attemptedQuestions.length, 1)) * 100);
  const readiness = attemptedQuestions.length ? Math.round((coverage * 0.35) + (accuracy * 0.65)) : 0;
  const history = progress.examHistory.filter(attempt => (attempt.certification ?? 'AZ-900') === activeCert);
  const mistakes = [...questionIds].filter(id => {
    const attempts = progress.results[id] ?? [];
    return attempts.length > 0 && !attempts[attempts.length - 1].correct;
  }).length;

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <main className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-10">
        <button type="button" onClick={() => onNavigate('tutorial')} className="text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]">← Tutorial</button>

        <header className="mb-10 mt-8 border-b border-[var(--sp-border)] pb-8">
          <p className="text-xs font-semibold tracking-[0.09em] text-[var(--sp-muted)]">Certification preparation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{certification.shortName}</h1>
          <p className="mt-2 text-sm text-[var(--sp-muted)]">{certification.name}</p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--sp-muted)]">Use these tools when you’re ready to translate your learning progress into exam preparation. Your core learning path stays separate.</p>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]" aria-labelledby="readiness-title">
          <div className="rounded-2xl bg-[var(--sp-primary-900)] p-6 text-white">
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--sp-on-primary-muted)]">Readiness estimate</p>
            <div className="mt-3 flex items-end gap-2">
              <strong id="readiness-title" className="text-5xl font-semibold tracking-[-0.06em] tabular-nums">{readiness}%</strong>
              <span className="pb-1 text-xs text-[var(--sp-on-primary-muted)]">based on practice</span>
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[var(--sp-primary-200)]" style={{ width: `${readiness}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[var(--sp-primary-100)] p-6">
            <div>
              <p className="text-xl font-semibold tabular-nums text-[var(--sp-primary-800)]">{coverage}%</p>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">topic coverage</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-[var(--sp-primary-800)]">{accuracy}%</p>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">recent accuracy</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-[var(--sp-primary-800)]">{mistakes}</p>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">to review</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="tools-title">
          <h2 id="tools-title" className="text-xl font-semibold tracking-[-0.025em]">Preparation tools</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => onNavigate('modules')} className="group rounded-xl bg-white p-5 text-left ring-1 ring-[var(--sp-border)] transition hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)]">
              <h3 className="text-sm font-semibold group-hover:text-[var(--sp-primary-800)]">Certification topics</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--sp-muted)]">Review the learning modules aligned with this certification.</p>
            </button>
            <button type="button" onClick={() => onNavigate('practice', { mode: 'weak' })} className="group rounded-xl bg-white p-5 text-left ring-1 ring-[var(--sp-border)] transition hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)]">
              <h3 className="text-sm font-semibold group-hover:text-[var(--sp-primary-800)]">Review weak areas</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--sp-muted)]">Practise concepts where your recent answers need work.</p>
            </button>
            <button type="button" onClick={() => onNavigate('practice', { mode: 'mistakes' })} className="group rounded-xl bg-white p-5 text-left ring-1 ring-[var(--sp-border)] transition hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)]">
              <h3 className="text-sm font-semibold group-hover:text-[var(--sp-primary-800)]">Review mistakes</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--sp-muted)]">Revisit incorrect answers before taking a timed assessment.</p>
            </button>
            <button type="button" onClick={() => onNavigate('exam')} className="group rounded-xl bg-[var(--sp-primary-900)] p-5 text-left text-white transition hover:-translate-y-0.5 hover:bg-[var(--sp-primary-900)]">
              <h3 className="text-sm font-semibold">Timed mock assessment</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--sp-on-primary)]">Simulate exam conditions and review the result afterward.</p>
            </button>
          </div>
        </section>

        {history.length > 0 && (
          <section className="mt-12 border-t border-[var(--sp-border)] pt-8" aria-labelledby="history-title">
            <div className="flex items-center justify-between">
              <h2 id="history-title" className="text-base font-semibold">Recent assessments</h2>
              <span className="text-xs text-[var(--sp-muted-light)]">{history.length} total</span>
            </div>
            <div className="mt-4 space-y-2">
              {history.slice(0, 5).map(attempt => {
                const score = Math.round((attempt.score / attempt.total) * 100);
                return (
                  <button
                    type="button"
                    key={attempt.id}
                    onClick={() => attempt.questionIds && onNavigate('examReview', { attemptId: attempt.id })}
                    disabled={!attempt.questionIds}
                    className="flex w-full items-center gap-4 rounded-lg bg-white px-4 py-3 text-left ring-1 ring-[var(--sp-border)] transition enabled:hover:ring-[var(--sp-border-strong)] disabled:opacity-60"
                  >
                    <strong className="w-12 text-lg tabular-nums text-[var(--sp-primary-700)]">{score}%</strong>
                    <span className="flex-1 text-xs text-[var(--sp-muted)]">{new Date(attempt.date).toLocaleDateString()} · {Math.floor(attempt.durationSec / 60)} min</span>
                    <span className="text-xs font-medium text-[var(--sp-ink-soft)]">{score >= 70 ? 'Passed' : 'Keep practising'}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-10 text-[11px] leading-5 text-[var(--sp-muted-light)]">Practice only. SkillPath is not affiliated with Microsoft or AWS and does not reproduce live exam questions.</p>
      </main>
    </div>
  );
}
