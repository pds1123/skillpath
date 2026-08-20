import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../services/api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="skillpath-login-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#skillpath-login-gradient)" />
      <path d="M10 29c4-7 7-8 11-8 4 0 5-4 9-10" stroke="rgba(255,255,255,0.62)" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="2 2.5" fill="none" />
      <circle cx="10" cy="29" r="2.5" fill="#fff" />
      <circle cx="21" cy="21" r="3" fill="#fff" />
      <circle cx="30" cy="11" r="4.2" fill="#fff" />
    </svg>
  );
}

export function LoginPage({ onNavigate }: Props) {
  const { user, login, register, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password || (mode === 'register' && !displayName.trim())) {
      setError(mode === 'register' ? 'Complete all fields to create your account.' : 'Enter an email and password to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      if (mode === 'register') await register(email.trim(), password, displayName.trim());
      else await login(email.trim(), password);
      onNavigate('home');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Cannot reach the server. Start the SkillPath API and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    setIsSubmitting(true);
    try {
      await logout();
      onNavigate('home');
    } catch {
      setError('Could not sign out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <header className="border-b border-[var(--sp-border)] bg-[var(--sp-header)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)]"
            aria-label="Return to SkillPath home"
          >
            <Logo />
            <span className="text-base font-semibold tracking-[-0.02em] text-[var(--sp-ink-strong)]">SkillPath</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--sp-muted)] transition hover:bg-[var(--sp-primary-50)] hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
          >
            Back to learning
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_26rem] lg:py-16">
        <section className="max-w-xl">
          <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Your learning, saved in one place</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--sp-ink-strong)] sm:text-5xl">
            Continue your SkillPath
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--sp-muted)]">
            Sign in to return to your lessons, practice history, and module progress.
          </p>
          <div className="mt-9 grid gap-3 text-sm text-[var(--sp-ink-soft)] sm:grid-cols-3 lg:max-w-lg">
            <p className="border-t border-[var(--sp-border-strong)] pt-3">Resume lessons</p>
            <p className="border-t border-[var(--sp-border-strong)] pt-3">Track progress</p>
            <p className="border-t border-[var(--sp-border-strong)] pt-3">Review practice</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-[var(--sp-border)] sm:p-8" aria-labelledby="sign-in-title">
          {user ? (
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sp-primary-100)] text-base font-semibold text-[var(--sp-primary-800)]">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
              <h2 id="sign-in-title" className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--sp-ink-strong)]">
                Signed in as {user.displayName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sp-muted)]">Your account and learning progress are saved by the SkillPath API.</p>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="mt-7 w-full rounded-lg bg-[var(--sp-primary-800)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
              >
                Continue learning
              </button>
              <button
                type="button"
                onClick={signOut}
                disabled={isSubmitting}
                className="mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold text-[var(--sp-muted)] transition hover:bg-[var(--sp-primary-50)] hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
              >
                {isSubmitting ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 id="sign-in-title" className="text-2xl font-semibold tracking-[-0.03em] text-[var(--sp-ink-strong)]">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sp-muted)]">
                {mode === 'login' ? 'Continue from where you left off.' : 'Create an account to sync your learning progress.'}
              </p>

              {mode === 'register' && (
                <>
                  <label className="mt-7 block text-sm font-semibold text-[var(--sp-ink-soft)]" htmlFor="display-name">Display name</label>
                  <input
                    id="display-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={event => {
                      setDisplayName(event.target.value);
                      setError('');
                    }}
                    placeholder="Alex Learner"
                    className="mt-2 w-full rounded-lg bg-white px-3.5 py-3 text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border-strong)] placeholder:text-[var(--sp-muted)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--sp-primary-600)]"
                  />
                </>
              )}

              <label className={`${mode === 'register' ? 'mt-5' : 'mt-7'} block text-sm font-semibold text-[var(--sp-ink-soft)]`} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => {
                  setEmail(event.target.value);
                  setError('');
                }}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-lg bg-white px-3.5 py-3 text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border-strong)] placeholder:text-[var(--sp-muted)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--sp-primary-600)]"
              />

              <label className="mt-5 block text-sm font-semibold text-[var(--sp-ink-soft)]" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
                className="mt-2 w-full rounded-lg bg-white px-3.5 py-3 text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border-strong)] placeholder:text-[var(--sp-muted)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--sp-primary-600)]"
              />

              {error && <p className="mt-4 text-sm font-medium text-red-700" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 w-full rounded-lg bg-[var(--sp-primary-800)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in to SkillPath' : 'Create SkillPath account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(current => current === 'login' ? 'register' : 'login');
                  setError('');
                }}
                className="mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold text-[var(--sp-primary-700)] transition hover:bg-[var(--sp-primary-50)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
              >
                {mode === 'login' ? 'Create a new account' : 'Sign in with an existing account'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
