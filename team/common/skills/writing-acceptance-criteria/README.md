# writing-acceptance-criteria — criteria anyone can run cold

One observable behavior per numbered item, the exact command or keys, the exact output and exit code, the starting state, a failure case with its message, wording from the spec, and items rewritten when a decision changes them.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | Kevin, when writing or changing an issue |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/cold-reader.md`](references/cold-reader.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
