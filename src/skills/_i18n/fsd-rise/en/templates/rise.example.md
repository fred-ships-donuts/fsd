# Rise: export-report

- Stage: Rise
- Owner: Architect
- Size limit: 60 lines
- Source: flavor.md#acceptance — two acceptance items: the CSV is written, an empty report is refused

## Feasible

Yes with changes: the report lines need a stable column order.

## Risks

- Values with commas or quotes break the CSV: quote every field.
- A large report is held in memory: write line by line.

## Discarded alternatives

- Print to stdout and let the user redirect: no exit code for the empty case.

## Open questions

None.
