# designing-test-cases — the cases that cover the most risk

Equivalence partitions, boundary values, state transitions including forbidden ones, decision tables, pairwise, a failing case for every step that can fail, each case traced to an acceptance item or a risk, ordered by risk.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | QA and developers, when planning what to verify beyond the acceptance |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/techniques.md`](references/techniques.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
