interface Props {
  number: string;
  level: string;
  title: string;
  description: string;
  note: string;
  action: string;
  onClick: () => void;
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

export function LearningEntryCard({ number, level, title, description, note, action, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-64 w-full flex-col rounded-2xl bg-white p-6 text-left ring-1 ring-[var(--sp-border)] transition duration-200 hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold tabular-nums text-[var(--sp-primary-700)]">{number}</span>
        <span className="rounded-md bg-[var(--sp-primary-50)] px-2 py-1 text-[11px] font-semibold text-[var(--sp-primary-700)]">{level}</span>
      </div>

      <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-[var(--sp-ink-strong)]">{title}</h2>
      <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[var(--sp-muted)]">{description}</p>

      <div className="mt-auto flex items-end justify-between gap-4 pt-7">
        <span className="text-[11px] text-[var(--sp-muted-light)]">{note}</span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sp-primary-700)] transition-[gap] duration-200 group-hover:gap-3">
          {action}
          <ArrowIcon />
        </span>
      </div>
    </button>
  );
}
