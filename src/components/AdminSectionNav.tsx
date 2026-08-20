interface Props {
  active: 'questions' | 'modules';
  onNavigate: (page: string) => void;
}

const ITEMS = [
  { key: 'questions', label: 'Questions', page: 'admin' },
  { key: 'modules', label: 'Modules', page: 'adminModules' },
] as const;

export function AdminSectionNav({ active, onNavigate }: Props) {
  return (
    <nav className="border-b border-[var(--sp-border)] bg-white" aria-label="Admin sections">
      <div className="mx-auto flex max-w-6xl gap-1 px-5 sm:px-8">
        {ITEMS.map(item => (
          <button
            type="button"
            key={item.key}
            onClick={() => onNavigate(item.page)}
            aria-current={active === item.key ? 'page' : undefined}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sp-primary-600)] ${
              active === item.key
                ? 'border-[var(--sp-primary-600)] text-[var(--sp-primary-800)]'
                : 'border-transparent text-[var(--sp-muted)] hover:text-[var(--sp-ink)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
