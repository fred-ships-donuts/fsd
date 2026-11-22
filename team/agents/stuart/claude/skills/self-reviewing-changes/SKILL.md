---
name: self-reviewing-changes
description: Checks a change against its architect handoff before it goes out for review, covering every handoff item in the diff, scope, reuse, edge cases, docs and spec in sync, relevant tests, and every blocking review point answered by a commit. Use before every fsd-pr open and before replying to a review round.
---

# Self-review before the PR

Copy this checklist into your reply and tick each line. A line you cannot tick is work to do, not a note for the reviewer.

```
Self-review:
- [ ] 1. Handoff coverage
- [ ] 2. Scope
- [ ] 3. Reuse
- [ ] 4. Edge cases
- [ ] 5. Spec and docs
- [ ] 6. Tests
- [ ] 7. Review round (only when answering a review)
- [ ] 8. Build, tests and acceptance run
```

**1. Handoff coverage.** Walk the handoff section by section. Every **What to do** step is in the diff. Every file in **Files** is in `git diff --stat origin/develop...HEAD`, and every file marked new exists and is committed (`git status --short` is empty). Every **Contract** (signature, message, exit code) matches the code character for character. Every **Risk** has code that handles it. Past failure: #109 read `team/judge-prompt.md`, which was never added.

**2. Scope.** Nothing outside the handoff. An improvement you noticed becomes an issue for Kevin (tell him as team.md says), not a hunk in this PR. One PR delivers one issue: if the handoff says two PRs, open two (#42).

**3. Reuse.** For every value the new code computes, search before keeping it: `fsd-map grep "<field or concept>"`. If the plan, the registry or a helper already knows it, use that (#77 recomputed `Plan.label`). If two places now hold the same logic, extract one helper (#107).

**4. Edge cases.** For code that touches the disk, run the checklist of `handling-files-safely`. For code with shared state: who else reads or writes it, and does a read-only call change it (#105)? For `FSD_DRY` or `--check` paths: nothing is written or sent (#96). For anything that keeps a baseline: does the first read report what already exists (#96)?

**5. Spec and docs.** If behavior, a message or a flag changed, `docs/spec/` and the docs say the same thing. The spec is Kevin's: say in the PR body that the spec needs the change and get his OK (#62, #67). README tables, `team/README.md`, `team.md` and `CONTRIBUTING.md` match the code.

**6. Tests.** Every relevant behavior has a test next to its module (`writing-unit-tests`): branches, parsing, state transitions, undo and recovery, races, edge cases, the exit code and `--json` contract. None for agent behavior or skill text. A review that asked for tests gets tests, not an explanation (#69 went three rounds).

**7. Review round.** List each Blocking point from `fsd-review read <n>` with the commit that resolves it. A point you disagree with gets a reasoned answer, not silence. A round that only merges develop resolves nothing.

**8. Run it.** `npm run build`, `npm test`, and every acceptance item by hand with the real `fsd` in a temporary HOME and project. Paste what you ran and what it printed into `--verified`.
