---
name: managing-product
description: Explains the fsd product from the product manager's side. Covers how the spec is organized and resolved through its map, the document chain and product vocabulary, milestones and what blocks the next release, where past decisions live, what is reserved to the author, and how board columns and commands move work. Use when writing an issue, slicing or prioritizing work, or making a product decision.
---

# Managing the fsd product

## The spec (yours)

- Each area has a folder in `docs/spec/<area>/` (commands, init, update, catalog, state, task, task-files, bakers, cookbook, kitchen, wizard, packaging, product…), with files named by the document chain (`craving.md`, `flavor.md`, `rise.md`…).
- `docs/spec/MAP.md` resolves the old "SPEC x.y" citations used in code and docs to their current file and anchor. Never rewrite those citations; resolve them.
- Product goal and out-of-scope: `docs/spec/product/craving.md`.
- You change the spec only through a PR with its own issue (`running-pm-workflow`, "Spec changes").

## Vocabulary and the document chain

`docs/GLOSSARY.md` defines the donut vocabulary (craving, flavor, rise, taste, tray, step, nook, oven, bakers, cookbook, kitchen…) and `CONTRIBUTING.md` §1.1 the chain of documents each delivery goes through, scaled by size. Use the same terms in issues and decisions.

## Milestones

Milestones are the phases (`gh api repos/{owner}/{repo}/milestones`). Before planning, check what is open in the current one and what blocks the next release (#12 publishing v1, #111 changelog). A release is prepared with `managing-releases`.

## Where decisions live

- `docs/DECISIONS.md`: product decisions with date and reason, newest at the top of their date.
- `Decision (PM, …)` and `Decision (author, …)` comments on issues and PRs; `fsd-issue show <n>` lists them.
- Before deciding, look for an earlier decision on the same point. Do not contradict one silently: supersede it and say why.

## Reserved to the author

#39 and #40 (label `decision`, until the author removes it), merges into `main`, publishing to npm, the donut art and header, and anything written as `Decision (author, …)`. An author decision is followed as written.

## The board

Columns and owners come from `team/bin/fsd-stages.mjs`; each column name shows its owner, e.g. `Ready for Development (Stuart)`. Commands move cards (`fsd-arq`, `fsd-dev`, `fsd-pr`, `fsd-review`, `fsd-qa`, `fsd-merge`, `fsd-board move`); move by hand only what no command covers.
