import type { InteractionDefinition } from '../types/questionEngine';
import type {
  Certification,
  CertificationKey,
  Question,
  QuestionMode,
  QuestionTableData,
  QuestionType,
  Skill,
} from '../types/questions';

export const SKILLS: Skill[] = [
  {
    key: 'azure-fundamentals',
    name: 'Microsoft Azure Fundamentals',
    shortName: 'Azure Fundamentals',
    provider: 'Azure',
    level: 'Beginner',
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'aws-fundamentals',
    name: 'AWS Cloud Fundamentals',
    shortName: 'AWS Fundamentals',
    provider: 'AWS',
    level: 'Beginner',
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'istqb-ctfl',
    name: 'ISTQB Certified Tester Foundation Level',
    shortName: 'ISTQB CTFL',
    provider: 'ISTQB',
    level: 'Beginner',
    certificationAlignment: 'CTFL',
  },
];

export const CERTIFICATIONS: Certification[] = [
  { key: 'AZ-900', name: 'Microsoft Azure Fundamentals', shortName: 'AZ-900', provider: 'Azure', mockQuestionCount: 45, mockDurationMinutes: 45, passScore: 0.7, aligns: 'azure-fundamentals' },
  { key: 'CLF-C02', name: 'AWS Certified Cloud Practitioner', shortName: 'CLF-C02', provider: 'AWS', mockQuestionCount: 65, mockDurationMinutes: 45, passScore: 0.7, aligns: 'aws-fundamentals' },
  { key: 'CTFL', name: 'ISTQB Certified Tester Foundation Level', shortName: 'ISTQB CTFL', provider: 'ISTQB', mockQuestionCount: 40, mockDurationMinutes: 60, passScore: 0.65, aligns: 'istqb-ctfl' },
];

export function skillForCert(certificationKey: CertificationKey): Skill {
  const certification = CERTIFICATIONS.find(item => item.key === certificationKey)!;
  return SKILLS.find(item => item.key === certification.aligns)!;
}

interface QuestionApiResponse {
  items: Array<{
    id: number;
    legacyId: number;
    certification: CertificationKey;
    type: QuestionType;
    question: string;
    options: Record<string, string>;
    domain: string;
    mode: QuestionMode;
    multipleSelect: boolean;
    sourceReferences?: string[];
    table?: QuestionTableData | null;
    interaction?: InteractionDefinition | null;
  }>;
  total: number;
  offset: number;
  limit: number;
}

export const ALL_QUESTIONS: Question[] = [];
let loadPromise: Promise<void> | null = null;

async function fetchCertification(certification: CertificationKey): Promise<Question[]> {
  const firstResponse = await fetch(`/api/questions?certification=${encodeURIComponent(certification)}&offset=0&limit=100`);
  if (!firstResponse.ok) throw new Error(`Unable to load ${certification} questions.`);

  const first = await firstResponse.json() as QuestionApiResponse;
  const pages: Promise<QuestionApiResponse>[] = [];
  for (let offset = first.limit; offset < first.total; offset += first.limit) {
    pages.push(
      fetch(`/api/questions?certification=${encodeURIComponent(certification)}&offset=${offset}&limit=${first.limit}`)
        .then(response => {
          if (!response.ok) throw new Error(`Unable to load ${certification} questions.`);
          return response.json() as Promise<QuestionApiResponse>;
        }),
    );
  }

  const remaining = await Promise.all(pages);
  return [first, ...remaining].flatMap(page => page.items).map(item => ({
    id: item.id,
    legacyId: item.legacyId,
    certification: item.certification,
    type: item.type,
    question: item.question,
    options: item.options,
    correct_answer: [],
    answer_text: '',
    community_vote: '',
    domain: item.domain,
    mode: item.mode,
    multipleSelect: item.multipleSelect,
    sourceReferences: item.sourceReferences,
    table: item.table ?? undefined,
    interaction: item.interaction ?? undefined,
  }));
}

export function loadQuestionBank(force = false): Promise<void> {
  if (force) {
    ALL_QUESTIONS.splice(0, ALL_QUESTIONS.length);
    loadPromise = null;
  }
  if (ALL_QUESTIONS.length > 0) return Promise.resolve();

  loadPromise ??= Promise.all([
    fetchCertification('AZ-900'),
    fetchCertification('CLF-C02'),
    fetchCertification('CTFL'),
  ]).then(groups => {
    ALL_QUESTIONS.splice(0, ALL_QUESTIONS.length, ...groups.flat());
  });
  return loadPromise;
}

export function questionsForCert(certification: CertificationKey): Question[] {
  return ALL_QUESTIONS.filter(question => question.certification === certification);
}

export function domainsForCert(certification: CertificationKey): string[] {
  return [...new Set(questionsForCert(certification).map(question => question.domain))].sort();
}

export function quizQuestionsForCert(certification: CertificationKey): Question[] {
  return questionsForCert(certification).filter(question =>
    question.mode === 'quiz' || (question.interaction && question.type !== 'image_self_grade'));
}

export function answerableQuestionsForCert(certification: CertificationKey): Question[] {
  return questionsForCert(certification).filter(question => question.mode !== 'read');
}
