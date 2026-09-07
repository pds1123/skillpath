import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const primarySource = process.argv[2];
const secondarySource = process.argv[3];

if (!primarySource || !secondarySource) {
  console.error('Usage: npm run db:import:ctfl:merge -- /absolute/path/to/278-bank.pdf /absolute/path/to/399-bank.pdf');
  process.exit(1);
}

const primaryPath = path.resolve(primarySource);
const secondaryPath = path.resolve(secondarySource);
const destination = path.join(root, 'backend/SkillPath.Api/App_Data/istqb-ctfl.seed.json');
const primaryImporter = path.join(root, 'scripts/import-istqb-ctfl.mjs');

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
    .replace(/^\s*(?:Exams Prep.*ISTQB|Top IT Certification Prep Material.*|IMPORTANT NOTICE.*)$/gim, '')
    .replace(/^\s*\d+\s+of\s+\d+\s*$/gim, '')
    .replace(/^\s*[A-F]\.\s*$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalize(value) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\bmost voted\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function fingerprint(question) {
  return normalize(`${question.prompt} ${question.options.map(option => `${option.key} ${option.text}`).join(' ')}`);
}

function tokenSet(value) {
  return new Set(value.split(' ').filter(Boolean));
}

function jaccard(left, right) {
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
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

function findOptionSequence(text, correctAnswers) {
  const matches = [...text.matchAll(/(?:^|\n)\s*([A-F])\.\s+/gm)];
  for (let start = matches.length - 1; start >= 0; start -= 1) {
    if (matches[start][1] !== 'A') continue;
    const sequence = [matches[start]];
    let expected = 'B'.charCodeAt(0);
    for (let index = start + 1; index < matches.length; index += 1) {
      const key = matches[index][1];
      if (key === sequence.at(-1)[1]) {
        sequence[sequence.length - 1] = matches[index];
        continue;
      }
      if (key.charCodeAt(0) !== expected) break;
      sequence.push(matches[index]);
      expected += 1;
    }
    if (sequence.length >= 2 && correctAnswers.every(key => sequence.some(match => match[1] === key))) return sequence;
  }
  return null;
}

function extractExplanation(chunk, answerMatch) {
  const remainder = chunk.slice(answerMatch.index + answerMatch[0].length);
  const marker = remainder.match(/\bExplanation\b(?:\s*Comprehensive and Detailed In-Depth Explanation)?\s*:?/i);
  if (!marker) return null;
  const explanation = remainder
    .slice(marker.index + marker[0].length)
    .split(/\bReference\s*:/i)[0];
  return cleanInline(explanation) || null;
}

function parseSecondaryQuestion(chunk, id) {
  const answerMatch = chunk.match(/\bAnswer:[ \t]*([A-F](?:[ \t]*[,/&][ \t]*[A-F])*)/i);
  if (!answerMatch) return { error: `399 source question ${id}: answer not found` };
  const correctAnswers = [...new Set(answerMatch[1].toUpperCase().match(/[A-F]/g) ?? [])];
  const body = chunk.slice(0, answerMatch.index);
  const optionMatches = findOptionSequence(body, correctAnswers);
  if (!optionMatches) return { error: `399 source question ${id}: options could not be parsed` };

  const prompt = cleanInline(body.slice(0, optionMatches[0].index));
  const options = optionMatches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = optionMatches[index + 1]?.index ?? body.length;
    return {
      key: match[1],
      text: cleanInline(body.slice(start, end)),
      isCorrect: correctAnswers.includes(match[1]),
    };
  });
  if (!prompt || options.some(option => !option.text)) return { error: `399 source question ${id}: question text is incomplete` };

  return {
    question: {
      sourceQuestionId: id,
      prompt,
      domain: classify(`${prompt} ${options.map(option => option.text).join(' ')}`),
      correctAnswer: correctAnswers,
      options,
      tableData: undefined,
      explanation: extractExplanation(chunk, answerMatch),
    },
  };
}

await fs.access(primaryPath);
await fs.access(secondaryPath);
execFileSync(process.execPath, [primaryImporter, primaryPath], { cwd: root, stdio: 'inherit' });

