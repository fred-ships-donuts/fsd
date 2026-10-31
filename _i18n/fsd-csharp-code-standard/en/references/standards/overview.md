# C# coding standards

This is a pivot file for the C# code-typing standards: language, style, names, comments, and the shape of each piece of code. Each topic has its own file, indicated in the table. The standards are the project's coding reference. The examples are illustrative: the names (`Entity`, `Document`) and the `Response`, `Error`, and `ErrorType` classes are fictitious; what matters is the form.

One project rule prevails over any example in the standards:

- Domain acronyms in PascalCase, as a word (`Ein`, `Ssn`, `BlNumber`, `Dte`, `Ctis`, `Sgtap`).

Code, identifiers, messages, logs, XML comments, and tests are all in English.

## Summary

| Rule | File |
|---|---|
| C# 14 with Nullable and ImplicitUsings; no `!` and no `#pragma warning disable` | `compiler-and-naming.md` |
| Everything in English; acronyms in PascalCase (`Ssn`, `BlNumber`) | `compiler-and-naming.md` |
| Field `_camelCase`, static `s_camelCase`, constant in PascalCase, `Async` suffix on an asynchronous method | `compiler-and-naming.md` |
| Lambda parameter with a full name; boolean as an affirmative statement | `compiler-and-naming.md` |
| Message states the violated rule, in English, with the field via `nameof` | `compiler-and-naming.md` |
| File-scoped namespace, primary constructor for dependencies, collection expression, pattern matching | `csharp.md` |
| Explicit text comparison; argument guard via `ThrowIfNull` | `csharp.md` |
| Log with a constant template and named placeholders | `csharp.md` |
| Every concrete class is `sealed` | `csharp.md` |
| Value with an invariant: `sealed class : Notifiable`, private constructor that validates, `Create` factory | `csharp.md` |
| Minimal API endpoint: dependency as a delegate parameter; the endpoint only delegates | `csharp.md` |
| `async` end to end, date and time via `TimeProvider`, `CancellationToken` last and always passed on | `csharp.md` |
| Allman braces, four spaces, 120 columns, one statement per line | `style.md` |
| Blank line before the final `return`; inside an `if`, tight | `style.md` |
| Validate the negative cases first and exit early, no nested `if` or `else` after `return` | `style.md` |
| XML comments only (`///`), in English; `<summary>` on every `public` and `protected` member | `style.md` |
| Explicit visibility, no `this.`, `int` instead of `Int32`, `nameof` instead of text | `style.md` |
| Property with `private set` or `init`; fields, properties, constructors, and methods in that order | `style.md` |
| `var` on every local variable with an inferred type; deconstruction with two or more properties | `style.md` |
| `using` outside the namespace, `System` first, one group per root namespace | `style.md` |
| Test in AAA, no comments, name `<Method>_<Scenario>_<Result>` | `tests.md` |
| `.editorconfig` and project properties that enforce the rules in the build | `build.md` |

The test strategy (projects, coverage, business-rule traceability) is in `tests.md`.
