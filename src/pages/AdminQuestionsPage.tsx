import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { AdminSectionNav } from '../components/AdminSectionNav';
import { ApiError, getAdminQuestions, type AdminQuestionPage } from '../services/api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const PAGE_SIZE = 25;

function statusClass(status: string) {
  if (status === 'published') return 'bg-green-100 text-green-800';
  if (status === 'draft') return 'bg-[var(--sp-primary-100)] text-[var(--sp-primary-800)]';
  return 'bg-[var(--sp-canvas)] text-[var(--sp-muted)]';
}

export function AdminQuestionsPage({ onNavigate }: Props) {
  const [data, setData] = useState<AdminQuestionPage | null>(null);
  const [certification, setCertification] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminQuestions({ certification, domain, status, search, offset, limit: PAGE_SIZE })
      .then(result => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch(reason => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Unable to load the question bank.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [certification, domain, status, search, offset]);

  function changeFilter(setter: (value: string) => void, value: string) {
    setLoading(true);
    setOffset(0);
    setter(value);
  }

  const first = data && data.total > 0 ? data.offset + 1 : 0;
  const last = data ? Math.min(data.offset + data.limit, data.total) : 0;

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="admin" onNavigate={onNavigate} />
      <AdminSectionNav active="questions" onNavigate={onNavigate} />
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)]">Question bank</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">Review, publish and maintain questions used across practice and assessments.</p>
          </div>
          <button type="button" onClick={() => onNavigate('adminQuestion')} className="self-start rounded-xl bg-[var(--sp-primary-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]">
            Create question
          </button>
        </div>

        {data && (
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--sp-border)] py-4 text-sm">
            {[
              ['All questions', data.stats.total],
              ['Published', data.stats.published],
              ['Draft', data.stats.draft],
              ['Archived', data.stats.archived],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <dt className="text-[var(--sp-muted)]">{label}</dt>
                <dd className="font-semibold tabular-nums text-[var(--sp-ink-strong)]">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <section className="mt-6 rounded-xl bg-white p-4 ring-1 ring-[var(--sp-border)]" aria-label="Question filters">
          <form className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_11rem_13rem_9rem_auto]" onSubmit={event => { event.preventDefault(); changeFilter(setSearch, searchDraft.trim()); }}>
            <label className="sr-only" htmlFor="admin-question-search">Search questions</label>
            <input id="admin-question-search" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search question text or ID" className="rounded-lg bg-[var(--sp-canvas)] px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] placeholder:text-[var(--sp-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]" />
            <select aria-label="Certification" value={certification} onChange={event => changeFilter(setCertification, event.target.value)} className="rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]">
              <option value="">All platforms</option>
              {data?.certifications.map(item => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Domain" value={domain} onChange={event => changeFilter(setDomain, event.target.value)} className="rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]">
              <option value="">All domains</option>
              {data?.domains.map(item => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Status" value={status} onChange={event => changeFilter(setStatus, event.target.value)} className="rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]">
              <option value="">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <button type="submit" className="rounded-lg bg-[var(--sp-primary-100)] px-4 py-2.5 text-sm font-semibold text-[var(--sp-primary-800)] hover:bg-[var(--sp-primary-200)]">Search</button>
          </form>
        </section>

        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <section className="mt-5 overflow-hidden rounded-xl bg-white ring-1 ring-[var(--sp-border)]" aria-label="Questions">
          <div className="hidden grid-cols-[6rem_minmax(18rem,1fr)_12rem_9rem_7rem] gap-4 border-b border-[var(--sp-border)] bg-[var(--sp-primary-50)] px-5 py-3 text-xs font-semibold text-[var(--sp-muted)] md:grid">
            <span>ID</span><span>Question</span><span>Platform and domain</span><span>Type</span><span>Status</span>
          </div>
          {loading && !data ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading questions">
              {[1, 2, 3, 4, 5].map(item => <div key={item} className="h-14 animate-pulse rounded-lg bg-[var(--sp-primary-50)]" />)}
            </div>
          ) : data?.items.length ? data.items.map(item => (
            <button type="button" key={item.id} onClick={() => onNavigate('adminQuestion', { questionId: String(item.id) })} className="grid w-full gap-2 border-b border-[var(--sp-border)] px-5 py-4 text-left transition last:border-0 hover:bg-[var(--sp-primary-50)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--sp-primary-600)] md:grid-cols-[6rem_minmax(18rem,1fr)_12rem_9rem_7rem] md:items-center md:gap-4">
              <span className="font-mono text-xs text-[var(--sp-muted)]">#{item.id}</span>
              <span className="line-clamp-2 text-sm font-medium leading-5 text-[var(--sp-ink-strong)]">{item.prompt}</span>
              <span className="text-xs text-[var(--sp-muted)]"><span className="block font-semibold text-[var(--sp-ink-soft)]">{item.certification}</span><span className="mt-0.5 block truncate">{item.domain}</span></span>
              <span className="text-xs capitalize text-[var(--sp-muted)]">{item.type.replaceAll('_', ' ')}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>{item.status}</span>
            </button>
          )) : (
            <div className="px-6 py-14 text-center">
              <p className="font-medium text-[var(--sp-ink-strong)]">No matching questions</p>
              <p className="mt-1 text-sm text-[var(--sp-muted)]">Change the filters or create a new question.</p>
            </div>
          )}
        </section>

        {data && data.total > 0 && (
          <div className="mt-5 flex items-center justify-between gap-4 text-sm">
            <p className="text-[var(--sp-muted)]">Showing {first} to {last} of {data.total}</p>
            <div className="flex gap-2">
              <button type="button" disabled={offset === 0} onClick={() => { setLoading(true); setOffset(value => Math.max(0, value - PAGE_SIZE)); }} className="rounded-lg bg-white px-4 py-2 font-medium ring-1 ring-[var(--sp-border)] hover:bg-[var(--sp-primary-50)] disabled:opacity-40">Previous</button>
              <button type="button" disabled={offset + PAGE_SIZE >= data.total} onClick={() => { setLoading(true); setOffset(value => value + PAGE_SIZE); }} className="rounded-lg bg-white px-4 py-2 font-medium ring-1 ring-[var(--sp-border)] hover:bg-[var(--sp-primary-50)] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
