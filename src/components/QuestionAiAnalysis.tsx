import { useState } from 'react';
import type React from 'react';
import type { Question } from '../types/questions';

interface Props {
  apiKey: string;
  question: Question;
  correctAnswers: string[];
  answerText?: string | null;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<strong key={key++} className="font-semibold text-[var(--sp-ink)]">{match[1]}</strong>);
    if (match[2]) parts.push(<code key={key++} className="rounded bg-white/70 px-1 py-0.5 font-mono text-[11px] text-[var(--sp-primary-800)]">{match[2]}</code>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function AnalysisText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-xs leading-5 text-[var(--sp-ink-soft)]">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return null;
        const listItem = line.match(/^[-*]\s+(.+)$/);
        return listItem
          ? <p key={index} className="pl-3 before:mr-2 before:content-['•']">{renderInline(listItem[1])}</p>
          : <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function tutorFor(question: Question) {
  if (question.certification === 'CTFL') return 'software testing tutor';
  if (question.certification === 'CLF-C02') return 'AWS cloud fundamentals tutor';
  return 'Microsoft Azure fundamentals tutor';
}

function errorMessage(data: { error?: { message?: string; type?: string } }) {
  const message = data.error?.message ?? 'Unknown error';
  const type = data.error?.type ?? '';
  if (type === 'overloaded_error' || /overloaded/i.test(message)) return 'Claude API is currently overloaded. Please wait a moment and try again.';
  if (type === 'rate_limit_error' || /rate.?limit/i.test(message)) return 'Rate limit reached. Please wait a minute and retry.';
  if (type === 'authentication_error' || /api.?key/i.test(message)) return `API key issue: ${message}\n\nCheck your API key in Settings.`;
  return `Error: ${message}`;
}

export function QuestionAiAnalysis({ apiKey, question, correctAnswers, answerText }: Props) {
  const cacheKey = `ai_cache_${question.id}`;
  const [analysis, setAnalysis] = useState(() => localStorage.getItem(cacheKey) ?? '');
  const [visible, setVisible] = useState(() => Boolean(localStorage.getItem(cacheKey)));
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!apiKey) {
      setAnalysis('Add your Claude API key in Settings.');
      setVisible(true);
      return;
    }

    setLoading(true);
    setVisible(true);
    try {
      const options = Object.entries(question.options).map(([letter, text]) => `${letter}. ${text}`).join('\n');
      const correctAnswer = correctAnswers.length > 0
        ? correctAnswers.map(letter => `${letter}. ${question.options[letter] ?? ''}`).join('; ')
        : 'Answer not available';
      const prompt = `You are a ${tutorFor(question)}. Explain this question concisely in under 150 words.

Question: ${question.question}
${options ? `\nOptions:\n${options}` : ''}
Correct answer: ${correctAnswer}
${answerText ? `Answer-key explanation: ${answerText}` : ''}

The correct answer above is authoritative. Explain why it is correct, why the other options are wrong, and give brief practical context. Do not contradict the answer key.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 350,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message?: string; type?: string } };
      const generated = data.content?.[0]?.text ?? errorMessage(data);
      if (data.content?.[0]?.text) localStorage.setItem(cacheKey, generated);
      setAnalysis(generated);
    } catch {
      setAnalysis('Network error. Check your internet connection and API key.');
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
    </div>
  );
}
