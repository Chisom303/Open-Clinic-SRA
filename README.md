# Open Clinic SRA

**A free, open-source HIPAA Security Risk Assessment for small clinics.**

**Try it:** https://chisom303.github.io/open-clinic-sra/

Built for the practice manager at a 1–10 provider clinic, not for security
engineers. Plain-language questions, a prioritized fix-it plan, and a report you
can keep on file.

> ⚠️ Not legal advice and not a compliance certification. See [DISCLAIMER.md](DISCLAIMER.md).

## Why this exists

Small practices are required to perform a security risk analysis
(45 CFR 164.308(a)(1)(ii)(A)), but most existing tools are either expensive
consulting engagements, clunky spreadsheets, or developer-focused scanners.
This project aims to be:

- **Free forever** — MIT-licensed code, CC BY 4.0 content.
- **Private by design** — the app runs entirely in your browser. Answers never
  leave your computer. There is no server to breach.
- **Transparent** — every question cites the regulation it comes from, and the
  scoring method is documented in [docs/methodology.md](docs/methodology.md).
- **Actionable** — every "No" comes with why it matters, how to fix it, and a
  suggested deadline.
- **Forward-looking** — questions are flagged when the January 2025 proposed
  Security Rule update would change their status (e.g., MFA and encryption
  becoming required). That proposal is **not final law**.

## Privacy

- **Your answers never leave your browser.** They are stored only on your
  device, and reports are printed or saved as PDF on your own computer.
- **Anonymous usage counts.** To see how many practices use the tool, the site
  counts visits and a few steps (assessment started, completed, report printed,
  file saved or loaded, feedback clicked) using
  [GoatCounter](https://www.goatcounter.com), which does not use cookies or
  track individuals. Only fixed page and event names are sent, never answers,
  practice names, or anything you type. The allow-list is in
  [`src/app/analytics.js`](src/app/analytics.js) and enforced by tests.
- Like any website, the counter's server briefly receives your browser's
  network address when it loads. Content blockers that block GoatCounter don't
  affect how the tool works.

## Project status

🚧 Early development. Current milestone: **v0.1 — question bank + scoring engine**.

| Component | Status |
|---|---|
| Question schema + validation | ✅ |
| Question bank (38 questions, incl. AI tools) | ✅ draft — needs expert review |
| Scoring engine + tests | ✅ |
| Browser questionnaire UI + results | ✅ |
| Save/load assessment file | ✅ |
| Printable signed report (save as PDF) | ✅ |
| ePHI asset inventory section | ⏳ next |

## Repository layout

```
content/
  sections.yaml        # assessment sections, in display order
  questions/*.yaml     # one file per section
  schema.json          # JSON Schema every question must satisfy
src/
  scoring.mjs          # scoring engine (pure functions, no I/O)
  app/                 # browser app: screens, styles, local-only storage
scripts/
  validate.mjs         # validates all content against the schema
test/
  scoring.test.mjs     # unit tests for the scoring engine
docs/
  methodology.md       # how risk is calculated, in plain language
```

## Getting started (developers)

Requires Node.js 20+.

```bash
npm install
npm run dev        # run the app locally at http://localhost:5173
npm run validate   # check every question against the schema
npm test           # run the tests
npm run build      # build the static site into dist/
```

## Publishing the app for free

The included GitHub Actions workflow deploys the app to GitHub Pages on every
push to `main`. In your repository, go to **Settings → Pages** and set
**Source** to **GitHub Actions**. The site will appear at
`https://<your-username>.github.io/<repo-name>/`.

## Contributing

Compliance professionals, practice managers, and developers are all welcome.
You don't need to write code to improve the question bank — questions are
plain YAML files. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- Code: [MIT](LICENSE)
- Question bank and documentation (`content/`, `docs/`): [CC BY 4.0](LICENSE-CONTENT)
