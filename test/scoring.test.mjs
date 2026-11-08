import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAssessment, inherentRisk, severity } from '../src/scoring.mjs';
import { loadContent } from '../src/content.mjs';

const q = (id, overrides = {}) => ({
  id,
  section: 'technical',
  text: `Question ${id}`,
  citation: '45 CFR 164.312(b)',
  likelihood: 2,
  impact: 2,
  critical: false,
  allow_na: true,
  why: 'why',
  fix: 'fix',
  fix_within_days: 30,
  ...overrides,
});

test('inherent risk is likelihood × impact', () => {
  assert.equal(inherentRisk(q('TEC-001', { likelihood: 3, impact: 2 })), 6);
});

test('severity bands', () => {
  assert.equal(severity(9), 'high');
  assert.equal(severity(6), 'high');
  assert.equal(severity(4), 'medium');
  assert.equal(severity(2), 'low');
});

test('all yes → low with no findings', () => {
  const qs = [q('TEC-001'), q('TEC-002')];
  const r = scoreAssessment(qs, { 'TEC-001': 'yes', 'TEC-002': 'yes' });
  assert.equal(r.level, 'low');
  assert.equal(r.score, 0);
  assert.equal(r.findings.length, 0);
  assert.equal(r.complete, true);
});

test('all no → high', () => {
  const qs = [q('TEC-001'), q('TEC-002')];
  const r = scoreAssessment(qs, { 'TEC-001': 'no', 'TEC-002': 'no' });
  assert.equal(r.level, 'high');
  assert.equal(r.ratio, 1);
});

test('partial counts half the risk', () => {
  const r = scoreAssessment([q('TEC-001')], { 'TEC-001': 'partial' });
  assert.equal(r.score, 2);
  assert.equal(r.max, 4);
});

test('N/A is excluded from the denominator', () => {
  const qs = [q('TEC-001'), q('TEC-002')];
  const r = scoreAssessment(qs, { 'TEC-001': 'yes', 'TEC-002': 'na' });
  assert.equal(r.max, 4);
  assert.equal(r.ratio, 0);
});

test('N/A is rejected when not allowed', () => {
  assert.throws(
    () => scoreAssessment([q('TEC-001', { allow_na: false })], { 'TEC-001': 'na' }),
    /does not allow/,
  );
});

test('invalid answer is rejected', () => {
  assert.throws(() => scoreAssessment([q('TEC-001')], { 'TEC-001': 'maybe' }), /Invalid answer/);
});

test('a single critical "no" forces HIGH even when everything else is yes', () => {
  const qs = [
    q('TEC-003', { critical: true, likelihood: 1, impact: 1 }),
    ...Array.from({ length: 20 }, (_, i) => q(`ADM-${String(i + 1).padStart(3, '0')}`, { likelihood: 3, impact: 3 })),
  ];
  const answers = Object.fromEntries(qs.map((x) => [x.id, 'yes']));
  answers['TEC-003'] = 'no';
  const r = scoreAssessment(qs, answers);
  assert.ok(r.ratio < 0.15, 'raw ratio alone would be low');
  assert.equal(r.level, 'high');
  assert.equal(r.criticalFindings.length, 1);
});

test('a critical "partial" forces at least MEDIUM', () => {
  const qs = [q('TEC-003', { critical: true, likelihood: 1, impact: 1 }), ...Array.from({ length: 20 }, (_, i) => q(`ADM-${String(i + 1).padStart(3, '0')}`, { likelihood: 3, impact: 3 }))];
  const answers = Object.fromEntries(qs.map((x) => [x.id, 'yes']));
  answers['TEC-003'] = 'partial';
  assert.equal(scoreAssessment(qs, answers).level, 'medium');
});

test('findings are prioritized: critical first, then by residual risk', () => {
  const qs = [
    q('TEC-001', { likelihood: 3, impact: 3 }),
    q('TEC-002', { critical: true, likelihood: 1, impact: 2 }),
    q('TEC-003', { likelihood: 1, impact: 1 }),
  ];
  const r = scoreAssessment(qs, { 'TEC-001': 'no', 'TEC-002': 'no', 'TEC-003': 'no' });
  assert.deepEqual(r.findings.map((f) => f.id), ['TEC-002', 'TEC-001', 'TEC-003']);
});

test('unanswered questions are reported and excluded', () => {
  const r = scoreAssessment([q('TEC-001'), q('TEC-002')], { 'TEC-001': 'no' });
  assert.deepEqual(r.unanswered, ['TEC-002']);
  assert.equal(r.complete, false);
  assert.equal(r.max, 4);
});

test('retired questions are ignored', () => {
  const r = scoreAssessment([q('TEC-001', { retired: true })], {});
  assert.equal(r.unanswered.length, 0);
  assert.equal(r.max, 0);
});

test('the real question bank scores end to end', () => {
  const { questions } = loadContent();
  const allNo = Object.fromEntries(questions.map((x) => [x.id, 'no']));
  const r = scoreAssessment(questions, allNo);
  assert.equal(r.level, 'high');
  assert.equal(r.findings.length, questions.length);
  assert.ok(r.criticalFindings.length >= 5);
});
