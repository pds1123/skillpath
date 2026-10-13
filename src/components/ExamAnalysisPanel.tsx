import { useEffect, useId, useState } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../auth/useAuth';
import { generateExamSummary, getExamAnalysis, type ExamAnalysisData } from '../services/api';

export function ExamAnalysisPanel({ attemptId }: { attemptId: string | null }) {
  const { user } = useAuth();
  return <ExamAnalysisContent key={`${user?.id}:${attemptId}`} userId={user?.id} attemptId={attemptId} />;
}

function ExamAnalysisContent({ attemptId, userId }: { attemptId: string | null; userId: string | undefined }) {
  const contentId = useId();
  const [data, setData] = useState<ExamAnalysisData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [summary, setSummary] = useState<{ text: string; generatedAt: string } | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId || !attemptId) return;
    getExamAnalysis(attemptId).then(result => { if (active) { setData(result); setError(''); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load exam analysis.'); });
    return () => { active = false; };
  }, [userId, attemptId, retry]);

  async function generate() {
    if (!attemptId || generating) return;
    if (summary) { setExpanded(true); return; }
    setGenerating(true); setSummaryError('');
    try { setSummary(await generateExamSummary(attemptId)); setExpanded(true); }
    catch (cause) { setSummaryError(cause instanceof Error ? cause.message : 'Unable to generate summary.'); }
    finally { setGenerating(false); }
  }

  if (!userId || !attemptId) return <p className="mt-4 text-xs text-[var(--sp-muted)]">Sign in before taking a mock exam to save its module analysis and AI Summary.</p>;

  return (
    <section aria-label="Mock exam analysis" className="my-5 rounded-2xl bg-[var(--sp-primary-900)] p-5 text-left text-[var(--sp-on-primary)] sm:p-6">
      {error ? <div role="alert"><p className="text-sm">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-xs underline">Try again</button></div>
        : !data ? <p role="status" className="text-xs">Loading exam analysis…</p>
        : <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Accuracy by module</h2>
            <p className="text-xs text-[var(--sp-on-primary-muted)]">This mock exam only</p>
          </div>
          <div className="mt-3 flex justify-between pl-[42%] pr-12 text-[10px] text-[var(--sp-on-primary-muted)]" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
          {data.modules.map(module => <div key={module.id} className="flex items-center gap-3 py-2"
            title={`${module.name} · ${module.correct}/${module.total}${module.smallSample ? ' · Small sample' : ''}`}
            aria-label={`${module.name}: ${module.total ? `${module.accuracy}% correct, ${module.correct} of ${module.total} questions${module.smallSample ? ', small sample' : ''}` : 'not included in this exam'}`}>
            <span className="w-[42%] shrink-0 truncate text-xs">{module.name}</span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-[var(--sp-primary-200)]" style={{ width: `${module.accuracy ?? 0}%` }} /></span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums">{module.accuracy === null ? '—' : `${module.accuracy}%`}</span>
          </div>)}
          <p className="mt-2 text-[10px] text-[var(--sp-on-primary-muted)]">— Not included in this exam · Fewer than 5 questions: small sample</p>
          <div className="mt-4 border-t border-white/15 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">AI Summary</h2>
              <div className="flex items-center gap-3">
                {summary && <button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)} className="text-xs">{expanded ? 'Hide' : 'Show'}</button>}
                {!summary && <button type="button" disabled={generating} onClick={() => void generate()} className="rounded-md border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50">{generating ? 'Generating…' : 'Generate summary'}</button>}
              </div>
            </div>
            {summaryError && <p role="alert" className="mt-3 text-xs">{summaryError}</p>}
            {summary && <div id={contentId} hidden={!expanded} aria-live="polite" className="mt-3 space-y-2 text-xs leading-5 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
              <Markdown skipHtml disallowedElements={['img']}>{summary.text}</Markdown>
              <p className="pt-2 text-[10px] text-[var(--sp-on-primary-muted)]">Generated {new Date(summary.generatedAt).toLocaleString()}</p>
            </div>}
          </div>
        </>}
    </section>
  );
}
