import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImport } from '../src/app/storage.js';

const questions = [
  { id: 'TEC-001', allow_na: false },
  { id: 'TEC-008', allow_na: true },
];

const file = (overrides) =>
  JSON.stringify({ format: 'open-clinic-sra', version: 1, practice: { name: 'Test Clinic' }, answers: {}, ...overrides });

test('valid answers are kept', () => {
  const { state, dropped } = parseImport(file({ answers: { 'TEC-001': 'yes', 'TEC-008': 'na' } }), questions);
  assert.deepEqual(state.answers, { 'TEC-001': 'yes', 'TEC-008': 'na' });
  assert.equal(dropped, 0);
  assert.equal(state.practice.name, 'Test Clinic');
});

test('unknown ids, bad values and disallowed N/A are dropped', () => {
  const { state, dropped } = parseImport(
    file({ answers: { 'TEC-001': 'na', 'TEC-008': 'maybe', 'XYZ-999': 'yes', __proto__: 'yes' } }),
    questions,
  );
  assert.deepEqual(state.answers, {});
  assert.equal(dropped, 2 + 1);
});

test('non-assessment files are rejected', () => {
  assert.throws(() => parseImport('not json', questions), /not a valid/);
  assert.throws(() => parseImport('{"hello":1}', questions), /not created by/);
  assert.throws(() => parseImport(file({ version: 99 }), questions), /newer version/);
});

test('long practice names are truncated', () => {
  const { state } = parseImport(file({ practice: { name: 'x'.repeat(500) } }), questions);
  assert.equal(state.practice.name.length, 120);
});

test('practice details are sanitized on import', () => {
  const { state } = parseImport(
    file({ practice: { name: 'A', securityOfficer: 'Dr. B', assessorType: 'hacker' } }),
    questions,
  );
  assert.equal(state.practice.securityOfficer, 'Dr. B');
  assert.equal(state.practice.assessorType, '');
});
