---
name: handling-files-safely
description: Covers how to read, write, move and lock files without corrupting data or crashing on edge cases. Includes atomic writes with temp files and rename or link, O_EXCL locks, avoiding check-then-act races, every common error code, symlinks, line endings and BOM, unusual paths, and dry runs with no side effects. Use when writing code that touches the filesystem.
---

# Handling files safely

Checklist for any change that touches the disk. Each item is a bug that has already happened.

## Writes

- **Atomic replace:** write to a temp file in the **same directory** (`<file>.<pid>.tmp`), `fsync` when durability matters, then `rename` over the target. Readers see the old file or the new one, never half of it. `rename` across devices fails with `EXDEV`: the temp file must live next to the target.
- **Create only if absent:** `open(path, 'wx')` (`O_EXCL`) fails with `EEXIST` atomically. If the content must never be seen empty, write a temp file and `link(temp, target)` (also fails with `EEXIST`), then unlink the temp file in a `finally`.
- **Keep the mode:** a replaced file keeps its original permissions; new secret files are created `0o600`.
- **Undo:** back up before changing (or journal the action) so a failure halfway can be rolled back.

## Races (check-then-act)

- `if (exists(x)) read(x)` is a race: another process can delete it in between. Act, then handle the error (`ENOENT`).
- A stale-lock takeover: re-read and compare before deleting, and tolerate `ENOENT` when the holder released it meanwhile.
- A lock records `{pid, startedAt}`; a lock whose pid is dead is stale; an empty or unparsable lock written by a crash is stale only if it is older than a short grace period (it may be being written right now).
- Release only a lock you still own (same pid).

## Error codes to handle on purpose

| Code | Meaning | Typical handling |
|---|---|---|
| `ENOENT` | missing | the expected "absent" state, not a crash |
| `EEXIST` | already there | busy, or already done (idempotent) |
| `EISDIR` / `ENOTDIR` | a directory where a file was expected, or the reverse | a clear "is not a regular file" error |
| `EACCES` / `EPERM` | no permission | actionable message naming the path |
| `EBUSY` | in use (Windows) | "in use by another program" |
| `EXDEV` | rename across devices | copy, then remove |
| `ENOSPC` | disk full | stop, undo, say so |

Never read a path before knowing what it is when it can be a directory: `lstat` first, or catch `EISDIR` and turn it into the documented error (#49).

## Symlinks

- `lstat` describes the link, `stat` the target. A dangling link: `lstat` works, `stat` fails with `ENOENT`.
- A link can point to a directory, outside the project, or to itself through a loop (`ELOOP`).
- Before writing through a path, decide whether following a link is allowed; when it is not, refuse with a message.
- Compare real locations with `realpath` when checking that a path stays inside a root.

## Content

- Line endings: accept `\r\n` and `\n`; keep the file's own style when editing.
- A UTF-8 BOM at the start: strip it before parsing, keep it when rewriting.
- A file with no final newline, an empty file, only whitespace.
- Edit by parsing and serializing only what you change; keep the rest byte for byte.

## Paths

- Spaces, quotes, unicode, a leading `-`, very long names. Always pass paths as separate arguments, never inside a shell string.
- Build paths with `path.join`/`path.resolve`; never concatenate with `/`. Expand `~` explicitly; it is not a path.
- Names reserved on Windows (`con`, `nul`, `aux`) and case-only differences.

## Dry runs and reads

- A dry run (`--check`, `FSD_DRY`) prints what it would do and writes nothing: no file, no temp file, no lock, no cache.
- A read-only command never updates shared state (a "last seen" marker, a cache that others rely on).

<!-- skill-files -->
## Files of this skill

- [`references/checklist.md`](references/checklist.md)
