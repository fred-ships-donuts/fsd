**Architect handoff** (F-40b; base: SPEC 5.5, the body of this issue, `feat/nook-tasks` code and `develop` @ `d45351b`)

**When to start:** after #8 (F-42) is merged into `develop`. #8 adds `Ops.writeText` and `Transaction.writeTextFiles({ path, content, expected })` (not on `develop` yet, despite the note on #6) and maps `FileChangedError` to `Stop('changed', '<path> changed while writing, try again')`. All the rest is already on `develop`: `runTransaction` (`engine/transactionRun.ts`), `Transaction.relocate`, `ensureDirs`/`createdDir`, `Ops.rename` (plain rename, no `EXDEV` copy), the `label`, journal `schema: 2`. Branch: `git fetch origin && git switch -c feature/7-task-done-archive origin/develop` after the #8 merge; PR to `develop` with `Closes #7`.

**What to do:**
1. **`plan/task.ts` (pure, writes nothing):** `planTaskMove(task: Task | undefined, name, command: 'done' | 'archive', now: Date)` returns one of:
   - `{ kind: 'error', message }`: complete message with the `(run: …)` hint from the SPEC 5.5 table;
   - `{ kind: 'already', message }`: `task <t> already done` / `already archived`;
   - `{ kind: 'move', slug, from, to, taskPath, destination, planPath, snapshot, newPlanText, label }` with `snapshot = task.planText`, `newPlanText = setPlanStatus(snapshot, …, now)`, `label = "task <t>"` (the core builds `<label> failed and was undone (<phase>: <reason>)`; the SPEC row is then `task <t> failed and was undone (…)`, see Risks).

   Check order: not found → `invalid` → `already` → wrong folder → open steps (`done` only). `already` only for a valid task in `rack` with `done`, or in `fridge` with `archived`. `archive` does not check steps. Use the task's own result type, do not force `ActionResult`. Move the messages now in `benchTask`/`invalidError` (`commands/task.ts:144-157`) to `plan/task.ts`, or export them from `commands/` for both sides: one message, one copy.
