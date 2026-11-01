#!/usr/bin/env python3
"""Checks in .cs files the coding rules that the build analyzer does not catch.

Covers: `//` and `/* */` comments, TODO/FIXME/HACK, `!` (null-forgiving), `#pragma warning disable`, `.Result`,
`.Wait()`, `async void`, `DateTime.Now`/`UtcNow` and `DateTimeOffset.Now`, lines over 120 columns, log with
interpolation, `Result` without a generic type, status chosen by whoever instantiates Result<T>, DataAnnotations, `HandleAsync` without `Invalid` on the first line, `== null`/`!= null`, asynchronous method without the `Async` suffix and file without the
CRLF terminator.
The scan is by regex over the text without the contents of strings: there may be false positives, and the reviewer confirms.

Usage: check.py <file-or-folder> [...]
Output: one line `file:line: rule -> correct form` per deviation; at the end, the total.
Exit code: 0 no deviations · 1 with deviations · 2 invalid input.
Standard library only.
"""
import re
import sys
from pathlib import Path

MAX_COLUMNS = 120
IGNORED_FOLDERS = {"bin", "obj", ".git", "node_modules", "Migrations"}

RULES = [
    ("slash-comment", re.compile(r"//(?!/)"), "`//` comment forbidden: only XML comments (`///`)"),
    ("block-comment", re.compile(r"/\*"), "`/* */` comment forbidden: only XML comments (`///`)"),
    ("pending-marker", re.compile(r"\b(TODO|FIXME|HACK)\b"), "no TODO/FIXME/HACK in the code"),
    ("null-forgiving", re.compile(r"[\w)\]]!(?=[.;,)\]\s])"), "no `!`: handle the null (`is not { } x`, `ThrowIfNull`)"),
    ("pragma", re.compile(r"#pragma\s+warning\s+disable"), "no `#pragma warning disable`: fix the code"),
    ("blocking-result", re.compile(r"\.Result\b(?!\s*[<(])"), "no `.Result`: use `await`"),
    ("blocking-wait", re.compile(r"\.Wait\s*\("), "no `.Wait()`: use `await`"),
    ("async-void", re.compile(r"\basync\s+void\b"), "no `async void`: return `Task`"),
    ("date-time", re.compile(r"\b(DateTime|DateTimeOffset)\.(Now|UtcNow)\b"), "use `TimeProvider` (`GetUtcNow()`)"),
    ("non-generic-result", re.compile(r"\bnew\s+Result\s*\(|Task<Result>"), "use `Result<T>` (`new Result<T>(...)`, `Task<Result<T>>`)"),
    (
        "chosen-result-status",
        re.compile(r"\bResult(<\w+>)?\.(NotFound|Validation|Ok|Created|BadRequest)\b|new\s+Result<\w+>\(\s*HttpStatusCode"),
        "the status belongs to the `Result<T>` constructor; whoever instantiates does not choose it",
    ),
    (
        "data-annotations",
        re.compile(r"System\.ComponentModel\.DataAnnotations|\[(property:\s*)?(AllowedValues|Range|Required|StringLength|MaxLength|MinLength|RegularExpression)\b"),
        "validate in the `Query`/`Command` constructor with Flunt notifications, without DataAnnotations",
    ),
    (
        "comparison-with-null",
        re.compile(r"[!=]=\s*null\b"),
        "use `is null`/`is not null` (in an expression tree, such as Moq's `It.Is`, use another form without a pattern)",
    ),
]

ASYNC_WITHOUT_SUFFIX = re.compile(r"\basync\s+(?:Task|ValueTask)(?:<.*?>)?\s+(\w+)\s*\(")
IMPOSED_NAMES = {"Process", "Main"}

INTERPOLATED_LOG = re.compile(r"\bLog(Trace|Debug|Information|Warning|Error|Critical)\s*\((?:[^;]*?,\s*)?\$@?\"")