const seed = JSON.parse(await fs.readFile(destination, 'utf8'));
const secondaryText = execFileSync('pdftotext', ['-layout', secondaryPath, '-'], {
  encoding: 'utf8',
  maxBuffer: 100 * 1024 * 1024,
});
const secondaryMatches = [...secondaryText.matchAll(/Question\s+#:\s*(\d+)\b/g)];
const secondaryQuestions = [];
const errors = [];
for (const [index, match] of secondaryMatches.entries()) {
  const id = Number(match[1]);
  const end = secondaryMatches[index + 1]?.index ?? secondaryText.length;
  const parsed = parseSecondaryQuestion(secondaryText.slice(match.index + match[0].length, end), id);
  if (parsed.question) secondaryQuestions.push(parsed.question);
  if (parsed.error) errors.push(parsed.error);
}
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const primaryQuestions = seed.questions.map(question => ({
  ...question,
  sourceAttribution: 'ctfl_278',
  sourceReference: `278.${question.legacyId}`,
  explanation: question.explanation ?? null,
  status: 'published',
}));
const primaryFingerprints = primaryQuestions.map(question => {
  const value = fingerprint(question);
  return { question, value, tokens: tokenSet(value) };
});
const answerConflicts = [];
const duplicatePairs = [];
const newQuestions = [];
const maxPrimaryLegacyId = Math.max(...primaryQuestions.map(question => question.legacyId));

for (const secondaryQuestion of secondaryQuestions) {
  const value = fingerprint(secondaryQuestion);
  const tokens = tokenSet(value);
  let best = null;
  let bestScore = 0;
  for (const candidate of primaryFingerprints) {
    const score = candidate.value === value ? 1 : jaccard(tokens, candidate.tokens);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  const lengthRatio = best ? Math.min(value.length, best.value.length) / Math.max(value.length, best.value.length) : 0;
  if (best && bestScore >= 0.9 && lengthRatio >= 0.85) {
    best.question.sourceAttribution = 'ctfl_278_399';
    best.question.sourceReference = `278.${best.question.legacyId}|399.${secondaryQuestion.sourceQuestionId}`;
    duplicatePairs.push({ source278Id: best.question.legacyId, source399Id: secondaryQuestion.sourceQuestionId, similarity: Number(bestScore.toFixed(4)) });
    const primaryAnswer = best.question.options.filter(option => option.isCorrect).map(option => option.key).sort().join(',');
    const secondaryAnswer = secondaryQuestion.correctAnswer.slice().sort().join(',');
    if (primaryAnswer !== secondaryAnswer) {
      answerConflicts.push({ source278Id: best.question.legacyId, source399Id: secondaryQuestion.sourceQuestionId, keptAnswer: primaryAnswer, source399Answer: secondaryAnswer });
    }
    continue;
  }

  newQuestions.push({
    legacyId: maxPrimaryLegacyId + secondaryQuestion.sourceQuestionId,
    sourceKey: `CTFL399:${secondaryQuestion.sourceQuestionId}`,
    sourceAttribution: 'ctfl_399',
    sourceReference: `399.${secondaryQuestion.sourceQuestionId}`,
    prompt: secondaryQuestion.prompt,
    domain: secondaryQuestion.domain,
    correctAnswer: secondaryQuestion.correctAnswer,
    options: secondaryQuestion.options,
    tableData: secondaryQuestion.tableData,
    explanation: secondaryQuestion.explanation,
    status: 'published',
  });
}

const questions = [...primaryQuestions, ...newQuestions];
const output = {
  generatedAt: new Date().toISOString(),
  sourceFiles: [path.basename(primaryPath), path.basename(secondaryPath)],
  skippedImageQuestions: seed.skippedImageQuestions ?? [],
  mergeSummary: {
    source278Questions: primaryQuestions.length,
    source399Questions: secondaryQuestions.length,
    sharedQuestions: duplicatePairs.length,
    source399OnlyQuestions: newQuestions.length,
    answerConflicts,
    duplicatePairs,
  },
  questions,
};

await fs.writeFile(destination, `${JSON.stringify(output)}\n`, 'utf8');
const distribution = Object.fromEntries(
  MODULES.map(module => [module.name, questions.filter(question => question.domain === module.name).length]),
);
console.log(`Merged ${primaryQuestions.length} source-278 questions with ${secondaryQuestions.length} source-399 questions.`);
console.log(`Marked ${duplicatePairs.length} questions as shared and published ${newQuestions.length} source-399-only questions.`);
console.log(`Kept the source-278 answer for ${answerConflicts.length} conflicting duplicates.`);
console.log(`Wrote ${questions.length} total questions to ${destination}`);
console.log('Module distribution:', distribution);
