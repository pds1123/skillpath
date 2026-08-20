import { useMemo } from 'react';
import type { ProgressState } from '../hooks/useProgress';
import type { CertificationKey, Question } from '../data/questions';
import { CERTIFICATIONS, questionsForCert, skillForCert } from '../data/questions';
import { AppHeader } from '../components/AppHeader';
import {
  lessonCountForModule,
  lessonsForModule,
  modulesForCert,
  type LearningModule,
} from '../data/curriculum';

interface Props {
  progress: ProgressState;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  activeCert: CertificationKey;
}

function ArrowIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

function moduleProgress(module: LearningModule, questions: Question[], progress: ProgressState) {
  const lessons = lessonsForModule(module);
  const lessonTotal = lessonCountForModule(module);
  const lessonCompleted = lessons.filter(lesson => progress.completedLessons[lesson.key]).length;
  const moduleQuestions = questions.filter(question => module.domainMap.includes(question.domain));
  const hasKnowledgeCheck = moduleQuestions.length > 0;
  const checkCompleted = moduleQuestions.some(question => (progress.results[question.id] ?? []).length > 0);
  const totalUnits = lessonTotal + (hasKnowledgeCheck ? 1 : 0);
  const completedUnits = lessonCompleted + (checkCompleted ? 1 : 0);

  return {
    lessons,
    lessonTotal,
    lessonCompleted,
    hasKnowledgeCheck,
    checkCompleted,
    percentage: Math.round((completedUnits / Math.max(totalUnits, 1)) * 100),
  };
}

