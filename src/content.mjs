// Loads the question bank from content/ (Node only; the browser app will bundle it at build time).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');

// JSON_SCHEMA keeps dates like 2026-11-07 as strings instead of Date objects.
const load = (path) => yaml.load(readFileSync(path, 'utf8'), { schema: yaml.JSON_SCHEMA });

export function loadContent() {
  const { sections } = load(join(root, 'sections.yaml'));
  const files = sections.map((s) => ({ ...load(join(root, 'questions', s.file)), file: s.file }));
  const questions = files.flatMap((f) => f.questions.map((q) => ({ ...q, section: f.section })));
  return { sections, files, questions };
}
