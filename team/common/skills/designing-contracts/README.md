# designing-contracts — contracts others depend on, and changing them safely

File formats, machine output, public signatures, exit codes and messages others match on: versioned schemas, reading old and writing new, idempotent migrations, refusing unknown newer versions, deprecation and typed errors.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | whoever adds or alters a contract |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/evolving.md`](references/evolving.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
