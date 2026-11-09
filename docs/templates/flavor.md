# Flavor (SPEC)

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: <path>#<anchor> — <what it says, one line>

Source points to the Craving: `craving.md#expected-result`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.
An empty section is written `None`; never delete a heading.
Keep punctuation out of anchor headings (no `.` `:` `(` `—`).

## Behavior

What the app does, step by step.

## Inputs

Arguments, options, files, environment.

## Outputs and messages

Exact texts and exit codes.

## Edge cases

What happens on each unusual input.

## Acceptance

Each item is a heading `### A1 <text>` and can be checked on the real app. The Taste links to one of them.

### A1 <text>

Command to run and what must happen.
