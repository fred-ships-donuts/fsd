---
name: writing-acceptance-criteria
description: Covers how to write acceptance criteria anyone can run without having read the discussion. Includes one observable behavior per numbered item, the exact command or keys and the exact output and exit code, the starting state and how to reach it, a failure case with its exact message, wording taken from the spec, and rewriting affected items whenever a later decision changes them. Use when writing or editing the Acceptance section of an issue, or after recording a decision that changes it.
---

# Writing acceptance criteria

QA runs each item exactly as written. An item that cannot be run is a failed item, so the cost of a vague item lands on the whole team.

## Each item

```
N. <starting state and how to reach it> → `<exact command or keys>` → <exact output or screen>, exit <code>
```

- **Runnable:** the exact command (or key sequence for the wizard) and the exact expected output, message and exit code. "Works correctly" is not acceptance.
- **Starting state included:** what must exist first (a skill installed, a read-only folder, a held lock) and how to get there. If the state cannot be reached from the CLI, name how (a fixture, an injected failure in a unit test) or ask Mel to plan it in the handoff.
- **One behavior per item**, independent of the others, numbered.
- **Observable from outside:** output, screen, files, exit code. Never "the code uses X".
- **Happy path and at least one failure**, with the failure's exact message.
- **Wording from the spec:** messages and formats are copied from `docs/spec/`; if the spec changes, the item changes.
- **Documentation items** name the file and the text to find, so they can be checked with `grep`.

## Keeping it true

A decision recorded after the issue was written (`fsd-issue decide`) that changes the expected result means rewriting the affected items in the same moment (#114 failed because the acceptance still asked for what a later decision had removed).

## Cold-reader test

Re-read the list as someone who never saw the discussion. If you would need to ask anything to run an item, the item is not done.
