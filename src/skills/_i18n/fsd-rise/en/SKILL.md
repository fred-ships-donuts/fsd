---
name: fsd-rise
description: >
  **WORKFLOW SKILL** — Writes the Rise (TECH REVIEW) of a delivery from its template, owned by the Architect: Is the specified behavior feasible, what are the risks and the discarded alternatives?
  Reads only the linked section of the previous document, fills every template heading within the size limit
  (60 lines) and writes the required `Source` link.
  USE FOR: writing the Rise (TECH REVIEW) document of a delivery.
  DO NOT USE FOR: the other stages of the document chain, namely `fsd-flavor` (previous stage) and `fsd-tray` (next stage); editing the previous document;
  moving task folders by hand.
  Triggers: "rise", "tech review", "is it feasible", "risks", "discarded alternatives".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-rise — Rise (TECH REVIEW)

Stage: **Rise** (TECH REVIEW). Owner: Architect. Question it answers: Is the specified behavior feasible, what are the risks and the discarded alternatives?

## Input

Read ONLY the section `flavor.md#acceptance`. Never the whole previous document and never `SPEC.md`.

## Steps

1. Look at `templates/rise.example.md` to see the expected size and tone.
2. Copy `templates/rise.md` to `nook/kitchen/<slug>/rise.md` (create the folder if it is missing; `<slug>` is the delivery slug, SPEC 4.5). Fill every heading (empty = `None`).
3. Keep to the size limit: 60 lines, counted without the header block.

## Source

Write `Source: <path>#<anchor> — <one line>` exactly as in `templates/rise.md`, here `flavor.md#acceptance`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.

## Check before finishing

- The line count is under 60.
- The anchor in `Source` exists as a heading in the target file (`grep -n '^#' <file>`).

## Does not

- Write other stages of the chain.
- Edit the previous document.
- Move folders by hand.
