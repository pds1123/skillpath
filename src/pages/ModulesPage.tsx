import { useState, useMemo } from 'react';
import { questionsForCert, quizQuestionsForCert } from '../data/questions';
import type { CertificationKey } from '../data/questions';
import { studyContentForCert, DOMAIN_EMOJI } from '../data/studyContent';
import type { ProgressState } from '../hooks/useProgress';

interface Props {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onNavigate: (page: string) => void;
  initialDomain?: string;
  activeCert: CertificationKey;
}

// ─── Module List ─────────────────────────────────────────────────────────────
function ModuleList({ progress, onSelect, certQuestions, activeCert }: {
  progress: ProgressState;
  onSelect: (d: string) => void;
  certQuestions: import('../data/questions').Question[];
  activeCert: CertificationKey;
}) {
  return (
    <div className="flex flex-col gap-2">
      {studyContentForCert(activeCert).map(({ domain, emoji, summary }) => {
        const qs = certQuestions.filter(q => q.domain === domain);
        const done = qs.filter(q => (progress.results[q.id] ?? []).length > 0).length;
        const correct = qs.filter(q => {
          const a = progress.results[q.id] ?? [];
          return a[a.length - 1]?.correct;
        }).length;
        return (
          <button
            key={domain}
            onClick={() => onSelect(domain)}
            className="bg-white rounded-xl border border-gray-200 hover:border-green-400 p-4 text-left transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-green-700 transition-colors">{domain}</h3>
                <p className="text-xs text-gray-400">{summary.slice(0, 60)}…</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-gray-600">{done}/{qs.length}</p>
                <p className={`text-xs font-bold ${correct / Math.max(done, 1) >= 0.7 ? 'text-green-600' : done > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                  {done > 0 ? `${Math.round((correct / done) * 100)}%` : '—'}
                </p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div className="h-full bg-green-400 transition-all" style={{ width: `${(correct / qs.length) * 100}%` }} />
                <div className="h-full bg-red-300 transition-all" style={{ width: `${((done - correct) / qs.length) * 100}%` }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Domain Detail ────────────────────────────────────────────────────────────
type DomainTab = 'study' | 'practice';

function DomainDetail({
  domain, onAnswer, onBack, activeCert,
}: {
  domain: string;
  onAnswer: (id: number, correct: boolean, sel: string[]) => void;
  onBack: () => void;
  activeCert: CertificationKey;
}) {
  const [tab, setTab] = useState<DomainTab>('study');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  const studyData = studyContentForCert(activeCert).find(d => d.domain === domain);
  const practiceQs = useMemo(() =>
    quizQuestionsForCert(activeCert).filter(q => q.domain === domain), [domain, activeCert]);

  function resetQuestion() {
    setSelected([]); setSubmitted(false);
  }

  function goQuestion(idx: number) {
    setPracticeIndex(idx); resetQuestion();
  }

  const q = practiceQs[practiceIndex];
  const isMulti = q?.correct_answer.length > 1;

  function toggle(letter: string) {
    if (submitted) return;
    setSelected(prev => isMulti
      ? prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]
      : [letter]);
  }

  function submit() {
    if (!selected.length || submitted) return;
    setSubmitted(true);
    const correct = selected.length === q.correct_answer.length && selected.every(s => q.correct_answer.includes(s));
    onAnswer(q.id, correct, selected);
  }

  function optClass(letter: string) {
    const base = 'w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm cursor-pointer';
    if (!submitted) return `${base} ${selected.includes(letter) ? 'border-green-500 bg-green-50 text-green-900' : 'border-gray-200 bg-white hover:border-green-300 text-gray-800'}`;
    if (q.correct_answer.includes(letter)) return `${base} border-green-500 bg-green-50 text-green-900`;
    if (selected.includes(letter)) return `${base} border-red-400 bg-red-50 text-red-900`;
    return `${base} border-gray-200 bg-gray-50 text-gray-400`;
  }

  const isCorrect = submitted && selected.length === q?.correct_answer.length && selected.every(s => q.correct_answer.includes(s));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Modules
        </button>
        <span className="text-base font-semibold text-gray-900">{DOMAIN_EMOJI[domain] ?? ''} {domain}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {(['study', 'practice'] as DomainTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'study' ? '📚 Study Notes' : `✏️ Practice (${practiceQs.length})`}
          </button>
        ))}
      </div>

      {/* Study Tab */}
      {tab === 'study' && studyData && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 italic">{studyData.summary}</p>
          {studyData.sections.map((sec, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-800 text-sm">{sec.title}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openSection === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openSection === i && (
                <div className="px-4 pb-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border-t border-gray-100">
                  <div className="pt-3">{sec.content}</div>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setTab('practice')}
            className="w-full mt-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            Start Practice Questions →
          </button>
        </div>
      )}

      {/* Practice Tab */}
      {tab === 'practice' && (
        <div>
          {practiceQs.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No quiz questions available for this domain.</p>
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
                <span>{practiceIndex + 1} / {practiceQs.length}</span>
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  {domain}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${((practiceIndex + 1) / practiceQs.length) * 100}%` }} />
              </div>

              {/* Question */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                <div className="flex items-start gap-3 mb-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">{practiceIndex + 1}</span>
                  <div>
                    {isMulti && !submitted && <p className="text-xs text-green-600 mb-1.5 font-medium">Select all that apply</p>}
                    <p className="text-gray-900 font-medium leading-relaxed text-sm whitespace-pre-wrap">{q.question}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(q.options).map(([l, t]) => (
                    <button key={l} onClick={() => toggle(l)} disabled={submitted} className={optClass(l)}>
                      <span className="flex gap-2.5 items-start">
                        <span className={`shrink-0 w-5 h-5 rounded border-2 text-xs font-bold flex items-center justify-center mt-0.5 ${
                          submitted ? q.correct_answer.includes(l) ? 'border-green-500 bg-green-500 text-white' : selected.includes(l) ? 'border-red-400 bg-red-400 text-white' : 'border-gray-300 text-gray-400'
                          : selected.includes(l) ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-500'
                        }`}>{l}</span>
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
                {submitted && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    {isCorrect ? '✓ Correct!' : `✗ Correct answer: ${q.correct_answer.join(', ')}`}
                  </div>
                )}
                {!submitted && (
                  <button onClick={submit} disabled={!selected.length} className="mt-4 w-full py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
                    Submit
                  </button>
                )}
              </div>

              {submitted && (
                <button
                  onClick={() => {
                    if (practiceIndex < practiceQs.length - 1) goQuestion(practiceIndex + 1);
                    else setTab('study');
                  }}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 transition-colors"
                >
                  {practiceIndex < practiceQs.length - 1 ? 'Next Question →' : 'Finish ✓'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ModulesPage({ progress, onAnswer, onNavigate, initialDomain, activeCert }: Props) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(initialDomain ?? null);
  const certQuestions = useMemo(() => questionsForCert(activeCert), [activeCert]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {!selectedDomain ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => onNavigate('home')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Home
              </button>
              <span className="font-semibold text-gray-900">Study by Module</span>
            </div>
            <ModuleList progress={progress} onSelect={setSelectedDomain} certQuestions={certQuestions} activeCert={activeCert} />
          </>
        ) : (
          <DomainDetail
            domain={selectedDomain}
            onAnswer={onAnswer}
            onBack={() => setSelectedDomain(null)}
            activeCert={activeCert}
          />
        )}
      </div>
    </div>
  );
}
