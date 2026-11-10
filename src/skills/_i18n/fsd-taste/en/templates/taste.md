# Taste (QA REVIEW)

- Stage: Taste
- Owner: QA
- Size limit: 50 lines (body, without this header block)
- Source: <path>#<anchor> — <what it says, one line>

Source points to one Flavor acceptance item: `flavor.md#a1-<text-slug>`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.
An empty section is written `None`; never delete a heading.

## Result

pass / fail.

## Checked

One row per Flavor acceptance item: `A1 — pass/fail — how it was checked`.

## Failures

Exact output of each failure.

## Covered by code review

Items that cannot be triggered on the real binary, with `file:line`.
