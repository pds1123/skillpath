import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AdminSectionNav } from '../components/AdminSectionNav';
import {
  ApiError,
  archiveAdminQuestion,
  createAdminQuestion,
  getAdminQuestion,
  getAdminQuestions,
  updateAdminQuestion,
  type AdminQuestionInput,
  type AdminQuestionOption,
} from '../services/api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const EMPTY_QUESTION: AdminQuestionInput = {
  certification: 'AZ-900',
  domain: 'General Azure',
  type: 'multiple_choice',
  contentType: 'practice_question',
  prompt: '',
  explanation: '',
  mode: 'quiz',
  difficulty: 'beginner',
  status: 'draft',
  options: [
    { key: 'A', text: '', isCorrect: true },
    { key: 'B', text: '', isCorrect: false },
    { key: 'C', text: '', isCorrect: false },
    { key: 'D', text: '', isCorrect: false },
  ],
};

const inputClass = 'w-full rounded-lg bg-white px-3 py-2.5 text-sm text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-border)] placeholder:text-[var(--sp-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary-600)]';

export function AdminQuestionEditorPage({ onNavigate }: Props) {
  const { questionId } = useParams();
  const isNew = questionId === 'new';
  const id = isNew ? null : Number(questionId);
  const [form, setForm] = useState<AdminQuestionInput>(EMPTY_QUESTION);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminQuestions({ limit: 1 })
      .then(metadata => {
        if (active) {
          setCertifications(metadata.certifications);
          setDomains(metadata.domains);
        }
      })
      .catch(() => undefined);
    if (!isNew && id) {
      getAdminQuestion(id)
        .then(question => {
          if (active) setForm({
            certification: question.certification,
            domain: question.domain,
            type: question.type,
            contentType: question.contentType,
            prompt: question.prompt,
            explanation: question.explanation ?? '',
            mode: question.mode,
            difficulty: question.difficulty,
            status: question.status,
            options: question.options,
          });
        })
        .catch(reason => {
          if (active) setError(reason instanceof ApiError ? reason.message : 'Unable to load this question.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => { active = false; };
  }, [id, isNew]);

  function updateField<K extends keyof AdminQuestionInput>(key: K, value: AdminQuestionInput[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function updateOption(index: number, update: Partial<AdminQuestionOption>) {
    updateField('options', form.options.map((option, optionIndex) => optionIndex === index ? { ...option, ...update } : option));
  }

  function addOption() {
    if (form.options.length >= 8) return;
    const key = String.fromCharCode(65 + form.options.length);
    updateField('options', [...form.options, { key, text: '', isCorrect: false }]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (isNew) await createAdminQuestion(form);
      else if (id) await updateAdminQuestion(id, form);
      onNavigate('admin');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to save this question.');
      setSaving(false);
    }
  }

  async function archive() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await archiveAdminQuestion(id);
      onNavigate('admin');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to archive this question.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="admin" onNavigate={onNavigate} />
      <AdminSectionNav active="questions" onNavigate={onNavigate} />
      <main className="mx-auto max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
        <button type="button" onClick={() => onNavigate('admin')} className="text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)]">Back to question bank</button>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)]">{isNew ? 'Create question' : `Edit question #${id}`}</h1>
          </div>
          {!isNew && <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${form.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-[var(--sp-primary-100)] text-[var(--sp-primary-800)]'}`}>{form.status}</span>}
        </div>

        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        {loading ? (
          <div className="mt-7 space-y-4" role="status" aria-label="Loading question">
            {[1, 2, 3, 4].map(item => <div key={item} className="h-20 animate-pulse rounded-xl bg-white ring-1 ring-[var(--sp-border)]" />)}
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="question-content-title">
              <h2 id="question-content-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Question content</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Certification<select value={form.certification} onChange={event => updateField('certification', event.target.value)} className={`${inputClass} mt-2`}><option value="AZ-900">AZ-900</option><option value="CLF-C02">CLF-C02</option>{certifications.filter(item => !['AZ-900', 'CLF-C02'].includes(item)).map(item => <option key={item}>{item}</option>)}</select></label>
                <label className="text-sm font-medium">Domain<input list="admin-domain-options" value={form.domain} onChange={event => updateField('domain', event.target.value)} className={`${inputClass} mt-2`} /><datalist id="admin-domain-options">{domains.map(item => <option key={item} value={item} />)}</datalist></label>
                <label className="text-sm font-medium">Question type<select value={form.type} onChange={event => updateField('type', event.target.value)} className={`${inputClass} mt-2`}><option value="multiple_choice">Multiple choice</option><option value="yes_no">Yes or no</option><option value="drag_drop">Drag and drop</option><option value="hotspot">Hotspot</option><option value="self_grade">Self grade</option></select></label>
                <label className="text-sm font-medium">Content use<select value={form.contentType} onChange={event => updateField('contentType', event.target.value)} className={`${inputClass} mt-2`}><option value="practice_question">Practice question</option><option value="knowledge_check">Knowledge check</option><option value="mock_question">Mock assessment</option></select></label>
              </div>
              <label className="mt-5 block text-sm font-medium">Question text<textarea rows={7} value={form.prompt} onChange={event => updateField('prompt', event.target.value)} placeholder="Write a clear question or scenario" className={`${inputClass} mt-2 resize-y leading-6`} /></label>
              <label className="mt-5 block text-sm font-medium">Explanation<textarea rows={5} value={form.explanation ?? ''} onChange={event => updateField('explanation', event.target.value)} placeholder="Explain why the answer is correct" className={`${inputClass} mt-2 resize-y leading-6`} /></label>
            </section>

            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="answer-options-title">
              <div className="flex items-center justify-between gap-4">
                <div><h2 id="answer-options-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Answer options</h2><p className="mt-1 text-xs text-[var(--sp-muted)]">Mark every correct option. Multiple correct answers are supported.</p></div>
                <button type="button" onClick={addOption} disabled={form.options.length >= 8} className="rounded-lg bg-[var(--sp-primary-100)] px-3 py-2 text-sm font-semibold text-[var(--sp-primary-800)] hover:bg-[var(--sp-primary-200)] disabled:opacity-40">Add option</button>
              </div>
              <div className="mt-5 space-y-3">
                {form.options.map((option, index) => (
                  <div key={`${option.key}-${index}`} className="grid gap-3 rounded-lg bg-[var(--sp-canvas)] p-3 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
                    <input aria-label={`Option ${index + 1} key`} value={option.key} maxLength={2} onChange={event => updateOption(index, { key: event.target.value.toUpperCase() })} className={`${inputClass} text-center font-mono font-semibold`} />
                    <input aria-label={`Option ${option.key} text`} value={option.text} onChange={event => updateOption(index, { text: event.target.value })} placeholder="Answer text" className={inputClass} />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--sp-ink-soft)]"><input type="checkbox" checked={option.isCorrect} onChange={event => updateOption(index, { isCorrect: event.target.checked })} className="h-4 w-4 accent-[var(--sp-primary-700)]" />Correct</label>
                      <button type="button" disabled={form.options.length <= 2} onClick={() => updateField('options', form.options.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-30">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="publishing-title">
              <h2 id="publishing-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Classification and publishing</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium">Difficulty<select value={form.difficulty} onChange={event => updateField('difficulty', event.target.value)} className={`${inputClass} mt-2`}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
                <label className="text-sm font-medium">Mode<select value={form.mode} onChange={event => updateField('mode', event.target.value)} className={`${inputClass} mt-2`}><option value="quiz">Quiz</option><option value="reveal">Reveal</option><option value="read">Read</option></select></label>
                <label className="text-sm font-medium">Status<select value={form.status} onChange={event => updateField('status', event.target.value)} className={`${inputClass} mt-2`}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-[var(--sp-border)] pt-5 sm:flex-row sm:items-center">
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[var(--sp-primary-700)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create question' : 'Save changes'}</button>
              <button type="button" onClick={() => onNavigate('admin')} className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-[var(--sp-ink)] ring-1 ring-[var(--sp-border)] hover:bg-[var(--sp-primary-50)]">Cancel</button>
              {!isNew && !confirmArchive && <button type="button" onClick={() => setConfirmArchive(true)} className="sm:ml-auto rounded-xl px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50">Archive question</button>}
            </div>

            {confirmArchive && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                <p className="text-sm font-semibold text-red-800">Archive this question?</p>
                <p className="mt-1 text-sm text-red-700">It will disappear from learner practice and assessment screens. Attempt history will remain intact.</p>
                <div className="mt-4 flex gap-2"><button type="button" onClick={() => setConfirmArchive(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-red-200">Keep question</button><button type="button" onClick={() => void archive()} disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Archive question</button></div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
