---
name: running-exploratory-tests
description: Covers time-boxed exploratory testing after the acceptance items pass. Includes writing a one-line charter, generating ideas with heuristics (interrupt, repeat, undo, wrong order, two processes, odd inputs and environments), recognizing a bug without a written expectation, and taking notes that become reproducible reports. Findings are filed as separate bugs and never change the acceptance verdict. Use after a PR's acceptance run is complete.
---

# Running exploratory tests

The acceptance run decides the verdict. Exploration looks for what nobody wrote down. It never changes the verdict: every finding becomes a separate bug.

## Session

1. **Charter**, one line: target, resources, what to look for. "Remove one skill with `.fsd/skills` read-only, looking for an inconsistent registry."
2. **Time box:** 15 to 30 minutes. When it ends, stop and write up.
3. **Notes while testing:** each command, the screen, what you expected, what you saw. Notes become the reproduction steps.

## Heuristics for ideas

- **Interrupt** in the middle (Ctrl+C, kill, close the terminal), then run again.
- **Repeat** the same command twice; **undo** it; do things in the **wrong order**.
- **Two at once:** a second process while the first runs.
- **Odd inputs:** empty, huge, spaces, unicode, `../`, a leading `-`, a name that already exists.
- **Odd environments:** no permission, a directory where a file should be, a dangling symlink, a tiny terminal, output to a pipe, `NO_COLOR`, no network.
- **SFDPOT:** structure, function, data, platform, operations, time.
- Follow what surprises you: one oddity often hides a bigger bug next to it.

## Oracles (knowing it is wrong without a written expectation)

- It contradicts the spec, the help text or its own message.
- It is inconsistent with another command or with the previous version.
- Data was lost or left half-written; files remain that should not.
- The exit code does not match what happened.
- A person would be confused or misled by it.

## Output

For each finding, `fsd-qa bug "<what fails>" "<what was expected>" <k>`, written with `reporting-bugs`. A summary line of the charter and what was covered goes in the QA report.

<!-- skill-files -->
## Files of this skill

- [`references/heuristics.md`](references/heuristics.md)
