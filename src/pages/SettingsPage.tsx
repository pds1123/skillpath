import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';

interface Props {
  apiKey: string;
  onSave: (key: string) => void;
  onNavigate: (page: string) => void;
  onReset: () => void;
}

export function SettingsPage({ apiKey, onSave, onNavigate, onReset }: Props) {
  const [draft, setDraft] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function save() {
    onSave(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
              <h2 id="ai-settings-title" className="text-lg font-semibold tracking-[-0.02em] text-[var(--sp-ink-strong)]">AI explanations</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sp-muted)]">
                Add a Claude API key to generate extra explanations in the question library. The key is stored in this browser and sent only to Anthropic when you request an explanation.
              </p>
              <label htmlFor="claude-api-key" className="mt-6 block text-sm font-medium text-[var(--sp-ink)]">Claude API key</label>
              <input
                id="claude-api-key"
                type="password"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="sk-ant-..."
                className="mt-2 w-full rounded-xl bg-[var(--sp-canvas)] px-4 py-3 font-mono text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border-strong)] placeholder:text-[var(--sp-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  className="rounded-xl bg-[var(--sp-primary-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
                >
                  {saved ? 'Saved' : 'Save API key'}
                </button>
                {draft && (
                  <button type="button" onClick={() => { setDraft(''); onSave(''); }} className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--sp-muted)] transition hover:bg-[var(--sp-primary-50)] hover:text-[var(--sp-ink)]">
                    Remove key
                  </button>
                )}
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--sp-muted)]">Create a key at console.anthropic.com under API Keys. AI explanations use Claude Haiku.</p>
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
