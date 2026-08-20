// ─────────────────────────────────────────────────────────────────────────────
// Sample data only.
//
// This file ships with a handful of hand-written sample questions so the app
// runs end-to-end after `git clone`. The full question banks used during
// development are NOT included in this repository.
//
// Types, exports, and helpers here mirror what the real data files contain,
// so all pages, filters, exam simulation, and cert switching work as-is.
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'yes_no' | 'drag_drop' | 'hotspot';
export type QuestionMode = 'quiz' | 'reveal' | 'read';
export type CertificationKey = 'AZ-900' | 'CLF-C02';

export interface Certification {
  key: CertificationKey;
  name: string;
  shortName: string;
  provider: 'Azure' | 'AWS';
}

export const CERTIFICATIONS: Certification[] = [
  { key: 'AZ-900', name: 'Azure Fundamentals', shortName: 'AZ-900', provider: 'Azure' },
  { key: 'CLF-C02', name: 'AWS Cloud Practitioner', shortName: 'CLF-C02', provider: 'AWS' },
];

export interface Question {
  id: number;
  legacyId?: number;
  certification: CertificationKey;
  type: QuestionType;
  question: string;
  options: Record<string, string>;
  correct_answer: string[];
  answer_text: string;
  community_vote: string;
  domain: string;
  mode: QuestionMode;
  multipleSelect?: boolean;
  table?: { headers: string[]; rows: string[][] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample AZ-900 items (original wording — for demo purposes)
// ─────────────────────────────────────────────────────────────────────────────
export const QUESTIONS: Question[] = [
  {
    id: 1,
    certification: 'AZ-900',
    type: 'multiple_choice',
    question: 'Which cloud service model gives you the most control over the underlying operating system?',
    options: {
      A: 'Software as a Service (SaaS)',
      B: 'Platform as a Service (PaaS)',
      C: 'Infrastructure as a Service (IaaS)',
      D: 'Function as a Service (FaaS)',
    },
    correct_answer: ['C'],
    answer_text: 'IaaS exposes the virtual machine and its operating system to the customer. PaaS abstracts the OS; SaaS abstracts the entire application; FaaS runs only individual functions.',
    community_vote: '',
    domain: 'Cloud Service Models',
    mode: 'quiz',
  },
  {
    id: 2,
    certification: 'AZ-900',
    type: 'multiple_choice',
    question: 'Which Azure construct is primarily used to group resources for billing and access control?',
    options: {
      A: 'Availability set',
      B: 'Resource group',
      C: 'Virtual network',
      D: 'Management group',
    },
    correct_answer: ['B'],
    answer_text: 'A resource group is a logical container that holds related Azure resources and can be used for lifecycle, cost, and RBAC scoping.',
    community_vote: '',
    domain: 'Azure Architecture',
    mode: 'quiz',
  },
  {
    id: 3,
    certification: 'AZ-900',
    type: 'multiple_choice',
    question: 'Which Azure service is a fully managed, event-driven, serverless compute platform?',
    options: {
      A: 'Azure Virtual Machines',
      B: 'Azure App Service',
      C: 'Azure Functions',
      D: 'Azure Kubernetes Service',
    },
    correct_answer: ['C'],
    answer_text: 'Azure Functions runs small pieces of code (functions) in response to events without provisioning or managing infrastructure.',
    community_vote: '',
    domain: 'Azure Compute',
    mode: 'quiz',
  },
  {
    id: 4,
    certification: 'AZ-900',
    type: 'yes_no',
    question: 'For each statement, select Yes if the statement is true. Otherwise, select No.',
    options: {},
    correct_answer: [],
    answer_text: '',
    community_vote: '',
    domain: 'Governance',
    mode: 'reveal',
  },
  {
    id: 5,
    certification: 'AZ-900',
    type: 'multiple_choice',
    question: 'What is the primary benefit of using multiple Availability Zones?',
    options: {
      A: 'Lower monthly cost',
      B: 'Protection against datacenter-level failures within a region',
      C: 'Automatic backup to another region',
      D: 'Free data transfer between zones',
    },
    correct_answer: ['B'],
    answer_text: 'Availability Zones are physically separated locations within a region — deploying across zones protects a workload from a datacenter-level failure.',
    community_vote: '',
    domain: 'Azure Architecture',
    mode: 'quiz',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Data-layer helpers (same shape as the full app)
// ─────────────────────────────────────────────────────────────────────────────
import { INTERACTIVE_DATA } from './interactiveData';

export const ALL_QUESTIONS: Question[] = [];

export async function loadQuestionBank(): Promise<void> {
  const certifications: CertificationKey[] = ['AZ-900', 'CLF-C02'];
  const responses = await Promise.all(certifications.map(async certification => {
    const response = await fetch(`/api/questions?certification=${certification}&limit=100`);
    if (!response.ok) throw new Error(`Unable to load ${certification} questions.`);
    const page = await response.json() as { items: Array<{
      id: number; legacyId: number; certification: CertificationKey; type: QuestionType;
      question: string; options: Record<string, string>; domain: string; mode: QuestionMode;
      multipleSelect: boolean; table?: Question['table'] | null;
    }> };
    return page.items.map(item => ({
      ...item,
      correct_answer: [],
      answer_text: '',
      community_vote: '',
      table: item.table ?? undefined,
    }));
  }));
  ALL_QUESTIONS.splice(0, ALL_QUESTIONS.length, ...responses.flat());
}

export function questionsForCert(cert: CertificationKey): Question[] {
  return ALL_QUESTIONS.filter(q => q.certification === cert);
}

export function domainsForCert(cert: CertificationKey): string[] {
  return [...new Set(questionsForCert(cert).map(q => q.domain))].sort();
}

export function quizQuestionsForCert(cert: CertificationKey): Question[] {
  return questionsForCert(cert).filter(q => q.mode === 'quiz' || INTERACTIVE_DATA[q.legacyId ?? q.id]);
}

export function answerableQuestionsForCert(cert: CertificationKey): Question[] {
  return questionsForCert(cert).filter(q => q.mode !== 'read');
}

// Legacy exports (default to AZ-900)
export const DOMAINS = domainsForCert('AZ-900');
export const QUIZ_QUESTIONS = quizQuestionsForCert('AZ-900');
export const ANSWERABLE_QUESTIONS = answerableQuestionsForCert('AZ-900');
