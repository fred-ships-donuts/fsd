# self-reviewing-changes — Stuart's check before every PR

Checks a change against its handoff before it goes to review: every handoff item in the diff, scope, reuse, edge cases, docs and spec in sync, relevant tests, and every Blocking point answered by a commit.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Stuart**, before `fsd-pr open` and before replying to a review |
| **Input** | the diff, the handoff, the review |
| **Output** | a change ready for review, or the gaps fixed |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/checklist.md`](references/checklist.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
