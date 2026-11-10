---
name: fsd-taste
description: >
  **WORKFLOW SKILL** — Writes the Taste (QA REVIEW) of a delivery from its template, owned by the QA: Does the real app meet the acceptance criteria?
  Reads only the linked section of the previous document, fills every template heading within the size limit
  (50 lines) and writes the required `Source` link.
  USE FOR: writing the Taste (QA REVIEW) document of a delivery.
  DO NOT USE FOR: the other stages of the document chain, namely `fsd-step` (previous stage); editing the previous document;
  moving task folders by hand.
  Triggers: "taste", "QA review", "verify the delivery", "check the acceptance", "QA the result".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-taste — Taste (QA REVIEW)

Stage: **Taste** (QA REVIEW). Owner: QA. Question it answers: Does the real app meet the acceptance criteria?

## Input

Read ONLY one Flavor acceptance item, `flavor.md#a<n>-<text-slug>`. Never the whole previous document and never `SPEC.md`.

## Steps

1. Look at `templates/taste.example.md` to see the expected size and tone.
2. Copy `templates/taste.md` to `nook/bench/<slug>/taste.md` (create the folder if it is missing; `<slug>` is the delivery slug, SPEC 4.5). Fill every heading (empty = `None`).
3. Keep to the size limit: 50 lines, counted without the header block.

## Source

Write `Source: <path>#<anchor> — <one line>` exactly as in `templates/taste.md`, here `flavor.md#a<n>-<text-slug>`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.

## Check before finishing

- The line count is under 50.
- The anchor in `Source` exists as a heading in the target file (`grep -n '^#' <file>`).

## Does not

- Write other stages of the chain.
- Edit the previous document.
- Move folders by hand.
