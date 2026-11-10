# Taste: export-report

- Stage: Taste
- Owner: QA
- Size limit: 50 lines
- Source: flavor.md#a1-export-writes-a-csv-file — `report export sales` creates `sales.csv`

## Result

pass.

## Checked

- A1 — pass — ran `report export sales`; `sales.csv` has a header and 3 rows; exit 0.
- A2 — pass — ran `report export empty`; message as specified, no file, exit 1.

## Failures

None.

## Covered by code review

None.
