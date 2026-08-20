import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import type { PracticeMode } from './pages/PracticePage';
import { useProgress } from './hooks/useProgress';
import { useCertification } from './hooks/useCertification';
import type { ExamAttempt, ProgressState } from './hooks/useProgress';
import type { CertificationKey } from './data/questions';

import { useAuth } from './auth/useAuth';

type Page = 'home' | 'cloud' | 'tutorial' | 'browse' | 'modules' | 'practice' | 'certification' | 'exam' | 'examReview' | 'settings' | 'login' | 'admin' | 'adminQuestion' | 'adminModules' | 'adminModule';
type NavigateTo = (page: string, params?: Record<string, string>) => void;

const API_KEY_STORAGE = 'skillpath_claude_api_key';
const PRACTICE_MODES = new Set<PracticeMode>(['quick', 'weak', 'mistakes']);

const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const ExploreHomePage = lazy(() => import('./pages/ExploreHomePage').then(module => ({ default: module.ExploreHomePage })));
const CloudPage = lazy(() => import('./pages/CloudPage').then(module => ({ default: module.CloudPage })));
const BrowsePage = lazy(() => import('./pages/BrowsePage').then(module => ({ default: module.BrowsePage })));
const ModulesPage = lazy(() => import('./pages/ModulesPage').then(module => ({ default: module.ModulesPage })));
const ExamPage = lazy(() => import('./pages/ExamPage').then(module => ({ default: module.ExamPage })));
const ExamReviewPage = lazy(() => import('./pages/ExamReviewPage').then(module => ({ default: module.ExamReviewPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const PracticePage = lazy(() => import('./pages/PracticePage').then(module => ({ default: module.PracticePage })));
const CertificationPage = lazy(() => import('./pages/CertificationPage').then(module => ({ default: module.CertificationPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const AdminQuestionsPage = lazy(() => import('./pages/AdminQuestionsPage').then(module => ({ default: module.AdminQuestionsPage })));
const AdminQuestionEditorPage = lazy(() => import('./pages/AdminQuestionEditorPage').then(module => ({ default: module.AdminQuestionEditorPage })));
const AdminModulesPage = lazy(() => import('./pages/AdminModulesPage').then(module => ({ default: module.AdminModulesPage })));
const AdminModuleEditorPage = lazy(() => import('./pages/AdminModuleEditorPage').then(module => ({ default: module.AdminModuleEditorPage })));

function RouteLoading() {
  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] px-5 py-8" role="status" aria-label="Loading page">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-4 w-28 rounded bg-[var(--sp-border)]" />
        <div className="mt-10 h-8 w-64 max-w-full rounded bg-[var(--sp-primary-100)]" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-[var(--sp-border)]" />
        <div className="mt-10 h-48 rounded-xl bg-white ring-1 ring-[var(--sp-border)]" />
      </div>
    </div>
  );
}

function pagePath(page: string, params: Record<string, string> = {}) {
  switch (page as Page) {
    case 'home':
      return params.section ? `/?section=${encodeURIComponent(params.section)}` : '/';
    case 'cloud':
      return '/cloud';
    case 'tutorial':
      return '/learning';
    case 'browse':
      return '/questions';
    case 'modules':
      return params.module || params.domain
        ? `/learning/modules/${encodeURIComponent(params.module ?? params.domain)}`
        : '/learning/modules';
    case 'practice':
      return `/practice/${PRACTICE_MODES.has(params.mode as PracticeMode) ? params.mode : 'quick'}`;
    case 'certification':
      return '/certification';
    case 'exam':
      return '/certification/mock-assessment';
    case 'examReview':
      return params.attemptId
        ? `/certification/mock-assessment/${encodeURIComponent(params.attemptId)}/review`
        : '/certification';
    case 'settings':
      return '/settings';
    case 'login':
      return '/login';
    case 'admin':
      return '/admin/questions';
    case 'adminQuestion':
      return params.questionId ? `/admin/questions/${encodeURIComponent(params.questionId)}` : '/admin/questions/new';
    case 'adminModules':
      return '/admin/modules';
    case 'adminModule':
      return params.moduleId ? `/admin/modules/${encodeURIComponent(params.moduleId)}` : '/admin/modules/new';
    default:
      return '/';
  }
}

function AdminAccess({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function ModulesRoute({
  progress,
  onAnswer,
  onToggleLesson,
  onNavigate,
  activeCert,
}: {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onToggleLesson: (lessonId: string) => void;
  onNavigate: NavigateTo;
  activeCert: CertificationKey;
}) {
  const { moduleKey } = useParams();

  return (
    <ModulesPage
      progress={progress}
      onAnswer={onAnswer}
      onToggleLesson={onToggleLesson}
      onNavigate={onNavigate}
      initialModule={moduleKey ? decodeURIComponent(moduleKey) : undefined}
      activeCert={activeCert}
    />
  );
}

function PracticeRoute({
  progress,
  onAnswer,
  onNavigate,
  activeCert,
}: {
  progress: ProgressState;
  onAnswer: (questionId: number, correct: boolean, selected: string[]) => void;
  onNavigate: NavigateTo;
  activeCert: CertificationKey;
}) {
  const { mode: routeMode } = useParams();
  if (!PRACTICE_MODES.has(routeMode as PracticeMode)) {
    return <Navigate to="/practice/quick" replace />;
  }

  const mode = routeMode as PracticeMode;
  return (
    <PracticePage
      key={`${activeCert}-${mode}`}
      progress={progress}
      onAnswer={onAnswer}
      onNavigate={onNavigate}
      activeCert={activeCert}
      mode={mode}
    />
  );
}

function ExamReviewRoute({
  progress,
  onNavigate,
}: {
  progress: ProgressState;
  onNavigate: NavigateTo;
}) {
  const { attemptId } = useParams();
  if (!attemptId) return <Navigate to="/certification" replace />;

  return (
    <ExamReviewPage
      progress={progress}
      attemptId={decodeURIComponent(attemptId)}
      onNavigate={onNavigate}
    />
  );
}

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem(API_KEY_STORAGE) ?? localStorage.getItem('az900_claude_api_key') ?? ''
  );
  const { state, recordAnswer, recordExam, resetProgress, toggleLesson } = useProgress();
  const cert = useCertification();

  const navigate = useCallback<NavigateTo>((page, params) => {
    routerNavigate(pagePath(page, params));
  }, [routerNavigate]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (location.pathname === '/' && section) {
      requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const titleByPath: Array<[RegExp, string]> = [
      [/^\/$/, 'SkillPath'],
      [/^\/cloud$/, 'Cloud Learning | SkillPath'],
      [/^\/learning\/modules/, 'Learning Modules | SkillPath'],
      [/^\/learning$/, 'My Learning | SkillPath'],
      [/^\/practice\//, 'Practice | SkillPath'],
      [/^\/certification\/mock-assessment\/.+\/review$/, 'Assessment Review | SkillPath'],
      [/^\/certification\/mock-assessment$/, 'Mock Assessment | SkillPath'],
      [/^\/certification$/, 'Certification Preparation | SkillPath'],
      [/^\/settings$/, 'Settings | SkillPath'],
      [/^\/login$/, 'Sign In | SkillPath'],
      [/^\/admin\/modules\//, 'Edit Module | SkillPath Admin'],
      [/^\/admin\/modules$/, 'Learning Modules | SkillPath Admin'],
      [/^\/admin\/questions\//, 'Edit Question | SkillPath Admin'],
      [/^\/admin\/questions$/, 'Question Bank | SkillPath Admin'],
    ];
    document.title = titleByPath.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? 'SkillPath';
  }, [location.pathname]);

  function saveApiKey(key: string) {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  }

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
      <Route path="/" element={<ExploreHomePage onNavigate={navigate} />} />
      <Route path="/cloud" element={<CloudPage onNavigate={navigate} setCertification={cert.setCertification} />} />
      <Route path="/learning" element={<HomePage progress={state} onNavigate={navigate} activeCert={cert.active} />} />
      <Route
        path="/learning/modules/:moduleKey?"
        element={(
          <ModulesRoute
            progress={state}
            onAnswer={recordAnswer}
            onToggleLesson={toggleLesson}
            onNavigate={navigate}
            activeCert={cert.active}
          />
        )}
      />
      <Route path="/questions" element={<BrowsePage progress={state} onNavigate={navigate} apiKey={apiKey} activeCert={cert.active} />} />
      <Route
        path="/practice/:mode"
        element={<PracticeRoute progress={state} onAnswer={recordAnswer} onNavigate={navigate} activeCert={cert.active} />}
      />
      <Route path="/practice" element={<Navigate to="/practice/quick" replace />} />
      <Route path="/certification" element={<CertificationPage progress={state} activeCert={cert.active} onNavigate={navigate} />} />
      <Route
        path="/certification/mock-assessment"
        element={(
          <ExamPage
            key={location.key}
            onNavigate={navigate}
            onExamComplete={(attempt: ExamAttempt) => recordExam(attempt)}
            activeCert={cert.active}
          />
        )}
      />
      <Route
        path="/certification/mock-assessment/:attemptId/review"
        element={<ExamReviewRoute progress={state} onNavigate={navigate} />}
      />
      <Route path="/settings" element={<SettingsPage apiKey={apiKey} onSave={saveApiKey} onNavigate={navigate} onReset={resetProgress} />} />
      <Route path="/login" element={<LoginPage onNavigate={navigate} />} />
      <Route path="/admin" element={<Navigate to="/admin/questions" replace />} />
      <Route path="/admin/questions" element={<AdminAccess><AdminQuestionsPage onNavigate={navigate} /></AdminAccess>} />
      <Route path="/admin/questions/:questionId" element={<AdminAccess><AdminQuestionEditorPage onNavigate={navigate} /></AdminAccess>} />
      <Route path="/admin/modules" element={<AdminAccess><AdminModulesPage onNavigate={navigate} /></AdminAccess>} />
      <Route path="/admin/modules/:moduleId" element={<AdminAccess><AdminModuleEditorPage onNavigate={navigate} /></AdminAccess>} />
      <Route path="/tutorial" element={<Navigate to="/learning" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
