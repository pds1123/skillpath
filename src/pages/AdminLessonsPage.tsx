import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminSectionNav } from '../components/AdminSectionNav';
import { AppHeader } from '../components/AppHeader';
import { ApiError, getAdminLessons, type AdminLessonPage } from '../services/api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function statusClass(status: string) {
  if (status === 'published') return 'bg-green-100 text-green-800';
  if (status === 'draft') return 'bg-[var(--sp-primary-100)] text-[var(--sp-primary-800)]';
  return 'bg-[var(--sp-canvas)] text-[var(--sp-muted)]';
}

export function AdminLessonsPage({ onNavigate }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AdminLessonPage | null>(null);
  const [module, setModule] = useState(() => searchParams.get('module') ?? '');
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminLessons({ module, status, search })
      .then(result => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch(reason => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Unable to load lessons.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [module, search, status]);

  function changeModule(value: string) {
    setLoading(true);
    setModule(value);
    setSearchParams(value ? { module: value } : {}, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="admin" onNavigate={onNavigate} />
      <AdminSectionNav active="lessons" onNavigate={onNavigate} />

      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)]">Lessons</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-muted)]">Write lesson content, control its position within a module, and publish it when it is ready for learners.</p>
          </div>
          <button type="button" onClick={() => onNavigate('adminLesson')} className="self-start rounded-xl bg-[var(--sp-primary-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]">
            Create lesson
          </button>
        </div>

        {data && (
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--sp-border)] py-4 text-sm">
            {[
              ['All lessons', data.stats.total],
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

        <section className="mt-6 rounded-xl bg-white p-4 ring-1 ring-[var(--sp-border)]" aria-label="Lesson filters">
          <form className="grid gap-3 md:grid-cols-[minmax(15rem,1fr)_16rem_10rem_auto]" onSubmit={event => { event.preventDefault(); setLoading(true); setSearch(searchDraft.trim()); }}>
            <label className="sr-only" htmlFor="admin-lesson-search">Search lessons</label>
            <input id="admin-lesson-search" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search lesson title or slug" className="rounded-lg bg-[var(--sp-canvas)] px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] placeholder:text-[var(--sp-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]" />
            <select aria-label="Module" value={module} onChange={event => changeModule(event.target.value)} className="rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]">
              <option value="">All modules</option>
              {data?.modules.map(item => <option key={item.id} value={item.id}>{item.certification} · {item.name}</option>)}
            </select>
            <select aria-label="Status" value={status} onChange={event => { setLoading(true); setStatus(event.target.value); }} className="rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-[var(--sp-border)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]">
              <option value="">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <button type="submit" className="rounded-lg bg-[var(--sp-primary-100)] px-4 py-2.5 text-sm font-semibold text-[var(--sp-primary-800)] transition hover:bg-[var(--sp-primary-200)]">Search</button>
          </form>
        </section>

        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <section className="mt-5 overflow-hidden rounded-xl bg-white ring-1 ring-[var(--sp-border)]" aria-label="Lessons">
          <div className="hidden grid-cols-[5rem_minmax(16rem,1fr)_14rem_7rem_7rem] gap-4 border-b border-[var(--sp-border)] bg-[var(--sp-primary-50)] px-5 py-3 text-xs font-semibold text-[var(--sp-muted)] md:grid">
            <span>Order</span><span>Lesson</span><span>Module</span><span>Duration</span><span>Status</span>
          </div>
          {loading && !data ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading lessons">
              {[1, 2, 3, 4, 5].map(item => <div key={item} className="h-16 animate-pulse rounded-lg bg-[var(--sp-primary-50)]" />)}
            </div>
          ) : data?.items.length ? data.items.map(item => (
            <button type="button" key={item.id} onClick={() => onNavigate('adminLesson', { lessonId: String(item.id) })} className="grid w-full gap-2 border-b border-[var(--sp-border)] px-5 py-4 text-left transition last:border-0 hover:bg-[var(--sp-primary-50)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--sp-primary-600)] md:grid-cols-[5rem_minmax(16rem,1fr)_14rem_7rem_7rem] md:items-center md:gap-4">
              <span className="font-mono text-xs text-[var(--sp-muted)]">{String(item.sortOrder).padStart(2, '0')}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold text-[var(--sp-ink-strong)]">{item.title}</span><span className="mt-1 block truncate font-mono text-xs text-[var(--sp-muted)]">{item.slug}</span></span>
              <span className="min-w-0 text-xs text-[var(--sp-muted)]"><span className="block truncate font-semibold text-[var(--sp-ink-soft)]">{item.module}</span><span className="mt-0.5 block truncate">{item.certification} · {item.learningPath}</span></span>
              <span className="text-sm tabular-nums text-[var(--sp-ink-soft)]"><span className="md:hidden">Duration: </span>{item.estimatedMinutes ? `${item.estimatedMinutes} min` : '—'}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>{item.status}</span>
            </button>
          )) : (
            <div className="px-6 py-14 text-center">
              <p className="font-medium text-[var(--sp-ink-strong)]">No matching lessons</p>
              <p className="mt-1 text-sm text-[var(--sp-muted)]">Change the filters or create a new lesson.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
