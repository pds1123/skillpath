import { useState, useEffect, useRef } from 'react';

interface Props {
  durationSec: number;
  onExpire: () => void;
  paused?: boolean;
}

export function Timer({ durationSec, onExpire, paused = false }: Props) {
  const [remaining, setRemaining] = useState(durationSec);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      onExpireRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, paused]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = remaining / durationSec;
  const urgent = pct < 0.15;

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold ${
      urgent ? 'bg-red-100 text-red-700' : 'bg-[var(--sp-primary-100)] text-[var(--sp-primary-800)]'
    }`}>
      <svg className={`w-4 h-4 ${urgent ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  );
}
