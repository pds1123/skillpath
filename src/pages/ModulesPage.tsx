import { useMemo, useState } from 'react';
import { questionsForCert, quizQuestionsForCert } from '../data/questions';
import type { CertificationKey, Question } from '../data/questions';
import {
  lessonCountForModule,
  lessonsForModule,
  modulesForCert,
  type LearningModule,
} from '../data/curriculum';
import type { ProgressState } from '../hooks/useProgress';
import { submitQuestionAnswer, type AnswerGrade } from '../services/api';

interface Props {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onToggleLesson: (lessonKey: string) => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  initialModule?: string;
  activeCert: CertificationKey;
}

function progressForModule(module: LearningModule, questions: Question[], progress: ProgressState) {
  const lessons = lessonsForModule(module);
  const lessonTotal = lessonCountForModule(module);
  const lessonCompleted = lessons.filter(lesson => progress.completedLessons[lesson.key]).length;
  const moduleQuestions = questions.filter(question => module.domainMap.includes(question.domain));
  const checkCompleted = moduleQuestions.some(question => (progress.results[question.id] ?? []).length > 0);
  const totalUnits = lessonTotal + (moduleQuestions.length > 0 ? 1 : 0);
  return {
    lessonTotal,
    lessonCompleted,
    percentage: Math.round(((lessonCompleted + (checkCompleted ? 1 : 0)) / Math.max(totalUnits, 1)) * 100),
  };
}

