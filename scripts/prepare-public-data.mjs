import { access, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ['src/data/questions.example.ts', 'src/data/questions.ts'],
  ['src/data/questionImages.example.ts', 'src/data/questionImages.ts'],
  ['src/data/interactiveData.example.ts', 'src/data/interactiveData.ts'],
];

for (const [example, local] of files) {
  const target = path.join(root, local);
  try {
    await access(target);
  } catch {
    await copyFile(path.join(root, example), target);
    process.stdout.write(`Created ${local} from its public example.\n`);
  }
}
