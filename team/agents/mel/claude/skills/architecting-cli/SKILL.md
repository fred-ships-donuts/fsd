---
name: architecting-cli
description: Explains the fsd CLI from the architect's side. Covers where each decision and spec lives, the file formats and outputs that are contracts (installed.json, config.json, the run journal, plan.md, --json, exit codes, spec messages), known risks per layer, how to evolve a contract with a schema version and migration, and how much a handoff must say. Use when writing a handoff or reviewing a PR that touches src/cli.
---

# Architecting the fsd CLI

## Where things live (read there, do not copy here)

| Topic | Source |
|---|---|
| Layers, what lives where and why | `docs/ARQUITETURA.md` ("Code layout", "Tests") |
| Product behavior, messages, formats | `docs/spec/<area>/flavor.md`; `docs/spec/MAP.md` resolves "SPEC x.y" |
| Decisions and their reasons | `docs/DECISIONS.md` and the `Decision (PM/author, …)` comments on issues |
| Vocabulary | `docs/GLOSSARY.md` |
| Code | `fsd-map ask "<question>" --source`, `fsd-map callers <symbol>` |

A handoff or a review that contradicts one of these is wrong until that source changes first. The spec is Kevin's; ARQUITETURA is yours.

## Contracts (changing them needs a schema version and a migration)

- `installed.json` (registry, `core/registry.ts`): the source of truth for what is installed; the CLI never scans the Claude directory.
- `config.json` (`core/config.ts`): theme, `autoUpdate`, `updateSkills`, `lastUpdateCheck`.
- The run journal (`core/runJournal.ts`, `schema: 2`, with the v1 conversion): what undo and recovery rely on. A newer unknown schema is refused.
- Task files (`core/taskFiles.ts`): `plan.md` frontmatter and step `.yaml`, parsed and serialized keeping everything else byte for byte.
- `--json` outputs, exit codes (`exitCodes.ts`) and every message quoted in the spec.
- The skill catalog layout and frontmatter `version` (`core/catalog.ts`).

How to evolve one: `designing-contracts`.

## Known risks per layer (from past Blocking points)

- `core/`: reads that throw before Verify can report a clean error (`.gitignore` as a directory, #49); races on `core/lock.ts` (stale takeover, empty file while being written, #69).
- `plan/`: recomputing what the plan already states (`Plan.label`, #77); planners must stay pure.
- `engine/`: every disk change through `Transaction` + `Ops`; a change outside the journal cannot be undone; `commit()` semantics when `save()` throws (#57/#59).
- `commands/`: stdout empty on errors with `--json`; the lock for task commands (`withTaskLock`).
- Scope: one issue per PR; a handoff that says "two PRs" means two (#42).
- Shared helpers: when two features need the same lookup, the handoff names the helper to extract (#107/#103).

## How much a handoff must say

The developer should not need to guess. Name:
- every new file;
- the helper to reuse;
- the exact messages and exit codes;
- the risks to handle (with `handling-files-safely` in mind);
- the relevant tests;
- what is out of scope.

If a PR comes back with a Blocking point the handoff could have prevented, add that kind of point to future handoffs and say so in the review ("my handoff got this wrong" is a valid line, #105).
