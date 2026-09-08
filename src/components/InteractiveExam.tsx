import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import type {
  InteractionDefinition,
  InteractionPrompt,
  InteractionSolution,
  InteractiveSubmission,
  QuestionInteractionType,
} from '../types/questionEngine';

export function ClickHotspot({
  data, imageUrl, checked, onSubmit, solution, hideSubmit,
}: {
  data: Extract<InteractionDefinition, { kind: 'click' }>;
  imageUrl: string;
  checked: boolean;
  onSubmit: (submission: InteractiveSubmission) => void;
  solution?: InteractionSolution;
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
      onSubmit({ interactionResponse: { x, y } });
    }
  }

  function check() {
    if (!click) return;
    onSubmit({ interactionResponse: click });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLImageElement>) {
    if (checked) return;
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (click) onSubmit({ interactionResponse: click });
      return;
    }
    const movement: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    setClick(current => ({
      x: Math.min(1, Math.max(0, (current?.x ?? 0.5) + delta.x)),
      y: Math.min(1, Math.max(0, (current?.y ?? 0.5) + delta.y)),
    }));
  }

  const region = solution && 'region' in solution ? solution.region : undefined;
  const userInside = click && region
    ? click.x >= region.x && click.x <= region.x + region.w && click.y >= region.y && click.y <= region.y + region.h
    : false;

  return (
    <div className="mb-3">
      <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
        Click on: <span className="normal-case text-[var(--sp-primary-700)]">{data.label}</span>
      </p>
      <div className="relative inline-block max-w-full">
        <img
          src={imageUrl}
          alt="Click to answer"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={checked ? -1 : 0}
          aria-label={`Select a point for: ${data.label}. Use the arrow keys to move the marker and Enter to submit.`}
          className={`block max-w-full rounded-lg border border-gray-200 ${checked ? '' : 'cursor-crosshair'}`}
        />
        {checked && region && (
          <div
            className="absolute border-2 border-green-500 bg-green-400/20 pointer-events-none"
            style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.w * 100}%`, height: `${region.h * 100}%` }}
          />
        )}
        {click && (
          <div
            className={`absolute pointer-events-none w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
              checked ? (userInside ? 'border-green-600 bg-green-400' : 'border-red-500 bg-red-400') : 'border-[var(--sp-primary-700)] bg-[var(--sp-primary-500)]'
            }`}
            style={{ left: `${click.x * 100}%`, top: `${click.y * 100}%` }}
          />
        )}
      </div>
      {!hideSubmit && !checked && (
        <button
          onClick={check}
          disabled={!click}
          className="mt-2 w-full rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:opacity-35"
        >Submit</button>
      )}
    </div>
  );
}

export function InteractiveExam({
  data, interactionType, checked, onSubmit, solution, showAnswer, imageUrl, hideSubmit,
}: {
  data: InteractionDefinition;
  interactionType: QuestionInteractionType;
  checked: boolean;
  onSubmit: (submission: InteractiveSubmission) => void;
  solution?: InteractionSolution;
  showAnswer: boolean;
  imageUrl?: string;
  /** When true, hide internal Submit button and auto-fire onSubmit once all picks are made (for exam mode). */
  hideSubmit?: boolean;
}) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const initialPool = data.kind === 'match' ? data.pool : [];
  const [pool, setPool] = useState<string[]>(initialPool);
  const [selectionAnswers, setSelectionAnswers] = useState<string[]>([]);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);
  const lastAutoSubmission = useRef('');

  const prompts: InteractionPrompt[] = data.kind === 'click' || data.kind === 'self_grade'
    ? []
    : data.prompts;
  const allPicked = prompts.every((_, i) => picks[i] !== undefined && picks[i] !== '');
  const solutionAnswers = solution && 'answers' in solution ? solution.answers : [];

  function check() {
    if (!allPicked) return;
    onSubmit({ interactionResponse: { answers: prompts.map((_, index) => picks[index]) } });
  }

  // Exam mode: auto-submit whenever picks change (live grade tracking, no button)
  useEffect(() => {
    if (data.kind === 'click' || data.kind === 'self_grade') return;
    if (!hideSubmit || checked) return;
    if (!allPicked) return;
    const answers = prompts.map((_, index) => picks[index]);
    const serialized = JSON.stringify(answers);
    if (lastAutoSubmission.current === serialized) return;
    lastAutoSubmission.current = serialized;
    onSubmit({ interactionResponse: { answers } });
    // setPicks always creates a new object, so `picks` reference changes on every update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.kind, hideSubmit, checked, allPicked, picks]);

  useEffect(() => {
    if (interactionType !== 'unordered_selection' || !hideSubmit || checked || selectionAnswers.length === 0) return;
    const serialized = JSON.stringify(selectionAnswers);
    if (lastAutoSubmission.current === serialized) return;
    lastAutoSubmission.current = serialized;
    onSubmit({ interactionResponse: { answers: selectionAnswers } });
  }, [checked, hideSubmit, interactionType, onSubmit, selectionAnswers]);

  if (data.kind === 'click') {
    if (!imageUrl) return null;
    return <ClickHotspot data={data} imageUrl={imageUrl} checked={checked} onSubmit={onSubmit} solution={solution} hideSubmit={hideSubmit} />;
  }

  if (data.kind === 'self_grade') {
    if (checked) return null;
    if (!showAnswer) {
      return (
        <div className="mb-3 rounded-xl border border-[var(--sp-primary-200)] bg-[var(--sp-primary-50)] p-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold text-[var(--sp-primary-800)]">Self-grade question.</span> Decide your answer, then select <span className="font-medium">Show Answer</span> to compare and mark yourself.
          </p>
        </div>
      );
    }
    return (
      <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-xs text-gray-700 mb-2 font-medium">Did you get it right?</p>
        <div className="flex gap-2">
          <button
            onClick={() => onSubmit({ selfGrade: true })}
            className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >I got it right</button>
          <button
            onClick={() => onSubmit({ selfGrade: false })}
            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >I got it wrong</button>
        </div>
      </div>
    );
  }

  function pickFor(i: number, val: string) {
    if (checked) return;
    setPicks(prev => ({ ...prev, [i]: val }));
  }

  if (data.kind === 'match') {
    const reusable =
      data.pool.length < data.prompts.length ||
      interactionType === 'fixed_match';
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
      } catch {
        // Ignore malformed drag payloads from outside this component.
      }
    }
    function onDropPool(e: React.DragEvent) {
      e.preventDefault();
      setDragOverPool(false);
      try {
        const { item, from } = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (item) moveToPool(item, from);
      } catch {
        // Ignore malformed drag payloads from outside this component.
      }
    }

    if (interactionType === 'unordered_selection') {

      function onDragStartSelection(e: React.DragEvent, item: string, from: 'pool' | 'answer') {
        e.dataTransfer.setData('text/plain', JSON.stringify({ item, from }));
        e.dataTransfer.effectAllowed = 'move';
      }

      function addSelection(item: string) {
        if (checked || selectionAnswers.includes(item)) return;
        if (!reusable) setPool(current => current.filter(option => option !== item));
        setSelectionAnswers(current => [...current, item]);
      }

      function removeSelection(item: string) {
        if (checked) return;
        setSelectionAnswers(current => current.filter(answer => answer !== item));
        if (!reusable) setPool(current => current.includes(item) ? current : [...current, item]);
      }

      function dropInAnswerArea(e: React.DragEvent) {
        e.preventDefault();
        setDragOverSlot(null);
        try {
          const { item, from } = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (item && from === 'pool') addSelection(item);
        } catch {
          // Ignore malformed drag payloads from outside this component.
        }
      }

      function dropInOptions(e: React.DragEvent) {
        e.preventDefault();
        setDragOverPool(false);
        try {
          const { item, from } = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (item && from === 'answer') removeSelection(item);
        } catch {
          // Ignore malformed drag payloads from outside this component.
        }
      }

      return (
        <div className="mb-3 space-y-3">
          <p className="text-sm font-medium text-[var(--sp-ink-soft)]">
            Drag or select the options you think are correct.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[var(--sp-muted)]">Options</p>
              <div
                className={`min-h-24 space-y-1.5 rounded-lg border-2 border-dashed p-2 transition-colors ${dragOverPool ? 'border-[var(--sp-primary-300)] bg-[var(--sp-primary-50)]' : 'border-[var(--sp-border)]'}`}
                onDragOver={event => { if (!checked) { event.preventDefault(); setDragOverPool(true); } }}
                onDragLeave={() => setDragOverPool(false)}
                onDrop={dropInOptions}
              >
                {pool.map(item => (
                  <button
                    type="button"
                    key={item}
                    draggable={!checked}
                    onDragStart={event => onDragStartSelection(event, item, 'pool')}
                    onClick={() => addSelection(item)}
                    disabled={checked}
                    className={`block w-full select-none rounded-lg border border-[var(--sp-primary-200)] bg-white px-3 py-2 text-left text-xs font-medium text-[var(--sp-ink)] ${checked ? '' : 'cursor-grab active:cursor-grabbing'}`}
                  >
                    {item}
                  </button>
                ))}
                {pool.length === 0 && <p className="py-2 text-center text-xs text-[var(--sp-muted)]">No options remaining</p>}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-[var(--sp-muted)]">Answer area</p>
              <div
                className={`min-h-24 space-y-1.5 rounded-lg border-2 border-dashed p-2 transition-colors ${dragOverSlot === 0 ? 'border-[var(--sp-primary-400)] bg-[var(--sp-primary-50)]' : 'border-[var(--sp-border)]'}`}
                onDragOver={event => { if (!checked) { event.preventDefault(); setDragOverSlot(0); } }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={dropInAnswerArea}
              >
                {selectionAnswers.map(item => {
                  const isCorrect = solutionAnswers.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      draggable={!checked}
                      onDragStart={event => onDragStartSelection(event, item, 'answer')}
                      onClick={() => removeSelection(item)}
                      disabled={checked}
                      className={`block w-full select-none rounded-lg border px-3 py-2 text-left text-xs font-medium ${
                        checked
                          ? isCorrect
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-red-300 bg-red-50 text-red-700'
                          : 'cursor-grab border-[var(--sp-primary-300)] bg-[var(--sp-primary-50)] text-[var(--sp-ink)] active:cursor-grabbing'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
                {selectionAnswers.length === 0 && (
                  <p className="flex min-h-16 items-center justify-center text-xs text-[var(--sp-muted)]">Drop answers here</p>
                )}
              </div>
            </div>
          </div>

          {checked && (
            <div className="space-y-1">
              {solutionAnswers.filter(answer => !selectionAnswers.includes(answer)).map(answer => (
                <p key={answer} className="text-xs text-red-600">Missing: <span className="font-semibold">{answer}</span></p>
              ))}
            </div>
          )}

          {!hideSubmit && !checked && !showAnswer && (
            <button
              onClick={() => onSubmit({ interactionResponse: { answers: selectionAnswers } })}
              disabled={selectionAnswers.length === 0}
              className="w-full rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:opacity-35"
            >Submit</button>
          )}
        </div>
      );
    }

    return (
      <div className="mb-3 space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--sp-muted)]">Options</p>
          <div
            className={`flex min-h-12 flex-wrap gap-2 rounded-lg border-2 border-dashed p-2 transition-colors ${dragOverPool ? 'border-[var(--sp-primary-300)] bg-[var(--sp-primary-50)]' : 'border-gray-200'}`}
            onDragOver={e => { if (!checked) { e.preventDefault(); setDragOverPool(true); } }}
            onDragLeave={() => setDragOverPool(false)}
            onDrop={onDropPool}
          >
            {pool.map(item => (
              <button
                type="button"
                key={item}
                draggable={!checked}
                onDragStart={e => onDragStartItem(e, item, 'pool')}
                onClick={() => {
                  const emptySlot = data.prompts.findIndex((_, index) => !picks[index]);
                  if (emptySlot >= 0) moveTo(emptySlot, item, 'pool');
                }}
                disabled={checked || data.prompts.every((_, index) => Boolean(picks[index]))}
                className={`select-none rounded-lg border border-[var(--sp-primary-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--sp-ink)] transition-colors ${checked ? '' : 'cursor-grab active:cursor-grabbing hover:border-[var(--sp-primary-400)] hover:bg-[var(--sp-primary-50)]'}`}
              >
                {item}
              </button>
            ))}
            {pool.length === 0 && (
              <div className="h-6 flex items-center justify-center text-xs text-gray-300 w-full">all placed</div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--sp-muted)]">Answer slots</p>
          <div className="space-y-2">
          {data.prompts.map((p, i) => {
            const placed = picks[i];
            const isCorrect = checked && placed === solutionAnswers[i];
            const isWrong = checked && placed !== solutionAnswers[i];
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
                    : dragOverSlot === i ? 'border-[var(--sp-primary-400)] bg-[var(--sp-primary-50)]'
                    : placed ? 'border-[var(--sp-primary-300)] bg-[var(--sp-primary-50)] text-[var(--sp-ink)]'
                    : 'border-dashed border-gray-300 text-gray-300'
                  }`}
                  onDragOver={e => { if (!checked) { e.preventDefault(); setDragOverSlot(i); } }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={e => onDropSlot(e, i)}
                >
                  {placed ? (
                    <button
                      type="button"
                      draggable={!checked}
                      onDragStart={e => onDragStartItem(e, placed, i)}
                      onClick={() => moveToPool(placed, i)}
                      disabled={checked}
                      className={`w-full text-center select-none ${checked ? '' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                      {placed}
                    </button>
                  ) : (
                    <span className="text-[11px]">drop here</span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {checked && (
            <div className="space-y-1 mt-2">
              {data.prompts.map((p, i) => {
                const ok = picks[i] === solutionAnswers[i];
                if (ok) return null;
                return (
                  <p key={i} className="text-xs text-red-600">
                    "{p.text}" should be <span className="font-semibold">{solutionAnswers[i]}</span>
                  </p>
                );
              })}
            </div>
        )}

        {!hideSubmit && !checked && !showAnswer && (
          <button
            onClick={check}
            disabled={!allPicked}
            className="w-full rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:opacity-35"
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
          className="max-w-full truncate rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-[var(--sp-primary-500)] focus:outline-none disabled:bg-gray-50"
        >
          <option value="">— select —</option>
          {(p.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    };
    if (data.layout === 'url' && data.urlTemplate) {
      const tmpl = data.urlTemplate;
      const segments = tmpl.split(/(\{\d+\})/g);
      const allCorrect = checked && data.prompts.every((_, i) => picks[i] === solutionAnswers[i]);
      const anyWrong = checked && data.prompts.some((_, i) => picks[i] !== solutionAnswers[i]);
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
              picks[i] !== solutionAnswers[i] ? (
                <p key={i} className="text-[11px] text-red-600 mt-1.5">
                  {p.text}: Correct = <span className="font-semibold">{solutionAnswers[i]}</span>
                </p>
              ) : null
            )}
          </div>
          {!hideSubmit && !checked && !showAnswer && (
            <button
              onClick={check}
              disabled={!allPicked}
              className="mt-2 w-full rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:opacity-35"
            >Submit</button>
          )}
        </div>
      );
    }
    return (
      <div className="mb-3 space-y-2">
        {data.prompts.map((p, i) => {
          const picked = picks[i];
          const isCorrect = checked && picked === solutionAnswers[i];
          const isWrong = checked && picked !== solutionAnswers[i];
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
                <p className="text-[11px] text-red-600 mt-1">Correct: <span className="font-semibold">{solutionAnswers[i]}</span></p>
              )}
            </div>
          );
        })}
        {!hideSubmit && !checked && !showAnswer && (
          <button
            onClick={check}
            disabled={!allPicked}
            className="w-full rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:opacity-35"
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
            const isCorrect = checked && picked === solutionAnswers[i];
            const isWrong = checked && picked !== solutionAnswers[i];
            return (
              <tr key={i} className={`border-b border-gray-100 last:border-0 ${
                isCorrect ? 'bg-green-50/40' : isWrong ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}>
                <td className="px-3 py-2.5 text-gray-700 leading-snug">
                  {p.text}
                  {isWrong && <span className="block text-[11px] text-red-600 mt-0.5">Correct: {solutionAnswers[i]}</span>}
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
          className="mt-2 w-full rounded-xl bg-[var(--sp-primary-700)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--sp-primary-800)] disabled:opacity-35"
        >Submit</button>
      )}
    </div>
  );
}
