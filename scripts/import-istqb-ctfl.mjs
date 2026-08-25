import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = process.argv[2];

if (!source) {
  console.error('Usage: npm run db:import:ctfl -- /absolute/path/to/question-bank.pdf');
  process.exit(1);
}

const sourcePath = path.resolve(source);
const destination = path.join(root, 'backend/SkillPath.Api/App_Data/istqb-ctfl.seed.json');
const visualCatalogPath = path.join(root, 'content/ctfl-visual-questions.json');
const visualCatalog = JSON.parse(await fs.readFile(visualCatalogPath, 'utf8'));

const MODULES = [
  {
    name: 'Test Tools',
    terms: [
      'test automation', 'automation tool', 'test tool', 'tool support', 'tool selection',
      'pilot project', 'static analysis tool', 'test execution tool', 'test management tool',
      'benefit of automation', 'risk of automation', 'acquire a tool',
    ],
  },
  {
    name: 'Static Testing',
    terms: [
      'static testing', 'static analysis', 'review process', 'review type', 'review meeting',
      'formal review', 'informal review', 'walkthrough', 'inspection', 'technical review',
      'review leader', 'reviewer', 'scribe', 'moderator', 'work product review',
      'static tests', 'examined by reviews', 'review work product',
    ],
  },
  {
    name: 'Test Analysis and Design',
    terms: [
      'equivalence partition', 'boundary value', 'decision table', 'state transition',
      'statement coverage', 'branch coverage', 'white-box', 'white box', 'black-box',
      'black box', 'experience-based', 'experience based', 'error guessing',
      'exploratory testing', 'checklist-based', 'checklist based', 'test technique',
      'coverage item', 'test condition', 'test case', 'acceptance criteria', 'gherkin',
      'given/when/then', 'collaborative user story', 'test analysis', 'test design',
      'transition', 'branch testing', 'conditional branch', 'decision coverage',
      'statement testing', 'use case testing', 'test data',
    ],
  },
  {
    name: 'Managing the Test Activities',
    terms: [
      'test plan', 'test planning', 'test estimation', 'three-point estimation',
      'three point estimation', 'planning poker', 'test monitoring', 'test control',
      'test report', 'test completion', 'entry criteria', 'exit criteria', 'risk level',
      'product risk', 'project risk', 'risk-based', 'risk based', 'risk analysis',
      'risk assessment', 'risk mitigation', 'defect report', 'defect management',
      'configuration management', 'test manager', 'test leader', 'test metrics',
      'test progress', 'test pyramid', 'testing quadrants', 'whole team approach',
      'test effort', 'estimating', 'estimate', 'traceability', 'test implementation',
      'test strategy', 'test status', 'stakeholder communication', 'prioritization', 'prioritisation',
    ],
  },
  {
    name: 'Testing Throughout the Software Development Lifecycle',
    terms: [
      'software development lifecycle', 'development lifecycle', 'sdlc', 'test level',
      'test type', 'type of testing', 'component testing', 'unit testing', 'component integration',
      'system integration', 'system testing', 'acceptance testing', 'maintenance testing',
      'regression testing', 'confirmation testing', 'shift-left', 'shift left',
      'test-driven development', 'test driven development', 'acceptance test-driven',
      'behavior-driven', 'behaviour-driven', 'devops', 'sequential development',
      'iterative development', 'incremental development', 'agile development',
      'retrospective', 'test-first', 'test first', 'prototyping',
    ],
  },
  {
    name: 'Fundamentals of Testing',
    terms: [
      'test objective', 'testing principle', 'seven testing principles', 'exhaustive testing',
      'pesticide paradox', 'absence-of-errors', 'absence of errors', 'defect clustering',
      'early testing', 'testing is context dependent', 'error, defect', 'error and defect',
      'failure', 'root cause', 'testing and debugging', 'quality assurance',
      'independence of testing', 'tester independence', 'psychology of testing',
      'human psychology', 'why is testing necessary', 'what is testing',
    ],
  },
];

