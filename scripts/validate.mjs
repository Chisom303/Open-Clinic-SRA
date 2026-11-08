// Validates every question file against content/schema.json plus cross-file rules.
// Run with: npm run validate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadContent } from '../src/content.mjs';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];
const { sections, files, questions } = loadContent();

const sectionIds = new Set(sections.map((s) => s.id));
for (const f of files) {
  if (!validate({ section: f.section, questions: f.questions })) {
    for (const e of validate.errors) {
      errors.push(`${f.file}: ${e.instancePath || '/'} ${e.message}`);
    }
  }
  if (!sectionIds.has(f.section)) {
    errors.push(`${f.file}: section "${f.section}" is not listed in sections.yaml`);
  }
}

const seen = new Map();
for (const q of questions) {
  if (seen.has(q.id)) errors.push(`Duplicate id ${q.id} (also in section ${seen.get(q.id)})`);
  seen.set(q.id, q.section);
  if (q.proposed_rule_2025?.affected && !q.proposed_rule_2025.note.trim()) {
    errors.push(`${q.id}: proposed_rule_2025.note must explain the change`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) found:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

const active = questions.filter((q) => !q.retired);
console.log(
  `✓ ${active.length} questions in ${files.length} sections are valid ` +
    `(${active.filter((q) => q.critical).length} critical, ` +
    `${active.filter((q) => q.proposed_rule_2025?.affected).length} affected by the 2025 proposed rule).`,
);
