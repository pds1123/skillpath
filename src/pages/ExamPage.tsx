import { useState, useMemo, useRef } from 'react';
import { quizQuestionsForCert } from '../data/questions';
import type { Question, CertificationKey } from '../data/questions';
import { INTERACTIVE_DATA } from '../data/interactiveData';
import { QUESTION_IMAGES } from '../data/questionImages';
import { Timer } from '../components/Timer';
import { InteractiveExam } from '../components/InteractiveExam';
import type { ExamAttempt } from '../hooks/useProgress';

const EXAM_QUESTIONS = 45;
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
  const startTime = useRef(Date.now());
  const questions = useMemo(
    () => shuffle(quizQuestionsForCert(activeCert)).slice(0, EXAM_QUESTIONS),
    [activeCert]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);

  const question: Question = questions[currentIndex];
  const interactive = INTERACTIVE_DATA[question.id];
  const qImages = QUESTION_IMAGES[question.id];
  const hasInteractive = !!interactive && interactive.kind !== 'click' && interactive.kind !== 'self_grade';
  const isClick = interactive?.kind === 'click';
  const isSelfGrade = interactive?.kind === 'self_grade';
  const isMC = !hasInteractive && !isClick && !isSelfGrade && Object.keys(question.options).length > 0;
  const isMulti = isMC && question.correct_answer.length > 1;
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

  function submitExam() {
    const finalAnswers: Record<number, Answer> = { ...answers };
    if (isMC && selected.length > 0) finalAnswers[currentIndex] = selected;

    const durationSec = Math.floor((Date.now() - startTime.current) / 1000);
    let score = 0;
    const domainScores: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q, i) => {
      const ans = finalAnswers[i];
      let correct = false;
      if (ans === 'correct') {
        correct = true;
      } else if (Array.isArray(ans) && q.correct_answer.length > 0) {
        correct = ans.length === q.correct_answer.length && ans.every(a => q.correct_answer.includes(a));
      }
      if (correct) score++;
      if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 };
      domainScores[q.domain].total++;
      if (correct) domainScores[q.domain].correct++;
    });

    const attempt: ExamAttempt = {
      id: Date.now().toString(),
      date: Date.now(),
      score,
      total: questions.length,
      durationSec,
      domainScores,
      questionIds: questions.map(q => q.id),
      answers: Object.fromEntries(
        Object.entries(finalAnswers).map(([k, v]) => [Number(k), v])
      ),
      certification: activeCert,
    };
    onExamComplete(attempt);
    setSubmitted(true);
  }

  if (submitted) {
    const finalAnswers: Record<number, Answer> = { ...answers };
    if (isMC && selected.length > 0) finalAnswers[currentIndex] = selected;
    const score = questions.filter((q, i) => {
      const ans = finalAnswers[i];
      if (ans === 'correct') return true;
      if (!Array.isArray(ans) || q.correct_answer.length === 0) return false;
      return ans.length === q.correct_answer.length && ans.every(a => q.correct_answer.includes(a));
    }).length;
    const pct = score / questions.length;
    const pass = pct >= PASS_SCORE;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${pass ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="text-4xl">{pass ? '🎉' : '📚'}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{pass ? 'You Passed!' : 'Keep Studying'}</h2>
          <p className="text-gray-500 text-sm mb-4">Practice Exam</p>
          <div className={`text-5xl font-bold mb-2 ${pass ? 'text-green-600' : 'text-red-600'}`}>
            {Math.round(pct * 100)}%
          </div>
          <p className="text-gray-500 text-sm mb-6">{score} / {questions.length} correct · Pass: 70%</p>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('exam')}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => { if (confirm('Exit exam? Progress will be lost.')) onNavigate('home'); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exit
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{totalAnswered}/{questions.length} answered</span>
            <Timer durationSec={EXAM_DURATION_SEC} onExpire={() => { setExpired(true); submitExam(); }} />
          </div>
        </div>

        {expired && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium text-center">
            Time's up! Submitting exam...
          </div>
        )}

        {/* Question */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-3 mb-5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
              {currentIndex + 1}
            </span>
            <div className="flex-1">
              {isMulti && (
                <p className="text-xs text-purple-600 font-medium mb-1.5">Select all that apply</p>
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
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 text-gray-800'
                    } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="flex gap-3 items-start">
                      <span className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold mt-0.5 transition-colors ${
                        isSelected ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-300 text-gray-500'
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
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600
              hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {isMC && !isAnswered && currentIndex < questions.length - 1 && (
            <button
              onClick={saveMCAndNext}
              disabled={selected.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm
                hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save & Next
            </button>
          )}
          {isMC && !isAnswered && currentIndex === questions.length - 1 && (
            <button
              onClick={() => { setAnswers(prev => ({ ...prev, [currentIndex]: selected })); }}
              disabled={selected.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm
                hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save Answer
            </button>
          )}
          {isAnswered && currentIndex < questions.length - 1 && (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          )}
          <button
            onClick={() => goTo(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600
              hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Question grid */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Question Navigator</p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  i === currentIndex
                    ? 'bg-purple-600 text-white'
                    : i in answers
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (confirm(`Submit exam? ${questions.length - totalAnswered} questions unanswered.`)) submitExam(); }}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm
            hover:bg-green-700 transition-colors"
        >
          Submit Exam ({totalAnswered}/{questions.length} answered)
        </button>
      </div>
    </div>
  );
}
