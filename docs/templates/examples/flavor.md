# Flavor: export-report

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines
- Source: craving.md#expected-result — the analyst gets the report as a CSV file with one command

## Behavior

`report export <name>` writes `<name>.csv` in the current folder, one row per report line.

## Inputs

`<name>`: an existing report. `--out <dir>`: target folder (default: current).

## Outputs and messages

- Success: `exported <name>.csv (<n> rows)`, exit 0.
- Empty report: `nothing to export: <name> has no rows`, exit 1.

## Edge cases

- The file already exists: it is overwritten.
- `<name>` does not exist: `report not found: <name>`, exit 1.

## Acceptance

### A1 Export writes a CSV file

`report export sales` creates `sales.csv` with a header row and one row per line; exit 0.

### A2 Empty report is refused

`report export empty` prints `nothing to export: empty has no rows`, creates no file; exit 1.