function cleanInline(value) {
  return value
    .replace(/\f/g, '\n')
    .replace(/^\s*\[\d{4}\/\d{2}\]\s*$/gm, '')
    .replace(/^\s*https?:\/\/\S+\s*$/gm, '')
    .replace(/^\s*All CTFL v?\d+(?:\.\d+)? Questions\s*$/gim, '')
    .replace(/\s+Most Voted\b/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function classify(text) {
  const normalized = text.toLowerCase();
  let best = MODULES.at(-1).name;
  let bestScore = 0;

  for (const module of MODULES) {
    const score = module.terms.reduce((total, term) => {
      const occurrences = normalized.split(term).length - 1;
      return total + occurrences * (term.includes(' ') ? 3 : 1);
    }, 0);
    if (score > bestScore) {
      best = module.name;
      bestScore = score;
    }
  }

  return best;
}

function pagesWithQuestionImages(pdfPath) {
  const listing = execFileSync('pdfimages', ['-list', pdfPath], { encoding: 'utf8' });
  const counts = new Map();
  for (const line of listing.split('\n').slice(2)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 3 || columns[2] !== 'image') continue;
    const page = Number(columns[0]);
    counts.set(page, (counts.get(page) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([page]) => page));
}

function findOptionSequence(text, correctAnswer) {
  const matches = [...text.matchAll(/(?:^|\n)\s*([A-F])\.\s+/gm)];
  for (let start = matches.length - 1; start >= 0; start -= 1) {
    if (matches[start][1] !== 'A') continue;
    const sequence = [matches[start]];
    let expected = 'B'.charCodeAt(0);
    for (let index = start + 1; index < matches.length; index += 1) {
      const key = matches[index][1];
      if (key.charCodeAt(0) !== expected) break;
      sequence.push(matches[index]);
      expected += 1;
    }
    if (sequence.length >= 2 && [...correctAnswer].every(key => sequence.some(match => match[1] === key))) {
      return sequence;
    }
  }
  return null;
}

function parseQuestion(chunk, id, affectedByImage) {
  const answerMatch = chunk.match(/Correct Answer:\s*([A-F]+)/i);
  if (!answerMatch) return { error: `Question ${id}: correct answer not found` };

  const correctAnswer = answerMatch[1].toUpperCase();
  const body = chunk.slice(0, answerMatch.index);
  const optionMatches = findOptionSequence(body, correctAnswer);
  if (!optionMatches) return { error: `Question ${id}: options could not be parsed` };

  const prompt = cleanInline(body.slice(0, optionMatches[0].index));
  const options = optionMatches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = optionMatches[index + 1]?.index ?? body.length;
    return {
      key: match[1],
      text: cleanInline(body.slice(start, end)),
      isCorrect: correctAnswer.includes(match[1]),
    };
  });

  const visual = visualCatalog[String(id)];
  if (!prompt || options.some(option => !option.text)) {
    return { error: `Question ${id}: prompt or option text is empty` };
  }
  if (affectedByImage && !visual) return { skipped: id };

  const resolvedPrompt = visual?.prompt ?? prompt;
  const domain = classify(`${resolvedPrompt} ${options.map(option => option.text).join(' ')}`);
  return {
    question: {
      legacyId: id,
      sourceKey: `CTFL:${id}`,
      prompt: resolvedPrompt,
      domain,
      correctAnswer: [...correctAnswer],
      options,
      tableData: visual?.tables ? { tables: visual.tables } : undefined,
    },
  };
}

await fs.access(sourcePath);
const text = execFileSync('pdftotext', ['-layout', sourcePath, '-'], {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});
const pages = text.split('\f');
const imagePages = pagesWithQuestionImages(sourcePath);
const questionStartPage = new Map();
for (const [index, page] of pages.entries()) {
  for (const match of page.matchAll(/Question #(\d+)\b[^\n]*Topic\s+\d+/g)) {
    questionStartPage.set(Number(match[1]), index + 1);
  }
}

const questionMatches = [...text.matchAll(/Question #(\d+)\b[^\n]*Topic\s+\d+/g)];
const questions = [];
const skippedImageQuestions = [];
const errors = [];

for (const [index, match] of questionMatches.entries()) {
  const id = Number(match[1]);
  const end = questionMatches[index + 1]?.index ?? text.length;
  const chunk = text.slice(match.index + match[0].length, end);
  const startPage = questionStartPage.get(id);
  const nextPage = questionStartPage.get(Number(questionMatches[index + 1]?.[1])) ?? pages.length + 1;
  const affectedByImage = [...imagePages].some(page => page >= startPage && page < nextPage);
  const parsed = parseQuestion(chunk, id, affectedByImage);
  if (parsed.question) questions.push(parsed.question);
  if (parsed.skipped) skippedImageQuestions.push(parsed.skipped);
  if (parsed.error) errors.push(parsed.error);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const importedIds = new Set(questions.map(question => question.legacyId));
const missingVisualQuestions = Object.keys(visualCatalog)
  .map(Number)
  .filter(id => !importedIds.has(id));
if (missingVisualQuestions.length > 0) {
  console.error(`Visual question mappings were not imported: ${missingVisualQuestions.join(', ')}`);
  process.exit(1);
}

const output = {
  generatedAt: new Date().toISOString(),
  sourceFile: path.basename(sourcePath),
  skippedImageQuestions,
  questions,
};

await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, `${JSON.stringify(output)}\n`, 'utf8');

const distribution = Object.fromEntries(
  MODULES.map(module => [module.name, questions.filter(question => question.domain === module.name).length]),
);
console.log(`Imported ${questions.length} text-complete questions to ${destination}`);
console.log(`Skipped ${skippedImageQuestions.length} image-dependent questions: ${skippedImageQuestions.join(', ')}`);
console.log(`Reconstructed or linked ${Object.keys(visualCatalog).length} visual questions`);
console.log('Module distribution:', distribution);
