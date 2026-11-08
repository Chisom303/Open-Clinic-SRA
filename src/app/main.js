import content from '../generated/content.json';
import { scoreAssessment } from '../scoring.mjs';
import { emptyAssessment, loadSaved, save, clearSaved, exportFile, parseImport } from './storage.js';

const { sections, questions } = content;
const bySection = Object.fromEntries(sections.map((s) => [s.id, questions.filter((q) => q.section === s.id)]));
const main = document.getElementById('main');

let state = loadSaved() ?? emptyAssessment();

// ---------- helpers ----------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LEVEL_LABEL = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' };
const ANSWER_LABEL = { yes: 'Yes', partial: 'Partially', no: 'No', na: 'N/A' };
const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

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
    <p class="lede">${questions.length} plain-language questions, about 20 minutes. You'll get a risk rating and a prioritized plan to fix what matters most.</p>
    <ul class="assurances">
      <li><strong>Private.</strong> Your answers are saved only in this browser. Nothing is sent anywhere.</li>
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
      <p class="cite">Source: ${esc(q.citation)} · ${esc(q.implementation)}${q.critical ? ' · <strong>critical safeguard</strong>' : ''}</p>
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
      <button class="btn primary" id="export">Save to file</button>
      <button class="btn ghost" onclick="window.print()">Print</button>
    </div>
    <p class="fine">This is a structured self-assessment, not legal advice and not a certification of HIPAA compliance. See the methodology and disclaimer in the project repository.</p>
  </section>`;
}

// ---------- render + events ----------
function render() {
  const hash = location.hash || '#/';
  const [, route, param] = hash.split('/');
  if (route === 'section') main.innerHTML = viewSection(param);
  else if (route === 'results') main.innerHTML = viewResults();
  else main.innerHTML = viewWelcome();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

main.addEventListener('submit', (e) => {
  if (e.target.id !== 'practice-form') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  state.practice.name = String(fd.get('name') || '').trim();
  state.practice.assessor = String(fd.get('assessor') || '').trim();
  persist();
  const firstOpen = sections.find((s) => answeredIn(s.id) < bySection[s.id].length) ?? sections[0];
  go(`#/section/${firstOpen.id}`);
});

main.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.type === 'radio' && t.closest('#answers')) {
    state.answers[t.name] = t.value;
    persist();
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
    showToast('Saved. Store this file with your HIPAA records.');
  }
  if (e.target.id === 'reset') {
    if (confirm('Erase all answers saved on this device? Save to file first if you want to keep them.')) {
      clearSaved();
      state = emptyAssessment();
      render();
    }
  }
});

window.addEventListener('hashchange', render);
render();
