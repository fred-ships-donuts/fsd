---
name: reporting-bugs
description: Covers how to write a bug report anyone can reproduce on the first try. Includes a symptom-first title, a minimal reproduction, expected versus actual with its source, the exact environment and commit, focused evidence, frequency, severity apart from priority, hypotheses clearly marked, and one bug per report. Use when an acceptance item fails or a test session finds a defect.
---

# Reporting bugs

```
**<symptom> when <action>** (title)

**Steps** (minimal, from a clean state)
1. …
2. …

**Expected:** … (source: acceptance item k / SPEC §x / the message itself)
**Actual:** … (literal output, screen, exit code)

**Environment:** commit <sha>, build <command>, terminal 80x24, temporary HOME and project, OS
**Evidence:** screen capture, file tree before/after, journal excerpt
**Frequency:** always / n of m runs / first run only
**Severity:** data loss | broken contract | wrong result | message | cosmetic
**Hypothesis (unconfirmed):** … (optional)
```

## Rules

- **Title:** the symptom and where it shows, in one line. Never "doesn't work".
- **Minimal reproduction:** remove each step and check it still fails; what remains is the report. Start from a clean state every time.
- **Expected comes from a source:** the acceptance item, the spec or the program's own text. Without a source, say "unclear expectation" and send it to Kevin.
- **Actual is literal:** paste the output; do not paraphrase it.
- **Evidence is focused:** the lines that show the bug, not the whole log.
- **Severity is the damage; priority is Kevin's decision.** Do not mix them.
- **No diagnosis as fact:** a guess about the cause goes under "Hypothesis", clearly marked. No suggested fix: that is the developer's work.
- **One bug per report.** Two symptoms, two reports, linked to each other.

<!-- skill-files -->
## Files of this skill

- [`references/template.md`](references/template.md)
