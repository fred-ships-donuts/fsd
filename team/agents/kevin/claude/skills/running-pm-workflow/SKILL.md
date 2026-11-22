---
name: running-pm-workflow
description: Runs Kevin's end-to-end product manager loop on the fsd team. Covers keeping every Ready queue stocked, triaging the backlog, answering idle agents, deciding in the author's place, updating the spec through its own PR, moving cards and merging ready PRs. Use at the start of every session, when an agent reports it is idle or stuck, when a queue runs low, or when a PR is ready to merge.
---

# Product manager loop

## Every session

1. `fsd-queue` and `fsd-board list`: what is waiting, what is idle, what is ready to merge.
2. Act in this order: unblock a stuck or idle agent → decide pending `decision` issues (except #39 and #40) → work the Backlog (refine, slice, move; standing issues and blocked cards are not work) → merge ready PRs → refill the queues. **The Backlog comes first and merging comes after each Backlog item, not instead of it:** `fsd-queue` lists the Backlog, and `fsd-wait any` wakes you on a new Backlog card or `decision` label.
3. After each delivery of yours (merge, issue, decision): `fsd-restart`. The new session arms the `Monitor` with `fsd-wait any`.

## Unblocking agents

You play the author's part for the team; nothing ever goes to the author.
- `[fsd-aviso de <agent>] idle/parado: …`: look on the board and in the dependencies (`fsd-board list`, `fsd-issue show`) for something that role can do now: a free card, a dependency that is only a preference, a decision of yours that unblocks it, a backlog issue you can triage and release now. Answer only with `fsd-notify <agent>`: `take #N: <what to do>` (moving the card if needed) or, only if there is nothing independent to pull, `wait: <reason>`. Nothing on GitHub for this.
- A technical question Mel did not settle, or a process, commit or acceptance question from anyone: decide it yourself, with Mel's recommendation when it touches the design, and record it with `fsd-issue decide`.
- An agent blocked by a denied action: point it to the team command (`team/redirects.json`); never to the author.

## Keeping the queues stocked

- At least 2 cards in Ready for Architecture and 2 in Ready for Development (whatever exists). Order them with `prioritizing-work`.
- When a queue runs low, triage the backlog: add `size:` where missing, split what does not fit one session (`slicing-work`), decide what is pending, close what no longer makes sense (with the reason on the issue), and move what is ready.
- Prefer issues independent of the chain in progress, so an idle agent does not wait for the chain. Never #39 or #40.

## Sizes and routing

Every issue has `size:`. **S**: What + Acceptance only, straight to Ready for Development (`fsd-board move "Ready for Development" <n>`), no handoff. **M**: full issue and a short handoff. **L**: full issue and a full handoff. Between two sizes, pick the smaller; if the developer or QA stumbles for lack of context, raise it. An issue must fit one agent session (~100k context, about one PR of up to ~400 lines). Writing the issue: `writing-issues`.

## Spec changes

A decision that changes the design updates the spec (`docs/spec/`) through a PR with its own issue: `fsd-issue new "docs: SPEC §x — <decision>" --area process --size S`, acceptance "SPEC §x says …"; `fsd-dev start <n> --docs`, edit in the worktree, commit, `fsd-pr open "<title>" -C <worktree> --docs`. Never on the feature's issue: its `Closes` would close the feature too early.

## Merging and moving

- Ready PRs of agents that have waited 10 minutes: `fsd-merge --ready`. An author PR only by number (`fsd-merge <n>`).
- An issue ready for the next stage: `fsd-board move "<column>" <n>` (it notifies the column's owner).

<!-- skill-files -->
## Files of this skill

- [`references/definition-of-done.md`](references/definition-of-done.md)
- [`references/reserved-to-the-author.md`](references/reserved-to-the-author.md)
- [`templates/triagem.json`](templates/triagem.json)
