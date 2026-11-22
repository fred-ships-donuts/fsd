# investigating-flaky-results — a check that sometimes passes

Treat it as a bug until explained: measure the rate, check the usual suspects, isolate one variable at a time, tell product, test and environment flakiness apart, and record the rate and conditions.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | QA and developers, when the same check gives different results |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/suspects.md`](references/suspects.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
