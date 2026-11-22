# handling-files-safely — touching the filesystem without corrupting data

Atomic writes, O_EXCL locks, no check-then-act races, every common error code, symlinks, line endings and BOM, unusual paths, and dry runs with no side effects.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | whoever writes code that touches the filesystem |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/checklist.md`](references/checklist.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
