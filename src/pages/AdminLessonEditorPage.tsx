import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminSectionNav } from '../components/AdminSectionNav';
import { AppHeader } from '../components/AppHeader';
import { ContentVersionHistory } from '../components/ContentVersionHistory';
import {
  ApiError,
  archiveAdminLesson,
  createAdminLesson,
  getAdminLesson,
  getAdminLessons,
  getAdminLessonVersions,
  updateAdminLesson,
  type AdminLessonInput,
  type AdminLessonModuleOption,
  type ContentRevision,
} from '../services/api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const EMPTY_LESSON: AdminLessonInput = {
  moduleId: 0,
  slug: '',
  title: '',
  summary: '',
  content: '',
  estimatedMinutes: 10,
  sortOrder: 1,
  status: 'draft',
};

const inputClass = 'w-full rounded-lg bg-white px-3 py-2.5 text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border)] placeholder:text-[var(--sp-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--sp-canvas)] disabled:text-[var(--sp-muted)]';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminLessonEditorPage({ onNavigate }: Props) {
  const { lessonId } = useParams();
  const isNew = lessonId === 'new';
  const id = isNew ? null : Number(lessonId);
  const [form, setForm] = useState<AdminLessonInput>(EMPTY_LESSON);
  const [modules, setModules] = useState<AdminLessonModuleOption[]>([]);
  const [versions, setVersions] = useState<ContentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getAdminLessons(),
      !isNew && id ? getAdminLesson(id) : Promise.resolve(null),
      !isNew && id ? getAdminLessonVersions(id) : Promise.resolve([]),
    ])
      .then(([metadata, lesson, history]) => {
        if (!active) return;
        setModules(metadata.modules);
        setVersions(history);
        if (lesson) {
          setForm({
            moduleId: lesson.moduleId,
            slug: lesson.slug,
            title: lesson.title,
            summary: lesson.summary ?? '',
            content: lesson.content,
            estimatedMinutes: lesson.estimatedMinutes,
            sortOrder: lesson.sortOrder,
            status: lesson.status,
          });
        } else if (metadata.modules[0]) {
          const first = metadata.modules[0];
          const count = metadata.items.filter(item => item.moduleId === first.id).length;
          setForm(previous => ({ ...previous, moduleId: first.id, sortOrder: count + 1 }));
        }
        setError(null);
      })
      .catch(reason => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Unable to load this lesson.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, isNew]);

  function updateField<K extends keyof AdminLessonInput>(key: K, value: AdminLessonInput[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function updateTitle(title: string) {
    setForm(previous => ({
      ...previous,
      title,
      slug: isNew && !slugEdited ? slugify(title) : previous.slug,
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (isNew) await createAdminLesson(form);
      else if (id) await updateAdminLesson(id, form);
      onNavigate('adminLessons', { moduleId: String(form.moduleId) });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to save this lesson.');
      setSaving(false);
    }
  }

  async function archive() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await archiveAdminLesson(id);
      onNavigate('adminLessons', { moduleId: String(form.moduleId) });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to archive this lesson.');
      setSaving(false);
    }
  }

  const selectedModule = modules.find(item => item.id === form.moduleId);

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="admin" onNavigate={onNavigate} />
      <AdminSectionNav active="lessons" onNavigate={onNavigate} />

      <main className="mx-auto max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
        <button type="button" onClick={() => onNavigate('adminLessons', form.moduleId ? { moduleId: String(form.moduleId) } : undefined)} className="text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]">Back to lessons</button>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)]">{isNew ? 'Create lesson' : `Edit ${form.title || 'lesson'}`}</h1>
          </div>
          {!isNew && <span className="w-fit rounded-full bg-[var(--sp-primary-100)] px-3 py-1 text-xs font-semibold capitalize text-[var(--sp-primary-800)]">{form.status}</span>}
        </div>

        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        {loading ? (
          <div className="mt-7 space-y-4" role="status" aria-label="Loading lesson">
            {[1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-[var(--sp-border)]" />)}
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="lesson-details-title">
              <h2 id="lesson-details-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Lesson details</h2>
              <label className="mt-5 block text-sm font-medium">Module
                <select value={form.moduleId} onChange={event => updateField('moduleId', Number(event.target.value))} disabled={!isNew} className={`${inputClass} mt-2`}>
                  {modules.map(item => <option key={item.id} value={item.id}>{item.certification} · {item.name}</option>)}
                </select>
              </label>
              {selectedModule && <p className="mt-2 text-xs text-[var(--sp-muted)]">{selectedModule.learningPath} · Module {selectedModule.sortOrder}</p>}
              <label className="mt-5 block text-sm font-medium">Lesson title
                <input value={form.title} onChange={event => updateTitle(event.target.value)} placeholder="For example, Shared responsibility" className={`${inputClass} mt-2`} />
              </label>
              <label className="mt-5 block text-sm font-medium">Summary
                <textarea rows={3} value={form.summary ?? ''} onChange={event => updateField('summary', event.target.value)} placeholder="A short description shown before the lesson is opened" className={`${inputClass} mt-2 resize-y leading-6`} />
              </label>
              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
                <label className="text-sm font-medium">Slug
                  <input value={form.slug} onChange={event => { setSlugEdited(true); updateField('slug', slugify(event.target.value)); }} placeholder="shared-responsibility" className={`${inputClass} mt-2 font-mono`} />
                </label>
                <label className="text-sm font-medium">Minutes
                  <input type="number" min="1" max="480" value={form.estimatedMinutes ?? ''} onChange={event => updateField('estimatedMinutes', event.target.value ? Number(event.target.value) : null)} className={`${inputClass} mt-2 tabular-nums`} />
                </label>
                <label className="text-sm font-medium">Order
                  <input type="number" min="1" value={form.sortOrder} onChange={event => updateField('sortOrder', Math.max(1, Number(event.target.value)))} className={`${inputClass} mt-2 tabular-nums`} />
                </label>
              </div>
            </section>

            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="lesson-content-title">
              <h2 id="lesson-content-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Lesson content</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--sp-muted)]">Use plain text with short paragraphs and line breaks. The learner view preserves this structure.</p>
              <label className="mt-5 block text-sm font-medium">Content
                <textarea rows={18} value={form.content} onChange={event => updateField('content', event.target.value)} placeholder="Write the lesson here…" className={`${inputClass} mt-2 resize-y font-mono leading-6`} />
              </label>
            </section>

            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="lesson-publishing-title">
              <h2 id="lesson-publishing-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Publishing</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">Only published lessons inside a published module and learning path are visible to learners.</p>
              <label className="mt-5 block max-w-xs text-sm font-medium">Status
                <select value={form.status} onChange={event => updateField('status', event.target.value)} className={`${inputClass} mt-2`}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </section>

            {!isNew && <ContentVersionHistory versions={versions} />}

            <div className="flex flex-col gap-3 border-t border-[var(--sp-border)] pt-5 sm:flex-row sm:items-center">
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[var(--sp-primary-700)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create lesson' : 'Save changes'}</button>
              <button type="button" onClick={() => onNavigate('adminLessons', form.moduleId ? { moduleId: String(form.moduleId) } : undefined)} className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-[var(--sp-ink)] ring-1 ring-[var(--sp-border)] hover:bg-[var(--sp-primary-50)]">Cancel</button>
              {!isNew && !confirmArchive && <button type="button" onClick={() => setConfirmArchive(true)} className="rounded-xl px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 sm:ml-auto">Archive lesson</button>}
            </div>

            {confirmArchive && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                <p className="text-sm font-semibold text-red-800">Archive this lesson?</p>
                <p className="mt-1 text-sm text-red-700">It will disappear from the learner curriculum, while its version history remains available.</p>
                <div className="mt-4 flex gap-2"><button type="button" onClick={() => setConfirmArchive(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-red-200">Keep lesson</button><button type="button" onClick={() => void archive()} disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Archive lesson</button></div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
