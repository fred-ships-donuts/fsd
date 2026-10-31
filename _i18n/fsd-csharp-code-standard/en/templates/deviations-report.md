# Coding standards deviations

Scope: <files or diff reviewed>
Source of the standards: <the project's `docs/coding-standards/` or the skill's `references/standards/`>

## Verdict

<No deviations | N deviations: X prohibitions, Y names, Z async and cancellation, W style>

## Deviations

Order of severity: prohibitions, names, async and cancellation, style.

| # | File:line | Violated rule | Correct form |
|---|---|---|---|
| 1 | `src/Example.cs:42` | `.Result` in an asynchronous call (`csharp.md`, async) | `await _repository.GetAsync(id, cancellationToken)` |

## Out of scope

Deviations in neighboring code that the task did not touch: only cited, without a fix.

## Automatic check

Output of `scripts/check.py` (the rules the build analyzer does not catch) and what it does not cover, checked by hand.
