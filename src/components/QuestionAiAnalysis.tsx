import { useState } from 'react';
import Markdown from 'react-markdown';
import type { Question } from '../types/questions';
import type { InteractionSolution } from '../types/questionEngine';
import { buildFeedbackPrompt, type LearnerFeedback } from '../services/aiFeedback';

import { requestAiFeedback } from '../services/api';

interface Props {
  question: Question;
  correctAnswers: string[];
  answerText?: string | null;
  solution?: InteractionSolution | null;
  feedback: LearnerFeedback;
}

function AnalysisText({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-[var(--sp-ink-soft)] [overflow-wrap:anywhere] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li>p]:my-1 [&_strong]:font-semibold [&_strong]:text-[var(--sp-ink)] [&_em]:italic [&_hr]:my-5 [&_hr]:border-[var(--sp-primary-200)] [&_a]:text-[var(--sp-primary-800)] [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--sp-primary-200)] [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:p-3">
      <Markdown
        skipHtml
        disallowedElements={['img']}
        components={{
          h1: ({ children }) => <h3 className="pt-1 text-base font-semibold leading-6 text-[var(--sp-ink)]">{children}</h3>,
          h2: ({ children }) => <h4 className="pt-2 text-sm font-semibold leading-6 text-[var(--sp-ink)]">{children}</h4>,
          h3: ({ children }) => <h5 className="pt-1 text-sm font-semibold leading-6 text-[var(--sp-ink)]">{children}</h5>,
          h4: ({ children }) => <h6 className="text-sm font-semibold text-[var(--sp-ink)]">{children}</h6>,
          h5: ({ children }) => <h6 className="text-sm font-semibold text-[var(--sp-ink)]">{children}</h6>,
          h6: ({ children }) => <h6 className="text-sm font-semibold text-[var(--sp-ink)]">{children}</h6>,
        }}
      >{text}</Markdown>
    </div>
  );
}

export function QuestionAiAnalysis({ question, correctAnswers, answerText, solution, feedback }: Props) {
  const prompt = buildFeedbackPrompt(question, correctAnswers, answerText, solution, feedback);
  const [analysis, setAnalysis] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (loading) return;

    setLoading(true);
    setVisible(true);
    try {
      setAnalysis(await requestAiFeedback(question.id, prompt));
    } catch (error) {
      setAnalysis(error instanceof Error ? error.message : 'Unable to request AI feedback. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => void analyze()}
        className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--sp-primary-200)] bg-[var(--sp-primary-50)] py-2.5 text-sm font-medium text-[var(--sp-primary-800)] transition-colors hover:bg-[var(--sp-primary-100)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
      >
        AI Analysis
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--sp-primary-200)] bg-[var(--sp-primary-50)] p-4" aria-live="polite">
      <p className="mb-1.5 text-xs font-semibold text-[var(--sp-primary-800)]">AI analysis</p>
      {loading
        ? <p className="animate-pulse text-xs text-[var(--sp-primary-500)]">Analyzing...</p>
        : <AnalysisText text={analysis} />}
      {!loading && <button type="button" onClick={() => void analyze()} className="mt-3 text-xs font-semibold underline">Try again</button>}
    </div>
  );
}
