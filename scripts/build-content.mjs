// Bundles content/*.yaml into a single JSON file the browser app imports.
// Runs automatically before `npm run dev` and `npm run build`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadContent } from '../src/content.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'generated', 'content.json');
const { sections, questions } = loadContent();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      sections: sections.map(({ file, ...s }) => s),
      questions: questions.filter((q) => !q.retired),
    },
    null,
    2,
  ),
);
console.log(`✓ Bundled ${questions.length} questions into src/generated/content.json`);
