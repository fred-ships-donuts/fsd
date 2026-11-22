---
name: writing-handoffs
description: Prepares an fsd issue for development by publishing the "Architect handoff" comment. Reads the issue, the spec and the code, then states what to do, which files change, the contracts, the risks, what is out of scope and how it is verified. Use when an issue is in Ready for Architecture or Kevin asks for a handoff.
---

# Handoff to the developer (in English)

1. `fsd-arq start <n>` (card → Architecting; shows the issue and its acceptance).
2. Read the spec it cites (in `docs/spec/`; `docs/spec/MAP.md` resolves the "SPEC x.y" numbers) and the code of the area, checking each claim at `file:line` (skill `architecting-cli`). Product questions go to Kevin with your recommendation; he decides. Nothing goes to the author.
   For a wide area, delegate the reading to an `Explore` subagent with a narrow brief (the question, the folders, what you already ruled out) and keep only its conclusions. Check every `file:line` it reports before it goes into the handoff.
3. Publish with `fsd-arq publish <n> - <<'X'` + the text + `X` (it checks the sections, publishes, moves the card to Ready for Development and notifies Stuart). The sections scale with the size: **size:L** all six; **size:M** only What to do, Files and Verification (the others only when there is something real to say); **size:S** has no handoff (`fsd-arq start` refuses and Kevin sends it straight to the developer):

```
**What to do:** <concrete steps, in order>
**Files:** <path — what changes>
**Contracts:** <signatures, types, exact error messages, exit codes>
**Risks:** <edge cases, concurrency, symlinks, Windows/paths…>
**Out of scope:** <what not to do now>
**Verification:** <how Bob confirms it, tied to the issue's acceptance>
```

Every file the handoff lists as new must be named in **Files**, and every relevant test the change needs must be named in **Verification**: a missing file or test is the most common reason a PR comes back.

<!-- skill-files -->
## Files of this skill

- [`references/definition-of-done.md`](references/definition-of-done.md)
- [`templates/arquitetura.json`](templates/arquitetura.json)
- [`templates/handoff.md`](templates/handoff.md)
- [`scripts/handoff-sections.mjs`](scripts/handoff-sections.mjs)