def clean(text):
    """Empties the contents of strings, chars, and XML comments, preserving columns and line breaks."""
    output, i, n = [], 0, len(text)
    while i < n:
        if text.startswith("///", i):
            end = text.find("\n", i)
            end = n if end < 0 else end
            output.append(" " * (end - i))
            i = end
        elif text[i] in "\"'":
            quote = text[i]
            if text.startswith('"""', i):
                end = text.find('"""', i + 3)
                end = n if end < 0 else end + 3
                output.append("".join("\n" if x == "\n" else " " for x in text[i:end]))
                i = end
                continue
            verbatim = quote == '"' and i > 0 and text[i - 1] == "@"
            j = i + 1
            while j < n:
                if text[j] == "\\" and not verbatim:
                    j += 2
                    continue
                if text[j] == quote:
                    if verbatim and text.startswith(quote * 2, j):
                        j += 2
                        continue
                    break
                if text[j] == "\n":
                    break
                j += 1
            middle = "".join("\n" if x == "\n" else " " for x in text[i + 1:j])
            output.append(quote + middle + (quote if j < n and text[j] == quote else ""))
            i = j + 1
        else:
            output.append(text[i])
            i += 1
    return "".join(output)


HANDLER = re.compile(r"Handler\.cs$")
FIRST_STATEMENT_INVALID = re.compile(r"\s*\{\s*if\s*\(\s*\w+\.Invalid\s*\)")


def handle_without_invalid(cleaned):
    """Lines of the `HandleAsync` methods whose first statement is not `if (<input>.Invalid)`."""
    lines = []
    for found in re.finditer(r"\bHandleAsync\s*\(", cleaned):
        level, i = 1, found.end()
        while i < len(cleaned) and level:
            level += {"(": 1, ")": -1}.get(cleaned[i], 0)
            i += 1
        if re.match(r"\s*\{", cleaned[i:]) and not FIRST_STATEMENT_INVALID.match(cleaned[i:]):
            lines.append(cleaned.count("\n", 0, found.start()) + 1)
    return lines


def check_file(path):
    original = path.read_text(encoding="utf-8-sig")
    cleaned = clean(original)
    findings = []
    if re.search(rb"(?<!\r)\n", path.read_bytes()):
        findings.append((1, "line-terminator", "CRLF line terminator (Windows standard)"))
    for number, (line, raw) in enumerate(zip(cleaned.splitlines(), original.splitlines()), start=1):
        if len(raw) > MAX_COLUMNS:
            findings.append((number, "columns", f"{len(raw)} columns: at most {MAX_COLUMNS}"))
        if INTERPOLATED_LOG.search(raw) and not raw.lstrip().startswith("///"):
            findings.append((number, "interpolated-log", "constant template with named placeholders, value as an argument"))
        for name, pattern, fix in RULES:
            if pattern.search(line):
                findings.append((number, name, fix))
        method = ASYNC_WITHOUT_SUFFIX.search(line)
        if method and not method.group(1).endswith("Async") and method.group(1) not in IMPOSED_NAMES:
            findings.append((number, "async-without-suffix", "asynchronous method ends in `Async`, including tests"))
    if HANDLER.search(path.name):
        for number in handle_without_invalid(cleaned):
            findings.append((number, "handler-without-invalid", "the first line of `HandleAsync` is `if (query.Invalid)` and, on the line below, `return new Result<T>(query.Notifications);`"))
    return sorted(findings)


def list_files(entries):
    for entry in entries:
        p = Path(entry)
        if p.is_file() and p.suffix == ".cs":
            yield p
        elif p.is_dir():
            for file in sorted(p.rglob("*.cs")):
                if not IGNORED_FOLDERS & set(file.parts):
                    yield file
        else:
            print(f"invalid input: {entry}", file=sys.stderr)
            sys.exit(2)


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    if not argv:
        print(__doc__, file=sys.stderr)
        return 2
    total = 0
    for file in list_files(argv):
        for number, rule, fix in check_file(file):
            print(f"{file}:{number}: {rule} -> {fix}")
            total += 1
    print(f"{total} deviation(s)")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
