import { useState, useEffect } from 'react';
import type React from 'react';
import type { InteractiveData, InteractivePrompt } from '../data/interactiveData';

export function ClickHotspot({
  data, imageUrl, checked, onSubmit, hideSubmit,
}: {
  data: Extract<InteractiveData, { kind: 'click' }>;
  imageUrl: string;
  checked: boolean;
  onSubmit: (correct: boolean) => void;
  hideSubmit?: boolean;
}) {
  const [click, setClick] = useState<{ x: number; y: number } | null>(null);

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    if (checked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setClick({ x, y });
    if (hideSubmit) {
      const c = data.correct;
      const correct = x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
      onSubmit(correct);
    }
  }

  function check() {
    if (!click) return;
    const c = data.correct;
    const correct = click.x >= c.x && click.x <= c.x + c.w && click.y >= c.y && click.y <= c.y + c.h;
    onSubmit(correct);
  }

  const c = data.correct;
  const userInside = click ? (click.x >= c.x && click.x <= c.x + c.w && click.y >= c.y && click.y <= c.y + c.h) : false;

  return (
    <div className="mb-3">
      <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
        Click on: <span className="text-blue-600 normal-case">{data.label}</span>
      </p>
      <div className="relative inline-block max-w-full">
        <img
          src={imageUrl}
          alt="Click to answer"
          onClick={handleClick}
          className={`block max-w-full rounded-lg border border-gray-200 ${checked ? '' : 'cursor-crosshair'}`}
        />
        {checked && (
          <div
            className="absolute border-2 border-green-500 bg-green-400/20 pointer-events-none"
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` }}
          />
        )}
        {click && (
          <div
            className={`absolute pointer-events-none w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
              checked ? (userInside ? 'border-green-600 bg-green-400' : 'border-red-500 bg-red-400') : 'border-blue-600 bg-blue-400'
            }`}
            style={{ left: `${click.x * 100}%`, top: `${click.y * 100}%` }}
          />
        )}
      </div>
      {!hideSubmit && !checked && (
        <button
          onClick={check}
          disabled={!click}
          className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
        >Submit</button>
      )}
    </div>
  );
}

export function InteractiveExam({
  data, checked, onSubmit, showAnswer, imageUrl, questionText, hideSubmit,
}: {
  data: InteractiveData;
  checked: boolean;
  onSubmit: (correct: boolean) => void;
  showAnswer: boolean;
  imageUrl?: string;
  questionText?: string;
  /** When true, hide internal Submit button and auto-fire onSubmit once all picks are made (for exam mode). */
  hideSubmit?: boolean;
}) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const initialPool = data.kind === 'match' ? data.pool : [];
  const [pool, setPool] = useState<string[]>(initialPool);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);

  if (data.kind === 'click') {
    if (!imageUrl) return null;
    return <ClickHotspot data={data} imageUrl={imageUrl} checked={checked} onSubmit={onSubmit} hideSubmit={hideSubmit} />;
  }

  if (data.kind === 'self_grade') {
    if (checked) return null;
    if (!showAnswer) {
      return (
        <div className="mb-3 p-3 rounded-lg bg-blue-50/40 border border-blue-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold text-blue-700">Self-grade question.</span> Decide your answer, then click <span className="font-medium">"Show Answer"</span> to compare and mark yourself.
          </p>
        </div>
      );
    }
    return (
      <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-xs text-gray-700 mb-2 font-medium">Did you get it right?</p>
        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(true)}
            className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >✓ I got it right</button>
          <button
            onClick={() => onSubmit(false)}
            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >✗ I got it wrong</button>
        </div>
      </div>
    );
  }

  const prompts = (data as { prompts: InteractivePrompt[] }).prompts;
  const allPicked = prompts.every((_, i) => picks[i] !== undefined && picks[i] !== '');

  function computeCorrect(): boolean {
    const hasDupText = prompts.some((p, i) => prompts.findIndex(x => x.text === p.text) !== i);
    if (hasDupText) {
      const placed = Object.values(picks).sort();
      const expected = prompts.map(p => p.correct).sort();
      return placed.length === expected.length && placed.every((v, i) => v === expected[i]);
    }
    return prompts.every((p, i) => picks[i] === p.correct);
  }

  function check() {
    if (!allPicked) return;
    onSubmit(computeCorrect());
  }

  // Exam mode: auto-submit whenever picks change (live grade tracking, no button)
  useEffect(() => {
    if (!hideSubmit || checked) return;
    if (!allPicked) return;
    onSubmit(computeCorrect());
    // setPicks always creates a new object, so `picks` reference changes on every update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideSubmit, checked, allPicked, picks]);

  function pickFor(i: number, val: string) {
    if (checked) return;
    setPicks(prev => ({ ...prev, [i]: val }));
  }

  if (data.kind === 'match') {
    const reusable =
      data.pool.length < data.prompts.length ||
      /more\s+than\s+once|may\s+be\s+used\s+(more\s+than\s+once|once\s+or\s+more)/i.test(questionText || '');
    function onDragStartItem(e: React.DragEvent, item: string, from: 'pool' | number) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ item, from }));
      e.dataTransfer.effectAllowed = 'move';
    }
    function moveTo(slotIdx: number, item: string, from: 'pool' | number) {
      if (from === 'pool' && !reusable) setPool(prev => prev.filter(x => x !== item));
      else if (typeof from === 'number') setPicks(prev => { const n = { ...prev }; delete n[from]; return n; });
      setPicks(prev => {
        const existing = prev[slotIdx];
        if (existing && !reusable) setPool(p => p.includes(existing) ? p : [...p, existing]);
        return { ...prev, [slotIdx]: item };
      });
    }
    function moveToPool(item: string, from: 'pool' | number) {
      if (from === 'pool') return;
      if (typeof from === 'number') {
        setPicks(prev => { const n = { ...prev }; delete n[from]; return n; });
        if (!reusable) setPool(prev => prev.includes(item) ? prev : [...prev, item]);
      }
    }
    function onDropSlot(e: React.DragEvent, slotIdx: number) {
      e.preventDefault();
      setDragOverSlot(null);
      try {
        const { item, from } = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (item) moveTo(slotIdx, item, from);
      } catch {}
    }
    function onDropPool(e: React.DragEvent) {
      e.preventDefault();
      setDragOverPool(false);
      try {
        const { item, from } = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (item) moveToPool(item, from);
      } catch {}
    }

    return (
      <div className="mb-3 space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Drag items from here</p>
          <div
            className={`min-h-12 rounded-lg border-2 border-dashed p-2 flex flex-wrap gap-2 transition-colors ${dragOverPool ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}
            onDragOver={e => { if (!checked) { e.preventDefault(); setDragOverPool(true); } }}
            onDragLeave={() => setDragOverPool(false)}
            onDrop={onDropPool}
          >
            {pool.map(item => (
              <div
                key={item}
                draggable={!checked}
                onDragStart={e => onDragStartItem(e, item, 'pool')}
                className={`px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-gray-800 select-none shadow-sm transition-colors ${checked ? '' : 'cursor-grab active:cursor-grabbing hover:border-blue-400 hover:bg-blue-50/40'}`}
              >
                {item}
              </div>
            ))}
            {pool.length === 0 && (
              <div className="h-6 flex items-center justify-center text-xs text-gray-300 w-full">all placed</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {data.prompts.map((p, i) => {
            const placed = picks[i];
            const isCorrect = checked && placed === p.correct;
            const isWrong = checked && placed !== p.correct;
            const dupCount = data.prompts.filter(x => x.text === p.text).length;
            const dupIdx = dupCount > 1 ? data.prompts.slice(0, i).filter(x => x.text === p.text).length + 1 : 0;
            const label = dupCount > 1 ? `${p.text} (${dupIdx})` : p.text;
            return (
              <div key={i} className="flex items-center gap-2">
                <p className="flex-1 text-xs text-gray-700 leading-snug">{label}</p>
                <div
                  className={`shrink-0 min-w-32 max-w-44 min-h-9 rounded-lg border-2 p-1.5 flex items-center justify-center transition-colors text-xs font-medium ${
                    isCorrect ? 'border-green-500 bg-green-50 text-green-800'
                    : isWrong ? 'border-red-400 bg-red-50 text-red-700'
                    : dragOverSlot === i ? 'border-blue-400 bg-blue-50/50'
                    : placed ? 'border-blue-300 bg-blue-50/40 text-gray-800'
                    : 'border-dashed border-gray-300 text-gray-300'
                  }`}
                  onDragOver={e => { if (!checked) { e.preventDefault(); setDragOverSlot(i); } }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={e => onDropSlot(e, i)}
                >
                  {placed ? (
                    <div
                      draggable={!checked}
                      onDragStart={e => onDragStartItem(e, placed, i)}
                      className={`w-full text-center select-none ${checked ? '' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                      {placed}
                    </div>
                  ) : (
                    <span className="text-[11px]">drop here</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {checked && (() => {
          const hasDupText = data.prompts.some((p, i) => data.prompts.findIndex(x => x.text === p.text) !== i);
          if (hasDupText) {
            const placed = new Set(Object.values(picks));
            const missing = data.prompts.map(p => p.correct).filter(c => !placed.has(c));
            if (missing.length === 0) return null;
            return (
              <div className="space-y-1 mt-2">
                {missing.map((c, i) => (
                  <p key={i} className="text-xs text-red-600">✗ Missing: <span className="font-semibold">{c}</span></p>
                ))}
              </div>
            );
          }
          return (
            <div className="space-y-1 mt-2">
              {data.prompts.map((p, i) => {
                const ok = picks[i] === p.correct;
                if (ok) return null;
                return (
                  <p key={i} className="text-xs text-red-600">
                    ✗ "{p.text}" — should be <span className="font-semibold">{p.correct}</span>
                  </p>
                );
              })}
            </div>
          );
        })()}

        {!hideSubmit && !checked && !showAnswer && (
          <button
            onClick={check}
            disabled={!allPicked}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
          >Submit</button>
        )}
      </div>
    );
  }

  if (data.kind === 'dropdown') {
    const selectEl = (p: typeof data.prompts[0], i: number) => {
      const picked = picks[i];
      return (
        <select
          disabled={checked}
          value={picked ?? ''}
          onChange={e => pickFor(i, e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-blue-400 disabled:bg-gray-50 max-w-full truncate"
        >
          <option value="">— select —</option>
          {(p.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    };
    if (data.layout === 'url' && data.urlTemplate) {
      const tmpl = data.urlTemplate;
      const segments = tmpl.split(/(\{\d+\})/g);
      const allCorrect = checked && data.prompts.every((p, i) => picks[i] === p.correct);
      const anyWrong = checked && data.prompts.some((p, i) => picks[i] !== p.correct);
      return (
        <div className="mb-3">
          <div className={`p-3 rounded-lg border-2 transition-colors ${
            allCorrect ? 'border-green-300 bg-green-50/40'
            : anyWrong ? 'border-red-300 bg-red-50/40'
            : 'border-gray-200 bg-white'
          }`}>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-800 font-mono">
              {segments.map((seg, idx) => {
                const m = seg.match(/^\{(\d+)\}$/);
                if (m) {
                  const i = parseInt(m[1]);
                  const p = data.prompts[i];
                  return p ? <span key={idx}>{selectEl(p, i)}</span> : null;
                }
                return seg ? <span key={idx}>{seg}</span> : null;
              })}
            </div>
            {checked && data.prompts.map((p, i) =>
              picks[i] !== p.correct ? (
                <p key={i} className="text-[11px] text-red-600 mt-1.5">
                  {p.text}: Correct = <span className="font-semibold">{p.correct}</span>
                </p>
              ) : null
            )}
          </div>
          {!hideSubmit && !checked && !showAnswer && (
            <button
              onClick={check}
              disabled={!allPicked}
              className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
            >Submit</button>
          )}
        </div>
      );
    }
    return (
      <div className="mb-3 space-y-2">
        {data.prompts.map((p, i) => {
          const picked = picks[i];
          const isCorrect = checked && picked === p.correct;
          const isWrong = checked && picked !== p.correct;
          const blankFirst = /^[a-z]/.test(p.text);
          return (
            <div key={i} className={`p-2.5 rounded-lg border-2 transition-colors ${
              isCorrect ? 'border-green-300 bg-green-50/40'
              : isWrong ? 'border-red-300 bg-red-50/40'
              : 'border-gray-200 bg-white'
            }`}>
              {blankFirst ? (
                <div className="flex items-start gap-2 flex-wrap">
                  {selectEl(p, i)}
                  <span className="text-xs text-gray-700 leading-snug pt-1.5">{p.text}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-700 leading-snug mb-1.5">{p.text}</p>
                  {selectEl(p, i)}
                </>
              )}
              {isWrong && (
                <p className="text-[11px] text-red-600 mt-1">Correct: <span className="font-semibold">{p.correct}</span></p>
              )}
            </div>
          );
        })}
        {!hideSubmit && !checked && !showAnswer && (
          <button
            onClick={check}
            disabled={!allPicked}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
          >Submit</button>
        )}
      </div>
    );
  }

  // Yes/No
  return (
    <div className="mb-3">
      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 text-gray-500 font-semibold">Statement</th>
            <th className="px-4 py-2 text-gray-500 font-semibold w-14">Yes</th>
            <th className="px-4 py-2 text-gray-500 font-semibold w-14">No</th>
          </tr>
        </thead>
        <tbody>
          {data.prompts.map((p, i) => {
            const picked = picks[i];
            const isCorrect = checked && picked === p.correct;
            const isWrong = checked && picked !== p.correct;
            return (
              <tr key={i} className={`border-b border-gray-100 last:border-0 ${
                isCorrect ? 'bg-green-50/40' : isWrong ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}>
                <td className="px-3 py-2.5 text-gray-700 leading-snug">
                  {p.text}
                  {isWrong && <span className="block text-[11px] text-red-600 mt-0.5">Correct: {p.correct}</span>}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input type="radio" name={`int-${i}`} checked={picked === 'Yes'} disabled={checked}
                    onChange={() => pickFor(i, 'Yes')} className="w-4 h-4 accent-green-600 cursor-pointer" />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input type="radio" name={`int-${i}`} checked={picked === 'No'} disabled={checked}
                    onChange={() => pickFor(i, 'No')} className="w-4 h-4 accent-red-500 cursor-pointer" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!hideSubmit && !checked && !showAnswer && (
        <button
          onClick={check}
          disabled={!allPicked}
          className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
        >Submit</button>
      )}
    </div>
  );
}
