---
name: running-dev-workflow
description: Takes the card of the turn from Ready for Development (or Changes Requested) to a PR in review, in the native team session. Starts the worktree, implements within the architect handoff, opens or updates the PR with the delivery JSON, and ends the turn. Use when the task card says entrega-codigo or correcao.
---

# From the card to the PR (GitHub text in English)

The card of the turn says which issue and which kind: `entrega-codigo` (new work) or `correcao` (changes requested). One card at a time; the supervisor already sends corrections first.

1. `fsd-dev start <n>` (a fix: `--fix`): card → Developing; the worktree lives in `~/wt/`, from develop, and it shows the issue with the handoff. A gap in the handoff? `fsd-diga mel "<question>" --ref #<n>` and end the turn; Mel's answer comes back as a new turn.
2. Work only inside that worktree. Implement only the scope (skill `coding-cli` for `src/cli`, `coding-team-tools` for `team/`, `writing-product-skills` for `src/skills`). `npm run build` with no errors, `npm test` green. Up to 4 subagents for independent parts, each with a narrow brief; check everything they deliver before it goes into a commit.
3. Check every numbered acceptance item by hand, running the real fsd. Commit, one commit per context.
4. Before opening the PR, run the skill `self-reviewing-changes`.
5. Write the delivery: `fsd-entrega modelo entrega-codigo > /tmp/e.json`, then fill it (each acceptance item with the commit and the test that cover it, the Definition of Done all `true`).
6. `fsd-pr open "<type>: <title>" -C <worktree> --entrega /tmp/e.json --verified - <<'X'` + what you ran and what it printed + `X` (a deviation from the SPEC: `--dev "<text>"`). It pushes, opens the PR, saves the delivery, moves the card and tells the reviewers.
7. Changes requested (card `correcao`): `fsd-review read <n>` shows what was asked. Fix every point, run `self-reviewing-changes` again, update the delivery, then `fsd-pr open -C <worktree> --reply - --entrega /tmp/e.json <<'X'` + the answer to each point with the commit that resolves it + `X`.
8. Only on a conflict (never just to bring the branch up to date): `fsd-dev sync -C <worktree>` and `fsd-pr open -C <worktree> --reply - --entrega /tmp/e.json` explaining it.
9. End the turn. The merge is the supervisor's, with the CI and the approvals. The next task comes as a new turn.

A denied command is not a reason to ask the author: push goes through `fsd-pr open`, reviews are Mel's and Bob's, merges are the supervisor's.

<!-- skill-files -->
## Files of this skill

- [`references/definition-of-done.md`](references/definition-of-done.md)
- [`templates/entrega-codigo.json`](templates/entrega-codigo.json)
- [`templates/pr-body.md`](templates/pr-body.md)
