# Definition of Done: a handoff

A handoff is done when every line below is true. `fsd-arq publish` checks the sections; the rest is yours.

1. The sections match the size: **L** all six; **M** What to do, Files and Verification; **S** has no handoff.
2. Every new file is named in **Files**, each with what changes in it.
3. Every claim about the code points to `file:line` that you opened yourself (also the ones a subagent reported).
4. **Contracts** has the exact signatures, error messages and exit codes the spec asks for.
5. **Risks** names the edge cases the developer must handle (paths, symlinks, races, Windows).
6. **Verification** ties each numbered acceptance item to how Bob runs it, and names the tests the change needs.
7. **Out of scope** says what not to do now, so the PR stays one issue.
8. In the new session, the `arquitetura` delivery is valid (`fsd-entrega modelo arquitetura`) and its `plan` is on the card before the move.
