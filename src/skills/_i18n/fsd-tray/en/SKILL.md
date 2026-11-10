---
name: fsd-tray
description: >
  **WORKFLOW SKILL** — Writes the Tray (PLAN) of a delivery from its template, owned by the Architect: In what order do we deliver, and which files change?
  Reads only the linked section of the previous document, fills every template heading within the size limit
  (60 lines) and writes the required `Source` link. The `plan.md` already exists (created by `fsd task new`).
  USE FOR: writing the Tray (PLAN) document of a delivery.
  DO NOT USE FOR: the other stages of the document chain, namely `fsd-rise` (previous stage) and `fsd-step` (next stage); editing the previous document;
  moving task folders by hand.
  Triggers: "tray", "PLAN", "delivery order", "files touched", "plan the delivery".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-tray — Tray (PLAN)

Stage: **Tray** (PLAN). Owner: Architect. Question it answers: In what order do we deliver, and which files change?

## Input

Read ONLY the section `rise.md#risks`. Never the whole previous document and never `SPEC.md`.

## Steps

1. Look at `templates/tray.example.md` to see the expected size and tone.
2. Fill the sections of `templates/tray.md` inside the existing `plan.md`. Keep the `# <title>` and the frontmatter that `fsd task new` created; never edit `status`. Fill every heading (empty = `None`).
3. Keep to the size limit: 60 lines, counted without the header block.

## Source

Write `Source: <path>#<anchor> — <one line>` exactly as in `templates/tray.md`, here `rise.md#risks`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.

## Check before finishing

- The line count is under 60.
- The anchor in `Source` exists as a heading in the target file (`grep -n '^#' <file>`).

## Does not

- Write other stages of the chain.
- Edit the previous document.
- Move folders by hand.
