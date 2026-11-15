---
name: reviewing-prs
description: Reviews an fsd pull request technically against its architect handoff and the architecture, and publishes the review as Blocking, Suggestion and Checked. Use when fsd-pr --todo lists a PR to review.
---

# Technical PR review (in English)

1. `fsd-review start <n>` (card → In Review; lists the files). Read the issue's handoff.
2. `fsd-review diff <n> <path…>` only for the files that matter. Judge it with the skill `assessing-designs` (and `assessing-security-risks` when it reads untrusted input, writes outside the project, runs commands or handles tokens): layers and contracts of the handoff, actionable errors and exit codes, idempotency and edge cases, relevant tests, and nothing out of scope.
   For a large PR, you may split the reading by lens (contracts, concurrency, tests) across subagents and merge their findings yourself. Confirm each finding in the diff before it becomes Blocking; the review and its verdict are yours.
3. `fsd-review post <n> approve|changes - <<'X'` + the text + `X`, in this format:

```
**Blocking**
- `file:line` — problem → what to do

**Suggestion** (does not block the merge)
- `file:line` — suggestion

**Checked:** <what you ran or read to conclude>
```

With anything in Blocking, use `changes`; otherwise `approve`. If the PR changed since `start`, it refuses: run `start` again. The command moves the card and notifies the PR author.
