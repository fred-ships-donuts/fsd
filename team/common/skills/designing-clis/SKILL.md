---
name: designing-clis
description: Covers how to design a command-line interface that people and programs can rely on. Includes stdout versus stderr, consistent exit codes, stable --json output, actionable error messages, flags and help, safe defaults and confirmations, idempotent commands, TTY, pipe, NO_COLOR and CI behavior, and deprecating options without breaking users. Use when adding or changing a command, a flag, an output or an error message.
---

# Designing CLIs

Based on the Command Line Interface Guidelines (clig.dev) and POSIX conventions.

## Output

- **stdout** carries the result: what a pipe or a script consumes. **stderr** carries errors, warnings and progress.
- Color, spinners, animation and prompts only when the stream is a TTY. Honor `NO_COLOR`, `TERM=dumb` and `CI`.
- Human output can change between versions; machine output cannot.

## Machine output (`--json`)

- One JSON object per invocation, with stable field names and types. Add fields freely; never rename, remove or retype one without a new major version.
- On an error with `--json`, stdout stays empty (or holds a documented error object) and the exit code says it failed.
- No log lines mixed into it.

## Exit codes

- 0 success, 1 failure, 2 wrong usage, 130 interrupted by Ctrl+C (128 + SIGINT). Document any other code.
- The same situation gets the same code in every command.
- A "nothing to do" run is a success.

## Errors

- Say what went wrong, why, and what to do next, in one or two lines: `cannot write .fsd/config.json: permission denied (run: chmod u+w .fsd)`.
- No stack traces for expected errors; keep them for bugs, behind a debug flag.
- Name the exact path, value or flag involved.

## Arguments and help

- Long flags for everything (`--force`), short ones only for the frequent (`-f`). `--help` and `--version` always work.
- Help shows usage, the most common examples first, and every flag with its default.
- Unknown flag or missing argument: exit 2 with a usage hint, not a stack trace.
- Flags beat environment variables, which beat config files, which beat defaults.

## Safety

- Defaults are the safe choice. Destructive actions confirm in a TTY and require `--yes`/`--force` when not interactive.
- Commands are idempotent: running the same command twice leaves the same state and succeeds both times.
- Interrupted runs leave a consistent state or can be resumed or undone.

## Evolving

- Deprecate before removing: warn on stderr for at least one minor version, document the replacement, then remove in a major.
- A message other tools match on is a contract: change it like an API.

<!-- skill-files -->
## Files of this skill

- [`references/checklist.md`](references/checklist.md)
