export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'learner' | 'admin';
}

interface ApiErrorBody {
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new ApiError(body.message ?? 'Something went wrong. Please try again.', response.status);
  }

  if (response.status === 204) return undefined;
  return response.json() as Promise<T>;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await request<AuthUser>('/api/auth/me') ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function registerAccount(input: { email: string; password: string; displayName: string }) {
  return request<AuthUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<AuthUser>;
}

export async function loginAccount(input: { email: string; password: string }) {
  return request<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<AuthUser>;
}

export async function logoutAccount() {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function getServerProgress<T>(): Promise<T | null> {
  return await request<T>('/api/progress') ?? null;
}

export async function saveServerProgress<T>(progress: T) {
  await request('/api/progress', {
    method: 'PUT',
    body: JSON.stringify(progress),
  });
}

export interface AnswerGrade {
  attemptId: string | null;
  correct: boolean;
  correctAnswer: string[];
  explanation: string | null;
}

export interface RevealedAnswer {
  correctAnswer: string[];
  explanation: string | null;
}

export async function submitQuestionAnswer(
  questionId: number,
  selectedAnswers: string[],
  options?: { selfGrade?: boolean; practiceSessionId?: string; durationSeconds?: number },
) {
  return request<AnswerGrade>(`/api/questions/${questionId}/attempts`, {
    method: 'POST',
    body: JSON.stringify({ selectedAnswers, ...options }),
  }) as Promise<AnswerGrade>;
}

export async function revealQuestionAnswer(questionId: number) {
  return request<RevealedAnswer>(`/api/questions/${questionId}/reveal`, {
    method: 'POST',
  }) as Promise<RevealedAnswer>;
}

export interface ExamGrade {
  attemptId: string | null;
  score: number;
  total: number;
  domainScores: Record<string, { correct: number; total: number }>;
  results: Array<{
    questionId: number;
    correct: boolean;
    correctAnswer: string[];
    explanation: string | null;
  }>;
}

export async function gradeExam(input: {
  certification: string;
  durationSeconds: number;
  answers: Array<{ questionId: number; selectedAnswers: string[]; selfGrade?: boolean }>;
}) {
  return request<ExamGrade>('/api/exams/grade', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<ExamGrade>;
}

export interface AdminQuestionStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

export interface AdminQuestionListItem {
  id: number;
  legacyId: number;
  certification: string;
  domain: string;
  type: string;
  contentType: string;
  prompt: string;
  difficulty: string;
  status: string;
  updatedAt: string;
}

export interface AdminQuestionPage {
  items: AdminQuestionListItem[];
  total: number;
  offset: number;
  limit: number;
  stats: AdminQuestionStats;
  certifications: string[];
  domains: string[];
}

export interface AdminQuestionOption {
  key: string;
  text: string;
  isCorrect: boolean;
}

export interface AdminQuestionDetail {
  id: number;
  legacyId: number;
  certification: string;
  domain: string;
  type: string;
  contentType: string;
  prompt: string;
  explanation: string | null;
  mode: string;
  difficulty: string;
  status: string;
  options: AdminQuestionOption[];
  createdAt: string;
  updatedAt: string;
}

export type AdminQuestionInput = Omit<AdminQuestionDetail, 'id' | 'legacyId' | 'createdAt' | 'updatedAt'>;

export async function getAdminQuestions(filters: {
  certification?: string;
  domain?: string;
  status?: string;
  search?: string;
  offset?: number;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return request<AdminQuestionPage>(`/api/admin/questions?${params.toString()}`) as Promise<AdminQuestionPage>;
}

export async function getAdminQuestion(id: number) {
  return request<AdminQuestionDetail>(`/api/admin/questions/${id}`) as Promise<AdminQuestionDetail>;
}

export async function createAdminQuestion(input: AdminQuestionInput) {
  return request<AdminQuestionDetail>('/api/admin/questions', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<AdminQuestionDetail>;
}

export async function updateAdminQuestion(id: number, input: AdminQuestionInput) {
  return request<AdminQuestionDetail>(`/api/admin/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }) as Promise<AdminQuestionDetail>;
}

export async function archiveAdminQuestion(id: number) {
  await request(`/api/admin/questions/${id}`, { method: 'DELETE' });
}

export interface AdminModuleStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

export interface AdminLearningPathOption {
  id: number;
  name: string;
  certification: string;
}

export interface AdminModuleListItem {
  id: number;
  learningPathId: number;
  learningPath: string;
  certification: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  lessonCount: number;
  questionCount: number;
  updatedAt: string;
}

export interface AdminModulePage {
  items: AdminModuleListItem[];
  stats: AdminModuleStats;
  paths: AdminLearningPathOption[];
}

export interface AdminModuleDetail extends AdminModuleListItem {
  createdAt: string;
}

export type AdminModuleInput = Pick<
  AdminModuleDetail,
  'learningPathId' | 'certification' | 'slug' | 'name' | 'description' | 'sortOrder' | 'status'
>;

export async function getAdminModules(filters: { path?: string; status?: string; search?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request<AdminModulePage>(`/api/admin/modules?${params.toString()}`) as Promise<AdminModulePage>;
}

export async function getAdminModule(id: number) {
  return request<AdminModuleDetail>(`/api/admin/modules/${id}`) as Promise<AdminModuleDetail>;
}

export async function createAdminModule(input: AdminModuleInput) {
  return request<AdminModuleDetail>('/api/admin/modules', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<AdminModuleDetail>;
}

export async function updateAdminModule(id: number, input: AdminModuleInput) {
  return request<AdminModuleDetail>(`/api/admin/modules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }) as Promise<AdminModuleDetail>;
}

export async function archiveAdminModule(id: number) {
  await request(`/api/admin/modules/${id}`, { method: 'DELETE' });
}
