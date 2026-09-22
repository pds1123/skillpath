import { AppHeader } from '../components/AppHeader';
import { LearningEntryCard } from '../components/LearningEntryCard';
import type { CertificationKey } from '../types/questions';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  setCertification: (cert: CertificationKey) => void;
}

export function CloudPage({ onNavigate, setCertification }: Props) {
  function openTutorial(certification: CertificationKey) {
    setCertification(certification);
    onNavigate('tutorial');
  }

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <AppHeader active="home" onNavigate={onNavigate} />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-9 sm:px-8 sm:pt-12">
        <nav className="flex items-center gap-2 text-xs text-[var(--sp-muted)]" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate('home')} className="transition hover:text-[var(--sp-primary-700)]">Home</button>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[var(--sp-ink-soft)]">Cloud</span>
        </nav>

        <header className="mt-8 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--sp-ink-strong)] sm:text-4xl">Cloud platforms</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">
            Choose either platform. They are parallel beginner tutorials.
          </p>
        </header>

        <section className="mt-10" aria-label="Available cloud tutorials">
          <div className="grid gap-4 md:grid-cols-2">
            <LearningEntryCard
              number="01"
              level="Beginner"
              title="Microsoft Azure"
              description="Learn core Azure concepts, services, identity, networking, storage, and governance."
              note="Certification prep available"
              action="Open tutorial"
              onClick={() => openTutorial('AZ-900')}
            />

            <LearningEntryCard
              number="02"
              level="Beginner"
              title="Amazon Web Services"
              description="Learn core AWS concepts, infrastructure, security, compute, storage, and pricing."
              note="Certification prep available"
              action="Open tutorial"
              onClick={() => openTutorial('CLF-C02')}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
