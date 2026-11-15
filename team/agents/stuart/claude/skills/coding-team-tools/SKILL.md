---
name: coding-team-tools
description: Explains how the agent team's tooling under team/ is built and changed. Covers shared helpers in fsd-lib.mjs, configuration and timings from agents.json, FSD_DRY with no side effects, shared state that readers must not consume, path resolution through links, and container compatibility checked with simulate-envs. Use when changing any script or config under team/.
---

# Coding the team tools (team/)

`team/README.md` maps every file. This skill is how to change them without breaking four running agents.

## Shape

- Scripts in `team/bin/`: Node ESM (`.mjs` or a `#!/usr/bin/env node` file) or bash. No build step, no new npm dependency.
- Shared logic lives in `fsd-lib.mjs`. Before writing a helper, search it (`fsd-map grep`, `fsd-map skeleton team/bin/fsd-lib.mjs`): `run`, `gh`/`ghJson`, `write`/`ghw` (GitHub writes), `pr`, `openPrs`, `reviewState`, `board`, `notify`, the inbox helpers, `waitsList`, `findDeadlocks`, `issue`, `handoffOf`, `acceptance`, `state`/`saveState`, `die`.
- Board columns and owners: only `fsd-stages.mjs` (`STAGE`, `OWNERS`, `stageName`). Never write a column name in a script.
- Times: only `agents.json` → `timing`, read through `fsd-timing.mjs`. A missing field is an error, never a default hidden in code. New field → add it to `REQUIRED` and to the "Tempos do time" table in `team/README.md`.
- Denied action → team command: only `redirects.json` (read by the hook, the watcher and the `team.md` table).

## Rules that reviews enforced

- **`FSD_DRY` has no side effects.** Every GitHub write, board move, notice and file write goes through `write()`/`ghw()`, which only print under `FSD_DRY`. A dry run never queues a notice or touches `$FSD_STATE` (#96).
- **Readers do not consume shared state.** A file under `$FSD_STATE` (`~/.config/fsd-agents`) or `/tmp/fsd-*` that tracks "already reported" belongs to one agent. A read-only command run by anyone else must not update it (#105).
- **The first read counts.** A check that keeps a baseline must report what already exists on its first read, not only what appears afterwards (#96).
- **No silent loss.** If delivery fails, queue it or say so. A failure that prints nothing is a bug.
- **Exit codes are a contract** for other scripts and for `fsd-wait`: keep each script's documented codes (the usage comment at the top of the file).
- **Every file a script reads ships in the same PR** (#109) and is listed in `team/.gitignore` exceptions if needed.

## Paths and environments

- Resolve your own location through links: `HERE="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"` in bash, `dirname(fileURLToPath(import.meta.url))` in Node. Scripts are also called through `~/.local/bin` links.
- The repository root is `FSD_REPO` or two levels up from `team/bin`. State is `FSD_STATE` or `~/.config/fsd-agents`. Never hard-code a user name, a home path or the machine.
- Run `team/setup/simulate-envs` before a PR that touches paths, setup or scripts: it clones the branch into several layouts (containers, the host, a path with spaces) and must exit 0. Run `team/setup/check-paths` for broken links and paths.

## Testing without a real agent

- `FSD_DRY=1` to see every write. A temporary `FSD_STATE=$(mktemp -d)` so nothing real is read or changed. `FSD_AGENT=<name>` to act as an agent. `FSD_NOW` where a script supports a simulated clock.
- tmux scenarios in an isolated server (`tmux -L test-<name>`) for anything that reads panes (`fsd-watch`, `fsd-stop`).
- Pure logic in `fsd-lib.mjs` (like `findDeadlocks`) is unit-testable with `node:test` and injected inputs (`writing-unit-tests`).

## Rollout

Agents run the scripts from the main checkout. A merged change reaches them when that checkout is updated, and hooks and settings apply to sessions opened after that. Say in the PR what changes for a running agent.
