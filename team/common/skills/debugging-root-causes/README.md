# debugging-root-causes — fixing the cause, not the symptom

Reproduce the smallest failing case, bisect, state and test hypotheses, read the whole error, find the same pattern elsewhere, fix the cause and lock it with a test that failed before.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | anyone, when something fails or a test breaks |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/method.md`](references/method.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
