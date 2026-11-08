// Open Clinic SRA — scoring engine.
// Pure functions only: no network, no storage, no DOM.
// See docs/methodology.md for the plain-language explanation.

/** Allowed answers. */
export const ANSWERS = Object.freeze({
  YES: 'yes',
  PARTIAL: 'partial',
  NO: 'no',
  NA: 'na',
});

/** Share of a question's risk that remains for each answer. */
const RESIDUAL = Object.freeze({ yes: 0, partial: 0.5, no: 1 });

/** Overall rating thresholds, as a share of maximum possible risk. */
export const THRESHOLDS = Object.freeze({ medium: 0.15, high: 0.4 });

const LEVELS = ['low', 'medium', 'high'];
const maxLevel = (a, b) => (LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b);

/** Inherent risk of a question if fully unaddressed: likelihood × impact (1–9). */
export function inherentRisk(q) {
  return q.likelihood * q.impact;
}

/** Map a 1–9 risk value to a finding severity. */
export function severity(risk) {
  if (risk >= 6) return 'high';
  if (risk >= 3) return 'medium';
  return 'low';
}

function levelFromRatio(ratio) {
  if (ratio >= THRESHOLDS.high) return 'high';
  if (ratio >= THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Score an assessment.
 *
 * @param {Array<object>} questions  Question objects from content/questions (retired ones are skipped).
 * @param {Record<string,string>} answers  Map of question id → 'yes' | 'partial' | 'no' | 'na'.
 * @returns {{
 *   level: 'low'|'medium'|'high',
 *   ratio: number,
 *   score: number, max: number,
 *   sections: Record<string, {score:number, max:number, ratio:number, level:string}>,
 *   findings: Array<object>,
 *   criticalFindings: Array<object>,
 *   unanswered: string[],
 *   complete: boolean
 * }}
 */
export function scoreAssessment(questions, answers) {
  const sections = {};
  const findings = [];
  const unanswered = [];
  let score = 0;
  let max = 0;
  let criticalFloor = 'low';

  for (const q of questions) {
    if (q.retired) continue;
    const a = answers[q.id];
    const section = (sections[q.section] ??= { score: 0, max: 0 });

    if (a === undefined || a === null || a === '') {
      unanswered.push(q.id);
      continue;
    }
    if (a === ANSWERS.NA) {
      if (!q.allow_na) {
        throw new Error(`Question ${q.id} does not allow "N/A".`);
      }
      continue; // excluded from both numerator and denominator
    }
    if (!(a in RESIDUAL)) {
      throw new Error(`Invalid answer "${a}" for ${q.id}.`);
    }

    const risk = inherentRisk(q);
    const residual = risk * RESIDUAL[a];
    section.max += risk;
    section.score += residual;
    max += risk;
    score += residual;

    if (residual > 0) {
      const finding = {
        id: q.id,
        section: q.section,
        text: q.text,
        answer: a,
        risk,
        residual,
        // Severity reflects the risk that remains, so labels match the priority order.
        severity: q.critical && a === ANSWERS.NO ? 'critical' : severity(residual),
        critical: Boolean(q.critical),
        citation: q.citation,
        why: q.why,
        fix: q.fix,
        fix_within_days: q.fix_within_days,
      };
      findings.push(finding);

      if (q.critical) {
        criticalFloor = maxLevel(criticalFloor, a === ANSWERS.NO ? 'high' : 'medium');
      }
    }
  }

  for (const s of Object.values(sections)) {
    s.ratio = s.max === 0 ? 0 : s.score / s.max;
    s.level = levelFromRatio(s.ratio);
  }

  const ratio = max === 0 ? 0 : score / max;
  const level = maxLevel(levelFromRatio(ratio), criticalFloor);

  // Remediation priority: critical first, then highest residual risk, then shortest deadline.
  findings.sort(
    (x, y) =>
      Number(y.severity === 'critical') - Number(x.severity === 'critical') ||
      y.residual - x.residual ||
      x.fix_within_days - y.fix_within_days ||
      x.id.localeCompare(y.id),
  );

  return {
    level,
    ratio,
    score,
    max,
    sections,
    findings,
    criticalFindings: findings.filter((f) => f.severity === 'critical'),
    unanswered,
    complete: unanswered.length === 0,
  };
}
