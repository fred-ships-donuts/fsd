# Contracts of the fsd CLI (changing one needs a schema version and a migration)

| Contract | Where | Rule |
|---|---|---|
| `installed.json` | `core/registry.ts` | source of truth of what is installed; the CLI never scans the Claude directory |
| `config.json` | `core/config.ts` | theme, `autoUpdate`, `updateSkills`, `lastUpdateCheck` |
| run journal | `core/runJournal.ts` (`schema: 2`) | what undo and recovery rely on; a newer unknown schema is refused |
| task files | `core/taskFiles.ts` | parsed and written back keeping everything else byte for byte |
| `--json`, exit codes, spec messages | `exitCodes.ts`, `docs/spec/` | others match on them |
| skill catalog | `core/catalog.ts` | layout and frontmatter `version` |

How to evolve one: the `designing-contracts` skill.
