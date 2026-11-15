import { useAuth } from '../auth/useAuth';
import { questionsForCert } from '../data/questionCatalog';
import type { Question } from '../types/questions';

interface Props {
  question: Question;
  className?: string;
}

export function QuestionSourceBadge({ question, className = '' }: Props) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;
  const value = questionsForCert(question.certification).findIndex(item => item.id === question.id) + 1;
  if (!value) return null;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[var(--sp-muted)] ring-1 ring-inset ring-[var(--sp-border)] ${className}`}
      aria-label={`Question source ${value}`}
    >
      <span>Source</span>
      <span className="font-mono font-semibold tabular-nums text-[var(--sp-primary-800)]">{value}</span>
    </span>
  );
}
