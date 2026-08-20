import { useState } from 'react';
import { questionsForCert } from '../data/questions';
import type { CertificationKey, Question } from '../data/questions';
import { QuestionCard } from '../components/QuestionCard';
import type { ProgressState } from '../hooks/useProgress';

export type PracticeMode = 'quick' | 'weak' | 'mistakes';

interface Props {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  activeCert: CertificationKey;
  mode: PracticeMode;
}

const MODE_COPY: Record<PracticeMode, { title: string; description: string }> = {
  quick: { title: 'Quick practice', description: 'A short mix from across your learning path.' },
  weak: { title: 'Review weak areas', description: 'Focused practice from topics where your recent answers need work.' },
  mistakes: { title: 'Review mistakes', description: 'Revisit questions you previously answered incorrectly.' },
};

function latestResult(question: Question, progress: ProgressState) {
  const attempts = progress.results[question.id] ?? [];
  return attempts[attempts.length - 1];
}

function selectQuestions(allQuestions: Question[], progress: ProgressState, mode: PracticeMode): Question[] {
  const quizQuestions = allQuestions.filter(question => question.mode === 'quiz');

  if (mode === 'mistakes') {
    return quizQuestions.filter(question => latestResult(question, progress)?.correct === false).slice(0, 10);
  }

  if (mode === 'weak') {
    const attempted = quizQuestions.filter(question => latestResult(question, progress));
    if (!attempted.length) return quizQuestions.slice(0, 10);

    const domains = new Map<string, { correct: number; total: number }>();
    attempted.forEach(question => {
      const current = domains.get(question.domain) ?? { correct: 0, total: 0 };
      const last = latestResult(question, progress);
      domains.set(question.domain, {
        correct: current.correct + (last?.correct ? 1 : 0),
        total: current.total + 1,
      });
    });
    const weakest = [...domains.entries()]
      .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
      .slice(0, 2)
      .map(([domain]) => domain);

    return quizQuestions
      .filter(question => weakest.includes(question.domain))
      .sort((a, b) => Number(Boolean(latestResult(a, progress)?.correct)) - Number(Boolean(latestResult(b, progress)?.correct)))
      .slice(0, 10);
  }

  return [...quizQuestions]
    .sort((a, b) => Number(Boolean(latestResult(a, progress))) - Number(Boolean(latestResult(b, progress))))
    .slice(0, 10);
}

export function PracticePage({ progress, onAnswer, onNavigate, activeCert, mode }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [questions] = useState(() => selectQuestions(questionsForCert(activeCert), progress, mode));
  const copy = MODE_COPY[mode];

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-[var(--sp-canvas)] px-5 py-8 text-[var(--sp-ink)]">
        <main className="mx-auto max-w-xl">
          <button type="button" onClick={() => onNavigate('tutorial')} className="text-sm font-medium text-[var(--sp-muted)] hover:text-[var(--sp-primary-800)]">← Tutorial</button>
          <div className="mt-20 rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-[var(--sp-border)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sp-primary-100)] text-[var(--sp-primary-700)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-[-0.02em]">No mistakes to review</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--sp-muted)]">Complete a quick practice session first. Questions you miss will be collected here automatically.</p>
            <button type="button" onClick={() => onNavigate('practice', { mode: 'quick' })} className="mt-6 rounded-lg bg-[var(--sp-primary-900)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--sp-primary-800)]">Start quick practice</button>
          </div>
        </main>
      </div>
    );
  }

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  function handleAnswer(selected: string[], correct: boolean) {
    if (question.mode !== 'read') {
      onAnswer(question.id, correct, selected);
      setSessionTotal(total => total + 1);
      if (correct) setSessionCorrect(total => total + 1);
    }
    setAnswered(true);
  }

  function next() {
    if (isLast) onNavigate('tutorial');
    else {
      setCurrentIndex(index => index + 1);
      setAnswered(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <main className="mx-auto max-w-2xl px-5 py-7 sm:px-8 sm:py-10">
        <button type="button" onClick={() => onNavigate('tutorial')} className="text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]">← Tutorial</button>
        <div className="mb-7 mt-7 flex items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em]">{copy.title}</h1>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">{copy.description}</p>
          </div>
          <div className="shrink-0 text-right text-xs text-[var(--sp-muted)]">
            {sessionTotal > 0 && <p className="font-semibold text-[var(--sp-primary-700)]">{sessionCorrect} correct</p>}
            <p className="mt-0.5 tabular-nums">{currentIndex + 1} / {questions.length}</p>
          </div>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[var(--sp-border)]">
          <div className="h-full rounded-full bg-[var(--sp-primary-600)] transition-[width]" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>

        <QuestionCard
          key={question.id}
          question={question}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
        />

        {(answered || question.mode === 'read') && (
          <button type="button" onClick={next} className="mt-4 w-full rounded-xl bg-[var(--sp-primary-900)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)]">
            {isLast ? 'Finish session' : 'Next question →'}
          </button>
        )}
      </main>
    </div>
  );
}
