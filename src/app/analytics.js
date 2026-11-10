// Anonymous usage counting with GoatCounter (https://www.goatcounter.com).
//
// PRIVACY RULES — do not break these:
//   * Only the fixed event names and page paths below are ever sent.
//   * Never send answers, practice names, people's names, or anything a user types.
// tests/analytics.test.mjs enforces the allow-list.

export const PAGES = Object.freeze({
  home: '/',
  results: '/results',
  report: '/report',
});

export const EVENTS = Object.freeze({
  started: 'assessment-started',
  completed: 'assessment-completed',
  reportPrinted: 'report-printed',
  fileSaved: 'file-saved',
  fileLoaded: 'file-loaded',
  feedbackClicked: 'feedback-clicked',
});

const ALLOWED = new Set([...Object.values(PAGES), ...Object.values(EVENTS)]);
const SECTION_PATH = /^\/section\/[a-z_]+$/;

/** True if a path is safe to send. Section paths use fixed section IDs only. */
export function isAllowed(path) {
  return ALLOWED.has(path) || SECTION_PATH.test(path);
}

const queue = [];
let sent = new Set();

function flush() {
  const gc = typeof window !== 'undefined' ? window.goatcounter : undefined;
  if (!gc || typeof gc.count !== 'function') return false;
  while (queue.length) {
    try {
      gc.count(queue.shift());
    } catch {
      /* never let analytics break the app */
    }
  }
  return true;
}

// The counter script loads asynchronously; retry briefly until it is ready.
let waiting = false;
function schedule() {
  if (flush() || waiting) return;
  waiting = true;
  let tries = 0;
  const timer = setInterval(() => {
    if (flush() || ++tries > 40) {
      clearInterval(timer);
      waiting = false;
    }
  }, 250);
}

/** Count a page view (path must be on the allow-list). */
export function trackPage(path) {
  if (!isAllowed(path)) return;
  queue.push({ path, title: 'Open Clinic SRA', event: false });
  schedule();
}

/** Count an event. `once` limits it to once per browser tab session. */
export function trackEvent(name, { once = false } = {}) {
  if (!isAllowed(name)) return;
  if (once) {
    if (sent.has(name)) return;
    sent.add(name);
  }
  queue.push({ path: name, title: name, event: true });
  schedule();
}

/** For tests only. */
export function _reset() {
  queue.length = 0;
  sent = new Set();
}
export const _queue = queue;
