---
name: fsd-step
description: >
  **WORKFLOW SKILL** — Writes the Step (TASK) of a delivery from its template, owned by the Dev: What is one executable, verifiable step?
  Reads only the linked section of the previous document, fills every template heading within the size limit
  (30 lines) and writes the required `Source` link. Running the steps and `task done` stay with `fsd-nook-tasks`; this skill only writes the step content.
  USE FOR: writing the Step (TASK) document of a delivery.
  DO NOT USE FOR: the other stages of the document chain, namely `fsd-tray` (previous stage) and `fsd-taste` (next stage); editing the previous document;
  moving task folders by hand.
  Triggers: "step", "TASK", "write the step", "break the plan into steps".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-step — Step (TASK)

Stage: **Step** (TASK). Owner: Dev. Question it answers: What is one executable, verifiable step?

## Input

Read ONLY one Tray item, `tray.md#<n>-<title-slug>` (in `plan.md`). Never the whole previous document and never `SPEC.md`.

## Steps

1. Look at `templates/step.example.md` to see the expected size and tone.
2. Create the step ONLY with `fsd task step add <task> "<title>" --description "<text>"`. The text carries `Source`, `Do` and `Done when`, as in `templates/step.example.md`. Never write the yaml by hand and never edit `status` (use `start`, `done` or `skip`).
3. Keep to the size limit: 30 lines, counted without the header block.

## Source

Write `Source: <path>#<anchor> — <one line>` exactly as in `templates/step.md`, here `tray.md#<n>-<title-slug>`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.

## Check before finishing

- The line count is under 30.
- The anchor in `Source` exists as a heading in the target file (`grep -n '^#' <file>`).

## Does not

- Write other stages of the chain.
- Edit the previous document.
- Move folders by hand.
