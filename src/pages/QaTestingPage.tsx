import { AppHeader } from '../components/AppHeader';
import { LearningEntryCard } from '../components/LearningEntryCard';
import type { CertificationKey } from '../data/questions';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  setCertification: (certification: CertificationKey) => void;
}

export function QaTestingPage({ onNavigate, setCertification }: Props) {
  function openTutorial() {
    setCertification('CTFL');
    onNavigate('tutorial');
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="home" onNavigate={onNavigate} />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-9 sm:px-8 sm:pt-12">
        <nav className="flex items-center gap-2 text-xs text-[var(--sp-muted)]" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate('home')} className="transition hover:text-[var(--sp-primary-700)]">Home</button>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[var(--sp-ink-soft)]">QA &amp; Testing</span>
        </nav>

        <header className="mt-8 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)] sm:text-4xl">QA &amp; Testing</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">
            Start with one structured beginner tutorial covering the foundations of software testing.
          </p>
        </header>

        <section className="mt-10" aria-label="Available QA and testing tutorials">
          <div className="grid gap-4 md:grid-cols-2">
            <LearningEntryCard
              number="01"
              level="Beginner"
              title="ISTQB CTFL"
              description="Learn testing fundamentals, test design, static testing, risk, test management, and test tools."
              note="Certification prep available"
              action="Open tutorial"
              onClick={openTutorial}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
