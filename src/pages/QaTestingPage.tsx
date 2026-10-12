import { AppHeader } from '../components/AppHeader';
import { LearningEntryCard } from '../components/LearningEntryCard';
import type { CertificationKey } from '../types/questions';

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

        <h1 className="sr-only">QA &amp; Testing tutorials</h1>

        <section className="mt-8" aria-label="Available QA and testing tutorials">
          <div className="grid gap-4 md:grid-cols-2">
            <LearningEntryCard
              number="01"
              level="Beginner"
              title="Software Testing Fundamentals"
              description="Learn testing fundamentals, test design, static testing, risk, test management, and test tools."
              note="Practice questions available"
              action="Open tutorial"
              onClick={openTutorial}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
