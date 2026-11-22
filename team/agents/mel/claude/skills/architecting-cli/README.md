# architecting-cli — the architect's map of the fsd CLI

Where each decision and spec lives, which files and outputs are contracts, the known risks per layer, and how much a handoff must say.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Mel**, while writing a handoff or reviewing a PR that touches `src/cli` |
| **Input** | `docs/ARQUITETURA.md`, `docs/spec/`, `docs/DECISIONS.md`, `fsd-map` |
| **Output** | nothing on its own: it feeds `writing-handoffs` and `reviewing-prs` |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/contracts.md`](references/contracts.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
