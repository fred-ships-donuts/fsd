# Definition of Done: a triage

1. The issue has `size:S|M|L` (between two sizes, the smaller).
2. The decision is one of: accept, decline, duplicate, author decision; the reason is written on the issue.
3. An accepted card is in the right column: S → Ready for Development; M and L → Ready for Architecture (or Backlog until it is ready).
4. A decline or a duplicate closes the issue with the reason.
5. A point reserved to the author becomes a deadlock with the `decision` label; the team keeps working on other cards.
6. In the new session, `fsd-issue triage <n> --entrega <json>` applied it, with a valid `triagem` delivery.
