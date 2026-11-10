# Tray: export-report

- Stage: Tray
- Owner: Architect
- Size limit: 60 lines
- Source: rise.md#risks — quote every field and write line by line

## Delivery order

### 1 Add the export command

Register `report export <name>` and read the report lines.

### 2 Write the CSV file

Quote every field and write line by line; refuse an empty report.

## Files touched

- `src/report/export.ts` — new, the command and the CSV writer.
- `src/report/index.ts` — registers the command.

## Out of scope

Other formats.
