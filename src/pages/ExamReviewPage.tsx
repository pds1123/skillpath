import { QUESTIONS } from '../data/questions';
import { INTERACTIVE_DATA } from '../data/interactiveData';
import type { ProgressState } from '../hooks/useProgress';
import type { Question } from '../data/questions';

interface Props {
  progress: ProgressState;
  attemptId: string;
  onNavigate: (page: string) => void;
}

export function ExamReviewPage({ progress, attemptId, onNavigate }: Props) {
  const attempt = progress.examHistory.find(a => a.id === attemptId);

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md w-full text-center">
          <p className="text-gray-700 mb-4">Exam attempt not found.</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const qIds = attempt.questionIds ?? [];
  const questions = qIds
    .map(id => QUESTIONS.find(q => q.id === id))
    .filter((q): q is Question => !!q);
  const answers = attempt.answers ?? {};
  const pct = Math.round((attempt.score / attempt.total) * 100);
  const pass = pct >= 70;

  function isCorrectAnswer(q: Question, idx: number): boolean {
    const ans = answers[idx];
    if (ans === 'correct') return true;
    if (ans === 'incorrect') return false;
    if (Array.isArray(ans) && q.correct_answer.length > 0) {
      return ans.length === q.correct_answer.length && ans.every(a => q.correct_answer.includes(a));
    }
    return false;
  }

  function renderUserAnswer(q: Question, idx: number) {
    const ans = answers[idx];
    if (ans === 'correct' || ans === 'incorrect') {
      const inter = INTERACTIVE_DATA[q.id];
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
        return <span className="text-xs text-gray-700">Self-graded: {ans === 'correct' ? '✓ correct' : '✗ wrong'}</span>;
      }
      return null;
    }
    if (Array.isArray(ans)) {
      if (ans.length === 0) return <span className="text-gray-400 italic">No answer</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {ans.map(letter => (
            <span key={letter} className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold">
              {letter}. {q.options[letter] ?? ''}
            </span>
          ))}
        </div>
      );
    }
    return <span className="text-gray-400 italic">No answer</span>;
  }

  function renderCorrectAnswer(q: Question) {
    const inter = INTERACTIVE_DATA[q.id];
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
    if (q.correct_answer.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {q.correct_answer.map(letter => (
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <p className="text-xs text-gray-400">{new Date(attempt.date).toLocaleString()}</p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 flex items-center gap-4">
          <div className={`text-3xl font-bold ${pass ? 'text-green-600' : 'text-red-500'}`}>
            {pct}%
          </div>
          <div className="flex-1 text-sm text-gray-500">
            <p className="font-medium text-gray-800">Exam Review</p>
            <p>{attempt.score}/{attempt.total} correct · {Math.floor(attempt.durationSec / 60)} min {attempt.durationSec % 60}s</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {pass ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* Domain breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">By Domain</h2>
          <div className="flex flex-col gap-1.5">
            {Object.entries(attempt.domainScores).map(([domain, s]) => {
              const dpct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={domain} className="flex items-center gap-3 text-xs">
                  <span className="flex-1 text-gray-700">{domain}</span>
                  <span className="text-gray-500">{s.correct}/{s.total}</span>
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${dpct >= 70 ? 'bg-green-500' : 'bg-red-400'}`}
                      style={{ width: `${dpct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-question */}
        <div className="space-y-3">
          {questions.map((q, i) => {
            const correct = isCorrectAnswer(q, i);
            const ans = answers[i];
            const answered = ans !== undefined;
            return (
              <div
                key={i}
                className={`bg-white rounded-xl border-l-4 border-r border-y border-gray-200 p-4 ${
                  !answered ? 'border-l-gray-300' : correct ? 'border-l-green-500' : 'border-l-red-500'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className={`shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                    !answered ? 'bg-gray-400' : correct ? 'bg-green-600' : 'bg-red-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-1">#{q.id} · {q.domain}</p>
                    <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{q.question}</p>
                  </div>
                  {answered && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                      correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {correct ? '✓' : '✗'}
                    </span>
                  )}
                </div>

                <div className="ml-10 space-y-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Your answer</p>
                    {renderUserAnswer(q, i)}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Correct answer</p>
                    {renderCorrectAnswer(q)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
