---
name: prioritizing-work
description: Covers how to order the team's queues with an explicit rationale. Includes cost of delay, unblocking stalled agents and dependency chains first, taking risk early, fixes before new features, size as a tiebreaker, keeping every Ready queue stocked with independent work, and writing down the reason for each order. Use when choosing what moves to a Ready column next, when an agent has no work, or when a new request competes with work in progress.
---

# Prioritizing work

## Order, from first to last

1. **Unblock:** whatever lets a stalled agent move, or opens a dependency chain (#91 before #92).
2. **Fixes before features:** changes requested, regressions and bugs that lose data or break a contract.
3. **Cost of delay:** what loses value by waiting (blocks the next release, blocks another issue, keeps a risk open).
4. **Risk early:** the most uncertain work (a new contract, concurrency, an integration) goes before the predictable, so mistakes are cheap.
5. **Size as the tiebreaker:** between two of similar value, the smaller first (cost of delay divided by size, as a guide, not a formula).

## Keep the flow

- At least 2 independent cards in each Ready queue. Pull from the backlog what does not depend on the chain in progress.
- One card at a time per developer: a new card never pushes back a pending rework.
- Reserved issues (label `decision`, #39 and #40) are outside the ranking.

## Write the reason

When you move or reorder cards, leave one line on the issue or in the notice: what goes first and why. The team does not need to ask, and the author can correct you.

## When a new request arrives

Place it with the same rules. It jumps the queue only if it unblocks someone or fixes something that loses data; otherwise it waits its turn.

<!-- skill-files -->
## Files of this skill

- [`references/order.md`](references/order.md)
