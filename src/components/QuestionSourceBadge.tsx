import { useAuth } from '../auth/useAuth';

interface Props {
  references?: string[];
  className?: string;
}

export function QuestionSourceBadge({ references, className = '' }: Props) {
  const { user } = useAuth();
  if (user?.role !== 'admin' || !references?.length) return null;

  const value = references.join(' · ');

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[var(--sp-muted)] ring-1 ring-inset ring-[var(--sp-border)] ${className}`}
      aria-label={`Question source ${references.join(', ')}`}
    >
      <span>Source</span>
      <span className="font-mono font-semibold tabular-nums text-[var(--sp-primary-800)]">{value}</span>
    </span>
  );
}
