# fsd — Fred Ships Donuts

CLI to install, update and remove the Claude Code skills by Frederico Jacobi.

## Use

```bash
npx -p fred-ships-donuts fsd init      # or: npm i -g fred-ships-donuts && fsd init
```

| Command | What it does |
|---|---|
| `fsd init` | Opens the interactive wizard (install and uninstall skills, scope, language, theme, updates). Needs a terminal. |
| `fsd update`, `fsd -u` | Updates the fsd CLI itself (global installs only). |
| `fsd update skill [name]`, `fsd update -s [name]`, `fsd -u -s [name]` | Updates the installed skills (all, or only `name`). A skill of the same name that is in the way is kept and reported (exit 1). |
| `fsd update skill [name] --force`, `... -f`, `fsd -u -s -f [name]` | The same, replacing the original that is in the way. |
| `fsd link skill [name]`, `fsd link -s [name]` | Links installed skills that have no link in `.claude/skills` (for example, those installed with "keep the original"). Add `--force` / `-f` to replace the original that is in the way. |
| `fsd task new "<title>"` | Creates the task folder `nook/bench/<slug>/` with a `plan.md` (`status: in_progress`). |
| `fsd task list [--all] [--json]` | Lists the tasks of `bench` and `rack` (`--all` adds `fridge`): slug, status and closed/total steps. `--json` prints one object for agents. |
| `fsd task step add <task> "<title>" [--description <text>]` | Adds the next step (`NN-<slug>.yaml`, `status: pending`). |
| `fsd task step start\|done\|skip <task> <n>` | Sets a step to `in_progress`, `done` or `skipped`. |
| `fsd task done <task>` | Needs every step closed; sets `status: done` and moves the folder to `nook/rack/` (F-40b, #7: not available yet). |
| `fsd task archive <task>` | Only for a task in `rack`; sets `status: archived` and moves the folder to `nook/fridge/` (F-40b, #7: not available yet). |
| `fsd -h`, `--help` | Help (also shown when run with no arguments). |
| `fsd -v`, `--version` | Version. |

Shortcuts: `-u` = `update`, `-s` = `skill`, `-f` = `--force`. Each is its own argument, in this order (`fsd -u -s -f name`); grouped (`-usf`) or out-of-order shortcuts are usage errors.

Skills go to `~/.fsd/skills` (global) or `./.fsd/skills` (local), and a symbolic link in `~/.claude/skills` (or `./.claude/skills`) lets Claude Code find them. If a skill of the same name already exists, the wizard asks what to do: keep the original and skip ours (default), install ours and keep the original (not linked; link it later with `fsd link skill`), or replace the original. After you confirm, the install runs in phases (verify, prepare, apply, register, conclude); if anything fails or you press `ctrl+c`, everything done is undone. What was installed is recorded in `.fsd/installed.json` of the scope; the install flow also creates the base `nook/` and `.fsd/` structure (see `docs/FSD-DIRECTORY-STRUCTURE.md`).

## Tasks

Tasks live in the project only (`nook/bench`, `nook/rack`, `nook/fridge`), so run `fsd task` from the project root. A task is a folder:

```text
nook/bench/login-oauth/
  plan.md            # spec and plan; the task `status` (in_progress|done|archived) is in its frontmatter
  01-schema.yaml     # a step: title, status (pending|in_progress|done|skipped), optional description
  02-endpoint.yaml
```

The skill `fsd-nook-tasks` (installed by the wizard) is what lets Claude Code work a task through these commands: the agent does the work, and the CLI only creates, reads, changes status and moves files. Only `fsd task archive`, run by you, moves a task from `rack` to `fridge`.

The Install flow will also add `.fsd/cache/` and `.fsd/logs/` to the project `.gitignore`.

## Development

```bash
npm install
npm run dev -- --help   # runs src/cli/fsd.ts with tsx
npm run build           # tsc to dist/
```

Documentation starts at [`docs/FSD-INDEX.md`](docs/FSD-INDEX.md); behavior is specified in [`docs/spec/MAP.md`](docs/spec/MAP.md).
