import type { InteractionDefinition, QuestionInteractionType } from './questionEngine';

export type QuestionType = QuestionInteractionType;
export type QuestionMode = 'quiz' | 'reveal' | 'read';
export type CertificationKey = 'AZ-900' | 'CLF-C02' | 'CTFL';
export type SkillKey = 'azure-fundamentals' | 'aws-fundamentals' | 'istqb-ctfl';
export type ContentType = 'lesson' | 'knowledge_check' | 'practice_question' | 'mock_question';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ContentStatus = 'draft' | 'published';

export interface QuestionTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export type QuestionTableData = QuestionTable | { tables: QuestionTable[] };

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
  table?: QuestionTableData;
  sourceReferences?: string[];
  interaction?: InteractionDefinition;
  skill?: SkillKey;
  topic?: string;
  content_type?: ContentType;
  difficulty?: Difficulty;
  status?: ContentStatus;
}

export interface Skill {
  key: SkillKey;
  name: string;
  shortName: string;
  provider: 'Azure' | 'AWS' | 'ISTQB';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  certificationAlignment?: CertificationKey;
}

export interface Certification {
  key: CertificationKey;
  name: string;
  shortName: string;
  provider: 'Azure' | 'AWS' | 'ISTQB';
  mockQuestionCount: number;
  mockDurationMinutes: number;
  passScore: number;
  aligns: SkillKey;
}
