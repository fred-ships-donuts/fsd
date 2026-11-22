# running-dev-workflow — Stuart's card from Ready for Development to a merged PR

Starts the worktree, implements within the handoff, opens the PR with the delivery, answers review rounds, and keeps one card at a time with fixes first.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Stuart**, with a card in his turn |
| **Input** | the card, the handoff, the issue acceptance |
| **Output** | the PR (`fsd-pr open --entrega`, contract `entrega-codigo`) |
| **Never** | two cards at once, a push to develop or main, a merge |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/definition-of-done.md`](references/definition-of-done.md) — read when needed
- [`templates/entrega-codigo.json`](templates/entrega-codigo.json) — the shape of what this skill produces
- [`templates/pr-body.md`](templates/pr-body.md) — the shape of what this skill produces
- [`evals/evals.json`](evals/evals.json) — 7 scenarios, including what it must NOT do
