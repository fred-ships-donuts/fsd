# fsd-csharp-code-standard — C# coding standards

Applies the project's C# coding standards when writing, changing, or reviewing code: compiler and names,
modern C#, style, tests, and build enforcement. One skill and one reviewer agent (read-only); `scripts/check.py` checks the rules that the
build analyzer does not catch.

> **Version:** 1.0.0-alpha.2 · **License:** UNLICENSED · **Author:** Frederico Jacobi.
> The source of truth for behavior is [`SKILL.md`](SKILL.md).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | the **Dev**, when writing, changing, or reviewing C# code |
| **Input** | the task (code to write or diff to review) |
| **Yardstick** | the project's `docs/coding-standards/`; without the folder, the copy in [`references/standards/`](references/standards/) |
| **Loading** | only the file for the task's topic, never all at once |
| **Output** | code in the shape of the standard, or a list of deviations with `file:line`, rule, and correct form |
| **Does not** | refactor what the task did not touch, change `.editorconfig` or `Directory.Build.props` without a request, version |

## How to use

```
/fsd-csharp-code-standard write the EntityService following the standards
/fsd-csharp-code-standard review the current diff against the coding standards
```

## Structure

```
fsd-csharp-code-standard/
├── SKILL.md
├── README.md
├── agents/
│   └── fsd-standards-reviewer.md       independent review of the diff, read-only
├── scripts/
│   ├── check.py                        rules the build analyzer does not catch, by regex
│   └── sync.py                         compares references/standards/ with the project's docs/coding-standards/
├── templates/
│   ├── Result.cs                       reference code for Result<T>
│   └── deviations-report.md            format of the list of deviations
├── evals/
│   └── evals.json                      the skill's test cases
└── references/
    ├── standards/                      copy of the project's docs/coding-standards/
    │   ├── overview.md                 pivot: summary of all rules
    │   ├── compiler-and-naming.md      compiler, nullability, language, names, messages
    │   ├── csharp.md                   modern C#, logging, typing, async, cancellation
    │   ├── style.md                    formatting, comments, declarations, `using`
    │   ├── tests.md                    xUnit v3, Moq, Fluent Assertions
    │   └── build.md                    `.editorconfig` and project properties
    └── models/
        └── classes.md                  model of each class: handler, endpoint, request, query/command, repository, tests
```

The files in `references/standards/` are a copy of `my-project-api/docs/coding-standards/`. The names
drop the `coding-standards-` prefix (`coding-standards-style.md` becomes `style.md`, `coding-standards.md` becomes
`overview.md`). To update, run `scripts/sync.py` (which ignores the prefix) and carry the differences to the
copy, keeping the names without the prefix, including in the cross-references in the text. `classes.md` belongs to the skill, taken from the
`BaseData/Vessels` feature: it does not exist in the project and is not overwritten by the copy.
