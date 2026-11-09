# 🍩 FSD Directory Structure

This document details the directories that FSD uses in a project. The conceptual model is in `FSD-ARCHITECTURE.md`; the index is `FSD-INDEX.md`.

```text
my-project/
├── nook/                  # User-facing workspace
│   ├── kitchen/           # Configuration, rules and project context
│   ├── bench/             # Active tasks (status: in_progress)
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
| `nook/kitchen/` | Project rules, settings and context | User |
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

A task is a folder named after its slug (`SPEC.md` 4.5):

```text
nook/bench/login-oauth/
  plan.md            # status of the task in the frontmatter
  01-schema.yaml     # a step, with its own status
  02-endpoint.yaml
```

```text
nook/bench/ (in_progress)  →  nook/rack/ (done)  →  nook/fridge/ (archived, on user request)
```

## Created by `fsd init`

When the Install flow is confirmed, the CLI creates only the base structure: `nook/kitchen/`, `nook/bakers/` and `.fsd/oven/`, `.fsd/cache/`, `.fsd/logs/` (in `~` for the global scope). `bench/`, `cookbook/`, `rack/` and `fridge/` are not created by `init`. `fsd update skill` never creates the structure.

## Open decisions (author)

- Format of recipes and destination of the Dough in the user's project.

## Decided (2026-11-07)

- **Task format** (`SPEC.md` 4.5): a folder with `plan.md` and `NN-<slug>.yaml` steps. The task `status` is in the `plan.md` frontmatter (`in_progress`, `done`, `archived`); the step `status` is `pending`, `in_progress`, `done` or `skipped`.
- **`.gitignore`** (`SPEC.md` 4.2): the Install flow adds `.fsd/cache/` and `.fsd/logs/` in the project scope.
- **Who moves `rack` to `fridge`**: only `fsd task archive`, run by the user; the agent never does (F-40b, #7: not available yet).
