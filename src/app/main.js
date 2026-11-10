import content from '../generated/content.json';
import { scoreAssessment } from '../scoring.mjs';
import { emptyAssessment, loadSaved, save, clearSaved, exportFile, parseImport } from './storage.js';
import { trackPage, trackEvent, EVENTS } from './analytics.js';

const FEEDBACK_URL = 'https://github.com/Chisom303/open-clinic-sra/issues/new?template=feedback.yml';
const FEEDBACK_EMAIL = 'Aloziechisom23@gmail.com';

const { sections, questions } = content;
const bySection = Object.fromEntries(sections.map((s) => [s.id, questions.filter((q) => q.section === s.id)]));
const main = document.getElementById('main');

let state = loadSaved() ?? emptyAssessment();
state.practice = { ...emptyAssessment().practice, ...state.practice };

// ---------- helpers ----------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LEVEL_LABEL = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' };
const ANSWER_LABEL = { yes: 'Yes', partial: 'Partially', no: 'No', na: 'N/A' };
const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const IMPLEMENTATION_TEXT = {
  required: '<strong>Required</strong> under the current Security Rule: you must implement it.',
  addressable:
    '<strong>Addressable</strong> under the current Security Rule. This does not mean optional: you must implement it if it is reasonable and appropriate for your practice, or document why not and what equivalent measure you use instead.',
  standard: '<strong>Standard</strong> under the current Security Rule: you must meet it.',
  guidance: '<strong>Recommended practice</strong> from official HHS or NIST guidance that supports the Security Rule.',
};
const RESOURCES = [
  ['HHS 405(d) Health Industry Cybersecurity Practices', 'https://405d.hhs.gov/', 'Free cybersecurity guidance written for small and medium healthcare practices.'],
  ['Official HHS Security Risk Assessment Tool', 'https://www.healthit.gov/topic/privacy-security-and-hipaa/security-risk-assessment-tool', 'The free government tool. You can use it alongside or instead of this one.'],
  ['CISA free vulnerability scanning', 'https://www.cisa.gov/cyber-hygiene-services', 'Free external scanning of your internet-facing systems, available to healthcare organizations.'],
  ['CISA Known Exploited Vulnerabilities Catalog', 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', 'Flaws attackers are actively using. Ask your IT provider to patch anything on this list first.'],
  ['HHS Security Rule guidance', 'https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html', 'Official HHS guidance on risk analysis and the Security Rule.'],
];

const answeredIn = (sid) => bySection[sid].filter((q) => state.answers[q.id]).length;
const totalAnswered = () => questions.filter((q) => state.answers[q.id]).length;
const hasStarted = () => Boolean(state.practice.name) || totalAnswered() > 0;

function persist() {
  if (!save(state)) showToast('Your browser is blocking storage. Use "Save to file" so you don\'t lose your answers.');
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

let toastTimer;
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = Object.assign(document.createElement('div'), { className: 'toast', role: 'status' });
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

function progressBar(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="${esc(label)}">
    <div class="progress-fill" style="width:${pct}%"></div></div>`;
}

// ---------- views ----------
function viewWelcome() {
  const started = hasStarted();
  return `
  <section class="hero">
    <p class="eyebrow">HIPAA Security Risk Assessment</p>
    <h1>Find and fix the security gaps in your practice.</h1>
    <p class="lede">${questions.length} plain-language questions, about 20–25 minutes. You'll get a risk rating and a prioritized plan to fix what matters most.</p>
    <ul class="assurances">
      <li><strong>Private.</strong> 100% runs in your browser. Your answers are saved only on this device and are never sent to GitHub or any other server. Reports are printed or saved as PDF on your own computer. To see how many practices use the tool, we count anonymous visits and steps (like "report printed") without cookies; your answers and practice details are never included.</li>
      <li><strong>Free.</strong> Open source, no account, no sign-up.</li>
      <li><strong>Transparent.</strong> Every question cites the HIPAA rule it comes from.</li>
    </ul>
  </section>

  <form class="card" id="practice-form">
    <h2>About this assessment</h2>
    <label>Practice name
      <input name="name" maxlength="120" autocomplete="organization" value="${esc(state.practice.name)}" placeholder="e.g. Riverside Family Medicine" />
    </label>
    <label>Completed by (name and role)
      <input name="assessor" maxlength="120" value="${esc(state.practice.assessor)}" placeholder="e.g. Jordan Lee, Practice Manager" />
    </label>
    <fieldset class="radio-row">
      <legend>The person completing this is</legend>
      <label><input type="radio" name="assessorType" value="internal" ${state.practice.assessorType === 'internal' ? 'checked' : ''} /> Practice staff</label>
      <label><input type="radio" name="assessorType" value="external" ${state.practice.assessorType === 'external' ? 'checked' : ''} /> An outside consultant</label>
    </fieldset>
    <label>Security Officer (name and title) <span class="optional">optional</span>
      <input name="securityOfficer" maxlength="120" value="${esc(state.practice.securityOfficer)}" placeholder="e.g. Dr. Sam Patel, Owner" />
    </label>
    <p class="warn">⚠️ Never enter patient names or any patient information. This tool asks only about your safeguards.</p>
    <div class="actions">
      <button type="submit" class="btn primary">${started ? 'Continue assessment' : 'Start assessment'} →</button>
      ${started ? `<a class="btn ghost" href="#/results">See results so far</a>` : ''}
    </div>
  </form>

  <section class="card subtle">
    <h2>Have a file from last time?</h2>
    <p>Load a saved assessment file to continue it or update it for this year.</p>
    <label class="btn ghost file-btn">Load saved file<input type="file" id="import" accept=".json,application/json" hidden /></label>
    ${started ? `<button class="btn link danger" id="reset">Start over and erase answers on this device</button>` : ''}
  </section>`;
}

function sectionNav(activeId) {
  return `<nav class="section-nav" aria-label="Sections"><ol>
    ${sections
      .map((s) => {
        const done = answeredIn(s.id);
        const total = bySection[s.id].length;
        const complete = done === total;
        return `<li><a href="#/section/${s.id}" class="${s.id === activeId ? 'active' : ''} ${complete ? 'complete' : ''}" ${
          s.id === activeId ? 'aria-current="step"' : ''
        }>
          <span class="dot" aria-hidden="true">${complete ? '✓' : ''}</span>
          <span class="nav-title">${esc(s.title)}</span>
          <span class="nav-count">${done}/${total}</span></a></li>`;
      })
      .join('')}
    <li><a href="#/results" class="results-link">View results →</a></li>
  </ol></nav>`;
}

function questionCard(q, index) {
  const current = state.answers[q.id];
  const opts = ['yes', 'partial', 'no', ...(q.allow_na ? ['na'] : [])];
  return `
  <fieldset class="question ${current ? 'answered' : ''}" id="${q.id}">
    <legend><span class="qnum">${index + 1}</span> ${esc(q.text)}</legend>
    <p class="help">${esc(q.help)}</p>
    <div class="choices" role="radiogroup">
      ${opts
        .map(
          (o) => `<label class="choice ${o}">
            <input type="radio" name="${q.id}" value="${o}" ${current === o ? 'checked' : ''} />
            <span>${ANSWER_LABEL[o]}</span></label>`,
        )
        .join('')}
    </div>
    <details class="more">
      <summary>Why this matters</summary>
      <p>${esc(q.why)}</p>
      <p class="cite">Source: ${esc(q.citation)}${q.critical ? ' · <strong>critical safeguard</strong>' : ''}</p>
      <p class="impl">${IMPLEMENTATION_TEXT[q.implementation] ?? ''}</p>
      ${q.proposed_rule_2025?.affected ? `<p class="proposed"><strong>Proposed rule (not final):</strong> ${esc(q.proposed_rule_2025.note)}</p>` : ''}
    </details>
  </fieldset>`;
}

function viewSection(sid) {
  const idx = sections.findIndex((s) => s.id === sid);
  if (idx === -1) return viewWelcome();
  const s = sections[idx];
  const prev = sections[idx - 1];
  const next = sections[idx + 1];
  return `
  <div class="layout">
    ${sectionNav(sid)}
    <div class="section-body">
      <p class="eyebrow">Section ${idx + 1} of ${sections.length}</p>
      <h1>${esc(s.title)}</h1>
      <p class="lede">${esc(s.description)}</p>
      ${progressBar(totalAnswered(), questions.length, 'Overall progress')}
      <p class="progress-label">${totalAnswered()} of ${questions.length} answered overall</p>
      <form id="answers">${bySection[sid].map(questionCard).join('')}</form>
      <div class="actions spread">
        ${prev ? `<a class="btn ghost" href="#/section/${prev.id}">← ${esc(prev.title)}</a>` : `<a class="btn ghost" href="#/">← Start</a>`}
        ${next ? `<a class="btn primary" href="#/section/${next.id}">${esc(next.title)} →</a>` : `<a class="btn primary" href="#/results">See results →</a>`}
      </div>
    </div>
  </div>`;
}

function viewResults() {
  const r = scoreAssessment(questions, state.answers);
  const pct = Math.round(r.ratio * 100);
  const date = new Date(state.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const sectionRows = sections
    .map((s) => {
      const sc = r.sections[s.id] ?? { ratio: 0, level: 'low', max: 0 };
      const p = Math.round(sc.ratio * 100);
      return `<tr>
        <th scope="row"><a href="#/section/${s.id}">${esc(s.title)}</a></th>
        <td><div class="meter" aria-hidden="true"><div class="meter-fill ${sc.level}" style="width:${Math.max(p, 2)}%"></div></div></td>
        <td class="num">${sc.max ? `${p}%` : '—'}</td>
        <td><span class="badge ${sc.level}">${sc.max ? LEVEL_LABEL[sc.level] : 'Not answered'}</span></td>
      </tr>`;
    })
    .join('');

  const findings = r.findings
    .map(
      (f, i) => `<li class="finding ${f.severity}">
        <div class="finding-head">
          <span class="rank">${i + 1}</span>
          <span class="badge ${f.severity}">${SEVERITY_LABEL[f.severity]}</span>
          <span class="due">Fix within ${f.fix_within_days} days</span>
        </div>
        <h3>${esc(f.text)}</h3>
        <p class="your-answer">Your answer: <strong>${ANSWER_LABEL[f.answer]}</strong> · <span class="cite">${esc(f.citation)}</span></p>
        <p><strong>Why it matters:</strong> ${esc(f.why)}</p>
        <p><strong>How to fix:</strong> ${esc(f.fix)}</p>
      </li>`,
    )
    .join('');

  return `
  <section class="results-head">
    <p class="eyebrow">Results${state.practice.name ? ` · ${esc(state.practice.name)}` : ''} · ${esc(date)}</p>
    <div class="score-card ${r.level}">
      <div>
        <p class="score-level">${LEVEL_LABEL[r.level]}</p>
        <p class="score-detail">${pct}% of measured risk remains · ${r.findings.length} gap${r.findings.length === 1 ? '' : 's'} found${
          r.criticalFindings.length ? ` · <strong>${r.criticalFindings.length} critical</strong>` : ''
        }</p>
      </div>
    </div>
    ${
      r.complete
        ? ''
        : `<p class="notice">You've answered ${totalAnswered()} of ${questions.length} questions. Results will change as you finish. <a href="#/section/${
            questions.find((q) => !state.answers[q.id])?.section
          }">Continue →</a></p>`
    }
    ${
      r.criticalFindings.length
        ? `<p class="notice critical">A missing critical safeguard puts your practice at high risk regardless of other answers. Start with the items marked <strong>Critical</strong>.</p>`
        : ''
    }
  </section>

  <section class="card">
    <h2>By section</h2>
    <table class="sections-table"><tbody>${sectionRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Your action plan</h2>
    ${findings ? `<p>Ordered by priority. Assign each item an owner and track it to completion.</p><ol class="findings">${findings}</ol>` : `<p>No gaps found in the questions you've answered. 🎉</p>`}
  </section>

  <section class="card subtle">
    <h2>Keep a record</h2>
    <p>HIPAA requires you to keep your risk analysis for at least 6 years. Save this assessment as a file and store it with your HIPAA documentation. Next year, load it to update rather than starting over.</p>
    <div class="actions">
      <a class="btn primary" href="#/report">Open signed report (print or save as PDF)</a>
      <button class="btn ghost" id="export">Save to file</button>
    </div>
    <p class="fine">This is a structured self-assessment, not legal advice and not a certification of HIPAA compliance. See the methodology and disclaimer in the project repository.</p>
  </section>

  <section class="card feedback">
    <h2>Did this help?</h2>
    <p>This free tool improves with feedback from practices and IT providers. Tell us what worked, what was confusing, or what's missing. Please don't include patient information.</p>
    <div class="actions">
      <a class="btn ghost" id="feedback" href="${FEEDBACK_URL}" target="_blank" rel="noopener noreferrer">Share feedback on GitHub ↗</a>
      <a class="btn link" id="feedback-email" href="mailto:${FEEDBACK_EMAIL}?subject=Open%20Clinic%20SRA%20feedback">Or send an email</a>
    </div>
  </section>

  ${resourcesCard()}`;
}

function resourcesCard() {
  return `<section class="card">
    <h2>Free help for small practices</h2>
    <ul class="resources">
      ${RESOURCES.map(([t, u, d]) => `<li><a href="${u}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a><span>${esc(d)}</span></li>`).join('')}
    </ul>
  </section>`;
}

function viewReport() {
  const r = scoreAssessment(questions, state.answers);
  const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const name = state.practice.name || '[Practice name not entered]';
  const assessed = new Date(state.updatedAt);
  const nextReview = new Date(assessed);
  nextReview.setFullYear(nextReview.getFullYear() + 1);
  const count = (sev) => r.findings.filter((f) => f.severity === sev).length;
  const assessorType = { internal: 'Practice staff', external: 'Outside consultant' }[state.practice.assessorType] ?? '';
  const rows = r.findings
    .map(
      (f, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td><span class="badge ${f.severity}">${SEVERITY_LABEL[f.severity]}</span></td>
        <td><strong>${esc(f.text)}</strong><br /><span class="cite">${esc(f.id)} · ${esc(f.citation)} · Answer: ${ANSWER_LABEL[f.answer]}</span><br />${esc(f.fix)}</td>
        <td>${f.fix_within_days} days</td>
        <td class="blank"></td>
        <td class="blank"></td>
      </tr>`,
    )
    .join('');
  const sectionRows = sections
    .map((s) => {
      const sc = r.sections[s.id] ?? { ratio: 0, level: 'low', max: 0 };
      const n = bySection[s.id].length;
      const na = bySection[s.id].filter((q) => state.answers[q.id] === 'na').length;
      return `<tr><th scope="row">${esc(s.title)}</th><td class="num">${n}</td><td class="num">${na}</td>
        <td class="num">${sc.max ? `${Math.round(sc.ratio * 100)}%` : '—'}</td>
        <td>${sc.max ? LEVEL_LABEL[sc.level] : 'Not assessed'}</td></tr>`;
    })
    .join('');

  return `
  <div class="report-toolbar">
    <a class="btn ghost" href="#/results">← Back to results</a>
    <button class="btn primary" onclick="window.print()">Print or save as PDF</button>
  </div>
  <p class="print-tip">Tip: in the print window, choose <strong>Save as PDF</strong> as the destination and turn off <strong>Headers and footers</strong> for a clean copy.</p>
  ${!state.practice.name ? `<p class="notice">Add your practice name on the <a href="#/">start page</a> so it appears on the report.</p>` : ''}
  ${!r.complete ? `<p class="notice">${r.unanswered.length} question(s) are unanswered. Complete the assessment before signing this report.</p>` : ''}

  <article class="report">
    <header class="report-cover">
      <p class="confidential">Confidential — contains details of security safeguards</p>
      <p class="eyebrow">HIPAA Security Rule · Security Risk Analysis</p>
      <h1>${esc(name)}</h1>
      <dl class="meta">
        <div><dt>Assessment date</dt><dd>${esc(fmt(assessed))}</dd></div>
        <div><dt>Next review due</dt><dd>${esc(fmt(nextReview))}</dd></div>
        <div><dt>Completed by</dt><dd>${esc(state.practice.assessor || '—')}${assessorType ? `<br /><span class="cite">${assessorType}</span>` : ''}</dd></div>
        <div><dt>Security Officer</dt><dd>${esc(state.practice.securityOfficer || '—')}</dd></div>
        <div><dt>Overall risk</dt><dd><span class="badge ${r.level}">${LEVEL_LABEL[r.level]}</span><br /><span class="cite">${Math.round(r.ratio * 100)}% of measured risk remains (${+r.score.toFixed(1)} of ${r.max} points)</span></dd></div>
        <div><dt>Findings</dt><dd>${r.findings.length} total<br /><span class="cite">${count('critical')} critical · ${count('high')} high · ${count('medium')} medium · ${count('low')} low</span></dd></div>
      </dl>
      <div class="fill-in">
        <div><span class="line"></span>Practice address</div>
        <div><span class="line"></span>NPI (optional)</div>
      </div>
    </header>

    <section>
      <h2>1. Scope and method</h2>
      <p>This analysis covers the practice's administrative, physical, and technical safeguards for electronic protected health information (ePHI), including AI tools that access ePHI, as required by 45 CFR 164.308(a)(1)(ii)(A). ${questions.length} safeguards were assessed.</p>
      <ul class="method">
        <li><strong>Sources:</strong> HIPAA Security Rule (45 CFR Part 164, Subpart C) as currently in force; Breach Notification Rule (45 CFR 164.404); NIST SP 800-30 Rev. 1 (risk assessment method); NIST SP 800-66 Rev. 2 (Security Rule implementation guidance).</li>
        <li><strong>Risk per safeguard:</strong> likelihood (1–3) × impact (1–3), from 1 to 9 points. Yes leaves 0% of that risk, Partially 50%, No 100%. N/A answers are excluded.</li>
        <li><strong>Overall rating:</strong> remaining risk as a share of the maximum. Below 15% Low, 15–39% Medium, 40% or more High. Any critical safeguard answered No raises the rating to at least High; Partially, to at least Medium.</li>
        <li><strong>Critical safeguards:</strong> risk analysis, tested backups, device encryption, multi-factor authentication, Business Associate Agreements, and an incident response plan.</li>
        <li><strong>Proposed rule:</strong> notes on the January 2025 proposed Security Rule are informational only; that rule is not final and is not scored.</li>
      </ul>
    </section>

    <section>
      <h2>2. Results by area</h2>
      <table class="report-table"><thead><tr><th>Area</th><th>Questions</th><th>N/A</th><th>Risk remaining</th><th>Rating</th></tr></thead><tbody>${sectionRows}</tbody></table>
    </section>

    <section>
      <h2>3. Risk management plan</h2>
      ${
        rows
          ? `<p>Findings in priority order. Assign an owner and target date to each, and record completion.</p>
        <table class="report-table plan"><thead><tr><th>#</th><th>Severity</th><th>Finding and remediation</th><th>Due in</th><th>Owner</th><th>Done (date)</th></tr></thead><tbody>${rows}</tbody></table>`
          : '<p>No gaps were identified in the safeguards assessed.</p>'
      }
    </section>

    <section class="signoff">
      <h2>4. Review and approval</h2>
      <p>I attest that the information in this assessment is true and complete to the best of my knowledge, that I have reviewed the risk management plan above, and that this assessment will be retained for at least six years as required by 45 CFR 164.316(b)(2)(i).</p>
      <div class="sig-grid">
        <div><span class="line"></span>Security Officer — printed name</div>
        <div><span class="line"></span>Signature</div>
        <div><span class="line"></span>Date</div>
        <div><span class="line"></span>Practice owner / administrator — printed name</div>
        <div><span class="line"></span>Signature</div>
        <div><span class="line"></span>Date</div>
      </div>
      <p>Next review due: within 12 months of the date above, or sooner after a major change or security incident.</p>
    </section>

    <footer class="report-foot">
      Prepared with Open Clinic SRA, a free open-source tool. This report is a structured self-assessment to support the practice's HIPAA risk analysis. It is not legal advice and does not certify HIPAA compliance. Keep this report for at least 6 years (45 CFR 164.316(b)(2)).
    </footer>
  </article>`;
}

// ---------- render + events ----------
function render() {
  const hash = location.hash || '#/';
  const [, route, param] = hash.split('/');
  if (route === 'section') main.innerHTML = viewSection(param);
  else if (route === 'results') main.innerHTML = viewResults();
  else if (route === 'report') main.innerHTML = viewReport();
  else main.innerHTML = viewWelcome();
  trackPage(route === 'section' ? `/section/${param}` : route === 'results' || route === 'report' ? `/${route}` : '/');
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

main.addEventListener('submit', (e) => {
  if (e.target.id !== 'practice-form') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  state.practice.name = String(fd.get('name') || '').trim();
  state.practice.assessor = String(fd.get('assessor') || '').trim();
  state.practice.securityOfficer = String(fd.get('securityOfficer') || '').trim();
  state.practice.assessorType = String(fd.get('assessorType') || '');
  persist();
  trackEvent(EVENTS.started, { once: true });
  const firstOpen = sections.find((s) => answeredIn(s.id) < bySection[s.id].length) ?? sections[0];
  go(`#/section/${firstOpen.id}`);
});

