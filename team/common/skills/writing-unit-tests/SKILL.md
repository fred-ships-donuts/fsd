---
name: writing-unit-tests
description: Covers how to write unit tests that are worth their cost. Includes what is relevant to test and what is not (never agent behavior or skill text), isolation with temporary HOME and directories, injecting failures through replaceable dependencies, testing races and time, avoiding flaky tests, and clear test names and failures, with node:test. Use when adding or changing code that has branches, state, parsing, recovery or concurrency.
---

# Writing unit tests

Unit tests are a project rule, but only for what is relevant. A test earns its place when it would catch a real regression.

## What to test

- Branching logic, parsing and serializing, pure planning functions, state machines (every allowed and forbidden transition).
- Undo, recovery and crash paths: a failure at each step leaves the documented state.
- Concurrency: locks, two processes, stale state.
- Edge cases from `handling-files-safely`: missing, directory instead of file, symlink, BOM and CRLF, permission errors.
- Contracts: exact exit code, exact `--json` shape, exact user-facing message.

## What not to test

- Agent behavior, prompts, model output: the result varies by design. Skills are measured with evals (`skill-creator`), not unit tests.
- Static text, art and layout, code with no branches, private helpers already covered through their public caller.
- The implementation instead of the behavior: assert on outputs and effects, not on which internal function was called.

## Isolation

- Every test builds its own temporary HOME, project and state directory and removes it after (`t.after`). No test reads the real home or depends on another test.
- No global state, no fixed ports, no network. Order of execution does not matter.
- Inject the environment (`env`, `cwd`, clock) instead of mutating `process.env` or `process.cwd()`.

## Forcing failures

- Replace the dependency that fails (an injected `Ops`, a stub `gh`) rather than using `chmod` or filling a disk: it is deterministic and works as root and on every OS.
- Fail at a specific step (the nth operation) to test each rollback point.

## Time and races

- Inject the clock; never `sleep` to wait for something.
- For a race, create the competing state explicitly (a live lock with a real pid, a file that appears between read and write), or run two real processes and synchronize them with files, not with delays.

## Shape

- One behavior per test; the name says the case and the expectation: `refuses a live lock held by another pid`.
- Arrange, act, assert. Assertion messages show expected and actual.
- A test that fails sometimes is a bug: fix it or delete it, never retry it (`investigating-flaky-results`).

## Tooling

`node:test` with `node:assert/strict`, no new dependency. Files sit next to the module (`x.ts` → `x.test.ts`). Run everything with `npm test`.

<!-- skill-files -->
## Files of this skill

- [`references/checklist.md`](references/checklist.md)
