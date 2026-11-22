# writing-product-skills — the skills fsd ships to its users

How to write and maintain the product skills under `src/skills`: names and descriptions that trigger, concise bodies with progressive disclosure, scripts, versioning, packaging and evaluation with skill-creator.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Stuart**, when creating or changing a skill under `src/skills` |
| **Reference** | `src/skills/_i18n/fsd-ui-approval/en/` |
| **Output** | a skill with SKILL.md, references, scripts and evals |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/anatomy.md`](references/anatomy.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
