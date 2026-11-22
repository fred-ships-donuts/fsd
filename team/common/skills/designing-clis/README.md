# designing-clis — command-line interfaces people and programs can rely on

stdout versus stderr, consistent exit codes, stable --json, actionable errors, flags and help, safe defaults and confirmations, idempotent commands, TTY/pipe/NO_COLOR/CI, and deprecation without breaking users.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | whoever adds or changes a command, flag, message or output |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/checklist.md`](references/checklist.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
