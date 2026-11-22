# running-pm-workflow — Kevin's loop as product manager

Unblocks agents, decides what is pending, triages and slices the backlog, keeps the Ready queues stocked and moves cards. Plays the author's part for the team: nothing goes to the author except what is reserved to them.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Kevin**, every turn |
| **Input** | the card (`triagem`) or the messages of the turn, the board, the queues |
| **Output** | triages (`fsd-issue triage --entrega`), decisions (`fsd-issue decide`), moved cards, answers to agents |
| **Never** | merges (the supervisor does), asks the author, touches #39 or #40 |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/definition-of-done.md`](references/definition-of-done.md) — read when needed
- [`references/reserved-to-the-author.md`](references/reserved-to-the-author.md) — read when needed
- [`templates/triagem.json`](templates/triagem.json) — the shape of what this skill produces
- [`evals/evals.json`](evals/evals.json) — 5 scenarios, including what it must NOT do
