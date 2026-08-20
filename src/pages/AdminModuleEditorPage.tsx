import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminSectionNav } from '../components/AdminSectionNav';
import { AppHeader } from '../components/AppHeader';
import {
  ApiError,
  archiveAdminModule,
  createAdminModule,
  getAdminModule,
  getAdminModules,
  updateAdminModule,
  type AdminLearningPathOption,
  type AdminModuleInput,
} from '../services/api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const EMPTY_MODULE: AdminModuleInput = {
  learningPathId: 0,
  certification: '',
  slug: '',
  name: '',
  description: '',
  sortOrder: 1,
  status: 'draft',
};

const inputClass = 'w-full rounded-lg bg-white px-3 py-2.5 text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border)] placeholder:text-[var(--sp-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--sp-canvas)] disabled:text-[var(--sp-muted)]';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminModuleEditorPage({ onNavigate }: Props) {
  const { moduleId } = useParams();
  const isNew = moduleId === 'new';
  const id = isNew ? null : Number(moduleId);
  const [form, setForm] = useState<AdminModuleInput>(EMPTY_MODULE);
  const [paths, setPaths] = useState<AdminLearningPathOption[]>([]);
  const [lessonCount, setLessonCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getAdminModules(),
      !isNew && id ? getAdminModule(id) : Promise.resolve(null),
    ])
      .then(([metadata, module]) => {
        if (!active) return;
        setPaths(metadata.paths);
        if (module) {
          setForm({
            learningPathId: module.learningPathId,
            certification: module.certification,
            slug: module.slug,
            name: module.name,
            description: module.description ?? '',
            sortOrder: module.sortOrder,
            status: module.status,
          });
          setLessonCount(module.lessonCount);
          setQuestionCount(module.questionCount);
        } else if (metadata.paths[0]) {
          const firstPath = metadata.paths[0];
          const pathModules = metadata.items.filter(item => item.learningPathId === firstPath.id);
          setForm(previous => ({
            ...previous,
            learningPathId: firstPath.id,
            certification: firstPath.certification,
            sortOrder: pathModules.length + 1,
          }));
        }
        setError(null);
      })
      .catch(reason => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Unable to load this module.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, isNew]);

  function updateField<K extends keyof AdminModuleInput>(key: K, value: AdminModuleInput[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function selectPath(pathId: number) {
    const selected = paths.find(item => item.id === pathId);
    if (!selected) return;
    updateField('learningPathId', pathId);
    setForm(previous => ({ ...previous, learningPathId: pathId, certification: selected.certification }));
  }

  function updateName(name: string) {
    setForm(previous => ({
      ...previous,
      name,
      slug: isNew && !slugEdited ? slugify(name) : previous.slug,
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (isNew) await createAdminModule(form);
      else if (id) await updateAdminModule(id, form);
      onNavigate('adminModules');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to save this module.');
      setSaving(false);
    }
  }

  async function archive() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await archiveAdminModule(id);
      onNavigate('adminModules');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to archive this module.');
      setSaving(false);
    }
  }

  const selectedPath = paths.find(item => item.id === form.learningPathId);

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="admin" onNavigate={onNavigate} />
      <AdminSectionNav active="modules" onNavigate={onNavigate} />

      <main className="mx-auto max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
        <button type="button" onClick={() => onNavigate('adminModules')} className="text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]">Back to modules</button>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)]">{isNew ? 'Create module' : `Edit ${form.name || 'module'}`}</h1>
          </div>
          {!isNew && <span className="w-fit rounded-full bg-[var(--sp-primary-100)] px-3 py-1 text-xs font-semibold capitalize text-[var(--sp-primary-800)]">{form.status}</span>}
        </div>

        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        {loading ? (
          <div className="mt-7 space-y-4" role="status" aria-label="Loading module">
            {[1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-[var(--sp-border)]" />)}
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="module-details-title">
              <h2 id="module-details-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Module details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Learning path
                  <select value={form.learningPathId} onChange={event => selectPath(Number(event.target.value))} disabled={!isNew} className={`${inputClass} mt-2`}>
                    {paths.map(item => <option key={item.id} value={item.id}>{item.certification} · {item.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Certification
                  <input value={selectedPath?.certification ?? form.certification} disabled className={`${inputClass} mt-2`} />
                </label>
              </div>
              <label className="mt-5 block text-sm font-medium">Module name
                <input value={form.name} onChange={event => updateName(event.target.value)} placeholder="For example, Network Foundations" className={`${inputClass} mt-2`} />
              </label>
              <label className="mt-5 block text-sm font-medium">Description
                <textarea rows={4} value={form.description ?? ''} onChange={event => updateField('description', event.target.value)} placeholder="What learners will understand after this module" className={`${inputClass} mt-2 resize-y leading-6`} />
              </label>
              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem]">
                <label className="text-sm font-medium">Slug
                  <input value={form.slug} onChange={event => { setSlugEdited(true); updateField('slug', slugify(event.target.value)); }} placeholder="network-foundations" className={`${inputClass} mt-2 font-mono`} />
                </label>
                <label className="text-sm font-medium">Order
                  <input type="number" min="1" value={form.sortOrder} onChange={event => updateField('sortOrder', Math.max(1, Number(event.target.value)))} className={`${inputClass} mt-2 tabular-nums`} />
                </label>
              </div>
            </section>

            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="module-publishing-title">
              <h2 id="module-publishing-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Publishing</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">Draft modules remain available to admins. Published modules are ready for learners. Archived modules retain their linked data.</p>
              <label className="mt-5 block max-w-xs text-sm font-medium">Status
                <select value={form.status} onChange={event => updateField('status', event.target.value)} className={`${inputClass} mt-2`}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </section>

            {!isNew && (
              <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="linked-content-title">
                <h2 id="linked-content-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Linked content</h2>
                <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3 text-sm">
                  <div><dt className="text-[var(--sp-muted)]">Lessons</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--sp-ink-strong)]">{lessonCount}</dd></div>
                  <div><dt className="text-[var(--sp-muted)]">Questions</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--sp-ink-strong)]">{questionCount}</dd></div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-[var(--sp-muted)]">Lesson and question editing remain in their own sections, so changing module metadata does not modify linked content.</p>
              </section>
            )}

            <div className="flex flex-col gap-3 border-t border-[var(--sp-border)] pt-5 sm:flex-row sm:items-center">
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[var(--sp-primary-700)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create module' : 'Save changes'}</button>
              <button type="button" onClick={() => onNavigate('adminModules')} className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-[var(--sp-ink)] ring-1 ring-[var(--sp-border)] hover:bg-[var(--sp-primary-50)]">Cancel</button>
              {!isNew && !confirmArchive && <button type="button" onClick={() => setConfirmArchive(true)} className="rounded-xl px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 sm:ml-auto">Archive module</button>}
            </div>

            {confirmArchive && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                <p className="text-sm font-semibold text-red-800">Archive this module?</p>
                <p className="mt-1 text-sm text-red-700">Linked lessons, questions and learner history will remain in the database.</p>
                <div className="mt-4 flex gap-2"><button type="button" onClick={() => setConfirmArchive(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-red-200">Keep module</button><button type="button" onClick={() => void archive()} disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Archive module</button></div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
