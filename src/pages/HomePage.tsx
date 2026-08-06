import { useState, useRef, useEffect } from 'react';
import type { ProgressState } from '../hooks/useProgress';
import type { CertificationKey } from '../data/questions';
import { CERTIFICATIONS, questionsForCert, quizQuestionsForCert, domainsForCert } from '../data/questions';
import { DOMAIN_EMOJI } from '../data/studyContent';

interface Props {
  progress: ProgressState;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onReset: () => void;
  activeCert: CertificationKey;
  setCertification: (cert: CertificationKey) => void;
}

export function HomePage({ progress, onNavigate, onReset, activeCert, setCertification }: Props) {
  const certQuestions = questionsForCert(activeCert);
  const certQuiz = quizQuestionsForCert(activeCert);
  const certDomains = domainsForCert(activeCert);
  const certMeta = CERTIFICATIONS.find(c => c.key === activeCert)!;
  const [certOpen, setCertOpen] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  // Close cert dropdown when clicking outside
  useEffect(() => {
    if (!certOpen) return;
    function onClick(e: MouseEvent) {
      if (certRef.current && !certRef.current.contains(e.target as Node)) {
        setCertOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [certOpen]);

  // Only count progress for questions in the active cert
  const certQuestionIds = new Set(certQuestions.map(q => q.id));
  const attempted = Object.keys(progress.results).filter(id => certQuestionIds.has(Number(id))).length;
  const allAttempts = Object.entries(progress.results)
    .filter(([id]) => certQuestionIds.has(Number(id)))
    .flatMap(([, v]) => v);
  const correct = allAttempts.filter(a => a.correct).length;
  const accuracy = allAttempts.length > 0 ? Math.round((correct / allAttempts.length) * 100) : 0;

  // Exam history filtered by cert (attempts stored per-cert if new; legacy attempts without cert shown under AZ-900)
  const certExamHistory = progress.examHistory.filter(a => (a.certification ?? 'AZ-900') === activeCert);

  const domainStats = certDomains.map(domain => {
    const qs = certQuestions.filter(q => q.domain === domain);
    const attempted = qs.filter(q => (progress.results[q.id] ?? []).length > 0).length;
    const correct = qs.filter(q => {
      const a = progress.results[q.id] ?? [];
      return a[a.length - 1]?.correct;
    }).length;
    return { domain, total: qs.length, attempted, correct };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <svg viewBox="0 0 40 40" className="w-10 h-10 shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="skillpath-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="10" fill="url(#skillpath-logo-bg)" />
            {/* Ascending path — dashed */}
            <path
              d="M 10 30 Q 15 22, 20 22 T 30 12"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2 2.5"
              fill="none"
            />
            {/* Waypoint 1 (start, smallest) */}
            <circle cx="10" cy="30" r="2.5" fill="white" />
            {/* Waypoint 2 (middle) */}
            <circle cx="20" cy="22" r="3" fill="white" />
            {/* Waypoint 3 (destination — with ring, largest) */}
            <circle cx="30" cy="12" r="6.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <circle cx="30" cy="12" r="4" fill="white" />
          </svg>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SkillPath</h1>
            <p className="text-xs text-gray-400">Cloud fundamentals · {certQuestions.length} practice items</p>
          </div>

          {/* Cert switcher — header dropdown */}
          <div ref={certRef} className="ml-auto relative">
            <button
              onClick={() => setCertOpen(o => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              title="Switch certification"
            >
              <span>{certMeta.emoji}</span>
              <span>{certMeta.shortName}</span>
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${certOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {certOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-20 overflow-hidden">
                <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100">Certifications</p>
                <div className="max-h-72 overflow-y-auto">
                  {CERTIFICATIONS.map(c => {
                    const isActive = c.key === activeCert;
                    const certQs = questionsForCert(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => { setCertification(c.key); setCertOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base">{c.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                            {c.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {c.shortName} · {c.provider} · {certQs.length} items
                          </p>
                        </div>
                        {isActive && (
                          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400">
                  More certifications coming soon
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {attempted > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{attempted}</p>
              <p className="text-xs text-gray-400 mt-0.5">Tried</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-xl font-bold text-green-600">{accuracy}%</p>
              <p className="text-xs text-gray-400 mt-0.5">Accuracy</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-xl font-bold text-purple-600">{certExamHistory.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Exams</p>
            </div>
          </div>
        )}

        {/* Main modes: Study (primary) + Exam */}
        <div className="flex flex-col gap-3 mb-6">

          {/* Module Study — primary */}
          <div className="bg-white rounded-2xl border-2 border-green-100 hover:border-green-400 transition-all group shadow-sm overflow-hidden">
            <button
              onClick={() => onNavigate('modules')}
              className="w-full p-5 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center text-2xl transition-colors">
                  🎯
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-base">Study by Module</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Read notes → practice domain questions
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            {/* Subordinate: browse question bank */}
            <button
              onClick={() => onNavigate('browse')}
              className="w-full px-5 py-2.5 border-t border-gray-100 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex items-center gap-2"
            >
              <span>📖</span>
              <span>Or browse all {certQuestions.length} items in order</span>
              <svg className="w-3.5 h-3.5 ml-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Exam */}
          <button
            onClick={() => onNavigate('exam')}
            className="bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-400 p-5 text-left transition-all group shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-2xl transition-colors">
                📝
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base">Exam Simulation</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {certMeta.name} · {certQuiz.length} items · 45q timed · Pass = 70%
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Exam History (filtered by active cert) */}
        {certExamHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Exam History</h2>
              <span className="text-xs text-gray-400">{certExamHistory.length} total</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {certExamHistory.slice(0, 5).map(a => {
                const pct = Math.round((a.score / a.total) * 100);
                const pass = pct >= 70;
                const reviewable = !!a.questionIds;
                return (
                  <button
                    key={a.id}
                    onClick={() => reviewable && onNavigate('examReview', { attemptId: a.id })}
                    disabled={!reviewable}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 text-left transition-colors ${
                      reviewable ? 'hover:bg-blue-50/40 cursor-pointer' : 'opacity-70 cursor-default'
                    }`}
                  >
                    <span className={`text-base font-bold ${pass ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                    <div className="flex-1 text-xs text-gray-500">
                      <p className="text-gray-700">{a.score}/{a.total} correct · {new Date(a.date).toLocaleString()}</p>
                      <p>{Math.floor(a.durationSec / 60)} min {a.durationSec % 60}s</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {pass ? 'PASS' : 'FAIL'}
                    </span>
                    {reviewable && (
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Domain Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Domain Progress</h2>
          <div className="flex flex-col gap-2.5">
            {domainStats.map(({ domain, total, attempted, correct }) => {
              const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
              return (
                <button key={domain} onClick={() => onNavigate('modules', { domain })} className="w-full text-left group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600 transition-colors">
                      {DOMAIN_EMOJI[domain] ?? '🔷'} {domain}
                    </span>
                    <span className="text-xs text-gray-400">{attempted}/{total} · {pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div className="h-full bg-green-400 transition-all" style={{ width: `${(correct / total) * 100}%` }} />
                      <div className="h-full bg-red-300 transition-all" style={{ width: `${((attempted - correct) / total) * 100}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {attempted > 0 && (
          <div className="mt-4 text-center">
            <button onClick={() => { if (confirm('Reset all progress?')) onReset(); }} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
              Reset progress
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
