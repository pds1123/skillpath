import { useState, useMemo } from 'react';
import { CERTIFICATIONS, quizQuestionsForCert } from '../data/questions';
import type { Question, CertificationKey } from '../data/questions';
import { INTERACTIVE_DATA } from '../data/interactiveData';
import { QUESTION_IMAGES } from '../data/questionImages';
import { Timer } from '../components/Timer';
import { InteractiveExam } from '../components/InteractiveExam';
import type { ExamAttempt } from '../hooks/useProgress';
import { gradeExam, type ExamGrade } from '../services/api';

const EXAM_DURATION_SEC = 45 * 60; // 45 minutes
const PASS_SCORE = 0.7;

interface Props {
  onNavigate: (page: string) => void;
  onExamComplete: (attempt: ExamAttempt) => void;
  activeCert: CertificationKey;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// MC answer = letter array (e.g., ["A", "C"])
// Interactive answer = "correct" | "incorrect" sentinel — graded by InteractiveExam
type Answer = string[] | 'correct' | 'incorrect';

export function ExamPage({ onNavigate, onExamComplete, activeCert }: Props) {
  const [startTime] = useState(() => Date.now());
  const certMeta = CERTIFICATIONS.find(c => c.key === activeCert)!;
  const mockCount = certMeta.mockQuestionCount;
  const questions = useMemo(
    () => shuffle(quizQuestionsForCert(activeCert)).slice(0, mockCount),
    [activeCert, mockCount]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [examGrade, setExamGrade] = useState<ExamGrade | null>(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sp-canvas)] px-5">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-[var(--sp-border)]">
          <h1 className="font-semibold text-[var(--sp-ink-strong)]">Question bank unavailable</h1>
          <p className="mt-2 text-sm text-[var(--sp-muted)]">Start the API and reload the page before beginning an assessment.</p>
          <button type="button" onClick={() => onNavigate('tutorial')} className="mt-5 rounded-xl bg-[var(--sp-primary-700)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--sp-primary-800)]">Back to learning</button>
        </div>
      </div>
    );
  }

  const question: Question = questions[currentIndex];
  const sourceId = question.legacyId ?? question.id;
  const interactive = INTERACTIVE_DATA[sourceId];
  const qImages = QUESTION_IMAGES[sourceId];
  const hasInteractive = !!interactive && interactive.kind !== 'click' && interactive.kind !== 'self_grade';
  const isClick = interactive?.kind === 'click';
  const isSelfGrade = interactive?.kind === 'self_grade';
  const isMC = !hasInteractive && !isClick && !isSelfGrade && Object.keys(question.options).length > 0;
  const isMulti = isMC && Boolean(question.multipleSelect);
  const isAnswered = currentIndex in answers;
  const totalAnswered = Object.keys(answers).length;

  // Reset interactive state when question changes (InteractiveExam manages its own state per mount,
  // but we want a fresh instance per question — keying does this)
  function toggleOption(letter: string) {
    if (isAnswered) return;
    if (isMulti) {
      setSelected(prev => prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]);
    } else {
      setSelected([letter]);
    }
  }

  function saveMCAndNext() {
    if (selected.length === 0) return;
    setAnswers(prev => ({ ...prev, [currentIndex]: selected }));
    setSelected([]);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  }

  function recordInteractiveResult(correct: boolean) {
    setAnswers(prev => ({ ...prev, [currentIndex]: correct ? 'correct' : 'incorrect' }));
  }

  function goTo(index: number) {
    if (isMC && selected.length > 0) {
      setAnswers(prev => ({ ...prev, [currentIndex]: selected }));
    }
    setCurrentIndex(index);
    const next = answers[index];
    setSelected(Array.isArray(next) ? next : []);
  }

  async function submitExam() {
    if (submittingExam || submitted) return;
    const finalAnswers: Record<number, Answer> = { ...answers };
    if (isMC && selected.length > 0) finalAnswers[currentIndex] = selected;

    const durationSec = Math.floor((Date.now() - startTime) / 1000);
    setSubmittingExam(true);
    setSubmitError(null);
    try {
      const result = await gradeExam({
        certification: activeCert,
        durationSeconds: durationSec,
        answers: questions.map((item, index) => {
          const answer = finalAnswers[index];
          return {
            questionId: item.id,
            selectedAnswers: Array.isArray(answer) ? answer : [],
            ...(answer === 'correct' ? { selfGrade: true } : answer === 'incorrect' ? { selfGrade: false } : {}),
          };
        }),
      });
      const attempt: ExamAttempt = {
        id: result.attemptId ?? crypto.randomUUID(),
        date: Date.now(),
        score: result.score,
        total: result.total,
        durationSec,
        domainScores: result.domainScores,
        questionIds: questions.map(item => item.id),
        answers: Object.fromEntries(Object.entries(finalAnswers).map(([key, value]) => [Number(key), value])),
        correctAnswers: Object.fromEntries(result.results.map(item => [item.questionId, item.correctAnswer])),
        certification: activeCert,
      };
      onExamComplete(attempt);
      setExamGrade(result);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit this assessment.');
    } finally {
      setSubmittingExam(false);
    }
  }

  if (submitted && examGrade) {
    const score = examGrade.score;
    const pct = score / examGrade.total;
    const pass = pct >= PASS_SCORE;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sp-canvas)] px-5">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center ring-1 ring-[var(--sp-border)] sm:p-10">
          <p className={`mx-auto mb-4 w-fit rounded-full px-3 py-1 text-xs font-semibold ${pass ? 'bg-green-100 text-green-800' : 'bg-[var(--sp-primary-100)] text-[var(--sp-primary-800)]'}`}>{pass ? 'Passed' : 'More practice recommended'}</p>
          <h2 className="mb-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--sp-ink-strong)]">Assessment complete</h2>
          <p className="mb-6 text-sm text-[var(--sp-muted)]">Mock assessment · Practice only</p>
          <div className="mb-2 text-5xl font-semibold tracking-[-0.05em] text-[var(--sp-ink-strong)]">
            {Math.round(pct * 100)}%
          </div>
          <p className="mb-8 text-sm text-[var(--sp-muted)]">{score} of {examGrade.total} correct · Target: 70%</p>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('tutorial')}
              className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-[var(--sp-ink)] ring-1 ring-[var(--sp-border)] transition hover:bg-[var(--sp-primary-50)]"
            >
              Back to learning
            </button>
            <button
              onClick={() => onNavigate('exam')}
              className="flex-1 rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)]"
            >
              Retake
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render question text with <u> tag support and inline table/image
  const renderText = (text: string) => {
    const parts = text.split(/(<u>.*?<\/u>)/g);
    return parts.map((part, i) => {
      const m = part.match(/^<u>(.*?)<\/u>$/);
      return m ? <u key={i} className="font-semibold">{m[1]}</u> : <span key={i}>{part}</span>;
    });
  };

  const hasContextImg =
    qImages?.question_img &&
    /shown in the following table|shown in the (following )?(exhibit|figure|diagram)|configured as shown/i.test(question.question);
  const splitMatch = (hasContextImg || question.table)
    ? question.question.match(/^([\s\S]*?(?:following table|following exhibit|following figure|following diagram|configured as shown[^:.\n]*)[:.])([\s\S]*)$/i)
    : null;

  const questionStem = splitMatch && (qImages?.question_img || question.table) ? (
    <>
      <p className="text-gray-900 font-medium leading-relaxed whitespace-pre-wrap mb-2">
        {renderText(splitMatch[1])}
      </p>
      {question.table ? (
        <div className="my-2 overflow-x-auto">
          <table className="mx-auto border border-gray-300 rounded-md text-sm">
            <thead>
              <tr>
                {question.table.headers.map((h, i) => (
                  <th key={i} className="border-b border-gray-300 bg-gray-50 px-3 py-1.5 font-semibold text-left text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-gray-50/30' : ''}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-t border-gray-200 px-3 py-1.5 text-gray-800">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <img
          src={qImages!.question_img!}
          alt="Question table"
          className="max-w-md mx-auto block rounded-lg border border-gray-200 my-2"
        />
      )}
      {splitMatch[2].trim() && (
        <p className="text-gray-900 font-medium leading-relaxed whitespace-pre-wrap mb-3">
          {renderText(splitMatch[2].replace(/^\s*\n?/, ''))}
        </p>
      )}
    </>
  ) : (
    <>
      <p className="text-gray-900 font-medium leading-relaxed whitespace-pre-wrap mb-3">
        {renderText(question.question)}
      </p>
      {qImages?.question_img && !isMC && !interactive && (
        <img
          src={qImages.question_img}
          alt="Question diagram"
          className="w-full max-w-lg mx-auto block rounded-lg border border-gray-200 mb-3"
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => setConfirmExit(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exit
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--sp-muted)] sm:inline">{totalAnswered} of {questions.length} answered</span>
            <Timer durationSec={EXAM_DURATION_SEC} onExpire={() => { setExpired(true); void submitExam(); }} />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sp-primary-700)]">Mock assessment</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--sp-ink-strong)]">{certMeta.name}</h1>
        </div>

        {confirmExit && (
          <div className="mb-5 rounded-xl border border-[var(--sp-primary-200)] bg-[var(--sp-primary-50)] p-4" role="alert">
            <p className="text-sm font-semibold text-[var(--sp-ink-strong)]">Exit this assessment?</p>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">Your answers in this attempt will not be saved.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirmExit(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[var(--sp-ink)] ring-1 ring-[var(--sp-border)]">Continue assessment</button>
              <button type="button" onClick={() => onNavigate('tutorial')} className="rounded-lg bg-[var(--sp-primary-700)] px-4 py-2 text-sm font-semibold text-white">Exit</button>
            </div>
          </div>
        )}

        {expired && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium text-center">
            Time's up! Submitting exam...
          </div>
        )}

        {/* Question */}
        <div className="mb-4 rounded-2xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-7">
          <div className="flex items-start gap-3 mb-5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sp-primary-700)] text-xs font-bold text-white">
              {currentIndex + 1}
            </span>
            <div className="flex-1">
              {isMulti && (
                <p className="mb-1.5 text-xs font-medium text-[var(--sp-primary-700)]">Select all that apply</p>
              )}
              {questionStem}
            </div>
          </div>

          {isMC && (
            <div className="flex flex-col gap-2">
              {Object.entries(question.options).map(([letter, text]) => {
                const isSelected = isAnswered
                  ? Array.isArray(answers[currentIndex]) && (answers[currentIndex] as string[]).includes(letter)
                  : selected.includes(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => toggleOption(letter)}
                    disabled={isAnswered}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-150 text-sm leading-relaxed ${
                      isSelected
                        ? 'border-[var(--sp-primary-600)] bg-[var(--sp-primary-50)] text-[var(--sp-primary-900)]'
                        : 'border-[var(--sp-border)] bg-white hover:border-[var(--sp-primary-300)] hover:bg-[var(--sp-primary-50)] text-[var(--sp-ink)]'
                    } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="flex gap-3 items-start">
                      <span className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold mt-0.5 transition-colors ${
                        isSelected ? 'border-[var(--sp-primary-600)] bg-[var(--sp-primary-600)] text-white' : 'border-[var(--sp-border-strong)] text-[var(--sp-muted)]'
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1">{text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {(hasInteractive || isClick || isSelfGrade) && interactive && (
            <InteractiveExam
              key={question.id}
              data={interactive}
              imageUrl={qImages?.question_img}
              checked={false}
              showAnswer={false}
              onSubmit={recordInteractiveResult}
              questionText={question.question}
              hideSubmit
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => goTo(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[var(--sp-muted)] ring-1 ring-[var(--sp-border)] transition-colors hover:bg-[var(--sp-primary-50)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {isMC && !isAnswered && currentIndex < questions.length - 1 && (
            <button
              onClick={saveMCAndNext}
              disabled={selected.length === 0}
              className="flex-1 rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save & Next
            </button>
          )}
          {isMC && !isAnswered && currentIndex === questions.length - 1 && (
            <button
              onClick={() => { setAnswers(prev => ({ ...prev, [currentIndex]: selected })); }}
              disabled={selected.length === 0}
              className="flex-1 rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Answer
            </button>
          )}
          {isAnswered && currentIndex < questions.length - 1 && (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="flex-1 rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)]"
            >
              Next
            </button>
          )}
          <button
            onClick={() => goTo(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[var(--sp-muted)] ring-1 ring-[var(--sp-border)] transition-colors hover:bg-[var(--sp-primary-50)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Skip
          </button>
        </div>

        {/* Question grid */}
        <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-[var(--sp-border)]">
          <p className="mb-3 text-xs font-medium text-[var(--sp-muted)]">Question navigator</p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  i === currentIndex
                    ? 'bg-[var(--sp-primary-700)] text-white'
                    : i in answers
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-[var(--sp-primary-50)] text-[var(--sp-muted)] hover:bg-[var(--sp-primary-100)]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {submitError && <p className="mb-3 text-center text-sm text-red-700" role="alert">{submitError}</p>}
        {confirmSubmit ? (
          <div className="rounded-2xl bg-[var(--sp-primary-50)] p-5 ring-1 ring-[var(--sp-primary-200)]">
            <p className="text-sm font-semibold text-[var(--sp-ink-strong)]">Submit assessment?</p>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">{questions.length - totalAnswered} questions are unanswered. You can review them before submitting.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmSubmit(false)} className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-[var(--sp-ink)] ring-1 ring-[var(--sp-border)]">Keep reviewing</button>
              <button type="button" onClick={() => void submitExam()} disabled={submittingExam} className="flex-1 rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submittingExam ? 'Submitting…' : 'Submit'}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmSubmit(true)} disabled={submittingExam} className="w-full rounded-xl bg-[var(--sp-primary-700)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] disabled:opacity-50">
            Submit mock assessment · {totalAnswered}/{questions.length} answered
          </button>
        )}
      </div>
    </div>
  );
}
