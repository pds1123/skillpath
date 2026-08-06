import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { questionsForCert, domainsForCert } from '../data/questions';
import type { Question, CertificationKey } from '../data/questions';
import type { ProgressState } from '../hooks/useProgress';
import { DOMAIN_EMOJI } from '../data/studyContent';
import { QUESTION_IMAGES } from '../data/questionImages';
import { INTERACTIVE_DATA } from '../data/interactiveData';
import type { InteractiveData } from '../data/interactiveData';
import { InteractiveExam } from '../components/InteractiveExam';

interface Props {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onNavigate: (page: string) => void;
  apiKey: string;
  activeCert: CertificationKey;
}

// ─── Box-answer parser ────────────────────────────────────────────────────────
function parseBoxes(raw: string): Array<{ n: number; answer: string; detail: string }> {
  const text = raw.replace(/^:\s*/, '');
  const results: Array<{ n: number; answer: string; detail: string }> = [];
  // Split on each "Box N:" boundary (works for multi-line content)
  const parts = text.split(/(?=Box\s+\d+\s*:)/i);
  for (const part of parts) {
    const header = part.match(/^Box\s+(\d+)\s*:\s*([\s\S]*)/i);
    if (!header) continue;
    const full = header[2].trim();
    // For Yes/No hotspot: starts with "Yes" or "No"
    const yn = full.match(/^(Yes|No)\s*[-–]?\s*([\s\S]*)/i);
    results.push({
      n: parseInt(header[1]),
      answer: yn ? yn[1] : '',
      detail: yn ? yn[2].trim() : full,
    });
  }
  return results;
}

function extractRef(raw: string): string {
  const refs = extractRefs(raw);
  return refs[0] || '';
}

function extractRefs(raw: string): string[] {
  // Match all URLs that appear after "References:" or "Reference:"
  const headerMatch = raw.match(/References?:\s*([\s\S]*)$/i);
  if (!headerMatch) return [];
  const tail = headerMatch[1];
  // Extract all URLs from the tail
  const urls = tail.match(/https?:\/\/\S+/g) || [];
  // Clean trailing punctuation
  return urls.map(u => u.replace(/[.,;|)\]]+$/, ''));
}

