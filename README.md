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
| `fsd -h`, `--help` | Help (also shown when run with no arguments). |
| `fsd -v`, `--version` | Version. |

Shortcuts: `-u` = `update`, `-s` = `skill`, `-f` = `--force`. Each is its own argument, in this order (`fsd -u -s -f name`); grouped (`-usf`) or out-of-order shortcuts are usage errors.

Skills go to `~/.fsd/skills` (global) or `./.fsd/skills` (local), and a symbolic link in `~/.claude/skills` (or `./.claude/skills`) lets Claude Code find them. If a skill of the same name already exists, the wizard asks what to do: keep the original and skip ours (default), install ours and keep the original (not linked; link it later with `fsd link skill`), or replace the original. After you confirm, the install runs in phases (verify, prepare, apply, register, conclude); if anything fails or you press `ctrl+c`, everything done is undone. What was installed is recorded in `.fsd/installed.json` of the scope; the install flow also creates the base `nook/` and `.fsd/` structure (see `docs/FSD-DIRECTORY-STRUCTURE.md`).

## Development

```bash
npm install
npm run dev -- --help   # runs src/cli/fsd.ts with tsx
npm run build           # tsc to dist/
```

Documentation starts at [`docs/FSD-INDEX.md`](docs/FSD-INDEX.md); behavior is specified in [`SPEC.md`](SPEC.md).
