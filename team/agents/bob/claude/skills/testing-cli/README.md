# testing-cli — putting the fsd CLI into any state worth testing

A clean environment for the exact commit, skill states and scopes, the wizard flows step by step, how to force each failure and interruption, and what evidence to capture.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Bob**, while preparing or running a verification under `src/cli` |
| **Input** | the PR head, the acceptance |
| **Output** | the state each item needs and the evidence of what happened |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/evidence.md`](references/evidence.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
