import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../auth/useAuth';
import type { ProgressState } from '../hooks/useProgress';
import type { CertificationKey } from '../types/questions';
import { generatePracticeSummary, getPracticeDashboard, type PracticeDashboardData } from '../services/api';

interface Props {
  activeCert: CertificationKey;
  progress: ProgressState;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function PracticeDashboard({ activeCert, progress, onNavigate }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<PracticeDashboardData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summary, setSummary] = useState<{ text: string; generatedAt: string; snapshot: string } | null>(null);
  const signature = data ? JSON.stringify(data) : '';
  const stale = Boolean(summary && summary.snapshot !== signature);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    getPracticeDashboard(activeCert).then(result => {
      if (active) { setData(result); setError(''); }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load practice statistics.');
    });
    return () => { active = false; };
  }, [activeCert, userId, progress.results, retry]);

  async function generate() {
    if (generating || !data?.practiced) return;
    setGenerating(true);
    setSummaryError('');
    try {
      const result = await generatePracticeSummary(activeCert);
      setSummary({ ...result, snapshot: signature });
      setExpanded(true);
    } catch (cause) {
      setSummaryError(cause instanceof Error ? cause.message : 'Unable to generate a summary. Please retry.');
    } finally { setGenerating(false); }
  }

  if (!user) return (
    <section className="flex flex-wrap items-center justify-between gap-3 text-[var(--sp-on-primary)]">
      <p className="text-xs">Sign in to see your practice statistics.</p>
      <button type="button" onClick={() => onNavigate('login')} className="text-xs font-semibold underline">Sign in</button>
    </section>
  );
  if (error) return (
    <section className="text-[var(--sp-on-primary)]" role="alert">
      <p className="text-xs">{error}</p>
      <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-xs font-semibold underline">Try again</button>
    </section>
  );
  if (!data) return <p className="text-xs text-[var(--sp-on-primary-muted)]" role="status">Loading practice statistics…</p>;

  const metrics = [
    { label: 'Practiced', value: String(data.practiced), detail: 'Unique questions' },
    { label: 'First try', value: data.firstAccuracy === null ? '—' : `${data.firstAccuracy}%`, detail: `${data.firstCorrect} correct on first try` },
    { label: 'Latest answer', value: data.latestAccuracy === null ? '—' : `${data.latestAccuracy}%`, detail: `${data.latestCorrect} correct out of ${data.practiced}` },
    { label: 'To review', value: String(data.toReview), detail: 'Latest answer incorrect' },
  ];
  return (
    <section className="space-y-4 text-[var(--sp-on-primary)]" aria-label="Practice dashboard">
      <div className="grid grid-cols-4 gap-3">
        {metrics.map(metric => <div key={metric.label}>
          <p className="text-[11px] text-[var(--sp-on-primary-muted)]">{metric.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.025em] tabular-nums">{metric.value}</p>
          <span className="sr-only">{metric.detail}</span>
        </div>)}
      </div>
      <section className="border-t border-white/15 pt-3" aria-labelledby="module-accuracy-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="module-accuracy-title" className="text-xs font-semibold">Accuracy by module</h2>
          <p className="text-[11px] text-[var(--sp-on-primary-muted)]">Latest answer · Per question</p>
        </div>
        {!data.practiced && <p className="mt-2 text-xs text-[var(--sp-on-primary-muted)]">Practice to see your results.</p>}
        <div className="mt-2 flex justify-between pl-[42%] pr-9 text-[10px] tabular-nums text-[var(--sp-on-primary-muted)]" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
        <div className="mt-1">
          {data.modules.map(module => <button type="button" key={module.id} onClick={() => onNavigate('modules', { module: module.slug, tab: 'practice' })}
            aria-label={`${module.name}: ${module.accuracy === null ? 'not practiced' : `${module.accuracy}% correct across ${module.practiced} practiced questions`}.${module.smallSample ? ' Small sample.' : ''} Open practice.`}
            title={`${module.name} · ${module.practiced ? `${module.practiced} questions${module.smallSample ? ' · Small sample' : ''}` : 'Not practiced'}`}
            className="group flex w-full items-center gap-3 rounded py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <span className="w-[42%] shrink-0 truncate text-[11px] text-[var(--sp-on-primary)] group-hover:underline">{module.name}</span>
            <span className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-[var(--sp-primary-200)]" style={{ width: `${module.accuracy ?? 0}%` }} /></span>
            <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-[var(--sp-on-primary)]">{module.accuracy === null ? '—' : `${module.accuracy}%`}</span>
          </button>)}
        </div>
        <p className="mt-1 text-[10px] text-[var(--sp-on-primary-muted)]">— Not practiced · Fewer than 5 questions: small sample</p>
      </section>
      <section className="border-t border-white/15 pt-3" aria-labelledby="summary-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="summary-title" className="text-xs font-semibold">AI Summary</h2>{summary && <p className="mt-1 text-[10px] text-[var(--sp-on-primary-muted)]">{stale ? 'New results · Update summary' : `Generated ${new Date(summary.generatedAt).toLocaleString()}`}</p>}</div>
          <div className="flex items-center gap-3">
            {summary && <button type="button" aria-expanded={expanded} aria-controls="practice-summary-content" onClick={() => setExpanded(value => !value)} className="text-[11px] text-[var(--sp-on-primary-muted)]">{expanded ? 'Hide' : 'Show'}</button>}
            <button type="button" disabled={generating || !data.practiced} onClick={() => void generate()} className="rounded-md border border-white/25 px-2.5 py-1.5 text-[11px] font-medium text-[var(--sp-on-primary)] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">{generating ? 'Generating…' : summary ? 'Update summary' : 'Generate summary'}</button>
          </div>
        </div>
        {summaryError && <p role="alert" className="mt-2 text-xs text-[var(--sp-on-primary)]">{summaryError}</p>}
        {summary && <div id="practice-summary-content" hidden={!expanded} aria-live="polite" className="mt-3 space-y-2 border-t border-white/15 pt-3 text-xs leading-5 text-[var(--sp-on-primary)] [&_h1]:text-xs [&_h1]:font-semibold [&_h2]:text-xs [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_em]:italic [&_strong]:font-semibold">
          <Markdown skipHtml disallowedElements={['img']}>{summary.text}</Markdown>
        </div>}
      </section>
    </section>
  );
}
