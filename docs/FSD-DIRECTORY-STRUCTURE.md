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
| `nook/bench/` | Task files being worked on | User |
| `nook/cookbook/` | Recipes (workflows) | User |
| `nook/bakers/` | Baker definitions and craft metadata | User |
| `nook/rack/` | Finished tasks and Donuts | FSD |
| `nook/fridge/` | Archived tasks | On user request |
| `.fsd/oven/` | Runtime state of the Oven | FSD |
| `.fsd/cache/` | Caches | FSD |
| `.fsd/logs/` | Execution logs | FSD |

`.fsd/` also holds the CLI data files: `installed.json` (global and project) and `config.json` (global only).

## Task lifecycle

The `status` of a task is a field in the task file itself. Bench, Rack and Fridge hold files; they do not store logs or execution state.

```text
nook/bench/ (in_progress)  →  nook/rack/ (done)  →  nook/fridge/ (archived, on user request)
```

## Created by `fsd init`

When the Install flow is confirmed, the CLI creates only the base structure: `nook/kitchen/`, `nook/bakers/` and `.fsd/oven/`, `.fsd/cache/`, `.fsd/logs/` (in `~` for the global scope). `bench/`, `cookbook/`, `rack/` and `fridge/` are not created by `init`. `fsd update skill` never creates the structure.

## Open decisions (author)

- File format of tasks (`.md` or `.yaml`) and the format of the `status` field.
- What goes into `.gitignore` (for example `.fsd/cache`, `.fsd/logs`).
- Who moves a task from `rack` to `fridge`.
- Format of recipes and destination of the Dough in the user's project.
