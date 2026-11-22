# Layers of src/cli

| Layer | What lives there | Rule |
|---|---|---|
| `core/` | registry, config, lock, journal, task files | reads report clean errors; no command logic |
| `plan/` | pure planners | no disk, no output |
| `engine/` | applies a plan | every disk change through `Transaction` + `Ops` (undoable) |
| `commands/` | the commands | `Io`, exit codes, `--json` on stdout only; errors to stderr |
