import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader';

import { getAiStatus, ApiError } from '../services/api';

interface Props {
  onNavigate: (page: string) => void;
  onReset: () => void;
}

export function SettingsPage({ onNavigate, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [aiStatus, setAiStatus] = useState('Checking availability…');
  useEffect(() => {
    let active = true;
    getAiStatus().then(status => {
      if (active) setAiStatus(status.configured ? 'AI feedback is available.' : 'AI feedback is not configured. Contact the administrator.');
    }).catch(error => {
      if (active) setAiStatus(error instanceof ApiError && error.status === 401 ? 'Sign in to use AI feedback.' : 'Unable to check AI availability. Try again later.');
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader onNavigate={onNavigate} />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sp-primary-700)]">Account</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)] sm:text-4xl">Settings</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">Manage optional learning tools and the progress saved for this browser.</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[var(--sp-surface)] ring-1 ring-[var(--sp-border)]">
          <section className="p-6 sm:p-8" aria-labelledby="ai-settings-title">
            <div className="max-w-xl">
              <h2 id="ai-settings-title" className="text-lg font-semibold tracking-[-0.02em] text-[var(--sp-ink-strong)]">AI analysis</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sp-muted)]">{aiStatus}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">When you request AI analysis, your question, current answer and grading result are sent to Anthropic through SkillPath. Sign-in is required. AI analysis is optional.</p>

            </div>
          </section>

          <section className="border-t border-[var(--sp-border)] p-6 sm:p-8" aria-labelledby="progress-settings-title">
            <div className="max-w-xl">
              <h2 id="progress-settings-title" className="text-lg font-semibold tracking-[-0.02em] text-[var(--sp-ink-strong)]">Progress data</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sp-muted)]">Clear quiz results, assessment history and answer records stored for this account.</p>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="mt-5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Clear progress
            </button>
          ) : (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm font-semibold text-red-800">Clear all progress?</p>
              <p className="mt-1 text-sm text-red-700">This removes your results and assessment history and cannot be undone.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-[var(--sp-ink)] hover:bg-red-50"
                >Cancel</button>
                <button
                  type="button"
                  onClick={() => { onReset(); setConfirmReset(false); }}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >Clear progress</button>
              </div>
            </div>
          )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