// ─── Tiny markdown renderer for AI analysis ───────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key++} className="font-semibold text-gray-900">{m[1]}</strong>);
    else if (m[2]) parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-purple-100 text-purple-800 text-[11px] font-mono">{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let i = 0;

  function flushList() {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-4 space-y-0.5 my-1">
        {listBuf.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
      </ul>
    );
    listBuf = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const cls = level === 1
        ? 'text-sm font-bold text-purple-800 mt-2 mb-1'
        : level === 2
          ? 'text-xs font-bold text-purple-700 mt-2 mb-0.5'
          : 'text-xs font-semibold text-purple-600 mt-1.5 mb-0.5';
      blocks.push(<p key={i++} className={cls}>{renderInline(h[2])}</p>);
    } else if (li) {
      listBuf.push(li[1]);
    } else {
      flushList();
      blocks.push(<p key={i++} className="leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return <div className="text-xs text-gray-700 space-y-1">{blocks}</div>;
}

// ─── Single Question Card ─────────────────────────────────────────────────────
function QuestionCard({
  question, index, progress, apiKey,
}: {
  question: Question; index: number;
  progress: ProgressState;
  apiKey: string;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mcResult, setMcResult] = useState<boolean | null>(null);
  const [hotspotPicks, setHotspotPicks] = useState<Record<number, 'Yes' | 'No'>>({});
  const [hotspotChecked, setHotspotChecked] = useState(false);
  const [hotspotResults, setHotspotResults] = useState<Record<number, boolean>>({});
  // Drag-drop state
  const [pool, setPool] = useState<string[]>(() => Object.keys(question.options));
  const [answerArea, setAnswerArea] = useState<string[]>([]);
  const [dragResult, setDragResult] = useState<boolean | null>(null);
  const [dragOver, setDragOver] = useState<'pool' | 'answer' | null>(null);
  const [aiText, setAiText] = useState(() => localStorage.getItem(`ai_cache_${question.id}`) ?? '');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(() => !!localStorage.getItem(`ai_cache_${question.id}`));

  const pastAttempts = progress.results[question.id] ?? [];
  const lastAttempt = pastAttempts[pastAttempts.length - 1];
  const isMulti = question.correct_answer.length > 1;
  const optionKeys = Object.keys(question.options);
  const hasOptions = optionKeys.length > 0;

  const interactive: InteractiveData | undefined = INTERACTIVE_DATA[question.id];
  const [interactiveResult, setInteractiveResult] = useState<boolean | null>(null);

  const isDragDrop = !interactive && question.type === 'drag_drop' && hasOptions;
  const isMC = !interactive && !isDragDrop && hasOptions;

  const hotspotBoxes = (!interactive && question.type === 'hotspot')
    ? parseBoxes(question.answer_text || '')
    : [];
  const isInteractiveHotspot = hotspotBoxes.length > 0 && hotspotBoxes.every(b => b.answer === 'Yes' || b.answer === 'No');

  const qImages = QUESTION_IMAGES[question.id];
  const rawCleaned = question.answer_text
    ? /^:\s*References?:/i.test(question.answer_text)
      ? ''
      : question.answer_text.replace(/\s*References?:.*$/s, '').replace(/^:\s*/, '').trim()
    : '';
  // Suppress redundant letter-only answer_text like "AC" or "B" when it just repeats correct_answer
  const cleanAnswerText = /^[A-E]{1,5}$/i.test(rawCleaned) ? '' : rawCleaned;
  const hasRealAnswer = question.correct_answer.length > 0 || cleanAnswerText.length > 0;

  // ── MC helpers ───────────────────────────────────────────────────────────────
  function toggleOption(letter: string) {
    if (showAnswer) return;
    setSelected(prev =>
      isMulti
        ? prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]
        : prev.includes(letter) ? [] : [letter]
    );
  }

  function handleMcSubmit() {
    if (!selected.length || showAnswer) return;
    const correct = selected.length === question.correct_answer.length &&
      selected.every(s => question.correct_answer.includes(s));
    setMcResult(correct);
    setShowAnswer(true);
  }

  function optClass(letter: string) {
    const base = 'w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm';
    if (!showAnswer) {
      return `${base} cursor-pointer ${selected.includes(letter)
        ? 'border-blue-500 bg-blue-50 text-blue-900'
        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 text-gray-800'}`;
    }
    const isCorrect = question.correct_answer.includes(letter);
    const wasSelected = selected.includes(letter);
    if (isCorrect) return `${base} border-green-500 bg-green-50 text-green-900 font-medium`;
    if (wasSelected && !isCorrect) return `${base} border-red-400 bg-red-50 text-red-800`;
    return `${base} border-gray-100 bg-gray-50 text-gray-400`;
  }

  // ── Hotspot helpers ───────────────────────────────────────────────────────────
  function handleHotspotSubmit() {
    if (hotspotChecked) return;
    const allPicked = hotspotBoxes.every(b => hotspotPicks[b.n] !== undefined);
    if (!allPicked) return;
    const results: Record<number, boolean> = {};
    hotspotBoxes.forEach(b => { results[b.n] = hotspotPicks[b.n] === b.answer; });
    setHotspotResults(results);
    setHotspotChecked(true);
    setShowAnswer(true);
  }

  // ── Drag-drop helpers ─────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, key: string, from: 'pool' | 'answer') {
    e.dataTransfer.setData('text/plain', `${from}:${key}`);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDropToAnswer(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('pool:')) {
      const key = data.slice(5);
      setPool(prev => prev.filter(k => k !== key));
      setAnswerArea(prev => prev.includes(key) ? prev : [...prev, key]);
    }
  }

  function onDropToPool(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('answer:')) {
      const key = data.slice(7);
      setAnswerArea(prev => prev.filter(k => k !== key));
      setPool(prev => prev.includes(key) ? prev : [...prev, key]);
    }
  }

  function handleDragSubmit() {
    const correct = answerArea.length === question.correct_answer.length &&
      answerArea.every(k => question.correct_answer.includes(k));
    setDragResult(correct);
    setShowAnswer(true);
  }

  // ── AI ────────────────────────────────────────────────────────────────────────
  async function fetchAI() {
    if (!apiKey) { setAiText('Add your Claude API key in Settings (top-right ⚙️).'); setShowAi(true); return; }
    setAiLoading(true); setShowAi(true);
    try {
      const answerInfo = question.correct_answer.length > 0
        ? `Correct answer: ${question.correct_answer.map(l => `${l}. ${question.options[l] ?? ''}`).join('; ')}`
        : question.answer_text ? `Answer: ${question.answer_text}` : 'Answer not available';
      const optText = Object.entries(question.options).map(([l, t]) => `${l}. ${t}`).join('\n');

      // For hotspot/match/yesno/dropdown: include structured prompts from interactive data
      let interactiveContext = '';
      if (interactive && interactive.kind !== 'self_grade' && interactive.kind !== 'click') {
        if (interactive.kind === 'yesno') {
          interactiveContext = '\nStatements (Yes/No):\n' +
            interactive.prompts.map((p, i) => `${i + 1}. [${p.correct}] ${p.text}`).join('\n');
        } else if (interactive.kind === 'dropdown') {
          interactiveContext = '\nStatements (fill-in-the-blank):\n' +
            interactive.prompts.map((p, i) =>
              `${i + 1}. ${p.text}\n   Options: ${(p.options ?? []).join(' | ')}\n   Correct: ${p.correct}`
            ).join('\n');
        } else if (interactive.kind === 'match') {
          interactiveContext = '\nDrag-drop matching:\n' +
            `Pool: ${interactive.pool.join(', ')}\n` +
            interactive.prompts.map((p, i) => `${i + 1}. "${p.text}" → ${p.correct}`).join('\n');
        }
      }

      const prompt = `You are a cloud fundamentals tutor. Explain this question concisely (under 150 words).

Question: ${question.question}
${optText ? '\nOptions:\n' + optText : ''}${interactiveContext}
${answerInfo}

IMPORTANT: The correct answer(s) above are AUTHORITATIVE — they come from the trusted answer key. Do NOT contradict them, even if you personally think a different answer is more logical. Your job is to explain WHY the given correct answers are right, why the wrong ones are wrong, and give a brief real-world context. Be direct.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 350,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      let text: string;
      if (data.content?.[0]?.text) {
        text = data.content[0].text;
        localStorage.setItem(`ai_cache_${question.id}`, text);
      } else {
        const errMsg = data.error?.message ?? 'Unknown error';
        const errType = data.error?.type ?? '';
        if (errType === 'overloaded_error' || /overloaded/i.test(errMsg)) {
          text = '⚠️ Claude API is currently overloaded (too many requests). Please wait a moment and click "AI Analysis" again to retry.';
        } else if (errType === 'rate_limit_error' || /rate.?limit/i.test(errMsg)) {
          text = '⚠️ Rate limit reached. Please wait a minute and retry.';
        } else if (errType === 'authentication_error' || /api.?key/i.test(errMsg)) {
          text = '⚠️ API key issue: ' + errMsg + '\n\nCheck your API key in Settings.';
        } else {
          text = '⚠️ Error: ' + errMsg;
        }
      }
      setAiText(text);
    } catch { setAiText('⚠️ Network error. Check your internet connection and API key.'); }
    setAiLoading(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const hasSubmitAction = isMC || isDragDrop || isInteractiveHotspot;
  const isEmptyQuestion = !question.question.trim() && !hasOptions && !hasRealAnswer && !qImages;

  if (isEmptyQuestion) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-mono text-gray-400">#{question.id}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
            {DOMAIN_EMOJI[question.domain] ?? ''} {question.domain}
          </span>
        </div>
        <div className="p-8 text-center text-gray-400">
          <p className="text-3xl mb-3">🖼️</p>
          <p className="font-medium text-gray-500 text-sm">Content not available</p>
          <p className="text-xs mt-1">This question requires an exhibit or image that was not captured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-mono text-gray-400">#{question.id}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
          {DOMAIN_EMOJI[question.domain] ?? ''} {question.domain}
        </span>
        {question.type !== 'multiple_choice' && question.type !== 'yes_no' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium capitalize">
            {question.type.replace('_', ' ')}
          </span>
        )}
        <div className="ml-auto">
          {lastAttempt && (
            <span className={`text-xs font-medium ${lastAttempt.correct ? 'text-green-600' : 'text-red-500'}`}>
              {lastAttempt.correct ? '✓' : '✗'}
            </span>
          )}
        </div>
      </div>

      {/* Question body */}
      <div className="p-4">
        {(() => {
          const hasContextImg =
            qImages?.question_img && (!interactive || interactive.kind !== 'self_grade') &&
            /shown in the following table|shown in the (following )?(exhibit|figure|diagram)|configured as shown/i.test(question.question);
          const hasInlineTable = !!question.table;
          // Split the question into [before table:] + [after table:] so image or table renders inline
          const splitMatch = (hasContextImg || hasInlineTable)
            ? question.question.match(/^([\s\S]*?(?:following table|following exhibit|following figure|following diagram|configured as shown[^:.\n]*)[:.])([\s\S]*)$/i)
            : null;
          const renderText = (text: string) => {
            const parts = text.split(/(<u>.*?<\/u>)/g);
            return parts.map((part, i) => {
              const m = part.match(/^<u>(.*?)<\/u>$/);
              return m ? <u key={i} className="font-semibold">{m[1]}</u> : <span key={i}>{part}</span>;
            });
          };
          if (splitMatch && (qImages?.question_img || question.table)) {
            return (
              <>
                <p className="text-gray-900 font-medium leading-relaxed text-sm mb-2 whitespace-pre-wrap">
                  {index + 1}. {renderText(splitMatch[1])}
                </p>
                {question.table ? (
                  <div className="my-2 overflow-x-auto">
                    <table className="mx-auto border border-gray-300 rounded-md text-sm">
                      <thead>
                        <tr>
                          {question.table.headers.map((h, i) => (
                            <th key={i} className="border-b border-gray-300 bg-gray-50 px-3 py-1.5 font-semibold text-left text-gray-700">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {question.table.rows.map((row, i) => (
                          <tr key={i} className={i % 2 ? 'bg-gray-50/30' : ''}>
                            {row.map((cell, j) => (
                              <td key={j} className="border-t border-gray-200 px-3 py-1.5 text-gray-800">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <img
                    src={qImages!.question_img}
                    alt="Question table"
                    className="max-w-md mx-auto block rounded-lg border border-gray-200 my-2"
                  />
                )}
                {splitMatch[2].trim() && (
                  <p className="text-gray-900 font-medium leading-relaxed text-sm mb-3 whitespace-pre-wrap">
                    {renderText(splitMatch[2].replace(/^\s*\n?/, ''))}
                  </p>
                )}
              </>
            );
          }
          return (
            <>
              <p className="text-gray-900 font-medium leading-relaxed text-sm mb-3 whitespace-pre-wrap">
                {index + 1}. {renderText(question.question)}
              </p>
              {/* Non-interactive question image */}
              {qImages?.question_img && !showAnswer && (!interactive || interactive.kind === 'self_grade') && !isDragDrop && !isInteractiveHotspot && !isMC && (
                <img
                  src={qImages.question_img}
                  alt="Question diagram"
                  className="w-full max-w-lg mx-auto block rounded-lg border border-gray-200 mb-3"
                />
              )}
            </>
          );
        })()}

        {/* Interactive (vision-extracted) UI */}
        {interactive && (
          <InteractiveExam
            data={interactive}
            imageUrl={qImages?.question_img}
            checked={interactiveResult !== null}
            showAnswer={showAnswer}
            onSubmit={(correct) => setInteractiveResult(correct)}
            questionText={question.question}
          />
        )}

        {/* ── Drag-drop UI ──────────────────────────────────────────────────── */}
        {isDragDrop && !showAnswer && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Options pool */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Options</p>
                <div
                  className={`min-h-16 rounded-lg border-2 border-dashed p-1.5 space-y-1.5 transition-colors ${dragOver === 'pool' ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}
                  onDragOver={e => { e.preventDefault(); setDragOver('pool'); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={onDropToPool}
                >
                  {pool.map(key => (
                    <div
                      key={key}
                      draggable
                      onDragStart={e => onDragStart(e, key, 'pool')}
                      className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing text-gray-800 select-none shadow-sm hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                    >
                      {question.options[key]}
                    </div>
                  ))}
                  {pool.length === 0 && (
                    <div className="h-8 flex items-center justify-center text-xs text-gray-300">empty</div>
                  )}
                </div>
              </div>
              {/* Answer area */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Answer Area</p>
                <div
                  className={`min-h-16 rounded-lg border-2 border-dashed p-1.5 space-y-1.5 transition-colors ${dragOver === 'answer' ? 'border-green-400 bg-green-50/30' : answerArea.length > 0 ? 'border-green-200' : 'border-gray-200'}`}
                  onDragOver={e => { e.preventDefault(); setDragOver('answer'); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={onDropToAnswer}
                >
                  {answerArea.map(key => (
                    <div
                      key={key}
                      draggable
                      onDragStart={e => onDragStart(e, key, 'answer')}
                      className="px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing text-gray-800 select-none shadow-sm hover:border-green-500 transition-colors"
                    >
                      {question.options[key]}
                    </div>
                  ))}
                  {answerArea.length === 0 && (
                    <div className="h-8 flex items-center justify-center text-xs text-gray-300">drop here</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Hotspot table UI ──────────────────────────────────────────────── */}
        {isInteractiveHotspot && (
          <div className="mb-3">
            {/* Show question image above so user can read the statements */}
            {qImages?.question_img && !showAnswer && (
              <img
                src={qImages.question_img}
                alt="Statements"
                className="w-full max-w-lg mx-auto block rounded-lg border border-gray-200 mb-3"
              />
            )}
            {!showAnswer && (
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold">Statement</th>
                    <th className="px-4 py-2 text-gray-500 font-semibold w-14">Yes</th>
                    <th className="px-4 py-2 text-gray-500 font-semibold w-14">No</th>
                  </tr>
                </thead>
                <tbody>
                  {hotspotBoxes.map((b, i) => (
                    <tr key={b.n} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2.5 text-gray-600">Statement {b.n}</td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="radio"
                          name={`q${question.id}-box${b.n}`}
                          checked={hotspotPicks[b.n] === 'Yes'}
                          disabled={hotspotChecked}
                          onChange={() => setHotspotPicks(p => ({ ...p, [b.n]: 'Yes' }))}
                          className="w-4 h-4 accent-green-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="radio"
                          name={`q${question.id}-box${b.n}`}
                          checked={hotspotPicks[b.n] === 'No'}
                          disabled={hotspotChecked}
                          onChange={() => setHotspotPicks(p => ({ ...p, [b.n]: 'No' }))}
                          className="w-4 h-4 accent-red-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── MC options ────────────────────────────────────────────────────── */}
        {isMC && (
          <>
            {isMulti && !showAnswer && (
              <p className="text-xs text-blue-500 mb-2 font-medium">Select all that apply</p>
            )}
            <div className="flex flex-col gap-1.5 mb-3">
              {Object.entries(question.options).map(([letter, text]) => (
                <button key={letter} onClick={() => toggleOption(letter)} disabled={showAnswer} className={optClass(letter)}>
                  <span className="flex gap-2 items-start">
                    <span className={`shrink-0 w-5 h-5 rounded border-2 text-xs font-bold flex items-center justify-center mt-0.5 transition-colors ${
                      showAnswer
                        ? question.correct_answer.includes(letter)
                          ? 'border-green-500 bg-green-500 text-white'
                          : selected.includes(letter)
                          ? 'border-red-400 bg-red-400 text-white'
                          : 'border-gray-200 text-gray-300'
                        : selected.includes(letter)
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 text-gray-400'
                    }`}>{letter}</span>
                    <span>{text}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-2">
          {/* Submit */}
          {isMC && !showAnswer && (
            <button
              onClick={handleMcSubmit}
              disabled={selected.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
            >Submit</button>
          )}
          {isDragDrop && !showAnswer && (
            <button
              onClick={handleDragSubmit}
              disabled={answerArea.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
            >Submit</button>
          )}
          {isInteractiveHotspot && !showAnswer && (
            <button
              onClick={handleHotspotSubmit}
              disabled={!hotspotBoxes.every(b => hotspotPicks[b.n] !== undefined)}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-35 hover:bg-blue-700 transition-colors"
            >Submit</button>
          )}
          {/* Show/Hide Answer toggle */}
          <button
            onClick={() => setShowAnswer(v => !v)}
            className={`${hasSubmitAction ? 'flex-1' : 'w-full'} py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              showAnswer
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30'
            }`}
          >{showAnswer ? 'Hide Answer' : 'Show Answer'}</button>
        </div>

        {/* ── Submit result feedback ───────────────────────── */}
        {interactiveResult !== null && (
          <div className={`mb-2 p-2.5 rounded-lg text-sm font-medium ${interactiveResult ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {(() => {
              const n = interactive && 'prompts' in interactive ? interactive.prompts.length : 1;
              if (interactiveResult) return n > 1 ? '✓ All correct!' : '✓ Correct!';
              return n > 1 ? '✗ Some answers are incorrect' : '✗ Incorrect';
            })()}
          </div>
        )}
        {mcResult !== null && (
          <div className={`mb-2 p-2.5 rounded-lg text-sm font-medium ${mcResult ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mcResult ? '✓ Correct!' : `✗ Incorrect — correct: ${question.correct_answer.join(', ')}`}
          </div>
        )}
        {dragResult !== null && (
          <div className={`mb-2 p-2.5 rounded-lg text-sm font-medium ${dragResult ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {dragResult ? '✓ Correct!' : `✗ Incorrect`}
          </div>
        )}

        {/* ── Answer panel ─────────────────────────────────────────────────── */}
        {showAnswer && (
          <div className="space-y-2">
            {/* Hotspot per-box result */}
            {hotspotChecked && hotspotBoxes.length > 0 && (
              <div className="space-y-1 mb-2">
                {hotspotBoxes.map(b => {
                  const picked = hotspotPicks[b.n];
                  const correct = hotspotResults[b.n];
                  return (
                    <div key={b.n} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      <span className="font-bold">Box {b.n}</span>
                      <span>{correct ? '✓' : '✗'}</span>
                      <span>You: {picked ?? '—'}</span>
                      {!correct && <span className="ml-auto">Correct: {b.answer}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer box */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Answer</p>

              {/* MC letter answers — hide for interactive types since the box rendering covers it */}
              {question.correct_answer.length > 0 && Object.keys(question.options).length > 0 && !interactive && (
                <div className="mb-2 space-y-0.5">
                  {question.correct_answer.map(l => (
                    <p key={l} className="text-sm font-semibold text-gray-800">
                      <span className="text-green-700">{l}.</span> {question.options[l]}
                    </p>
                  ))}
                </div>
              )}

              {/* Letter only (no options) — hide for interactive types */}
              {question.correct_answer.length > 0 && Object.keys(question.options).length === 0 && !interactive && (
                <p className="text-sm font-bold text-green-700 mb-2">{question.correct_answer.join(', ')}</p>
              )}

              {/* Box N: structured answers */}
              {(() => {
                let boxes = parseBoxes(cleanAnswerText || question.answer_text || '');
                // Fallback: for yesno/dropdown interactive data, fill in missing or empty-detail boxes
                // using the prompt statement text
                if (interactive && (interactive.kind === 'yesno' || interactive.kind === 'dropdown')) {
                  const expected = interactive.prompts.length;
                  const existing = new Map(boxes.map(b => [b.n, b]));
                  if (boxes.length < expected || boxes.some(b => !b.detail.trim())) {
                    const isYesNo = interactive.kind === 'yesno';
                    boxes = interactive.prompts.map((p, i) => {
                      const n = i + 1;
                      const existingBox = existing.get(n);
                      if (existingBox && existingBox.detail.trim()) return existingBox;
                      return {
                        n,
                        answer: existingBox?.answer || (isYesNo ? p.correct : ''),
                        // For yesno: don't repeat statement when no real explanation exists (user can see the statement above)
                        // For dropdown: always show the prompt → correct since it's the actual answer
                        detail: isYesNo ? '' : `${p.text} → ${p.correct}`,
                      };
                    });
                  }
                }
                // Special case: single-prompt dropdown — don't show "Box 1" label, render prose explanation
                const isSinglePromptDropdown =
                  interactive?.kind === 'dropdown' &&
                  interactive.prompts.length === 1 &&
                  boxes.length === 1;
                if (isSinglePromptDropdown) {
                  const p = interactive.prompts[0];
                  return (
                    <div className="mb-2 space-y-1.5">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        <span className="text-gray-600">{p.text}</span>
                        {' → '}
                        <span className="font-semibold text-green-700">{p.correct}</span>
                      </p>
                      {cleanAnswerText && !cleanAnswerText.match(/^Box\s+\d+/i) && (
                        <p className="text-xs text-gray-600 leading-relaxed">{cleanAnswerText}</p>
                      )}
                    </div>
                  );
                }
                if (boxes.length > 0) {
                  // If answer_text is prose (no Box N markers) and we filled boxes from fallback,
                  // show the prose explanation below as overall context
                  const hasBoxMarkers = /Box\s+\d+\s*:/i.test(cleanAnswerText);
                  const proseExplanation = !hasBoxMarkers && cleanAnswerText ? cleanAnswerText : '';
                  return (
                    <div className="flex flex-col gap-1.5 mb-2">
                      {boxes.map((b, idx) => (
                        <div key={b.n} className="contents">
                          <div className="flex gap-2 items-start">
                            <span className="shrink-0 w-14 text-xs font-bold text-amber-700 pt-0.5">Box {b.n}</span>
                            {b.answer ? (
                              <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${b.answer.toLowerCase() === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {b.answer}
                              </span>
                            ) : null}
                            {b.detail && <span className="text-xs text-gray-600 leading-relaxed">{b.detail}</span>}
                          </div>
                          {qImages?.answer_inline_img && idx === 0 && boxes.length > 1 && (
                            <img
                              src={qImages.answer_inline_img}
                              alt="Answer diagram"
                              className="w-full max-w-lg mx-auto block rounded-lg my-1"
                            />
                          )}
                        </div>
                      ))}
                      {proseExplanation && (
                        <p className="text-xs text-gray-600 leading-relaxed mt-1">{proseExplanation}</p>
                      )}
                    </div>
                  );
                }
                if (cleanAnswerText) {
                  return <p className="text-sm text-gray-700 leading-relaxed mb-2">{cleanAnswerText}</p>;
                }
                return null;
              })()}

              {/* Reference link(s) — show all URLs after "References:" */}
              {(() => {
                const refs = extractRefs(question.answer_text || '');
                if (refs.length === 0) return null;
                return (
                  <div className="mt-1 space-y-0.5">
                    {refs.map((r, i) => (
                      <a key={i} href={r} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all block text-xs">
                        🔗 Reference{refs.length > 1 ? ` ${i + 1}` : ''}
                      </a>
                    ))}
                  </div>
                );
              })()}

              {/* Answer image */}
              {qImages?.answer_img && (
                <img
                  src={qImages.answer_img}
                  alt="Answer diagram"
                  className="w-full max-w-lg mx-auto block rounded-lg mt-2"
                />
              )}

              {/* No answer fallback */}
              {!hasRealAnswer && !qImages?.answer_img && (() => {
                const ref = extractRef(question.answer_text || '');
                return (
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>No text answer available.</p>
                    {ref && (
                      <a href={ref} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all block">
                        🔗 View on Microsoft Docs
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {!showAi ? (
          <button
            onClick={fetchAI}
            className="mt-3 w-full py-2.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
          >
            🤖 AI Analysis
          </button>
        ) : (
          <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-purple-700 mb-1.5">🤖 AI Analysis</p>
            {aiLoading
              ? <p className="text-xs text-purple-400 animate-pulse">Analyzing...</p>
              : <MarkdownLite text={aiText} />
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Navigator ───────────────────────────────────────────────────────
function QuestionNav({ currentId, visitedIds, onJump, questions }: {
  currentId: number;
  visitedIds: Set<number>;
  onJump: (id: number) => void;
  questions: Question[];
}) {
  return (
    <div className="flex flex-wrap gap-1 py-2 max-h-48 overflow-y-auto">
      {questions.map(q => {
        const isCurrent = q.id === currentId;
        const isVisited = visitedIds.has(q.id);
        const color = isCurrent
          ? 'bg-blue-600 text-white'
          : isVisited
            ? 'bg-gray-300 text-gray-500 hover:bg-gray-400'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200';
        return (
          <button
            key={q.id}
            onClick={() => onJump(q.id)}
            className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors shrink-0 ${color}`}
          >
            {q.id}
          </button>
        );
      })}
    </div>
  );
}

// ─── Browse Page ──────────────────────────────────────────────────────────────
export function BrowsePage({ progress, onAnswer: _onAnswer, onNavigate, apiKey, activeCert }: Props) {
  const certQuestions = useMemo(() => questionsForCert(activeCert), [activeCert]);
  const certDomains = useMemo(() => domainsForCert(activeCert), [activeCert]);
  const lastIdStorageKey = `browse_last_id_${activeCert}`;

  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'wrong' | 'unseen'>('all');
  const [search, setSearch] = useState('');
  const [idx, setIdx] = useState(() => {
    const lastId = parseInt(localStorage.getItem(lastIdStorageKey) ?? '0');
    const found = lastId ? certQuestions.findIndex(q => q.id === lastId) : -1;
    return found >= 0 ? found : 0;
  });
  const [, setShowNav] = useState(false);
  const [visitedIds, setVisitedIds] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(`browse_visited_${activeCert}`);
      return saved ? new Set<number>(JSON.parse(saved)) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  // Stable filtered array
  const filtered = useMemo(() => certQuestions.filter(q => {
    if (filterDomain && q.domain !== filterDomain) return false;
    if (filterStatus === 'wrong') {
      const a = progress.results[q.id] ?? [];
      return a.length > 0 && !a[a.length - 1].correct;
    }
    if (filterStatus === 'unseen') return (progress.results[q.id] ?? []).length === 0;
    if (search) return q.question.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [filterDomain, filterStatus, search, progress.results, certQuestions]);

  useEffect(() => { window.scrollTo(0, 0); }, [idx]);

  // Persist last question ID + track visited (per-cert)
  useEffect(() => {
    const q = filtered[idx];
    if (!q) return;
    if (!filterDomain && filterStatus === 'all' && !search) {
      localStorage.setItem(lastIdStorageKey, String(q.id));
    }
    setVisitedIds(prev => {
      if (prev.has(q.id)) return prev;
      const s = new Set(prev);
      s.add(q.id);
      localStorage.setItem(`browse_visited_${activeCert}`, JSON.stringify([...s]));
      return s;
    });
  }, [idx, filtered, filterDomain, filterStatus, search, lastIdStorageKey, activeCert]);

  const question = filtered[idx];
  const total = filtered.length;

  // Filter helpers — reset idx inline so no useEffect fires on mount
  function setDomainFilter(d: string) { setFilterDomain(d); setIdx(0); }
  function setStatusFilter(s: 'all' | 'wrong' | 'unseen') { setFilterStatus(s); setIdx(0); }
  function setSearchFilter(s: string) { setSearch(s); setIdx(0); }

  function jumpToId(id: number) {
    setFilterDomain('');
    setFilterStatus('all');
    setSearch('');
    const globalIdx = certQuestions.findIndex(q => q.id === id);
    if (globalIdx >= 0) setIdx(globalIdx);
    setShowNav(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Top nav */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => onNavigate('home')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Home
          </button>
          <span className="font-semibold text-gray-900 text-sm ml-1">Browse Questions</span>
        </div>

        {/* Question navigator — always visible */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
            <span>Question {question?.id ?? '—'} / {certQuestions.length}</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" /> current</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" /> visited</span>
          </div>
          <QuestionNav currentId={question?.id ?? 0} visitedIds={visitedIds} onJump={jumpToId} questions={certQuestions} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 space-y-2">
          <input
            value={search}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Search questions..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
          />
          <div className="flex gap-2">
            <select
              value={filterDomain}
              onChange={e => setDomainFilter(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            >
              <option value="">All Domains</option>
              {certDomains.map(d => <option key={d} value={d}>{DOMAIN_EMOJI[d] ?? ''} {d}</option>)}
            </select>
            <div className="flex gap-1">
              {(['all', 'wrong', 'unseen'] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'all' ? 'All' : f === 'wrong' ? '✗ Wrong' : '○ New'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar + counter */}
        {total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>{idx + 1} / {total}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setIdx(i => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  className="px-2 py-1 rounded text-xs bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >←</button>
                <button
                  onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
                  disabled={idx >= total - 1}
                  className="px-2 py-1 rounded text-xs bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >→</button>
              </div>
            </div>
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((idx + 1) / total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Single question */}
        {question ? (
          <>
            <QuestionCard
              key={question.id}
              question={question}
              index={idx}
              progress={progress}
              apiKey={apiKey}
            />
            {/* Bottom nav */}
            <div className="flex gap-2 mt-4 pb-8">
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
                disabled={idx >= total - 1}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 py-20 text-sm">No questions match your filter.</p>
        )}
      </div>
    </div>
  );
}
