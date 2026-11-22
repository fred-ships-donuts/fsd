# Definition of Done: a code delivery

1. One card: `fsd-dev start <n>` refuses a second card while one is open; a PR with changes requested comes first.
2. Every handoff item is in the diff (`self-reviewing-changes`); nothing out of scope.
3. The tests the handoff names exist and pass; the verify hook is green after the last edit.
4. Commits follow the commitlint rule, the header ends with `(#n)`.
5. The PR body says what changed and how it was verified; `Closes #n`.
6. In the new session, `fsd-pr open … --entrega <json>` with a valid `entrega-codigo` delivery (card, branch, head).
