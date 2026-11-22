# assessing-designs — judging a design or a change on its merits

Correctness on every path, layer boundaries, explicit contracts, shared state and concurrency, failure and recovery, side effects of dry runs, simplicity, and a clear line between Blocking and Suggestion, each with `file:line`.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | reviewers and the architect, while reviewing a PR or a design |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/severity.md`](references/severity.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
