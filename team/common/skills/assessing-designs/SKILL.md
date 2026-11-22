---
name: assessing-designs
description: Covers how to judge a design or a code change on its merits. Includes correctness on every path including errors, layer boundaries, explicit contracts, shared state and concurrency, failure and recovery, side effects of dry runs and reads, simplicity, and a clear line between blocking issues and suggestions, each with file:line evidence. Use when reviewing a PR or checking a design before handing it to a developer.
---

# Assessing designs

Read the change against what it promised (the issue, the handoff), then walk these lenses. Write each finding as `file:line — problem → what to do`.

1. **Correctness.** Every path does what the contract says: success, each error, empty input, the second run. Trace one failing path end to end.
2. **Boundaries.** Each layer imports only what it may. No rule is duplicated in two layers. Nothing reaches around an abstraction (a direct `fs` call next to an injectable `Ops`).
3. **Contracts.** Inputs, outputs, errors and side effects are explicit. A caller never has to guess or parse a string. Changed contracts follow `designing-contracts`.
4. **State and concurrency.** Who writes, who reads, what happens with two at once. Does a read or a check change shared state? Who "consumes" a marker, and can another caller steal it?
5. **Failure and recovery.** What is on disk if it stops halfway (crash, Ctrl+C, full disk)? Can it be undone or resumed? Is every failure reported, or can one be silent?
6. **Side effects.** Dry runs, `--check` and reads change nothing.
7. **Simplicity.** The simplest thing that solves the problem. An abstraction needs two real users. Dead code and speculative options go.
8. **Tests.** The relevant behaviors have tests (`writing-unit-tests`); none are missing for risky paths, none test implementation details.
9. **Scope.** Nothing outside the promise; nothing promised is missing (every new file is in the diff).

## Severity

- **Blocking:** breaks a contract, can lose or corrupt data, a race, a crash on a reachable input, a silent failure, a security risk, missing promised work or relevant tests, out-of-scope change.
- **Suggestion:** readability, naming, small refactors, future improvements, style. Never block on taste.
- When unsure, explain the risk and let the evidence decide the label.

## Evidence

Say what you read or ran to conclude ("Checked: …"). A finding without a location or a reason is not actionable.

<!-- skill-files -->
## Files of this skill

- [`references/severity.md`](references/severity.md)