2. **`engine/taskRun.ts`, a client of `runTransaction`, scope `project`, `keepAncestors: false`, no register:**
   - **verify** (runs after the core's `recoverRuns`): re-read with `findTask`. The task must be only in `from`, valid, with `planText === snapshot`; otherwise `Stop('changed', '<nook/…/plan.md> changed while writing, try again')`. For `done`, steps must still be closed, else also `changed`.
   - Still in verify: `lstat(destination)` must not exist, else `task <t> already exists in nook/<to> (run: fsd task list --all)`. `nook/<to>`, if it exists, must be a real directory, not a link: for a link, `nook/<to> is a symbolic link`. Then `accessSync(W_OK)` on the task folder, on `nook/<from>` and on `nearestExisting(nook/<to>)`.
   - **work** (firstPhase `apply`), in this order: (1) `tx.writeTextFiles([{ path: planPath, content: newPlanText, expected: snapshot }])`; (2) `tx.ensureDirs(nook/<to>)`; (3) `tx.relocate(taskPath, destination)`. Undo runs backwards (folder back, empty `rack` removed, `plan.md` restored at the origin).
   - `EPERM`/`EBUSY` on the relocate → `Stop('failed', 'task <t> is in use by another program, close it and try again')`, with undo.
   - Register: nothing. `installed.json` is neither read nor written.
3. **`commands/task.ts` + `fsd.ts`: `task done <task>` and `task archive <task>`.**
   - No `nook/` → `NOT_ROOT`.
   - **Before planning, call `recoverRuns` on the project cache**, warnings to stderr. It only touches dead runs and writes nothing when there are none.
   - Then `planTaskMove`. `error` → stderr, exit 1. `already` → stdout, exit 0, no engine. `move` → run `taskRun`.
   - Output: `done` prints `moved <t> to nook/rack`, `archive` prints `moved <t> to nook/fridge`, exit 0. `cancelled` → `EXIT_CANCELLED` (130). Any other `Stop` → exit 1 with the message. `busy` uses the same text as `commands/guards.ts`.
4. **`docs/ARQUITETURA.md`:** add `plan/task.ts` and `engine/taskRun.ts` to the layer lists.

**Why recover before planning (decision of this handoff):** an agent repeats a command after a timeout, and the timeout can kill the process. If `task done` dies between the relocate and the commit, the disk has `rack/<t>` with `status: done`, which looks coherent. Without recovering first, the repeat prints `already done` (exit 0), and the next engine run (maybe an `install` days later) undoes the journal and puts the task back in `bench`, unseen. Recovering first, the repeat sees the task back in `bench` and moves it again, which is the right result. `step` and `list` do not recover: `step` refuses a task outside `bench`, and `list` only reads.

**Files:** new `src/cli/plan/task.ts`, `src/cli/engine/taskRun.ts` (+ tests next to them, `node:test`); changed `src/cli/commands/task.ts`, `src/cli/fsd.ts`, `docs/ARQUITETURA.md`. Nothing in `core/` unless a read query is missing.

**Contracts:** messages as in What to do; new ones for Kevin to add to the SPEC 5.5 table: `task <t> failed and was undone (<phase>: <reason>)` (the core's label format) and `nook/<dir> is a symbolic link`. `already exists` in verify reuses the existing row. Exit codes: 0, 1, 130.

**Risks:**
- Undo order: `plan.md` is restored at the **origin** path, so the move must be undone first; the ordered journal guarantees it. Never restore through the destination path.
- Without `expected` an edit made by hand between verify and apply would be lost; keep it.
- The `rack` folder created by the run is removed only with `rmdir` when empty, never `rm -rf` (that is `createdDir`).
- Project with `nook/` and no `.fsd/`: the journal creates `.fsd/cache/`; at the end the disk must be as before (`cacheCreated`/`runAncestors`). Check `.fsd/` is not left behind.
- Cross-device: `EXDEV` is an ordinary failure with undo, never a copy + `rm`.

**Out of scope:** `task new/list/step` changes, registering tasks, restoring a task from `fridge` (no command), any `installed.json` write.

**Verification:** run the binary (`node_modules/.bin/tsx src/cli/fsd.ts`) in a temp dir; injected failures go in a throwaway `.mts` calling `taskRun` with failing `ops`. Compare `find nook .fsd -exec sha256sum` before/after each case.
1. `done` with an open step: exit 1 with `(run: fsd task step done <t> 01)`, disk identical.
2. Valid `done` in a project without `.fsd/`: `moved <t> to nook/rack`; `plan.md` has `status: done` and a new `updatedAt`, body bytes equal (also with CRLF and a comment on the `status` line); no `.fsd/` afterwards.
3. Repeat `done`: `already done`, exit 0, mtime unchanged. `archive` from `bench`: error with `(run: fsd task done <t>)`. Valid `archive`, then repeated: `already archived`. `done` on a `fridge` task: error with `(run: fsd task new …)`.
4. Existing destination: `mkdir nook/rack/<t>` by hand → task `invalid` ("in more than one folder"), exit 1; destination created between planning and verify (injected) → `already exists`, exit 1, no change.
5. `nook/rack` as a symlink: refused, nothing changes.
6. Injected failure: (a) in `writeText`: `plan.md` intact; (b) `rename` with `EBUSY`: in-use message, task in `bench`, `plan.md` byte-equal, the created `rack` removed; (c) after the move (failure at commit, or `cancelled` right after the relocate): the task returns whole to `bench`.
7. `plan.md` edited between verify and apply (injected): `changed while writing`, undone.
8. Death after the move: `SIGKILL` on itself right after the relocate leaves `rack/<t>` + `done`. Then `fsd task archive <t>` recovers and prints `is not in nook/rack: it is in nook/bench`; `fsd task done <t>` recovers and prints `moved`.
9. A live run (a runDir with a live pid): `another fsd run is in progress`, exit 1.
10. With `.fsd/installed.json` present its sha256 is the same before and after every case; run an `install` afterwards and check skills behave as before.

The PR reports each case with the command run and its output.
