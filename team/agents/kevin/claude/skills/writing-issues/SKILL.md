---
name: writing-issues
description: Writes and maintains fsd issues and records the team's product decisions. Covers the issue body by size, labels and milestone, fsd-issue new and fsd-issue decide. Use when creating an issue, editing one, or recording a decision.
---

# fsd issues (in English)

The documentation scales with the size. **S** (a small change, one or few files): only `## What` and `## Acceptance`, and the issue goes straight to Ready for Development, with no handoff. **M** and **L**: the full body below; M gets a short handoff and L a full one. Too big for one session? Split it first (skill `slicing-work`).

Body of an M or L task, in a file or on standard input:

```
## What
<one or two sentences>

## Why
<the problem it solves, with a link to the spec in docs/spec/ (SPEC §x)>

## Acceptance
1. <reproducible step>  →  <what must appear>

## References
- docs/spec/<area>/ (SPEC §x) · related issues
```

- Create: `fsd-issue new "<type>: <title>" --area <a> --size S|M|L --milestone "<phase>" [--to "Ready for Architecture"] <file|->`. It checks the sections, refuses a probable duplicate (`--force` if it is not one) and puts the issue on the board.
- Never ask the author. Decide: `fsd-issue decide <n> "<decision>"` (the decision and the why; it removes the `decision` label). If the decision changes the acceptance, rewrite the affected items in the same moment.
- The acceptance must be runnable by someone who did not read the conversation, one item per numbered line (skill `writing-acceptance-criteria`).
- Labels: `area:cli|nook|process|release|ui`, `size:S|M|L`, `decision`, `bug`. Milestone = the phase. Initial column: Backlog, or `--to "Ready for Architecture"` when it can already go to Mel (she is notified).
