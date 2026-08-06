import { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { ModulesPage } from './pages/ModulesPage';
import { ExamPage } from './pages/ExamPage';
import { ExamReviewPage } from './pages/ExamReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { useProgress } from './hooks/useProgress';
import { useCertification } from './hooks/useCertification';
import type { ExamAttempt } from './hooks/useProgress';

type Page = 'home' | 'browse' | 'modules' | 'exam' | 'examReview' | 'settings';

const API_KEY_STORAGE = 'skillpath_claude_api_key';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [params, setParams] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem(API_KEY_STORAGE) ?? localStorage.getItem('az900_claude_api_key') ?? ''
  );
  const { state, recordAnswer, recordExam, resetProgress } = useProgress();
  const cert = useCertification();

  function navigate(p: string, newParams?: Record<string, string>) {
    setPage(p as Page);
    setParams(newParams ?? {});
    window.scrollTo(0, 0);
  }

  function saveApiKey(key: string) {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  }

  if (page === 'browse') {
    return <BrowsePage progress={state} onAnswer={recordAnswer} onNavigate={navigate} apiKey={apiKey} activeCert={cert.active} />;
  }
  if (page === 'modules') {
    return <ModulesPage progress={state} onAnswer={recordAnswer} onNavigate={navigate} initialDomain={params.domain} activeCert={cert.active} />;
  }
  if (page === 'exam') {
    return <ExamPage onNavigate={navigate} onExamComplete={(a: ExamAttempt) => recordExam(a)} activeCert={cert.active} />;
  }
  if (page === 'examReview' && params.attemptId) {
    return <ExamReviewPage progress={state} attemptId={params.attemptId} onNavigate={navigate} />;
  }
  if (page === 'settings') {
    return <SettingsPage apiKey={apiKey} onSave={saveApiKey} onNavigate={navigate} onReset={resetProgress} />;
  }
  return <HomePage progress={state} onNavigate={navigate} onReset={resetProgress} activeCert={cert.active} setCertification={cert.setCertification} />;
}
