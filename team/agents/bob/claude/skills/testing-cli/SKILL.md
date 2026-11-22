---
name: testing-cli
description: Explains how to put the fsd CLI into any state worth testing and drive it there. Covers a clean test environment for the exact commit, skill states and scopes, the wizard flows step by step, how to force each failure and interruption, and what evidence to capture. Use when preparing or running a verification of anything under src/cli.
---

# Testing the fsd CLI

## Clean environment for the exact commit

- `fsd-qa prep <N>` builds the PR's commit in its own worktree and opens the test terminal; use that build, never a global `fsd`.
- Every scenario starts from fresh temporary dirs: `T=$(mktemp -d); mkdir $T/home $T/proj; cd $T/proj; export HOME=$T/home`. Global scope lives in `$HOME/.fsd`, project scope in `./.fsd` and `./nook`.
- Terminal 80x24. Commands that need an agent identity (`fsd-issue`, `fsd-pr`) need `FSD_AGENT`; product commands (`fsd …`) do not.
- Note the commit (`git rev-parse --short HEAD` in the worktree) in every report.

## Skill states (SPEC "Estado de uma skill")

| State | How to get there |
|---|---|
| not installed | fresh HOME/project |
| up to date | install it with `fsd init` (Install flow) |
| outdated | install it, then lower `version` for it in `installed.json` |
| missing | install it, then delete its folder but keep the registry entry |
| conflict | create `.claude/skills/<name>` that fsd did not install |
| global vs project | pick the scope on the wizard's first step; check `~/.fsd` vs `./.fsd` |

Inspect the result with `cat .fsd/installed.json`, `ls -la .fsd/skills .claude/skills`, and `readlink` on links.

## Wizard flows (`fsd init`)

Steps come from `src/cli/wizard/steps.ts`:
- **Install:** scope → skills → language (only when a selected skill has more than one) → conflicts (only when there is one) → update → theme → summary. The header shows `step k of n`; n is 5, 6 or 7.
- **Uninstall:** scope → skills → summary.

Keys: `Up`/`Down` move, `Space` marks, `Enter` confirms, `Escape`/`Left` goes back. "Select all" is the first row of the skills list and starts marked.
- To act on one skill only: go to "Select all" and press `Space` to clear every mark, then mark the one you want (#77 needed five attempts without this).
- Read the screen after every key (`fsd-qa run` shows it). Never send a long key sequence blind.

## Forcing failures and interruptions

- **Permission:** `chmod a-w .fsd/skills` (restore with `chmod u+w`) to fail a write; on a read-only parent to fail a create. Not valid when running as root.
- **Concurrent run:** hold the lock: write `.fsd/cache/lock` as `{"pid": <live pid>, "startedAt": "<ISO date>"}` using the pid of a live process (e.g. `sleep 300 &` then `$!`), then run a second command; expect "another fsd run is in progress".
- **Stale lock:** the same file with a dead pid; the next run takes it over.
- **Interrupt:** press `C-c` while the Running screen shows the Apply phase; expect exit 130 and the undo; check the tree.
- **Dead run:** kill the process with `kill -9` mid-run; the next `fsd` recovers it (journal in `.fsd/cache/run-<pid>-<id>/`).
- **Directory instead of a file:** `mkdir .gitignore` before an Install.
- A failure the CLI cannot be pushed into from outside: say so in the verdict and point to the unit test that injects it through `Ops` (the issue's acceptance or the handoff names it).

## Evidence per item

The command or keys, the screen at the end, `EXIT=n`, and the file tree before and after (`find .fsd nook .claude -maxdepth 3 | sort`). For failures, the journal file. Capture after the screen settles (`driving-terminal-apps`).

<!-- skill-files -->
## Files of this skill

- [`references/evidence.md`](references/evidence.md)
