import { useState, useMemo } from 'react';
import { QUESTIONS } from '../data/questions';
import { QuestionCard } from '../components/QuestionCard';
import type { ProgressState } from '../hooks/useProgress';

interface Props {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onNavigate: (page: string) => void;
  domain?: string;
  weakMode?: boolean;
}

export function PracticePage({ progress, onAnswer, onNavigate, domain, weakMode }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [answered, setAnswered] = useState(false);

  const questions = useMemo(() => {
    let qs = QUESTIONS;
    if (domain) qs = qs.filter(q => q.domain === domain);
    if (weakMode) {
      qs = qs.filter(q => {
        const attempts = progress.results[q.id] ?? [];
        if (attempts.length === 0) return false;
        return !attempts[attempts.length - 1].correct;
      });
      if (qs.length === 0) {
        // fallback: unattempted questions
        qs = QUESTIONS.filter(q => !(progress.results[q.id]?.length > 0));
      }
    }
    return qs;
  }, [domain, weakMode, progress.results]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            {weakMode ? 'No weak areas found — great job!' : 'No questions in this domain.'}
          </p>
          <button onClick={() => onNavigate('home')} className="text-blue-600 hover:underline text-sm">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  function handleAnswer(selected: string[], correct: boolean) {
    if (question.mode !== 'read') {
      onAnswer(question.id, correct, selected);
      setSessionTotal(t => t + 1);
      if (correct) setSessionCorrect(c => c + 1);
    }
    setAnswered(true);
  }

  function next() {
    if (isLast) {
      onNavigate('home');
    } else {
      setCurrentIndex(i => i + 1);
      setAnswered(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </button>
          <div className="flex items-center gap-3 text-sm">
            {sessionTotal > 0 && (
              <span className={sessionCorrect / sessionTotal >= 0.6 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                {sessionCorrect}/{sessionTotal}
              </span>
            )}
            <span className="text-gray-400">{domain ?? (weakMode ? 'Weak Areas' : 'All Questions')}</span>
          </div>
        </div>

        <QuestionCard
          question={question}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
        />

        {/* Next button: always available for 'read' mode, otherwise after answering */}
        {(answered || question.mode === 'read') && (
          <button
            onClick={next}
            className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm
              hover:bg-gray-700 transition-colors"
          >
            {isLast ? 'Finish' : 'Next Question →'}
          </button>
        )}

        {/* Skip for read-only questions */}
        {question.mode === 'read' && !answered && (
          <p className="text-center text-xs text-gray-400 mt-2">
            This question has no extractable text answer (image-based)
          </p>
        )}
      </div>
    </div>
  );
}
