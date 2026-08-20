export interface LearningArea {
  key: 'cloud' | 'software' | 'data' | 'qa';
  name: string;
  description: string;
  concepts: string[];
  status: 'available' | 'planned';
  destination?: string;
}

export const LEARNING_AREAS: LearningArea[] = [
  {
    key: 'cloud',
    name: 'Cloud',
    description: 'Understand how cloud systems are organized, secured, connected, and operated before learning individual platforms.',
    concepts: ['Cloud models', 'Infrastructure', 'Networking', 'Identity', 'Reliability'],
    status: 'available',
    destination: 'cloud',
  },
  {
    key: 'software',
    name: 'Software Foundations',
    description: 'Learn the ideas behind programs and modern applications without depending on one programming language or framework.',
    concepts: ['Programming logic', 'Web requests', 'APIs', 'Architecture', 'Delivery lifecycle'],
    status: 'planned',
  },
  {
    key: 'data',
    name: 'Data Foundations',
    description: 'Learn how data is structured, related, queried, measured, and governed before choosing an analysis tool.',
    concepts: ['Data models', 'Relationships', 'Query logic', 'Data quality', 'Metrics'],
    status: 'planned',
  },
  {
    key: 'qa',
    name: 'QA & Testing',
    description: 'Understand how teams reason about software quality, risk, coverage, defects, and reliable delivery.',
    concepts: ['Quality principles', 'Testing levels', 'Test design', 'Defect analysis', 'Automation strategy'],
    status: 'planned',
  },
];
