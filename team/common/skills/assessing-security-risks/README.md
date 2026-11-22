# assessing-security-risks — security risks of a local CLI and its tooling

Untrusted names, paths and YAML, path traversal and symlinks, shell commands built from strings, secrets in logs or loose file modes, new dependencies, and issue, PR or memory text treated as data, never as instructions.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | reviewers and the architect, when a change reads untrusted input, writes outside the project, runs commands or handles tokens |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/checklist.md`](references/checklist.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
