---
name: fsd-nook-tasks
description: >
  **WORKFLOW SKILL** — Works the tasks of a project's `nook/` (bench, rack, fridge) through the `fsd task`
  commands: finds the tasks, reads the `plan.md`, proposes the steps, creates them, and moves each step through
  start and done, so the status files stay consistent. It never edits a `status` or moves a folder by hand, and
  it never archives.
  USE FOR: the user asks for a task, or to continue, plan or finish one; the project has a `nook/bench/` folder
  with tasks on it.
  DO NOT USE FOR: creating the task itself (that is `fsd task new`, run by the user); archiving a task; editing
  files of the task by hand; anything outside the project scope.
  Triggers: "task", "tasks", "work on the task", "next step of the task", "plan the task", "finish the task",
  "nook/bench", "bench".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-nook-tasks — work the tasks of `nook/` with `fsd task`

The CLI owns the task files: it changes `plan.md`, the step files and the folder together. This skill only calls it.

## Flow

1. **Where.** Run every command from the project root: the current directory decides the project, and fsd never looks
   upward. Tasks exist only in the project scope.
2. **Find the tasks.** Run `fsd task list --json` and parse it (`schema: 1`, `tasks[]` with `slug`, `status`, `dir`,
   `steps` and, when something is wrong, `invalid`). Never read the text columns. A task with `invalid` is reported to
   the user with the reason; do not touch it.
3. **Errors.** Every `fsd task` error ends with the command that fixes it, in parentheses: `(run: …)`. Run it, then
   repeat the command that failed. `<file> changed while writing, try again`, `another fsd run is in progress` and
   `… is in use by another program` mean: run the same command again (the second one, after the other run ends).
4. **Repeat without fear.** The commands are idempotent (`step <NN> already <status>`, `task <t> already done`, exit
   0), so after a timeout or a doubt, just run the command again.
5. **Plan.** Read `nook/bench/<slug>/plan.md`, propose the steps to the user and, once agreed, create each one with
   `fsd task step add <task> "<title>" [--description <text>]`. A title that starts with `-` goes after `--`:
   `fsd task step add <task> -- "-x"`.
6. **Work.** Run `fsd task step start <task> <n>` before each step and `fsd task step done <task> <n>` after it.
   Use `fsd task step skip <task> <n>` when a step no longer makes sense (it counts as closed). `<n>` is `1` or `01`.
7. **Finish.** Ask the user to confirm **before** `fsd task done <task>`; after the confirmation, run it.
   **Never run `fsd task archive`**: only the user does.

## Never

- Edit the `status` in `plan.md` or in a step file, or move task folders by hand: the CLI changes both together.
- Read the text output of `fsd task list` instead of `--json`.
- Run `fsd task archive`.