function ModuleList({ modules, progress, questions, onSelect }: {
  modules: LearningModule[];
  progress: ProgressState;
  questions: Question[];
  onSelect: (module: LearningModule) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modules.map(module => {
        const stats = progressForModule(module, questions, progress);
        return (
          <button
            type="button"
            key={module.key}
            onClick={() => onSelect(module)}
            className="group flex min-h-44 flex-col rounded-2xl bg-white p-5 text-left ring-1 ring-[var(--sp-border)] transition duration-200 hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sp-primary-50)] text-xs font-semibold tabular-nums tracking-[0.08em] text-[var(--sp-primary-700)]">
                {String(module.order).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold tracking-[-0.015em] text-[var(--sp-ink)] transition group-hover:text-[var(--sp-primary-800)]">{module.name}</h2>
                <p className="mt-1.5 text-xs leading-5 text-[var(--sp-muted)]">{module.description}</p>
              </div>
            </div>
            <div className="mt-auto pt-5">
              <div className="flex items-center justify-between text-[11px] text-[var(--sp-muted)]">
                <span>{stats.lessonTotal > 0 ? `${stats.lessonTotal} lessons · ${module.practiceCount} practices` : 'Coming soon'}</span>
                <span className="font-medium tabular-nums text-[var(--sp-ink-soft)]">{stats.percentage}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--sp-primary-50)]">
                <div className="h-full rounded-full bg-[var(--sp-primary-600)] transition-[width]" style={{ width: `${stats.percentage}%` }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

type ModuleTab = 'learn' | 'practice';

function ModuleDetail({ module, progress, onAnswer, onToggleLesson, onBack, activeCert }: {
  module: LearningModule;
  progress: ProgressState;
  onAnswer: (id: number, correct: boolean, selected: string[]) => void;
  onToggleLesson: (lessonKey: string) => void;
  onBack: () => void;
  activeCert: CertificationKey;
}) {
  const [tab, setTab] = useState<ModuleTab>('learn');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState<AnswerGrade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState(0);
  const lessons = useMemo(() => lessonsForModule(module), [module]);
  const practiceQuestions = useMemo(
    () => quizQuestionsForCert(activeCert).filter(question => module.domainMap.includes(question.domain)).slice(0, 10),
    [activeCert, module],
  );
  const completedCount = lessons.filter(lesson => progress.completedLessons[lesson.key]).length;
  const lessonPercentage = Math.round((completedCount / Math.max(lessons.length, 1)) * 100);
  const question = practiceQuestions[practiceIndex];
  const isMulti = question?.multipleSelect ?? false;

  function resetQuestion() {
    setSelected([]);
    setSubmitted(false);
    setGrade(null);
    setSubmitting(false);
    setSubmitError(null);
  }

  function goQuestion(index: number) {
    setPracticeIndex(index);
    resetQuestion();
  }

  function toggleOption(letter: string) {
    if (submitted) return;
    setSelected(previous => isMulti
      ? previous.includes(letter) ? previous.filter(item => item !== letter) : [...previous, letter]
      : [letter]);
  }

  async function submit() {
    if (!question || !selected.length || submitted) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitQuestionAnswer(question.id, selected);
      setGrade(result);
      setSubmitted(true);
      onAnswer(question.id, result.correct, selected);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to check this answer.');
    } finally {
      setSubmitting(false);
    }
  }

  function optionClass(letter: string) {
    const base = 'w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]';
    if (!question) return base;
    if (!submitted) return `${base} ${selected.includes(letter) ? 'border-[var(--sp-primary-600)] bg-[var(--sp-primary-50)] text-[var(--sp-primary-900)]' : 'border-[var(--sp-border)] bg-white text-[var(--sp-ink)] hover:border-[var(--sp-border-strong)]'}`;
    if (grade?.correctAnswer.includes(letter)) return `${base} border-[var(--sp-primary-600)] bg-[var(--sp-primary-50)] text-[var(--sp-primary-900)]`;
    if (selected.includes(letter)) return `${base} border-[#c97f72] bg-[#fff2ef] text-[#7e392f]`;
    return `${base} border-[var(--sp-primary-50)] bg-[var(--sp-primary-50)] text-[var(--sp-muted-light)]`;
  }

  const isCorrect = submitted && Boolean(grade?.correct);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)]"
      >
        <span aria-hidden="true">←</span> All modules
      </button>

      <div className="mb-7 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--sp-primary-100)] text-xs font-semibold tabular-nums tracking-[0.08em] text-[var(--sp-primary-700)]">
          {String(module.order).padStart(2, '0')}
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--sp-muted)]">Module {module.order}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--sp-ink)] sm:text-3xl">{module.name}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">{module.description}</p>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-[var(--sp-primary-100)] p-1" role="tablist" aria-label="Module content">
        {(['learn', 'practice'] as ModuleTab[]).map(item => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item}
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-lg py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[var(--sp-primary-600)] ${tab === item ? 'bg-white text-[var(--sp-ink)] shadow-sm' : 'text-[var(--sp-muted)] hover:text-[var(--sp-ink-soft)]'}`}
          >
            {item === 'learn' ? 'Lessons' : 'Knowledge check'}
          </button>
        ))}
      </div>

      {tab === 'learn' && (
        <div>
          {lessons.length > 0 ? (
            <>
              <div className="mb-5 rounded-xl bg-[var(--sp-primary-100)] p-4">
                <div className="flex items-center justify-between text-xs text-[var(--sp-ink-soft)]">
                  <span>{completedCount} of {lessons.length} lessons completed</span>
                  <span className="font-semibold tabular-nums text-[var(--sp-primary-700)]">{lessonPercentage}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                  <div className="h-full rounded-full bg-[var(--sp-primary-600)] transition-[width]" style={{ width: `${lessonPercentage}%` }} />
                </div>
              </div>

              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const complete = Boolean(progress.completedLessons[lesson.key]);
                  const open = openLesson === index;
                  return (
                    <article key={lesson.key} className="overflow-hidden rounded-xl bg-white ring-1 ring-[var(--sp-border)]">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setOpenLesson(open ? -1 : index)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition hover:bg-[var(--sp-header)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--sp-primary-600)]"
                        >
                          <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--sp-muted-light)]">{String(index + 1).padStart(2, '0')}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--sp-ink)]">{lesson.title}</span>
                            <span className="mt-0.5 block text-[11px] text-[var(--sp-muted-light)]">{lesson.domain}</span>
                          </span>
                          <span className={`text-[var(--sp-muted-light)] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleLesson(lesson.key)}
                          className={`mr-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)] ${complete ? 'border-[var(--sp-primary-600)] bg-[var(--sp-primary-600)] text-white' : 'border-[var(--sp-border-strong)] text-transparent hover:border-[var(--sp-border-strong)]'}`}
                          aria-label={complete ? `Mark ${lesson.title} incomplete` : `Mark ${lesson.title} complete`}
                        >
                          {complete && (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="m5 12 4 4L19 6" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {open && (
                        <div className="border-t border-[var(--sp-primary-50)] px-5 pb-6 pt-5 text-sm leading-7 text-[var(--sp-ink-soft)] whitespace-pre-wrap sm:px-12">
                          {lesson.content}
                          <button
                            type="button"
                            onClick={() => onToggleLesson(lesson.key)}
                            className={`mt-6 flex w-fit items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)] ${complete ? 'bg-[var(--sp-primary-50)] text-[var(--sp-ink-soft)] hover:bg-[var(--sp-primary-100)]' : 'bg-[var(--sp-primary-900)] text-white hover:bg-[var(--sp-primary-800)]'}`}
                          >
                            {complete ? 'Lesson completed' : 'Mark lesson complete'}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setTab('practice')}
                className="mt-5 w-full rounded-xl bg-[var(--sp-primary-900)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
              >
                Take the knowledge check →
              </button>
            </>
          ) : (
            <div className="rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-[var(--sp-border)]">
              <h2 className="font-semibold text-[var(--sp-ink)]">Lessons are being prepared</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--sp-muted)]">This module is part of the learning path. Its guided lessons will appear here as they are published.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'practice' && (
        <div>
          {!question ? (
            <div className="rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-[var(--sp-border)]">
              <p className="text-2xl">◇</p>
              <h2 className="mt-3 font-semibold text-[var(--sp-ink)]">Knowledge check coming soon</h2>
              <p className="mt-2 text-sm text-[var(--sp-muted)]">Practice for this module is still being curated.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between text-xs text-[var(--sp-muted)]">
                <span>Question {practiceIndex + 1} of {practiceQuestions.length}</span>
                <span className="rounded-md bg-[var(--sp-primary-100)] px-2 py-1 font-medium text-[var(--sp-primary-700)]">{module.name}</span>
              </div>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--sp-primary-50)]">
                <div className="h-full rounded-full bg-[var(--sp-primary-600)] transition-[width]" style={{ width: `${((practiceIndex + 1) / practiceQuestions.length) * 100}%` }} />
              </div>

              <div className="rounded-2xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-7">
                {isMulti && !submitted && <p className="mb-2 text-xs font-semibold text-[var(--sp-primary-600)]">Select all that apply</p>}
                <p className="text-sm font-medium leading-7 text-[var(--sp-ink)] whitespace-pre-wrap">{question.question}</p>
                <div className="mt-5 space-y-2">
                  {Object.entries(question.options).map(([letter, text]) => (
                    <button type="button" key={letter} onClick={() => toggleOption(letter)} disabled={submitted} className={optionClass(letter)}>
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current text-[10px] font-semibold">{letter}</span>
                        <span>{text}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {submitted ? (
                  <div className={`mt-4 rounded-lg p-3 text-sm ${isCorrect ? 'bg-[var(--sp-primary-50)] text-[var(--sp-primary-700)]' : 'bg-[#fff1ee] text-[#813c31]'}`}>
                    {isCorrect ? 'Correct' : `Correct answer: ${grade?.correctAnswer.join(', ')}`}
                    {grade?.explanation && <p className="mt-2 leading-6">{grade.explanation}</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!selected.length || submitting}
                    className="mt-5 w-full rounded-xl bg-[var(--sp-primary-900)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
                  >
                    {submitting ? 'Checking…' : 'Check answer'}
                  </button>
                )}
                {submitError && <p className="mt-3 text-sm text-red-700" role="alert">{submitError}</p>}
              </div>

              {submitted && (
                <button
                  type="button"
                  onClick={() => {
                    if (practiceIndex < practiceQuestions.length - 1) goQuestion(practiceIndex + 1);
                    else { setTab('learn'); goQuestion(0); }
                  }}
                  className="mt-4 w-full rounded-xl bg-[var(--sp-primary-900)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
                >
                  {practiceIndex < practiceQuestions.length - 1 ? 'Next question →' : 'Finish knowledge check'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ModulesPage({ progress, onAnswer, onToggleLesson, onNavigate, initialModule, activeCert }: Props) {
  const modules = useMemo(() => modulesForCert(activeCert), [activeCert]);
  const questions = useMemo(() => questionsForCert(activeCert), [activeCert]);
  const initialSelection = useMemo(
    () => modules.find(module => module.key === initialModule || module.domainMap.includes(initialModule ?? '')) ?? null,
    [initialModule, modules],
  );
  const selectedModule = initialSelection;

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <main className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
        {!selectedModule ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate('tutorial')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sp-muted)] transition hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)]"
            >
              <span aria-hidden="true">←</span> Tutorial
            </button>
            <div className="mb-8 mt-8">
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--sp-muted)]">Cloud Engineer Path</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--sp-ink)]">Learning modules</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">Read the concepts in order, or open the module that answers what you need today.</p>
            </div>
            <ModuleList
              modules={modules}
              progress={progress}
              questions={questions}
              onSelect={module => onNavigate('modules', { module: module.key })}
            />
          </>
        ) : (
          <ModuleDetail
            module={selectedModule}
            progress={progress}
            onAnswer={onAnswer}
            onToggleLesson={onToggleLesson}
            onBack={() => onNavigate('modules')}
            activeCert={activeCert}
          />
        )}
      </main>
    </div>
  );
}
