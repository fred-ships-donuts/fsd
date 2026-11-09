# Step (TASK)

- Stage: Step
- Owner: Dev
- Size limit: 30 lines (body, without this header block)
- Source: inside `description` (see below)

A Step is the existing `NN-<slug>.yaml` of a task folder (SPEC 4.5). No new yaml field. The `Source` lives inside the `description` text and points to one Tray delivery item: `tray.md#1-<title-slug>`. A generic link such as "see SPEC" is not allowed: always a path plus an anchor.

```yaml
title: <title>
status: pending
description: |
  Source: <path>#<anchor> — <what it says, one line>
  Do: <what to change, in one or two lines>
  Done when: <what can be checked on the real app>
```
