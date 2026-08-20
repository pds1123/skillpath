import { AppHeader } from '../components/AppHeader';
import { LEARNING_AREAS } from '../data/learningAreas';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

export function ExploreHomePage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="home" onNavigate={onNavigate} />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Learn IT, one skill at a time.</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-[var(--sp-ink-strong)] sm:text-5xl">
            What do you want to learn?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--sp-muted)] sm:text-lg">
            Choose an area and start building practical IT foundations. No previous experience required.
          </p>
        </section>

        <section id="categories" className="mt-14 scroll-mt-8 sm:mt-20" aria-labelledby="categories-title">
          <div className="mb-6 flex items-end justify-between gap-5">
            <div>
              <h2 id="categories-title" className="text-2xl font-semibold tracking-[-0.03em]">Learning areas</h2>
              <p className="mt-1.5 text-sm text-[var(--sp-muted)]">Start with a broad direction. Choose a tutorial when you are ready.</p>
            </div>
            <span className="hidden text-xs text-[var(--sp-muted-light)] sm:block">Concept-led beginner learning</span>
          </div>

          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
            {LEARNING_AREAS.map(area => area.status === 'available' ? (
              <button
                type="button"
                key={area.key}
                onClick={() => onNavigate(area.destination ?? 'home')}
                className="group flex min-h-[19rem] flex-col rounded-2xl bg-[var(--sp-primary-900)] p-6 text-left text-white transition hover:-translate-y-0.5 hover:bg-[var(--sp-primary-800)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sp-primary-600)] sm:p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-[var(--sp-on-primary)]">Available</span>
                  <span className="text-xs font-medium text-[var(--sp-on-primary-muted)]">Beginner friendly</span>
                </div>
                <div className="mt-7">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em]">{area.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--sp-on-primary)]">{area.description}</p>
                  <p className="mt-5 text-xs leading-5 text-[var(--sp-on-primary-muted)]">{area.concepts.join(' · ')}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold transition group-hover:gap-3">
                  Explore {area.name} <ArrowIcon />
                </span>
              </button>
            ) : (
              <article key={area.key} className="flex min-h-[19rem] flex-col rounded-2xl bg-white p-6 ring-1 ring-[var(--sp-border)] sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold tracking-[-0.025em]">{area.name}</h3>
                  <span className="rounded-md bg-[var(--sp-primary-50)] px-2 py-1 text-[11px] font-semibold text-[var(--sp-muted)]">Planned</span>
                </div>
                <p className="mt-6 text-sm leading-6 text-[var(--sp-muted)]">{area.description}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-6" aria-label={`${area.name} concepts`}>
                  {area.concepts.map(concept => (
                    <span key={concept} className="rounded-md bg-[var(--sp-primary-50)] px-2 py-1 text-[11px] font-medium text-[var(--sp-ink-soft)]">{concept}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-[var(--sp-border)] pt-9" aria-labelledby="next-title">
          <div className="max-w-2xl">
            <h2 id="next-title" className="text-xl font-semibold tracking-[-0.025em]">More learning areas are planned</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-muted)]">New beginner paths will be added as complete learning experiences become available.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
