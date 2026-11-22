# Definition of Done: a QA run

1. `fsd-qa prep <n>` at the PR head; a PR without `Closes #n` is refused back to its author.
2. Every acceptance item ran exactly as written, one by one (`fsd-qa run <k>`).
3. A first FAIL is repeated from scratch; a second FAIL confirms it.
4. Every item has a verdict; PASS with a non-zero exit only with the reason.
5. A new commit after `prep` means a new verification.
6. Out-of-scope defects become separate bugs (`fsd-qa bug`), never a FAIL of the PR.
7. In the new session, `fsd-qa finish --entrega <json>` with a valid `qa` delivery.
