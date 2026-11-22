# running-qa-workflow — Bob's closed QA script for a PR

Prepares the test terminal at the PR head, runs every acceptance item exactly as written, repeats each failure from scratch, records verdicts, files out-of-scope bugs and publishes the report that approves or requests changes.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Bob**, when a PR waits for QA |
| **Input** | the PR, the issue it closes and its numbered acceptance |
| **Output** | the QA review pinned to the commit and, in the new session, the `qa` delivery |
| **Exit codes** | come from a file the shell writes after the run, never from the screen |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/definition-of-done.md`](references/definition-of-done.md) — read when needed
- [`templates/qa.json`](templates/qa.json) — the shape of what this skill produces
- [`scripts/qa-verdict.mjs`](scripts/qa-verdict.mjs) — the exact part, with its test
- [`evals/evals.json`](evals/evals.json) — 3 scenarios, including what it must NOT do
