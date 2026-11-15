---
name: coding-cli
description: Explains how the fsd CLI code under src/cli is organized and how to change it. Covers which layer a change belongs to, which existing helpers to reuse, how disk changes go through Transaction and Ops, the command contract (Io, exit codes, --json, spec messages), and which tests are relevant. Use when implementing or changing anything under src/cli.
---

# Coding the fsd CLI (src/cli)

The layout and the reasons behind it live in `docs/ARQUITETURA.md` (section "Code layout"). Read it there; this skill tells you how to work inside it.

## Where a change goes

| You need to… | Layer | Rule |
|---|---|---|
| read the disk, parse a file, compute a state | `core/` | reads only; the one write exception is atomic JSON (`writeJsonAtomic`) |
| decide what to do | `plan/` | pure: reads, returns a `Plan`, never writes |
| change the disk | `engine/` | only through `Transaction` + `Ops` inside `runTransaction` |
| parse arguments and print | `commands/` | one file per command; output through `Io` |
| wizard rules | `wizard/` | no React |
| screens | `ui/` | Ink/TSX; loaded only by `fsd init` through a dynamic import |

Imports go one way: a layer imports only the layers above it in that list. Nothing from `core/` to `wizard/` imports React, Ink or commander.

## Reuse before writing

Search first: `fsd-map ask "<what you need>" --source`, `fsd-map grep "<name>"`. The helpers you are most likely to need:

- `core/scope.ts`: `realEnv()`, `scopePaths(scope, env)`, `scopeRoot`, `installedScopes`. Never build `.fsd/` or `nook/` paths by hand.
- `core/fs.ts`: `exists`, `pointsTo`, `isLinkTo`, `isInside`, `missingAncestors`, `nearestExisting`, `readTextOrNull`, `writeTextAtomic`, `writeJsonAtomic`, `createTextFile`, `FileChangedError`.
- `core/registry.ts` (`installed.json`), `core/config.ts`, `core/catalog.ts`, `core/semver.ts`, `core/slug.ts`, `core/taskFiles.ts` (parse and serialize keeping the rest), `core/nook.ts`, `core/lock.ts`.
- `plan/types.ts`: `Plan`, `PlanItem`, `PlanLabel` (the plan already says install, upgrade, remove or enable), `emptyPlan`, `addItem`, `formatResult`.
- `commands/guards.ts`: `withTaskLock`. `commands/io.ts`: `Io`, `consoleIo`.

## Changing the disk

- Build a `Plan` in `plan/`, then run it through `runTransaction` (`engine/transactionRun.ts`): lock, journal, signals, commit, undo and phase events come with it.
- Every change goes through a `Transaction` method (`copyDir`, `moveIn`, `relocate`, `symlink`, `ensureDirs`, `displace`, `writeJsonFiles`, `writeTextFiles` with `expected` to detect a concurrent change). Each is journaled before it happens, so a crash or Ctrl+C can be undone.
- `Ops` (`engine/ops.ts`) is the only place that touches the filesystem. It is injectable, which is how tests force failures.
- Generic file safety (atomic writes, races, error codes, symlinks): `handling-files-safely`.

## The command contract

- Output through `Io.out` (results) and `Io.err` (errors), never `console.*` in logic.
- Exit codes from `exitCodes.ts`: `EXIT_OK` 0, `EXIT_FAILED` 1, `EXIT_CANCELLED` 130.
- `--json`: one JSON object on stdout, the format agents read; on an error with `--json`, stdout stays empty.
- Messages come from the spec (`docs/spec/`, resolved through `docs/spec/MAP.md`). A new or changed message is a spec change: Kevin's call, stated in the PR.
- General CLI design (flags, help, TTY, NO_COLOR): `designing-clis`.

## Tests

Tests sit next to the module (`*.test.ts`, `node:test`), run with `npm test`. Use `engine/testkit.ts`: `tempEnv()` for HOME and project, `failingOps(n)` and `opsFailing(name)` to force a failure at a given operation, `journalOf` and `writeRun` to build a dead run. What is relevant to test: `writing-unit-tests`.

## Check it for real

`npm run build`, then run `node dist/cli/fsd.js` (or the linked `fsd`) with a temporary HOME and project. The wizard: in tmux at 80x24.
