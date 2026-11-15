---
name: running-dev-workflow
description: Takes an issue from the Ready for Development column to a merged PR. Starts the worktree, implements within the architect handoff, opens the PR, handles review rounds and merges. Use when picking up a card, opening or updating a PR, answering a review, or merging.
---

# From issue to merge (GitHub text in English)

1. `fsd-dev start <n>`: card → Developing; creates the worktree `feature/<n>-<slug>` from develop (`--fix` for a fix) and shows the issue with the handoff. A gap in the handoff? Ask Mel on the issue before coding.
2. Work only inside the worktree it showed. Implement only the scope (skill `coding-cli` for `src/cli`, `coding-team-tools` for `team/`, `writing-product-skills` for `src/skills`). `npm run build` with no errors, `npm test` green.
   Up to 4 subagents for independent parts of the work (separate files or modules, research), each with a narrow brief. Read and check everything they deliver before it goes into a commit. Pushes, PRs and replies are always yours.
3. Check every "Acceptance" item by hand, running the real fsd. Then commit, one commit per context.
4. Before opening the PR, run the skill `self-reviewing-changes`.
5. `fsd-pr open "<type>: <title>" -C <worktree> --verified - <<'X'` + what you ran and what it printed + `X` (a deviation from the SPEC: `--dev "<text>"`). It pushes, opens the PR, moves the card and notifies the reviewers.
6. Changes requested: `fsd-review read <n>` shows what was asked. Fix every point, run `self-reviewing-changes` again, then `fsd-pr open -C <worktree> --reply - <<'X'` + the answer to each point with the commit that resolves it + `X` (pushes, replies, notifies; add `--verified <file>` only if you ran something new).
7. Only on a conflict (never just to bring the branch up to date): `fsd-dev sync -C <worktree>` (brings develop in by merge) and `fsd-pr open -C <worktree> --reply -` explaining it.
8. With 2 approvals: `fsd-merge <n>`.
9. Every delivery (PR opened, round of fixes, merge) ends with `fsd-restart`, even if all that is left is waiting. The new session sees the queue; with no work, it tells Kevin (`fsd-notify kevin "idle: …"`) and arms the `Monitor` with `fsd-wait any`.

A denied command is not a reason to ask the author: push goes through `fsd-pr open`, reviews through `fsd-review`, merges through `fsd-merge`.