function learningStreak(progress: ProgressState): number {
  const activity = [
    ...Object.values(progress.completedLessons),
    ...Object.values(progress.results).flatMap(attempts => attempts.map(attempt => attempt.attemptedAt)),
  ];
  if (!activity.length) return 0;

  const days = new Set(activity.map(timestamp => new Date(timestamp).toDateString()));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }

  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function HomePage({ progress, onNavigate, activeCert }: Props) {
  const certQuestions = useMemo(() => questionsForCert(activeCert), [activeCert]);
  const modules = useMemo(() => modulesForCert(activeCert), [activeCert]);
  const moduleStats = useMemo(
    () => modules.map(module => ({ module, ...moduleProgress(module, certQuestions, progress) })),
    [modules, certQuestions, progress],
  );
  const certMeta = CERTIFICATIONS.find(cert => cert.key === activeCert)!;
  const skill = skillForCert(activeCert);

  const current = moduleStats.find(item => item.percentage < 100 && item.lessons.length > 0)
    ?? moduleStats.find(item => item.lessons.length > 0)
    ?? moduleStats[0];
  const nextLesson = current?.lessons.find(lesson => !progress.completedLessons[lesson.key]) ?? current?.lessons[0];
  const totalLessons = moduleStats.reduce((sum, item) => sum + item.lessonTotal, 0);
  const completedLessons = moduleStats.reduce((sum, item) => sum + item.lessonCompleted, 0);
  const completedChecks = moduleStats.filter(item => item.checkCompleted).length;
  const totalChecks = moduleStats.filter(item => item.hasKnowledgeCheck).length;
  const overallProgress = Math.round(
    ((completedLessons + completedChecks) / Math.max(totalLessons + totalChecks, 1)) * 100,
  );
  const streak = learningStreak(progress);
  const providerName = activeCert === 'AZ-900' ? 'Microsoft Azure' : 'Amazon Web Services';

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="learning" onNavigate={onNavigate} />

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <nav className="mb-8 flex items-center gap-2 text-xs text-[var(--sp-muted)]" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate('home')} className="transition hover:text-[var(--sp-primary-700)]">Home</button>
          <span aria-hidden="true">/</span>
          <button type="button" onClick={() => onNavigate('cloud')} className="transition hover:text-[var(--sp-primary-700)]">Cloud</button>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[var(--sp-ink-soft)]">{providerName}</span>
        </nav>
        <section className="mb-8 sm:mb-10" aria-labelledby="path-title">
          <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--sp-muted)]">Cloud · {skill.level}</p>
          <h1 id="path-title" className="text-3xl font-semibold tracking-[-0.04em] text-[var(--sp-ink-strong)] sm:text-4xl">{providerName}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--sp-muted)]">
            {activeCert === 'AZ-900'
              ? 'Understand cloud concepts first, then see how Microsoft Azure applies them.'
              : 'Understand cloud concepts first, then see how Amazon Web Services applies them.'}
          </p>
        </section>

        {current && (
          <section className="relative mb-12 overflow-hidden rounded-2xl bg-[var(--sp-primary-900)] p-6 text-white shadow-[0_22px_55px_rgba(48,46,118,0.2)] sm:p-8" aria-labelledby="continue-title">
            <div className="relative max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.09em] text-[var(--sp-on-primary-muted)]">Continue learning</p>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-semibold tabular-nums tracking-[0.08em] text-[var(--sp-on-primary)] ring-1 ring-white/10">
                  {String(current.module.order).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="continue-title" className="text-xl font-semibold tracking-[-0.02em]">{current.module.name}</h2>
                  <p className="mt-1 text-sm text-[var(--sp-on-primary)]">{nextLesson?.title ?? current.module.description}</p>
                  <div className="mt-5 flex items-center justify-between text-xs text-[var(--sp-on-primary-muted)]">
                    <span>{current.lessonCompleted} of {current.lessonTotal} lessons completed</span>
                    <span className="tabular-nums">{current.percentage}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-[var(--sp-primary-200)] transition-[width] duration-500" style={{ width: `${current.percentage}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('modules', { module: current.module.key })}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--sp-primary-50)] px-4 py-2.5 text-sm font-semibold text-[var(--sp-primary-900)] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Continue <ArrowIcon />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-14" aria-labelledby="learning-path-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 id="learning-path-title" className="text-xl font-semibold tracking-[-0.025em]">Learning path</h2>
              <p className="mt-1 text-sm text-[var(--sp-muted)]">Build a mental model before learning individual services.</p>
            </div>
            <span className="hidden text-xs text-[var(--sp-muted-light)] sm:block">{modules.length} modules</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {moduleStats.slice(0, 6).map(({ module, lessonTotal, percentage }) => (
              <button
                type="button"
                key={module.key}
                onClick={() => onNavigate('modules', { module: module.key })}
                className="group flex min-h-40 flex-col rounded-2xl bg-white p-5 text-left ring-1 ring-[var(--sp-border)] transition duration-200 hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sp-primary-50)] text-[11px] font-semibold tabular-nums tracking-[0.08em] text-[var(--sp-primary-700)]">
                    {String(module.order).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold tracking-[-0.015em] text-[var(--sp-ink)] transition group-hover:text-[var(--sp-primary-800)]">{module.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--sp-muted)]">{module.description}</p>
                  </div>
                </div>
                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between text-[11px] text-[var(--sp-muted)]">
                    <span>{lessonTotal > 0 ? `${lessonTotal} lessons · ${module.practiceCount} practices` : 'Coming soon'}</span>
                    <span className="font-medium tabular-nums text-[var(--sp-ink-soft)]">{percentage}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--sp-primary-50)]">
                    <div className="h-full rounded-full bg-[var(--sp-primary-600)] transition-[width] duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('modules')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sp-primary-700)] transition hover:gap-3 hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)]"
          >
            View all {modules.length} modules <ArrowIcon />
          </button>
        </section>

        <section className="mb-14 rounded-2xl bg-[var(--sp-primary-100)] p-6 sm:p-8" aria-labelledby="progress-title">
          <div className="grid gap-8 md:grid-cols-[0.85fr_1.4fr] md:gap-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--sp-muted)]">Your progress</p>
              <div className="mt-3 flex items-end gap-2">
                <strong className="text-5xl font-semibold tracking-[-0.06em] tabular-nums text-[var(--sp-primary-900)]">{overallProgress}%</strong>
                <span className="pb-1 text-sm text-[var(--sp-muted)]">overall</span>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-3 border-t border-[var(--sp-border)] pt-5">
                <div>
                  <p className="text-sm font-semibold tabular-nums">{completedLessons} / {totalLessons}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--sp-muted)]">lessons</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">{completedChecks} / {totalChecks}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--sp-muted)]">knowledge checks</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">{streak} day{streak === 1 ? '' : 's'}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--sp-muted)]">learning streak</p>
                </div>
              </div>
            </div>

            <div>
              <h2 id="progress-title" className="text-sm font-semibold text-[var(--sp-ink-soft)]">Module progress</h2>
              <div className="mt-4 space-y-3.5">
                {moduleStats.slice(0, 5).map(({ module, percentage }) => (
                  <button
                    type="button"
                    key={module.key}
                    onClick={() => onNavigate('modules', { module: module.key })}
                    className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)]"
                  >
                    <span className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-[var(--sp-ink-soft)] transition group-hover:text-[var(--sp-primary-700)]">{module.name}</span>
                      <span className="tabular-nums text-[var(--sp-muted)]">{percentage}%</span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-white/80">
                      <span className="block h-full rounded-full bg-[var(--sp-primary-600)] transition-[width] duration-500" style={{ width: `${percentage}%` }} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-14" aria-labelledby="practice-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="practice-title" className="text-xl font-semibold tracking-[-0.025em]">Practice</h2>
              <p className="mt-1 text-sm text-[var(--sp-muted)]">Test what you’ve learned.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('browse')}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--sp-primary-700)] transition hover:gap-2.5 hover:bg-[var(--sp-primary-50)] hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
            >
              Browse all questions <ArrowIcon />
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { mode: 'quick', title: 'Quick practice', copy: '10 mixed questions' },
              { mode: 'weak', title: 'Review weak areas', copy: 'Focus on concepts that need work' },
              { mode: 'mistakes', title: 'Review mistakes', copy: 'Revisit previous incorrect answers' },
            ].map(item => (
              <button
                type="button"
                key={item.mode}
                onClick={() => onNavigate('practice', { mode: item.mode })}
                className="group flex items-start gap-3 rounded-xl border border-[var(--sp-border)] bg-transparent p-4 text-left transition hover:border-[var(--sp-border-strong)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
              >
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-[var(--sp-ink)] group-hover:text-[var(--sp-primary-800)]">{item.title}</span>
                  <span className="mt-1 block text-xs leading-4 text-[var(--sp-muted)]">{item.copy}</span>
                </span>
                <ArrowIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sp-muted-light)] transition group-hover:translate-x-0.5 group-hover:text-[var(--sp-primary-700)]" />
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--sp-border)] pt-7 sm:flex-row sm:items-center" aria-labelledby="cert-title">
          <div className="flex-1">
            <p className="text-xs text-[var(--sp-muted-light)]">Preparing for a certification?</p>
            <h2 id="cert-title" className="mt-1 text-sm font-semibold text-[var(--sp-ink-soft)]">{certMeta.shortName} · {activeCert === 'AZ-900' ? 'Azure Fundamentals' : 'AWS Certified Cloud Practitioner'}</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('certification')}
            className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--sp-ink-soft)] transition hover:gap-3 hover:text-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sp-primary-600)] sm:self-auto"
          >
            View preparation tools <ArrowIcon />
          </button>
        </section>
      </main>
    </div>
  );
}
