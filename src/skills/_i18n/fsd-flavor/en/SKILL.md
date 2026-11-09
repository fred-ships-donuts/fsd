---
name: fsd-flavor
description: >
  **WORKFLOW SKILL** — Writes the Flavor (SPEC) of a delivery from its template, owned by the PM + Architect: What exact behavior: inputs, outputs, messages, edge cases?
  Reads only the linked section of the previous document, fills every template heading within the size limit
  (120 lines) and writes the required `Source` link.
  USE FOR: writing the Flavor (SPEC) document of a delivery.
  DO NOT USE FOR: the other stages of the document chain, namely `fsd-craving` (previous stage) and `fsd-rise` (next stage); editing the previous document;
  moving task folders by hand.
  Triggers: "flavor", "SPEC", "specify the behavior", "write the spec", "acceptance items".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-flavor — Flavor (SPEC)

Stage: **Flavor** (SPEC). Owner: PM + Architect. Question it answers: What exact behavior: inputs, outputs, messages, edge cases?

## Input

Read ONLY the section `craving.md#expected-result`. Never the whole previous document and never `SPEC.md`.

## Steps

1. Look at `templates/flavor.example.md` to see the expected size and tone.
2. Copy `templates/flavor.md` to `nook/kitchen/<slug>/flavor.md` (create the folder if it is missing; `<slug>` is the delivery slug, SPEC 4.5). Fill every heading (empty = `None`).
3. Keep to the size limit: 120 lines, counted without the header block.

## Source

Write `Source: <path>#<anchor> — <one line>` exactly as in `templates/flavor.md`, here `craving.md#expected-result`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.

## Check before finishing

- The line count is under 120.
- The anchor in `Source` exists as a heading in the target file (`grep -n '^#' <file>`).

## Does not

- Write other stages of the chain.
- Edit the previous document.
- Move folders by hand.
