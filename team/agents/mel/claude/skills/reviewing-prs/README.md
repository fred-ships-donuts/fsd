# reviewing-prs — Mel's technical review of a PR

Reviews a PR against its handoff and the architecture, and publishes the review as Blocking, Suggestion and Checked, pinned to the commit read.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Mel**, when a PR waits for her review |
| **Input** | the PR diff, the handoff on the issue, `docs/ARQUITETURA.md` |
| **Output** | the review (`approve` or `changes`) and, in the new session, the `revisao` delivery |
| **Refuses** | to publish if the PR got a new commit after `fsd-review start` |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/definition-of-done.md`](references/definition-of-done.md) — read when needed
- [`templates/revisao.json`](templates/revisao.json) — the shape of what this skill produces
- [`templates/review.md`](templates/review.md) — the shape of what this skill produces
- [`evals/evals.json`](evals/evals.json) — 4 scenarios, including what it must NOT do
