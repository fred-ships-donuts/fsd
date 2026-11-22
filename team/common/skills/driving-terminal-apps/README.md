# driving-terminal-apps — driving terminal programs with tmux

An isolated fixed-size session, named keys and literal text, reading the screen, waiting for text instead of sleeping, exit codes of interactive programs, signals, resizing, TTY versus pipe, environment and evidence.

> The source of truth for behavior is [`SKILL.md`](SKILL.md); the scenarios that check it are in [`evals/evals.json`](evals/evals.json).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | QA, when a verification needs a real terminal |

## Files

- [`SKILL.md`](SKILL.md) — the behavior
- [`references/tmux.md`](references/tmux.md) — read when needed
- [`evals/evals.json`](evals/evals.json) — 2 scenarios, including what it must NOT do
