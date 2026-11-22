# coding-cli — how the fsd CLI code is organized and changed

Which layer a change belongs to, which helpers to reuse, how disk changes go through Transaction and Ops, the command contract and the relevant tests.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Stuart**, when changing anything under `src/cli` |
| **Input** | the handoff, `fsd-map` |
| **Output** | code in the right layer, with tests |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/layers.md`](references/layers.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
