export interface CurriculumLesson {
  id: number;
  key: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  estimatedMinutes: number | null;
  order: number;
}

export interface CurriculumModule {
  id: number;
  key: string;
  slug: string;
  name: string;
  description: string;
  order: number;
  lessons: CurriculumLesson[];
  questionIds: number[];
  practiceCount: number;
}

export interface CurriculumPath {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  level: string;
  area: {
    id: number;
    slug: string;
    name: string;
  };
  modules: CurriculumModule[];
}

export interface CurriculumPathSummary {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  level: string;
  sortOrder: number;
}

export interface CurriculumArea {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  paths: CurriculumPathSummary[];
}
