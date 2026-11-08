# Open Clinic SRA

**A free, open-source HIPAA Security Risk Assessment for small clinics.**

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

## Project status

🚧 Early development. Current milestone: **v0.1 — question bank + scoring engine**.

| Component | Status |
|---|---|
| Question schema + validation | ✅ |
| Question bank (first 32 questions) | ✅ draft — needs expert review |
| Scoring engine + tests | ✅ |
| Browser questionnaire UI | ⏳ next |
| PDF report | ⏳ |
| ePHI asset inventory section | ⏳ |
| Export/import for year-over-year comparison | ⏳ |

## Repository layout

```
content/
  sections.yaml        # assessment sections, in display order
  questions/*.yaml     # one file per section
  schema.json          # JSON Schema every question must satisfy
src/
  scoring.mjs          # scoring engine (pure functions, no I/O)
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
npm run validate   # check every question against the schema
npm test           # run scoring engine tests
```

## Contributing

Compliance professionals, practice managers, and developers are all welcome.
You don't need to write code to improve the question bank — questions are
plain YAML files. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- Code: [MIT](LICENSE)
- Question bank and documentation (`content/`, `docs/`): [CC BY 4.0](LICENSE-CONTENT)
