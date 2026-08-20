import { useAuth } from '../auth/useAuth';

interface Props {
  active?: 'home' | 'learning' | 'admin';
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const PRIMARY_NAV_ITEMS = [
  { key: 'home', label: 'Home', page: 'home' },
  { key: 'learning', label: 'My Learning', page: 'tutorial' },
] as const;

export function AppHeader({ active, onNavigate }: Props) {
  const { user, isLoading } = useAuth();
  const navItems = user?.role === 'admin'
    ? [...PRIMARY_NAV_ITEMS, { key: 'admin' as const, label: 'Admin', page: 'admin' }]
    : PRIMARY_NAV_ITEMS;

  return (
    <header className="border-b border-[var(--sp-border)] bg-[var(--sp-header)]/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex h-16 items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)]"
            aria-label="SkillPath home"
          >
            <svg viewBox="0 0 40 40" className="h-9 w-9" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="skillpath-header-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="10" fill="url(#skillpath-header-gradient)" />
              <path d="M10 29c4-7 7-8 11-8 4 0 5-4 9-10" stroke="rgba(255,255,255,0.62)" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="2 2.5" fill="none" />
              <circle cx="10" cy="29" r="2.5" fill="#fff" />
              <circle cx="21" cy="21" r="3" fill="#fff" />
              <circle cx="30" cy="11" r="4.2" fill="#fff" />
            </svg>
            <span className="text-base font-semibold tracking-[-0.02em] text-[var(--sp-ink-strong)]">SkillPath</span>
          </button>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map(item => (
              <button
                type="button"
                key={item.key}
                onClick={() => onNavigate(item.page)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)] ${
                  active === item.key
                    ? 'bg-[var(--sp-primary-100)] text-[var(--sp-primary-800)]'
                    : 'text-[var(--sp-muted)] hover:bg-[var(--sp-primary-50)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-[var(--sp-ink-soft)] transition hover:bg-[var(--sp-primary-50)] hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)] md:ml-2"
            aria-label={user ? `Account: ${user.displayName}` : 'Sign in'}
          >
            {user ? (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sp-primary-100)] text-xs font-semibold text-[var(--sp-primary-800)]">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate lg:inline">{user.displayName}</span>
              </>
            ) : (
              <span>{isLoading ? 'Loading' : 'Sign in'}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="rounded-lg p-2 text-[var(--sp-muted)] transition hover:bg-[var(--sp-primary-100)] hover:text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
            aria-label="Settings"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.3 4.3c.4-1.7 2.9-1.7 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.3 2.4a1.7 1.7 0 0 0 1.1 2.5c1.7.5 1.7 3 0 3.4a1.7 1.7 0 0 0-1.1 2.6c1 1.5-.8 3.3-2.3 2.3a1.7 1.7 0 0 0-2.6 1.1c-.5 1.7-3 1.7-3.4 0a1.7 1.7 0 0 0-2.6-1.1c-1.5 1-3.3-.8-2.3-2.3a1.7 1.7 0 0 0-1.1-2.6c-1.7-.4-1.7-2.9 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-1-1.6.8-3.3 2.3-2.4a1.7 1.7 0 0 0 2.6-1.1Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>

        <nav className={`grid border-t border-[var(--sp-border)] md:hidden ${navItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} aria-label="Main navigation">
          {navItems.map(item => (
            <button
              type="button"
              key={item.key}
              onClick={() => onNavigate(item.page)}
              className={`border-b-2 px-1 py-2.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-[var(--sp-primary-600)] ${
                active === item.key
                  ? 'border-[var(--sp-primary-600)] text-[var(--sp-primary-800)]'
                  : 'border-transparent text-[var(--sp-muted)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
