import type { ContentRevision } from '../services/api';

interface Props {
  versions: ContentRevision[];
  loading?: boolean;
}

function formatSnapshot(snapshotJson: string) {
  try {
    return JSON.stringify(JSON.parse(snapshotJson), null, 2);
  } catch {
    return snapshotJson;
  }
}

export function ContentVersionHistory({ versions, loading = false }: Props) {
  return (
    <section className="rounded-xl bg-white p-5 ring-1 ring-[var(--sp-border)] sm:p-6" aria-labelledby="version-history-title">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 id="version-history-title" className="text-base font-semibold text-[var(--sp-ink-strong)]">Version history</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--sp-muted)]">A snapshot is stored whenever content, publishing state, or order changes.</p>
        </div>
        {!loading && <span className="text-xs tabular-nums text-[var(--sp-muted)]">{versions.length} versions</span>}
      </div>
      {loading ? (
        <div className="mt-5 space-y-2" role="status" aria-label="Loading version history">
          {[1, 2].map(item => <div key={item} className="h-14 animate-pulse rounded-lg bg-[var(--sp-primary-50)]" />)}
        </div>
      ) : versions.length ? (
        <div className="mt-5 divide-y divide-[var(--sp-border)] border-y border-[var(--sp-border)]">
          {versions.map(version => (
            <details key={version.version} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-primary-600)]">
                <span className="flex items-center gap-3"><strong className="font-semibold text-[var(--sp-ink-strong)]">Version {version.version}</strong><span className="capitalize text-[var(--sp-muted)]">{version.changeType}</span></span>
                <span className="text-right text-xs text-[var(--sp-muted)]">{version.changedBy ?? 'System'} · {new Date(version.changedAt).toLocaleString()}</span>
              </summary>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-[var(--sp-canvas)] p-4 text-xs leading-5 text-[var(--sp-ink-soft)] ring-1 ring-inset ring-[var(--sp-border)]">{formatSnapshot(version.snapshotJson)}</pre>
            </details>
          ))}
        </div>
      ) : <p className="mt-5 text-sm text-[var(--sp-muted)]">No versions have been recorded yet.</p>}
    </section>
  );
}
