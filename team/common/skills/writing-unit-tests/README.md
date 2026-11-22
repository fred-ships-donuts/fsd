# writing-unit-tests — unit tests worth their cost

What is relevant to test and what is not, isolation with temporary HOME and folders, failures injected through replaceable dependencies, races and time, no flaky tests, clear names, with node:test.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | developers, when adding or changing code with branches |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/checklist.md`](references/checklist.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
