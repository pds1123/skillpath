// ─────────────────────────────────────────────────────────────────────────────
// Curriculum — designed learning modules per Skill.
//
// This is intentionally NOT derived from question tags. Modules represent a
// pedagogical breakdown of the cloud skill; the existing question domains are
// mapped INTO these modules via `domainMap`, so the practice engine still
// works while the surface UI shows a proper learning-path structure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CertificationKey, SkillKey } from './questions';
import { studyContentForCert } from './studyContent';

export interface LearningModule {
  key: string;                    // globally unique slug, e.g. "az-cloud-concepts"
  skillKey: SkillKey;
  name: string;                   // "Cloud Concepts"
  description: string;            // "Fundamental cloud models and concepts"
  order: number;                  // display order within skill
  domainMap: string[];            // legacy `Question.domain` values that map into this module
  lessonCount: number;            // designed lesson count (static for now, wired to Admin later)
  practiceCount: number;          // curated practice activities, not raw question count
  certificationAlignment?: CertificationKey;
}

export interface ModuleLesson {
  key: string;
  title: string;
  content: string;
  domain: string;
}

export function lessonsForModule(module: LearningModule): ModuleLesson[] {
  if (!module.certificationAlignment) return [];

  return studyContentForCert(module.certificationAlignment)
    .filter(topic => module.domainMap.includes(topic.domain))
    .flatMap(topic => topic.sections.map((section, index) => ({
      key: `${module.key}:${topic.domain}:${index}`,
      title: section.title,
      content: section.content,
      domain: topic.domain,
    })));
}

export function lessonCountForModule(module: LearningModule): number {
  return lessonsForModule(module).length || module.lessonCount;
}

// ─── Microsoft Azure Fundamentals (Cloud Engineer Path) ─────────────────────
export const AZURE_MODULES: LearningModule[] = [
  {
    key: 'az-cloud-concepts',
    skillKey: 'azure-fundamentals',
    name: 'Cloud Models & Responsibility',
    description: 'How cloud delivery models change ownership, control, cost, and responsibility',
    order: 1,
    domainMap: ['Cloud Service Models', 'Cloud Deployment Models'],
    lessonCount: 5,
    practiceCount: 2,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-core-services',
    skillKey: 'azure-fundamentals',
    name: 'Resources & Organization',
    description: 'How cloud resources are grouped, managed, deployed, and governed',
    order: 2,
    domainMap: ['General Azure'],
    lessonCount: 3,
    practiceCount: 2,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-compute',
    skillKey: 'azure-fundamentals',
    name: 'Compute Concepts',
    description: 'Virtual machines, containers, managed platforms, and event-driven compute',
    order: 3,
    domainMap: ['Azure Compute'],
    lessonCount: 6,
    practiceCount: 3,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-storage',
    skillKey: 'azure-fundamentals',
    name: 'Data & Storage Concepts',
    description: 'Object, file and block storage, durability, access patterns, and managed data',
    order: 4,
    domainMap: ['Azure Storage'],
    lessonCount: 4,
    practiceCount: 2,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-networking',
    skillKey: 'azure-fundamentals',
    name: 'Network Foundations',
    description: 'Isolation, addressing, routing, traffic distribution, and hybrid connectivity',
    order: 5,
    domainMap: ['Azure Networking'],
    lessonCount: 4,
    practiceCount: 2,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-identity-security',
    skillKey: 'azure-fundamentals',
    name: 'Identity & Access',
    description: 'Authentication, authorization, least privilege, and access boundaries',
    order: 6,
    domainMap: ['Identity & Access', 'Security & Compliance'],
    lessonCount: 5,
    practiceCount: 3,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-architecture',
    skillKey: 'azure-fundamentals',
    name: 'Architecture & Resilience',
    description: 'Regions, failure domains, availability, recovery, and resilient design',
    order: 7,
    domainMap: ['Azure Architecture'],
    lessonCount: 4,
    practiceCount: 2,
    certificationAlignment: 'AZ-900',
  },
  {
    key: 'az-cost-governance',
    skillKey: 'azure-fundamentals',
    name: 'Cost, Governance & Operations',
    description: 'Cost decisions, policies, observability, support, and responsible operations',
    order: 8,
    domainMap: ['Cost Management', 'SLA & Support', 'Governance', 'Monitoring'],
    lessonCount: 6,
    practiceCount: 3,
    certificationAlignment: 'AZ-900',
  },
];

// ─── AWS Cloud Fundamentals ─────────────────────────────────────────────────
export const AWS_MODULES: LearningModule[] = [
  {
    key: 'aws-cloud-concepts',
    skillKey: 'aws-fundamentals',
    name: 'Cloud Models & Responsibility',
    description: 'Cloud economics, delivery models, shared responsibility, and global infrastructure',
    order: 1,
    domainMap: ['Cloud Concepts'],
    lessonCount: 6,
    practiceCount: 2,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-core-services',
    skillKey: 'aws-fundamentals',
    name: 'Resources & Organization',
    description: 'How accounts, regions, resources, and managed services fit together',
    order: 2,
    domainMap: ['Cloud Technology & Services'],
    lessonCount: 8,
    practiceCount: 3,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-compute',
    skillKey: 'aws-fundamentals',
    name: 'Compute Concepts',
    description: 'Virtual machines, functions, containers, and managed application platforms',
    order: 3,
    domainMap: [],
    lessonCount: 0,
    practiceCount: 0,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-storage',
    skillKey: 'aws-fundamentals',
    name: 'Data & Storage Concepts',
    description: 'Object, block and file storage, relational data, and distributed databases',
    order: 4,
    domainMap: [],
    lessonCount: 0,
    practiceCount: 0,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-networking',
    skillKey: 'aws-fundamentals',
    name: 'Network Foundations',
    description: 'Network isolation, routing, name resolution, delivery, and connectivity',
    order: 5,
    domainMap: [],
    lessonCount: 0,
    practiceCount: 0,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-security',
    skillKey: 'aws-fundamentals',
    name: 'Identity & Security',
    description: 'Identity, least privilege, encryption, layered protection, and compliance',
    order: 6,
    domainMap: ['Security & Compliance'],
    lessonCount: 7,
    practiceCount: 2,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-billing',
    skillKey: 'aws-fundamentals',
    name: 'Cost & Governance',
    description: 'Consumption pricing, commitments, budgets, account boundaries, and controls',
    order: 7,
    domainMap: ['Billing, Pricing & Support'],
    lessonCount: 8,
    practiceCount: 2,
    certificationAlignment: 'CLF-C02',
  },
  {
    key: 'aws-reliability-support',
    skillKey: 'aws-fundamentals',
    name: 'Reliability & Operations',
    description: 'Failure planning, observability, service health, support, and operational decisions',
    order: 8,
    domainMap: [],
    lessonCount: 0,
    practiceCount: 0,
    certificationAlignment: 'CLF-C02',
  },
];

export const ALL_MODULES: LearningModule[] = [...AZURE_MODULES, ...AWS_MODULES];

export function modulesForCert(cert: CertificationKey): LearningModule[] {
  return ALL_MODULES.filter(m => m.certificationAlignment === cert).sort((a, b) => a.order - b.order);
}

export function moduleByKey(key: string): LearningModule | undefined {
  return ALL_MODULES.find(m => m.key === key);
}
