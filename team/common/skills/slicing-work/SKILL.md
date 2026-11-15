---
name: slicing-work
description: Covers how to split large work into issues that each fit one agent session and deliver verifiable value on their own. Includes INVEST as a readiness check, SPIDR cuts (spike, paths, interfaces, data, rules), vertical slices across layers instead of one layer at a time, short explicit dependency chains, signs that an issue must be split, and keeping the parent issue as the design reference. Use when an issue or request is size L, spans more than one module or PR, or has too many acceptance items.
---

# Slicing work

## Signs an issue must be split

- More than one new module, or a handoff that needs more than one PR (#42 carried two deliveries).
- More than about six acceptance items, or "and also" in the title.
- It will not fit one agent session (~100k context, a PR of up to ~400 lines).

## Ready check (INVEST)

Each slice is Independent, Negotiable, Valuable, Estimable, Small and Testable. A slice that fails one of these is not ready.

## Where to cut (SPIDR)

- **Spike:** too much is unknown → a short investigation issue first; its output is a decision or a handoff.
- **Paths:** the happy path first, error and edge paths next.
- **Interfaces:** one command, flag or screen at a time.
- **Data:** one format, one kind of input at a time.
- **Rules:** one business rule at a time.

## Vertical, not horizontal

Each slice crosses the layers it needs and can be verified from outside by QA. "Only the core/ part" cannot be verified and delivers nothing. The split of #81 into #89–#92 is the model.

## Dependencies

- `Depends on: #n` in the body, chains of two or three at most.
- Prefer independent slices so idle agents are not waiting on a chain (#92 waited for #91 unnoticed).
- When the blocker closes, move the dependent card at once.

## The parent

The original issue keeps the full design and becomes the reference; each slice links to its section and closes on its own.
