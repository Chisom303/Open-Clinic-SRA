import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, trackEvent, trackPage, _queue, _reset, EVENTS } from '../src/app/analytics.js';

test('only allow-listed paths are counted', () => {
  assert.ok(isAllowed('/'));
  assert.ok(isAllowed('/results'));
  assert.ok(isAllowed('/section/technical'));
  assert.ok(isAllowed(EVENTS.reportPrinted));
  assert.ok(!isAllowed('/section/Riverside Family'));
  assert.ok(!isAllowed('TEC-004=no'));
  assert.ok(!isAllowed('/results?practice=SMC'));
});

test('anything outside the allow-list is never queued', () => {
  _reset();
  trackPage('/practice/SMC Family Clinic');
  trackEvent('answer:TEC-004:no');
  assert.equal(_queue.length, 0);
});

test('once-only events are counted a single time', () => {
  _reset();
  trackEvent(EVENTS.completed, { once: true });
  trackEvent(EVENTS.completed, { once: true });
  assert.equal(_queue.length, 1);
  assert.deepEqual(Object.keys(_queue[0]).sort(), ['event', 'path', 'title']);
});
