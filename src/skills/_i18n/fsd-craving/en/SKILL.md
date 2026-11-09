---
name: fsd-craving
description: >
  **WORKFLOW SKILL** — Writes the Craving (PRD) of a delivery from its template, owned by the PM: What problem, for whom, what result, what is out?
  Reads only the linked section of the previous document, fills every template heading within the size limit
  (40 lines) and writes the required `Source` link.
  USE FOR: writing the Craving (PRD) document of a delivery.
  DO NOT USE FOR: the other stages of the document chain, namely `fsd-flavor` (next stage); editing the previous document;
  moving task folders by hand.
  Triggers: "craving", "PRD", "write the problem", "what problem are we solving", "new delivery idea".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-craving — Craving (PRD)

Stage: **Craving** (PRD). Owner: PM. Question it answers: What problem, for whom, what result, what is out?

## Input

Read ONLY the user's request (nothing else). Never the whole previous document and never `SPEC.md`.

## Steps

1. Look at `templates/craving.example.md` to see the expected size and tone.
2. Copy `templates/craving.md` to `nook/kitchen/<slug>/craving.md` (create the folder if it is missing; `<slug>` is the delivery slug, SPEC 4.5). Fill every heading (empty = `None`).
3. Keep to the size limit: 40 lines, counted without the header block.

## Source

None: the Craving starts the chain.

## Check before finishing

- The line count is under 40.
- Every template heading is present.

## Does not

- Write other stages of the chain.
- Edit the previous document.
- Move folders by hand.
