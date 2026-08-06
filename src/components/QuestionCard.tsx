import { useState, useEffect } from 'react';
import type { Question } from '../data/questions';

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selected: string[], correct: boolean) => void;
  showProgress?: boolean;
}

export function QuestionCard({ question, questionNumber, totalQuestions, onAnswer, showProgress = true }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selfGrade, setSelfGrade] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    setSelected([]);
    setSubmitted(false);
    setRevealed(false);
    setSelfGrade(null);
  }, [question.id]);

  const isMulti = question.correct_answer.length > 1;
  const mode = question.mode;

  function toggleOption(letter: string) {
    if (submitted) return;
    if (isMulti) {
      setSelected(prev => prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]);
    } else {
      setSelected([letter]);
    }
  }

  function submit() {
    if (selected.length === 0 || submitted) return;
    setSubmitted(true);
    const correct =
      selected.length === question.correct_answer.length &&
      selected.every(s => question.correct_answer.includes(s));
    onAnswer(selected, correct);
  }

  function handleReveal() {
    setRevealed(true);
  }

  function handleSelfGrade(grade: 'correct' | 'incorrect') {
    setSelfGrade(grade);
    onAnswer([], grade === 'correct');
  }

  function getOptionClass(letter: string) {
    const base = 'w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-150 text-sm leading-relaxed cursor-pointer';
    if (!submitted) {
      return `${base} ${
        selected.includes(letter)
          ? 'border-blue-500 bg-blue-50 text-blue-900'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'
      }`;
    }
    const isCorrect = question.correct_answer.includes(letter);
    const isSelected = selected.includes(letter);
    if (isCorrect) return `${base} border-green-500 bg-green-50 text-green-900`;
    if (isSelected && !isCorrect) return `${base} border-red-400 bg-red-50 text-red-900`;
    return `${base} border-gray-200 bg-gray-50 text-gray-500`;
  }

  const isCorrectAnswer =
    submitted &&
    selected.length === question.correct_answer.length &&
    selected.every(s => question.correct_answer.includes(s));

  // MODE BADGE
  const modeLabel = mode === 'quiz' ? null : mode === 'reveal' ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Self-grade</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Review only</span>
  );

  return (
    <div className="flex flex-col gap-4">
      {showProgress && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>Question {questionNumber} of {totalQuestions}</span>
            {modeLabel}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {question.domain}
          </span>
        </div>
      )}

      {showProgress && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
            {questionNumber}
          </span>
          <div className="flex-1">
            {isMulti && mode === 'quiz' && !submitted && (
              <p className="text-xs text-blue-600 font-medium mb-1.5">Select all that apply</p>
            )}
            <p className="text-gray-900 font-medium leading-relaxed whitespace-pre-wrap">{question.question}</p>
          </div>
        </div>

        {/* QUIZ MODE: interactive options */}
        {mode === 'quiz' && (
          <>
            <div className="flex flex-col gap-2">
              {Object.entries(question.options).map(([letter, text]) => (
                <button
                  key={letter}
                  onClick={() => toggleOption(letter)}
                  className={getOptionClass(letter)}
                  disabled={submitted}
                >
                  <span className="flex gap-3 items-start">
                    <span className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold mt-0.5 transition-colors ${
                      submitted
                        ? question.correct_answer.includes(letter)
                          ? 'border-green-500 bg-green-500 text-white'
                          : selected.includes(letter)
                          ? 'border-red-400 bg-red-400 text-white'
                          : 'border-gray-300 text-gray-400'
                        : selected.includes(letter)
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 text-gray-500'
                    }`}>
                      {letter}
                    </span>
                    <span className="flex-1">{text}</span>
                  </span>
                </button>
              ))}
            </div>

            {submitted && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                isCorrectAnswer
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="font-semibold mb-1">
                  {isCorrectAnswer ? 'Correct!' : `Incorrect — correct answer: ${question.correct_answer.join(', ')}`}
                </p>
              </div>
            )}

            {!submitted && (
              <button
                onClick={submit}
                disabled={selected.length === 0}
                className="mt-5 w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm
                  hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            )}
          </>
        )}

        {/* REVEAL MODE: show/hide answer + self grade */}
        {mode === 'reveal' && (
          <>
            {!revealed ? (
              <button
                onClick={handleReveal}
                className="w-full py-2.5 rounded-lg border-2 border-dashed border-amber-300 text-amber-700 font-medium text-sm
                  hover:bg-amber-50 transition-colors"
              >
                Show Answer
              </button>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-gray-800 mb-4">
                  <p className="text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">Answer</p>
                  {question.correct_answer.length > 0 && question.options && Object.keys(question.options).length > 0 && (
                    <div className="mb-2">
                      {question.correct_answer.map(letter => (
                        <p key={letter} className="font-medium">
                          <span className="font-bold text-amber-800">{letter}.</span> {question.options[letter]}
                        </p>
                      ))}
                    </div>
                  )}
                  {question.answer_text && (
                    <p className="leading-relaxed">{question.answer_text}</p>
                  )}
                </div>

                {selfGrade === null ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelfGrade('incorrect')}
                      className="flex-1 py-2 rounded-lg border-2 border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
                    >
                      Got it wrong
                    </button>
                    <button
                      onClick={() => handleSelfGrade('correct')}
                      className="flex-1 py-2 rounded-lg border-2 border-green-300 text-green-700 font-medium text-sm hover:bg-green-50 transition-colors"
                    >
                      Got it right
                    </button>
                  </div>
                ) : (
                  <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                    selfGrade === 'correct' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {selfGrade === 'correct' ? 'Marked as correct ✓' : 'Marked as incorrect ✗'}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* READ MODE: no answer available */}
        {mode === 'read' && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-500 text-center">
            Answer not available in text format (image-based question)
          </div>
        )}
      </div>
    </div>
  );
}
