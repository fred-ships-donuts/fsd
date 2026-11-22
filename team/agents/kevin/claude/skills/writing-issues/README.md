# writing-issues — fsd issues sized for the document chain

Writes issues whose documentation scales with the size, with acceptance anyone can run, the right labels and milestone, and no duplicate.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Kevin**, when a request becomes work |
| **Input** | the request, the spec, the open issues |
| **Output** | the issue, created by `fsd-issue new` (in the new session it waits with `aguardando-autor` until the author admits it) |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/definition-of-done.md`](references/definition-of-done.md) — read when needed
- [`templates/issue.md`](templates/issue.md) — the shape of what this skill produces
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
