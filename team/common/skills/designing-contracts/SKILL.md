---
name: designing-contracts
description: Covers how to design the contracts other code and people depend on (file formats, machine output, public signatures, exit codes, messages others match on) and how to change them without breaking anyone. Includes versioned schemas, reading old and writing new, idempotent migrations, refusing unknown newer versions, deprecation paths, and typed errors. Use when a change adds or alters a file format, an output, a public function or an error.
---

# Designing contracts

## What counts as a contract

Anything someone else depends on without reading your code: file formats on disk, `--json` output, exported functions and types, exit codes, environment variables, and any message a person or a script matches on.

## Designing one

- The minimum that serves today's need; every field has a clear name, type and meaning.
- Objects over bare lists and positional values, so fields can be added later.
- Explicit defaults; absent and empty mean different things only when documented.
- A `schema` (or `version`) field in every persisted format from day one.
- Errors as data: a typed result or a code the caller can branch on, not a sentence to parse.
- One place of record (the spec): the code and the docs point to it.

## Changing one without breaking anyone

| Change | Safe? |
|---|---|
| Add an optional field or a new value readers can ignore | yes |
| Rename, remove, retype a field; change a meaning | needs a new schema version |
| Change an exit code or a matched message | needs a major version or a deprecation |

- **Read old, write new:** accept the previous schema, convert it in memory, write the current one.
- **Migration:** automatic, idempotent (running it twice is harmless), atomic (`handling-files-safely`), with a backup or undo. Never leave a half-converted file.
- **Newer than known:** refuse with a clear message ("written by a newer fsd; update the CLI"). Never guess.
- **Deprecation:** warn, document the replacement, keep the old behavior for a stated period, then remove.

## In a handoff

Write the contract out in full: field names and types, the exact messages, the exit codes, the schema bump and how old data is read. The developer implements it character for character.
