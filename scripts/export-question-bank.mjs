import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();

async function readExport(filePath, exportName) {
  const sourceText = await fs.readFile(filePath, 'utf8');
  const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName && declaration.initializer) {
        return literalValue(declaration.initializer);
      }
    }
  }

  throw new Error(`Could not find ${exportName} in ${filePath}`);
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  throw new Error(`Unsupported property name: ${node.getText()}`);
}

function literalValue(node) {
  if (ts.isParenthesizedExpression(node)) return literalValue(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken)
    return -Number(literalValue(node.operand));
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literalValue);
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property))
        throw new Error(`Unsupported object property: ${property.getText()}`);
      result[propertyName(property.name)] = literalValue(property.initializer);
    }
    return result;
  }
  throw new Error(`Unsupported expression: ${node.getText()}`);
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'lesson';
}

const azureQuestions = await readExport(path.join(root, 'src/data/questions.ts'), 'QUESTIONS');
const awsQuestions = await readExport(path.join(root, 'src/data/questions_aws.ts'), 'QUESTIONS_AWS');
const interactive = await readExport(path.join(root, 'src/data/interactiveData.ts'), 'INTERACTIVE_DATA');
const azureModules = await readExport(path.join(root, 'src/data/curriculum.ts'), 'AZURE_MODULES');
const awsModules = await readExport(path.join(root, 'src/data/curriculum.ts'), 'AWS_MODULES');
const studyContent = await readExport(path.join(root, 'src/data/studyContent.ts'), 'STUDY_CONTENT');

const questions = [...azureQuestions, ...awsQuestions].map(question => ({
  legacyId: question.id,
  certification: question.certification,
  sourceKey: `${question.certification}:${question.id}`,
  questionType: question.type,
  contentType: question.content_type ?? 'practice_question',
  prompt: question.question,
  explanation: question.answer_text || null,
  interactionData: question.certification === 'AZ-900' ? interactive[String(question.id)] ?? null : null,
  tableData: question.table ?? null,
  mode: question.mode,
  difficulty: question.difficulty ?? 'beginner',
  status: question.status ?? 'published',
  domain: question.domain,
  options: Object.entries(question.options ?? {}).map(([key, text], index) => ({
    key,
    text,
    sortOrder: index + 1,
    isCorrect: (question.correct_answer ?? []).includes(key),
  })),
}));

const paths = [
  {
    slug: 'azure-fundamentals',
    name: 'Microsoft Azure',
    description: 'Learn Azure services and infrastructure through guided beginner modules.',
    level: 'beginner',
    certification: 'AZ-900',
    modules: azureModules,
  },
  {
    slug: 'aws-fundamentals',
    name: 'Amazon Web Services',
    description: 'Learn AWS services and infrastructure through guided beginner modules.',
    level: 'beginner',
    certification: 'CLF-C02',
    modules: awsModules,
  },
].map((learningPath, pathIndex) => ({
  ...learningPath,
  sortOrder: pathIndex + 1,
  modules: learningPath.modules.map(module => {
    const matchingDomains = studyContent.filter(
      domain => domain.certification === learningPath.certification && module.domainMap.includes(domain.domain),
    );
    const lessons = matchingDomains.flatMap(domain =>
      domain.sections.map((section, index) => ({
        slug: `${slug(domain.domain)}-${index + 1}-${slug(section.title)}`,
        title: section.title,
        summary: domain.summary,
        content: section.content,
        sortOrder: index + 1,
      })),
    );
    return { ...module, lessons: lessons.map((lesson, index) => ({ ...lesson, sortOrder: index + 1 })) };
  }),
}));

const document = {
  generatedAt: new Date().toISOString(),
  learningArea: {
    slug: 'cloud',
    name: 'Cloud',
    description: 'Cloud platforms, infrastructure, security, and operations.',
  },
  certifications: [
    { code: 'AZ-900', name: 'Microsoft Azure Fundamentals', provider: 'Microsoft Azure', mockQuestionCount: 45 },
    { code: 'CLF-C02', name: 'AWS Certified Cloud Practitioner', provider: 'Amazon Web Services', mockQuestionCount: 65 },
  ],
  paths,
  questions,
};

const destination = path.join(root, 'backend/SkillPath.Api/App_Data/question-bank.seed.json');
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, `${JSON.stringify(document)}\n`, 'utf8');
console.log(`Exported ${questions.length} questions to ${destination}`);
