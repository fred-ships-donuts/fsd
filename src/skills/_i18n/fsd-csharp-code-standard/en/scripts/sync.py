#!/usr/bin/env python3
"""Compares the skill's references/standards/ with a project's docs/coding-standards/ and lists what diverged.

The skill's files drop the `coding-standards-` prefix (`coding-standards.md` is `overview.md`), including in the
cross-references inside the text. The comparison ignores the prefix of those references: only content changes count.
Usage: sync.py <project-docs-coding-standards-folder>
Output: one line per diverging file, with the first line that differs.
Exit code: 0 in sync · 1 with divergence · 2 invalid input. Standard library only. Changes nothing.
"""
import re
import sys
from pathlib import Path

NAMES = {
    "coding-standards.md": "overview.md",
    "coding-standards-compiler-and-naming.md": "compiler-and-naming.md",
    "coding-standards-csharp.md": "csharp.md",
    "coding-standards-style.md": "style.md",
    "coding-standards-tests.md": "tests.md",
    "coding-standards-build.md": "build.md",
}

REFERENCE = re.compile(r"coding-standards-([\w-]+\.md)")


def normalize(text, from_project):
    """In the project's text, strips the prefix from file names."""
    if from_project:
        text = REFERENCE.sub(r"\1", text).replace("coding-standards.md", "overview.md")
    return text


def first_difference(a, b):
    for number, (x, y) in enumerate(zip(a.split("\n"), b.split("\n")), start=1):
        if x != y:
            return number
    return min(len(a.split("\n")), len(b.split("\n"))) + 1


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 1 or not Path(argv[0]).is_dir():
        print(__doc__, file=sys.stderr)
        return 2
    project = Path(argv[0])
    skill = Path(__file__).resolve().parent.parent / "references" / "standards"
    divergences = 0
    for project_name, skill_name in NAMES.items():
        a, b = project / project_name, skill / skill_name
        if not a.is_file():
            print(f"missing in the project: {project_name}")
        elif not b.is_file():
            print(f"missing in the skill: {skill_name}")
        else:
            project_text = normalize(a.read_text(encoding="utf-8"), True)
            skill_text = normalize(b.read_text(encoding="utf-8"), False)
            if project_text == skill_text:
                continue
            line = first_difference(project_text, skill_text)
            print(f"diverges: {project_name} x references/standards/{skill_name} (first difference at line {line})")
        divergences += 1
    print(f"{divergences} divergence(s)")
    return 1 if divergences else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
