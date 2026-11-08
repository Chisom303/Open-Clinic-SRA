// Local-only persistence. Nothing here ever touches the network.
const KEY = 'open-clinic-sra:v1';
export const FORMAT_VERSION = 1;

export function emptyAssessment() {
  return {
    format: 'open-clinic-sra',
    version: FORMAT_VERSION,
    practice: { name: '', assessor: '' },
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answers: {},
  };
}

export function loadSaved() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // private mode, blocked storage, or corrupt data
  }
}

export function save(state) {
  try {
    state.updatedAt = new Date().toISOString();
    window.localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Download the assessment as a JSON file the user keeps for next year. */
export function exportFile(state) {
  const slug = (state.practice.name || 'practice').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `${slug}-${date}.assessment.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse and sanitize an imported file. Unknown question IDs and invalid
 * answers are dropped rather than trusted.
 */
export function parseImport(text, questions) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid assessment file.');
  }
  if (data?.format !== 'open-clinic-sra' || typeof data.answers !== 'object' || data.answers === null) {
    throw new Error('That file was not created by Open Clinic SRA.');
  }
  if (data.version > FORMAT_VERSION) {
    throw new Error('That file was created by a newer version of this tool. Please update.');
  }
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answers = {};
  let dropped = 0;
  for (const [id, a] of Object.entries(data.answers)) {
    const q = byId.get(id);
    const ok = Boolean(q) && (['yes', 'partial', 'no'].includes(a) || (q.allow_na && a === 'na'));
    if (ok) answers[id] = a;
    else dropped++;
  }
  const str = (v) => (typeof v === 'string' ? v.slice(0, 120) : '');
  return {
    state: {
      ...emptyAssessment(),
      practice: { name: str(data.practice?.name), assessor: str(data.practice?.assessor) },
      startedAt: str(data.startedAt) || new Date().toISOString(),
      answers,
    },
    dropped,
  };
}
