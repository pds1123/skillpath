import { useState } from 'react';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => onNavigate('home')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Home
          </button>
          <span className="font-semibold text-gray-900">Settings</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Claude API Key</h2>
          <p className="text-xs text-gray-500 mb-4">
            Required for AI Analysis on questions. Your key is stored only in your browser's localStorage and never sent anywhere except Anthropic's API.
          </p>
          <input
            type="password"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 mb-3 font-mono"
          />
          <button
            onClick={save}
            className="w-full py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors"
          >
            {saved ? '✓ Saved!' : 'Save API Key'}
          </button>
          {draft && (
            <button onClick={() => { setDraft(''); onSave(''); }} className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors">
              Clear API key
            </button>
          )}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <p className="font-medium mb-1">How to get a key:</p>
            <p>Visit console.anthropic.com → API Keys → Create Key</p>
            <p className="mt-1">The AI Analysis uses claude-haiku-4-5 (fast & cheap, ~$0.001/question).</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
          <h2 className="font-semibold text-gray-900 mb-1">Progress Data</h2>
          <p className="text-xs text-gray-500 mb-4">Clear all quiz results, exam history, and answer records stored in this browser.</p>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2.5 rounded-lg border-2 border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Clear All Progress
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-medium text-center">This cannot be undone. Are you sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >Cancel</button>
                <button
                  onClick={() => { onReset(); setConfirmReset(false); }}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >Yes, Clear Everything</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
