# Contributing to Open Clinic SRA

Thank you for helping small clinics protect patient data. There are three ways
to contribute, and only one of them requires code.

## 1. Improve the question bank (no coding needed)

Questions live in `content/questions/`, one YAML file per section. To suggest a
change, open an issue using the **Question change** template, or edit the file
directly on GitHub and open a pull request.

### Rules for every question

1. **Cite a source.** Every question must have a `citation` pointing to the
   HIPAA Security Rule (45 CFR 164.3xx), the Breach Notification Rule
   (45 CFR 164.4xx), or official HHS/NIST guidance. No citation, no merge.
2. **Write for a practice manager.** If someone without an IT background
   can't answer it, rewrite it. Put jargon explanations in `help`.
3. **Never ask for patient information.** Questions are about safeguards only.
   Free-text fields that could invite PHI are not accepted.
4. **Be honest about required vs. addressable.** Use `implementation` to state
   how the *current, in-force* rule treats the specification. Use
   `proposed_rule_2025` only to note how the January 2025 proposal would change
   it — and never describe the proposal as final.
5. **Explain your weights.** If you change `likelihood` or `impact`, say why in
   the pull request.
6. **Update `last_reviewed`** to today's date when you change a question.

### IDs

IDs are permanent. Never reuse or renumber an ID, because saved assessments
reference them. To retire a question, set `retired: true`.

## 2. Review for accuracy

If you are a HIPAA compliance professional, attorney, or auditor, reviews are
the most valuable contribution. Comment on open pull requests or open an
issue labeled `accuracy`.

## 3. Write code

```bash
npm install
npm run validate
npm test
```

- Keep the scoring engine (`src/scoring.mjs`) pure: no network, no storage.
- Add tests for any scoring change.
- The app must never send assessment answers to any server.

## Code of conduct

Participation in this project is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
