---
name: running-pm-workflow
description: Runs Kevin's product manager loop in the native team session. Covers keeping every Ready queue stocked, triaging the backlog, answering idle agents, deciding in the author's place, updating the spec through its own PR, moving cards Use when the card of the turn says triagem, when a doubt or a supervisor notice arrives, or when a queue runs low.
---

# Product manager loop

## Every turn

1. The turn brings the card (`triagem`) or messages (`[fsd-mensagens: N]`): doubts of flow, supervisor notices (a denied command, a delivery that did not come).
2. `fsd-queue` and `fsd-board list`: what is waiting and what is ready. Act in this order: unblock a stuck agent → decide pending `decision` issues (except #39 and #40) → work the Backlog (refine, slice, move; standing issues and blocked cards are not work) → refill the queues.
3. A triage ends with the delivery: `fsd-entrega modelo triagem`, fill it, then `fsd-issue triage <n> --entrega <file>` (it applies the size, the column and the decision; declined and duplicate close the issue; an author decision becomes a deadlock). Then end the turn. The merge is the supervisor's.

## Unblocking agents

You play the author's part for the team; nothing ever goes to the author.
- A stuck agent (a doubt of flow, a supervisor notice): look on the board and in the dependencies (`fsd-board list`, `fsd-issue show`) for what unblocks it: a free card, a dependency that is only a preference, a decision of yours, a backlog issue you can triage and release now. Move the card (the supervisor sends the task) or answer with `fsd-diga <agent> "<what to do>"`. Nothing on GitHub for this.
- A technical question Mel did not settle, or a process, commit or acceptance question from anyone: decide it yourself, with Mel's recommendation when it touches the design, and record it with `fsd-issue decide`.
- A denied command (the supervisor tells you): point the agent to the team command; if the command is really needed, open an issue for the author to free it by PR. Never ask the author directly.

## Keeping the queues stocked

- At least 2 cards in Ready for Architecture and 2 in Ready for Development (whatever exists). Order them with `prioritizing-work`.
- When a queue runs low, triage the backlog: add `size:` where missing, split what does not fit one session (`slicing-work`), decide what is pending, close what no longer makes sense (with the reason on the issue), and move what is ready.
- Prefer issues independent of the chain in progress, so an idle agent does not wait for the chain. Never #39 or #40.

## Sizes and routing

Every issue has `size:`. **S**: What + Acceptance only, straight to Ready for Development (`fsd-board move "Ready for Development" <n>`), no handoff. **M**: full issue and a short handoff. **L**: full issue and a full handoff. Between two sizes, pick the smaller; if the developer or QA stumbles for lack of context, raise it. An issue must fit one agent session (~100k context, about one PR of up to ~400 lines). Writing the issue: `writing-issues`.

## Spec changes

A decision that changes the design updates the spec (`docs/spec/`) through a PR with its own issue: `fsd-issue new "docs: SPEC §x — <decision>" --area process --size S`, acceptance "SPEC §x says …"; `fsd-dev start <n> --docs`, edit in the worktree, commit, `fsd-pr open "<title>" -C <worktree> --docs`. Never on the feature's issue: its `Closes` would close the feature too early.

## Moving

- An issue ready for the next stage: `fsd-board move "<column>" <n>`; the supervisor sends the task to the column's owner.
- Merging is the supervisor's: with the 4 CI jobs green, 2 team approvals on the last commit and no conflict.

<!-- skill-files -->
## Files of this skill

- [`references/definition-of-done.md`](references/definition-of-done.md)
- [`references/reserved-to-the-author.md`](references/reserved-to-the-author.md)
- [`templates/triagem.json`](templates/triagem.json)
