---
name: fsd-csharp-code-standard
description: >
  **WORKFLOW SKILL** — Applies the project's C# coding standards when writing, changing, or reviewing code:
  compiler and analysis (C# 14, Nullable, no `!` and no `#pragma warning disable`), language and names (everything
  in English, acronyms in PascalCase), modern C# (primary constructor, pattern matching, `sealed`, Flunt,
  `TimeProvider`, `CancellationToken`, structured logging), style (Allman, 120 columns, XML comments only, member
  order, `var`, `using`), tests (xUnit v3, Moq, Fluent Assertions, AAA) and build enforcement (`.editorconfig`,
  `Directory.Build.props`). The full standards live in `references/`, loaded by topic; in the project,
  `docs/coding-standards/` prevails over the skill's copy. Does not refactor code the task did not touch,
  does not change the build configuration unless asked, does not version on its own initiative.
  USE FOR: writing or changing the project's C# code; writing unit tests; reviewing a diff against the coding
  standards; checking names, style, comments, and messages; configuring `.editorconfig` and analyzers.
  DO NOT USE FOR: architecture and layer choices; test strategy, coverage, and business-rule traceability (that is
  the project's `tests.md`); security or performance review; code that is not C#; rewriting old code unrelated to the
  task.
  Triggers: "coding standards", "C# coding standard", "follow the standards", "review the style", "names and
  comments", "code style", "editorconfig", "test standard", "check my code against the standards", "naming
  conventions".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.2"
---

# fsd-csharp-code-standard — C# coding standards

The C# code that comes out of this skill has the shape the project demands: names, style, comments, messages, and
tests. The standards are the coding reference; this skill puts them into practice, without reopening the discussion.

The standards are those of `my-project-api`. In another project, they only apply if it adopted the same
standards; when in doubt, ask the human before applying. The forbidden `//` comment is the one in C# code:
configuration files (`.editorconfig`, `.csproj`, `.props`) keep the comment syntax of their own format.

## Rules

1. **The project rules.** If the repository has `docs/coding-standards/`, read the files there: they prevail
   over the copy in `references/standards/`. Without the folder, use the copy. Divergence between the two: follow the
   project and warn the human

2. **Read the topic before writing.** Load only the file for the task's topic (table below). Do not write from
   memory a detail that the file defines

3. **Everything is in English.** Identifiers, messages, logs, XML comments, and tests are written in English, with the
   domain terms of the business glossary in English. One project rule wins over any example in the standards: domain
   acronyms in PascalCase, as a word (`Ein`, `Ssn`, `BlNumber`, `Dte`, `Ctis`, `Sgtap`)

4. **The examples are illustrative.** `Entity`, `Document`, `Response`, `Error`, and `ErrorType` are fictitious:
   copy the form, not the name

5. **Only the task's code.** Apply the standards to what you write or change. Do not reformat or rename
   neighboring code that the task did not touch; if you find a deviation, mention it in the report

6. **No suppression to get past it.** No `#pragma warning disable` and no `!`. `[SuppressMessage]` only with
   `Justification`, in the smallest scope (member, not type)

7. **Do not change the build on your own.** `.editorconfig` and `Directory.Build.props` only change on request.
   A warning that the new code generates is fixed in the code, not silenced

8. **No git.** Do not version on your own initiative (`AI_GIT_POLICY`)

## Which file to read

| The task involves | Read |
|---|---|
| Overview and the list of all rules | [overview.md](references/standards/overview.md) |
| Compiler, nullability, suppression, names, message text | [compiler-and-naming.md](references/standards/compiler-and-naming.md) |
| C# features, logging, typing (`record`, Flunt `Create`), `sealed`, primary constructor, async, time, `CancellationToken`, `await using` | [csharp.md](references/standards/csharp.md) |
| Formatting, line breaks, blank lines, XML comments, declarations, member order, `var`, deconstruction, `using` | [style.md](references/standards/style.md) |
| Creating or changing a use-case class: handler, endpoint, request, query/command, filter, response, repository and their tests | [classes.md](references/models/classes.md) |
| Unit test (AAA, Moq, Fluent Assertions, test name) | [tests.md](references/standards/tests.md) |
| `.editorconfig`, analyzer severity, project properties | [build.md](references/standards/build.md) |

Production code usually calls for `compiler-and-naming`, `csharp`, and `style`. A test adds `tests`. A use-case
class (handler, repository, request, query/command, endpoint) adds `classes.md`.

## Class models

[classes.md](references/models/classes.md) gives the shape of each role, taken from the
`BaseData/Vessels` feature. The **handler** is the central model: `internal sealed class` with a primary constructor, a single
`HandleAsync(<query or command>, CancellationToken cancellationToken = default)` that returns `Result<T>`, a `catch (DbException)`
that logs with a template and returns `new Result<T>(string.Empty, Result<T>.ServerErrorMessage)`, and no SQL or HTTP. The first line of the handler is `if (query.Invalid)` and, on the line below, `return new Result<T>(query.Notifications);`: the
`Query`/`Command` (`internal sealed class : Notifiable`) validates the input in the constructor, in C#, without `Contract` and without
DataAnnotations, and has the static `ExecuteAsync` that the endpoint calls. Database reads go through `IOracleReader`,
opened by `IOracleConnectionFactory`. The HTTP status belongs exclusively to `Result<T>`: the handler chooses the constructor (`new Result<T>()` 201,
`new Result<T>(obj)` 200, `new Result<T>(items, (1, 10, 353))` 200, `new Result<T>(notifications)` 400,
`new Result<T>("Id", message)` 404, `new Result<T>(string.Empty, message)` 500) and never the code. A new use-case class
copies the shape of the role, changing only the domain names; do not invent a different shape.

## Scripts, templates, and agent

| I need | Use |
|---|---|
| Check what the build analyzer does not catch (`//`, `!`, `.Result`, `DateTime.Now`, 120 columns, interpolated log, DataAnnotations, `HandleAsync` without `Invalid` on the first line, `Result` without `<T>`, `== null`, async method without `Async`, CRLF) | `python <skill>/scripts/check.py <file-or-folder>`: one line `file:line: rule -> correct form` per deviation. Regex over the text without strings: confirm each finding in the code |
| Know whether the copy of the standards has drifted out of sync with the project | `python <skill>/scripts/sync.py <project>/docs/coding-standards`: only reads and lists what diverged, ignoring the `coding-standards-` prefix of the references and the line terminator |
| The reference code for `Result<T>` (constructors, status, `ServerErrorMessage`) | [Result.cs](templates/Result.cs). `Pagination` and `ToActionResult()` live in the project's `Platform`: they are not part of the skill |
| Deliver the list of deviations from a review | [deviations-report.md](templates/deviations-report.md) |
| A second, independent read of the diff | the agent [fsd-standards-reviewer](agents/fsd-standards-reviewer.md): only reads and returns the report. Install: copy `agents/*.md` to the project's or the user's `.claude/agents/` |

Python 3, standard library only.

## Flow

**Write or change code**

1. Read the files for the task's topics
2. Write the code already in the shape of the standard
3. Run `scripts/check.py` and the check below on what you wrote
4. Build (`dotnet build`). If the build has `EnforceCodeStyleInBuild`, the `IDE*` and `CS1591` warnings from the new
   code must come out at zero
5. Run the tests for what changed only if none of them opens a database connection. If any does, do not run: present
   the command and ask for the `#NNN` authorization (`SQL_AUTORIZACAO_CODIGO`)

**Review a diff**

1. Run `scripts/check.py` on the diff and read the topic files it touches
2. For each deviation, record `file:line`, the violated rule, and the correct form, in this order of severity:
   prohibitions (`!`, `#pragma`, `async void`, `.Result`, `DateTime.Now`, `//` comment), names, async
   and cancellation, style
3. Do not report personal preference that the standard does not define. A diff with no deviation is a legitimate result
4. The rules of `compiler-and-naming`, `csharp`, `style`, and `tests` always apply. The class model
   ([classes.md](references/models/classes.md): `Result<T>`, the handler's `try`/`catch (DbException)`,
   `IOracleReader`, interface name, use-case folder) is only enforced when the project adopts it, that is, when
   `docs/coding-standards/` or the existing use-case classes already follow the same shape. Without that, cite it as an
   observation and not as a deviation

## Quick check

A supporting summary, it does not replace the files in `references/`: in case of conflict, the file prevails. What the
build analyzer does **not** catch and the review must check:

- no `//` or `/* */` comment, no commented-out code, no `TODO`/`FIXME`/`HACK`
- no `!` (null-forgiving) and no `#pragma warning disable`
- everything in English: identifiers, messages, logs, XML comments, and test names; the domain term is the one in the
  business glossary, in English (`VesselRepository`, `GetVesselQuery`, `VesselNotFoundException`)
- names: acronyms in PascalCase, `Async` on every asynchronous method (including tests), lambda with a full name,
  boolean as an affirmative statement
- new message: `$"Field {nameof(Name)} is required."`
- `DateTime.Now`, `DateTime.UtcNow`, and `DateTimeOffset.Now` outside `TimeProvider`; no `.Result`, `.Wait()`
  or `async void`
- `CancellationToken cancellationToken = default` last and passed on to every call that accepts one
- dependency captured once in a `_camelCase` field; the body uses the field, not the constructor parameter
- concrete class `sealed`; DTO as `sealed record`; value with an invariant as `sealed class : Notifiable`
  with `Create`
- UTF-8 without BOM and CRLF line terminator; `is null`/`is not null`; at most 120 columns; blank line before the final `return` (tight inside an `if`); members in the order
  fields, properties, constructors, operators, methods (`public` before `private`)
- negative validation first: each failure condition becomes an `if` that returns right away, all at the same level, and the
  happy path comes last; no nested `if` for success (horizontal sprawl) and no `else` after
  `return`
- `Result<T>`: no status chosen by whoever instantiates (no `Result.NotFound`, `Result.Validation`, status as
  an argument or property); 404 with a filled field, 500 with `string.Empty`
- use-case class in the shape of the role: handler without SQL and without HTTP, repository without `catch` or log, SQL only
  by bind and closed list, endpoint only delegates, request as a `sealed record` without a validation attribute, query/command `: Notifiable` that validates in the
  constructor (without `Contract` and without DataAnnotations), handler with `HandleAsync` and `Invalid` on the first line,
  repository that only reads through `IOracleReader`
- test: AAA without comments, `sealed`, `<Method>_<Scenario>_<Result>`, `TestContext.Current.CancellationToken`,
  no `Thread.Sleep`, no Mock of the domain
