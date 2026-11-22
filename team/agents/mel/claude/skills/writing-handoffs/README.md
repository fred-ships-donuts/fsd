# writing-handoffs — the Architect handoff for a card

Prepares an issue for development: reads the issue, the spec and the code, and publishes the "Architect handoff" that tells the developer what to do, which files change, the contracts, the risks, what is out of scope and how Bob verifies it.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Mel**, with a card in Ready for Architecture |
| **Input** | the issue and its numbered acceptance, `docs/spec/`, the code of the area |
| **Output** | the handoff comment on the issue (with the **Plan:** first in the new session) and the `arquitetura` delivery |
| **Moves** | the card to Ready for Development (Stuart) |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/definition-of-done.md`](references/definition-of-done.md) — read when needed
- [`templates/arquitetura.json`](templates/arquitetura.json) — the shape of what this skill produces
- [`templates/handoff.md`](templates/handoff.md) — the shape of what this skill produces
- [`scripts/handoff-sections.mjs`](scripts/handoff-sections.mjs) — the exact part, with its test
- [`evals/evals.json`](evals/evals.json) — 3 scenarios, including what it must NOT do
