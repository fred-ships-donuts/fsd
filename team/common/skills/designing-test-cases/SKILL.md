---
name: designing-test-cases
description: Covers how to derive the test cases that cover the most risk with the fewest runs. Includes equivalence partitions, boundary values, state transitions including forbidden ones, decision tables, pairwise combinations, a failing case for every step that can fail, tracing each case to an acceptance item or a risk, and ordering by risk. Use when planning what to verify on a PR beyond running its acceptance items, or when an acceptance item is too vague to run as written.
---

# Designing test cases

## Techniques

- **Equivalence partitions:** group inputs that should behave the same; test one from each group, including the invalid groups.
- **Boundary values:** at the edge and one step on each side: empty, one, many, the maximum, the maximum plus one; 0 and -1; the longest name allowed and one longer.
- **State transitions:** list the states (a skill: not installed, up to date, outdated, missing, conflict; a task: bench, rack, fridge) and test every allowed transition and every forbidden one.
- **Decision tables:** when the result depends on several conditions (scope × state × flag), write the table and test each column that has a distinct outcome.
- **Pairwise:** with many independent options, cover every pair of values instead of every combination.
- **Error paths:** for each step that can fail (read, plan, verify, apply, register), one case that fails there, then check what is left on disk.

## From cases to a plan

1. Trace each case to an acceptance item or a handoff risk. A case with no reason is cut.
2. Order by risk: data loss and broken contracts first, then wrong results, then messages, then cosmetics.
3. Write each case as starting state → action → exact expected output, exit code and files.
4. Reuse one setup for several cases only when they cannot affect each other.

## Vague acceptance

When an item cannot be run as written, derive the concrete cases above, report the item as not runnable, and send Kevin the cases you would run (`fsd-notify kevin`). Never invent the expected result.
