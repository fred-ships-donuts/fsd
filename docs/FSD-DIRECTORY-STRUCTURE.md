# 🍩 FSD Directory Structure

This document details the directories that FSD uses in a project. The conceptual model is in `FSD-ARCHITECTURE.md`; the index is `FSD-INDEX.md`.

```text
my-project/
├── nook/                  # User-facing workspace
│   ├── kitchen/           # Configuration, rules and project context
│   │   └── <slug>/        # Per-delivery preparation: craving.md, flavor.md, rise.md
│   ├── bench/             # Active tasks (status: in_progress)
│   │   └── <slug>/        # plan.md, NN-<slug>.yaml steps, taste.md
│   ├── cookbook/          # Recipes (declarative workflows)
│   ├── bakers/            # Specialized AI workers (and craft)
│   ├── rack/           # Finished Donuts (status: done)
│   └── fridge/            # Cold storage archive
│
└── .fsd/                  # Internal system and execution state
    ├── oven/              # Execution orchestration state
    ├── cache/             # Internal caches
    └── logs/              # Execution logs
```

## Directories

| Directory | Function | Written by |
|---|---|---|
| `nook/kitchen/` | Project rules, settings and context; per-delivery preparation documents | User |
| `nook/bench/` | Task folders being worked on | User |
| `nook/cookbook/` | Recipes (workflows) | User |
| `nook/bakers/` | Baker definitions and craft metadata | User |
| `nook/rack/` | Finished task folders and Donuts | FSD |
| `nook/fridge/` | Archived task folders | On user request |
| `.fsd/oven/` | Runtime state of the Oven | FSD |
| `.fsd/cache/` | Caches | FSD |
| `.fsd/logs/` | Execution logs | FSD |

`.fsd/` also holds the CLI data files: `installed.json` (global and project) and `config.json` (global only).

## Task lifecycle

The `status` of a task is a field in the task file itself. Bench, Rack and Fridge hold task **folders**; they do not store logs or execution state.

A task is a folder named after its slug (SPEC 4.5, ver `docs/spec/MAP.md`):

```text
nook/bench/login-oauth/
  plan.md            # status of the task in the frontmatter
  01-schema.yaml     # a step, with its own status
  02-endpoint.yaml
```

```text
nook/bench/ (in_progress)  →  nook/rack/ (done)  →  nook/fridge/ (archived, on user request)
```

## Document chain

The six documents of a delivery (names in `GLOSSARY.md`). `<slug>` is the delivery slug, with the same rules as a task slug (SPEC 4.5, ver `docs/spec/MAP.md`). The shared slug is the link between `kitchen/<slug>/` and `bench/<slug>/`.

| Document | Path | Written by |
|---|---|---|
| Craving (PRD) | `nook/kitchen/<slug>/craving.md` | User / PM |
| Flavor (SPEC) | `nook/kitchen/<slug>/flavor.md` | User / PM |
| Rise (TECH REVIEW) | `nook/kitchen/<slug>/rise.md` | Architect |
| Tray (PLAN) | `nook/bench/<slug>/plan.md` (the task plan) | Architect |
| Step (TASK) | `nook/bench/<slug>/NN-<slug>.yaml` | Dev |
| Taste (QA REVIEW) | `nook/bench/<slug>/taste.md` | QA |

Craving, Flavor and Rise are preparation, so they live in `kitchen/`. Tray, Step and Taste belong to the task folder and move with it from `bench/` to `rack/` and `fridge/`.

`kitchen/<slug>/` is created when the user writes a Craving, not by `fsd init`, and it is not part of the slug-uniqueness check of `fsd task new` (bench, rack and fridge only).

Outside `nook/` (this repository's own team flow, not the product): the Craving is the GitHub issue; Tray and Rise are the Architect handoff comment; Steps are the steps of the PR; Taste is the QA verification comment on the PR. For now the Flavor is in `docs/spec/<slug>/flavor.md` (see `docs/spec/MAP.md`).

## Created by `fsd init`

When the Install flow is confirmed, the CLI creates only the base structure: `nook/kitchen/`, `nook/bakers/` and `.fsd/oven/`, `.fsd/cache/`, `.fsd/logs/` (in `~` for the global scope). `bench/`, `cookbook/`, `rack/` and `fridge/` are not created by `init`. `fsd update skill` never creates the structure.

## Open decisions (author)

- Format of recipes and destination of the Dough in the user's project.

## Decided (2026-11-07)

- **Task format** (SPEC 4.5, ver `docs/spec/MAP.md`): a folder with `plan.md` and `NN-<slug>.yaml` steps. The task `status` is in the `plan.md` frontmatter (`in_progress`, `done`, `archived`); the step `status` is `pending`, `in_progress`, `done` or `skipped`.
- **`.gitignore`** (SPEC 4.2, ver `docs/spec/MAP.md`): the Install flow adds `.fsd/cache/` and `.fsd/logs/` in the project scope.
- **Who moves `rack` to `fridge`**: only `fsd task archive`, run by the user; the agent never does (F-40b, #7: not available yet).
