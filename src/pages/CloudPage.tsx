import type { CertificationKey } from '../data/questions';
import { AppHeader } from '../components/AppHeader';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  setCertification: (cert: CertificationKey) => void;
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

const FUTURE_TOOLS = [
  { name: 'Networking Basics', copy: 'IP addresses, DNS, ports, protocols, routing, and cloud networking.' },
  { name: 'Linux Essentials', copy: 'Commands, files, permissions, processes, and terminal fundamentals.' },
  { name: 'Docker', copy: 'Container images, registries, networking, and local workflows.' },
  { name: 'Kubernetes', copy: 'Pods, workloads, services, and orchestration fundamentals.' },
  { name: 'Terraform', copy: 'Infrastructure as code, providers, state, and reusable modules.' },
];

export function CloudPage({ onNavigate, setCertification }: Props) {
  function openTutorial(cert: CertificationKey) {
    setCertification(cert);
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
          <p className="text-sm font-semibold text-[var(--sp-primary-700)]">Learning area</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--sp-ink-strong)] sm:text-5xl">Cloud</h1>
          <p className="mt-5 text-base leading-7 text-[var(--sp-muted)]">
            Build a strong foundation in cloud computing, infrastructure, and modern cloud tools. You do not need previous cloud experience to begin.
          </p>
        </header>

        <section className="mt-14" aria-labelledby="foundations-title">
          <div className="mb-5">
            <h2 id="foundations-title" className="text-xl font-semibold tracking-[-0.025em]">Foundations</h2>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">Start with the ideas shared by every cloud platform.</p>
          </div>
          <article className="grid gap-7 rounded-2xl bg-[var(--sp-primary-100)] p-6 sm:grid-cols-[1fr_1.15fr] sm:p-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold tabular-nums text-[var(--sp-primary-700)]">01</span>
                <span className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-[var(--sp-primary-700)]">Beginner</span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">Cloud Fundamentals</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">Understand what cloud computing is before learning the vocabulary of a specific platform.</p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sp-primary-700)]">
                Covered in both platform tutorials
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-[var(--sp-border)] pt-5 text-xs leading-5 text-[var(--sp-ink-soft)] sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
              {['IaaS, PaaS, and SaaS', 'Public, private, and hybrid cloud', 'Scalability and availability', 'Shared responsibility', 'Cloud costs and consumption', 'Core infrastructure concepts'].map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-14" aria-labelledby="platforms-title">
          <div className="mb-5">
            <h2 id="platforms-title" className="text-xl font-semibold tracking-[-0.025em]">Cloud platforms</h2>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">Choose either platform. They are parallel beginner tutorials.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => openTutorial('AZ-900')}
              className="group flex min-h-64 flex-col rounded-2xl bg-white p-6 text-left ring-1 ring-[var(--sp-border)] transition hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tabular-nums text-[var(--sp-primary-700)]">02</span>
                <span className="rounded-md bg-[var(--sp-primary-50)] px-2 py-1 text-[11px] font-semibold text-[var(--sp-primary-700)]">Beginner</span>
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">Microsoft Azure</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">Learn core Azure concepts, services, identity, networking, storage, and governance.</p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                <span className="text-[11px] text-[var(--sp-muted-light)]">Certification prep available</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sp-primary-700)] transition group-hover:gap-3">Open tutorial <ArrowIcon /></span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openTutorial('CLF-C02')}
              className="group flex min-h-64 flex-col rounded-2xl bg-white p-6 text-left ring-1 ring-[var(--sp-border)] transition hover:-translate-y-0.5 hover:ring-[var(--sp-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tabular-nums text-[var(--sp-primary-700)]">03</span>
                <span className="rounded-md bg-[var(--sp-primary-50)] px-2 py-1 text-[11px] font-semibold text-[var(--sp-primary-700)]">Beginner</span>
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">Amazon Web Services</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">Learn core AWS concepts, infrastructure, security, compute, storage, and pricing.</p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                <span className="text-[11px] text-[var(--sp-muted-light)]">Certification prep available</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sp-primary-700)] transition group-hover:gap-3">Open tutorial <ArrowIcon /></span>
              </div>
            </button>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="infrastructure-title">
          <div className="mb-5">
            <h2 id="infrastructure-title" className="text-xl font-semibold tracking-[-0.025em]">Core infrastructure</h2>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">Build the operating-system and networking knowledge used across cloud roles.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FUTURE_TOOLS.slice(0, 2).map((tool, index) => (
              <article key={tool.name} className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold tabular-nums text-[var(--sp-muted-light)]">{String(index + 4).padStart(2, '0')}</span>
                  <span className="text-[11px] font-semibold text-[var(--sp-muted-light)]">Coming soon</span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{tool.name}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--sp-muted)]">{tool.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="tools-title">
          <div className="mb-5">
            <h2 id="tools-title" className="text-xl font-semibold tracking-[-0.025em]">Containers & infrastructure tools</h2>
            <p className="mt-1 text-sm text-[var(--sp-muted)]">Move into platform tools after the core foundations.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {FUTURE_TOOLS.slice(2).map((tool, index) => (
              <article key={tool.name} className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold tabular-nums text-[var(--sp-muted-light)]">{String(index + 6).padStart(2, '0')}</span>
                  <span className="text-[11px] font-semibold text-[var(--sp-muted-light)]">Coming soon</span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{tool.name}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--sp-muted)]">{tool.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
