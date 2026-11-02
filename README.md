# fsd — Fred Ships Donuts

CLI to install, update and remove the Claude Code skills by Frederico Jacobi.

## Use

```bash
npx -p fred-ships-donuts fsd init      # or: npm i -g fred-ships-donuts && fsd init
```

| Command | What it does |
|---|---|
| `fsd init` | Opens the interactive wizard (install and uninstall skills, scope, language, theme, symbols, updates). Needs a terminal. |
| `fsd update`, `fsd -u` | Updates the fsd CLI itself (global installs only). |
| `fsd update skill [name]`, `fsd update -s [name]`, `fsd -u -s [name]` | Updates the installed skills (all, or only `name`). |
| `fsd -h`, `--help` | Help (also shown when run with no arguments). |
| `fsd -v`, `--version` | Version. |

Shortcuts: `-u` = `update`, `-s` = `skill`; they can be mixed and combined (`fsd -us name`).

Skills go to `~/.claude/skills` (global) or `./.claude/skills` (local). What was installed is recorded in `.fsd/installed.json` of the scope; the install flow also creates the base `nook/` and `.fsd/` structure (see `docs/FSD-DIRECTORY-STRUCTURE.md`).

## Development

```bash
npm install
npm run dev -- --help   # runs src/cli/fsd.ts with tsx
npm test                # tsc + node --test
```

Documentation starts at [`docs/FSD-INDEX.md`](docs/FSD-INDEX.md); behavior is specified in [`SPEC.md`](SPEC.md).
