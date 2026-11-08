# Scoring methodology

This page explains, in plain language, how Open Clinic SRA turns your answers
into a risk rating. The approach follows the likelihood-and-impact model
described in NIST SP 800-30 and HHS guidance on risk analysis, simplified for
small practices.

## 1. Each question has a risk weight

Every question describes a safeguard. If that safeguard is missing, two things
determine how serious the gap is:

| Factor | 1 | 2 | 3 |
|---|---|---|---|
| **Likelihood** that a threat exploits the gap | Unlikely | Possible | Likely |
| **Impact** on patient data if it happens | Limited | Serious | Severe |

**Inherent risk = likelihood × impact**, giving a value from 1 to 9.
Weights are set by contributors and reviewed in public pull requests.

## 2. Your answer determines how much risk remains

| Answer | Risk that remains |
|---|---|
| Yes | 0% |
| Partially | 50% |
| No | 100% |
| N/A | Excluded — doesn't count for or against you |

N/A is only offered where a safeguard may genuinely not apply (for example,
a practice with no Wi-Fi network).

## 3. Section and overall scores

For each section and for the assessment as a whole:

**Risk ratio = remaining risk ÷ maximum possible risk** (for the questions that apply).

| Risk ratio | Rating |
|---|---|
| Below 15% | 🟢 Low |
| 15% – 39% | 🟡 Medium |
| 40% and above | 🔴 High |

## 4. Critical safeguards override the score

Some safeguards are so important that missing one puts the practice at high
risk regardless of how well it does elsewhere. These are marked `critical`:

- A current risk analysis (ADM-001)
- Tested data backups (ADM-010)
- Encryption of portable devices (TEC-003)
- Multi-factor authentication for email and remote access (TEC-004)
- Business Associate Agreements with every vendor (ORG-001)
- A written incident response plan (POL-001)

If any critical question is answered **No**, the overall rating is at least
**High**. If any is answered **Partially**, the rating is at least **Medium**.

## 5. Prioritized remediation

Every gap becomes a finding in the remediation plan, ordered by:

1. Critical findings first
2. Then highest remaining risk
3. Then shortest suggested deadline

## Limitations

- This is a structured self-assessment. Its accuracy depends on honest,
  informed answers.
- Weights are general estimates for small practices. Your own risk may differ;
  a qualified professional can tailor them.
- A rating is not a certification of HIPAA compliance. See
  [DISCLAIMER.md](../DISCLAIMER.md).