main.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.type === 'radio' && t.closest('#answers')) {
    state.answers[t.name] = t.value;
    persist();
    if (totalAnswered() === questions.length) trackEvent(EVENTS.completed, { once: true });
    t.closest('.question').classList.add('answered');
    // Update nav counts and progress without re-rendering (keeps focus on the radio).
    const nav = document.querySelector('.section-nav');
    if (nav) nav.outerHTML = sectionNav(location.hash.split('/')[2]);
    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = `${Math.round((totalAnswered() / questions.length) * 100)}%`;
    const label = document.querySelector('.progress-label');
    if (label) label.textContent = `${totalAnswered()} of ${questions.length} answered overall`;
  }
  if (t.id === 'import' && t.files?.[0]) {
    try {
      const { state: imported, dropped } = parseImport(await t.files[0].text(), questions);
      state = imported;
      persist();
      trackEvent(EVENTS.fileLoaded);
      showToast(`Loaded ${Object.keys(state.answers).length} answers${dropped ? ` (${dropped} outdated answers skipped)` : ''}.`);
      render();
    } catch (err) {
      showToast(err.message);
    }
  }
});

main.addEventListener('click', (e) => {
  if (e.target.id === 'export') {
    exportFile(state);
    trackEvent(EVENTS.fileSaved);
    showToast('Saved. Store this file with your HIPAA records.');
  }
  if (e.target.id === 'feedback' || e.target.id === 'feedback-email') trackEvent(EVENTS.feedbackClicked);
  if (e.target.id === 'reset') {
    if (confirm('Erase all answers saved on this device? Save to file first if you want to keep them.')) {
      clearSaved();
      state = emptyAssessment();
      render();
    }
  }
});

window.addEventListener('hashchange', render);
// Counts printing from the report page, whether via the button or Ctrl+P.
window.addEventListener('beforeprint', () => {
  if ((location.hash || '').startsWith('#/report')) trackEvent(EVENTS.reportPrinted);
});
render();
