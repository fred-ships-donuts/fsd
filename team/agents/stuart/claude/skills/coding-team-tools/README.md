# coding-team-tools — changing the team's tooling under team/

Shared helpers in fsd-lib.mjs, configuration from agents.json, FSD_DRY with no side effects, shared state that readers must not consume, paths through links, and container compatibility.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | **Stuart**, when changing a script or config under `team/` |
| **Input** | `team/bin/`, `agents.json` |
| **Output** | a tested change that behaves the same on the host and in the container |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/rules.md`](references/rules.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
