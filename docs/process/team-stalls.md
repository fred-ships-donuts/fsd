# Team stalls: every way the team freezes, and the slices that fix them

Study for #124 (spike #126). Nothing here is implemented. The evidence is from 2026-11-15 (`~/.config/fsd-agents/watch.log`, agent transcripts) and from reading the code on `develop`.
Claims about Claude Code behavior that I could not check in this study are marked **(verify)**: the slice that depends on one starts by proving it.

## 1. How the team is watched today

| Piece | What it does | Cost |
|---|---|---|
| `fsd-watch --loop --fix` (`classify`, `act`, every 15 s) | reads each tmux pane and transcript; restarts, nudges, redirects author-asks, raises `alert` | 0 tokens |
| `fsd-context-guard` (hooks `PreToolUse`, `PostToolUse`, `Stop`, …) | writes per-tool "live" files for the watcher; blocks work when the context is too large | 0 |
| `fsd-redirect-hook` (`PreToolUse` on `Bash`) | a denied command is answered with the team command (`redirects.json`) | 0 |
| `fsd-wait` (the Monitor) | agents sleep on it; wakes them on a PR, a card or a notice | 0 while waiting |
| `fsd-wait deadlock` / `findDeadlocks` (#91) | DEADLOCK (cycle) and STALLED (everyone waiting, nothing moves for `stallMin`) | 0 |
| `fsd-judge` (#92) | Kevin's headless verdict on an impasse | tokens, only on an impasse |
| `fsd-cleanup --loop` | removes merged branches | 0 |

What is missing is the same in every incident: **the watcher judges the screen and the agent's own wait registry; nobody judges the team's progress, and nothing forces the agent itself to not ask.** The detectors are also blind to anything that is not a known phrase or a registered wait.

## 2. Failure modes

Columns: **Evidence** (what happened or the reproduction) · **Detect** · **Resolve** · **Tokens** (cost of the fix, at run time) · **Slice**.
Finding numbers F1–F10 are the ones in #124; M1–M11 are the extra modes it asks to cover.

### F1. The running watcher is stale
- **Evidence:** `fsd-watch --loop` started 02:40 kept the code it loaded. The #112 author-ask detection (merged ~04:54) ran only after a manual restart at 06:04 (`watch.log`: no line between 03:49 and 06:04). Node loads the file once; `team/bin/fsd-cleanup` has the same flaw. Sessions also keep the hooks and settings they loaded at start.
- **Detect:** compare the watcher's own source fingerprint (mtime of `team/bin/fsd-watch`, `fsd-lib.mjs`, `fsd-redirects.mjs`, `agents.json`, `redirects.json`) with the one taken at start, each round. For sessions: a hash of `claude-settings.json` + `redirects.json` stored in the live dir at session start, compared on each round.
- **Resolve:** the watcher and `fsd-cleanup` re-exec themselves (`process.execPath` + same args, keep the pid file) when the fingerprint changes and the file parses (`node --check`) so a half-written file cannot kill the loop. Sessions with an outdated hash restart at a safe point: idle, at the prompt, no Bash or Monitor-critical work (the same safe-point test as safe nudging, F8).
- **Tokens:** 0.
- **Slice:** S2.

### F2. Author-ask patterns miss real phrasing
- **Evidence:** none of the four real messages of 2026-11-15 ("O #115 continua parado na sua decisão…", "Continuo parado esperando você liberar o push", "Como quer seguir?", "Preciso de uma regra de permissão no Bash") matches `redirects.json → authorAsks`.
- **Detect / Resolve:** stop detecting phrasing. Make the end of a turn a checkpoint (see **D1**, the `Stop` hook): the hook sees the last assistant message and decides, at the moment the agent tries to stop. The regex in the watcher stays only as the second net for a turn that ended before the hook existed.
- **Tokens:** 0 to inspect (a regex and a few cheap rules in a hook). One extra model turn only when the hook blocks a real ask (the agent then decides and continues, which is work it had to do anyway).
- **Slice:** S3.

### F3. An armed Monitor hides a stall
- **Evidence:** `classify()` returns `esperando (Monitor)`, `act: null`, whenever the pane shows `N monitors`. Kevin, Mel and Bob re-armed 30-minute Monitors for 30 minutes while Stuart waited for a decision.
- **Detect:** a Monitor is healthy only if the agent's last message does not ask something. That is again D1 (the turn that ended with a question never reaches the armed state, because the hook sends the agent back to work). The watcher backs it up with the team progress check (F5): a long Monitor with open work and no movement is reported.
- **Resolve:** as F2 and F5.
- **Tokens:** 0.
- **Slice:** S3 (prevention), S7 (backstop).

### F4. Waiting on the author is not registered
- **Evidence:** `findDeadlocks` reads only `$FSD_STATE/waits/*`, written by `fsd-wait --waiting-for`. At 06:04 the directory was empty although Stuart had been blocked for 30 minutes. STALLED requires every waiter to be registered, so the team-wide stall was invisible.
- **Detect:** do not depend on registration. Derive "who waits for whom" from facts that cost nothing and cannot be skipped: open PRs, cards and their owner column (`fsd-stages.mjs → OWNERS`), reviews requested, and the last time anything moved. That is the progress check (F5).
- **Resolve:** a wait on "the author" is by definition not allowed; the `Stop` hook (D1) refuses it, and `fsd-wait --waiting-for author` is rejected with the team command instead (one line in `fsd-wait`, part of S3).
- **Tokens:** 0.
- **Slice:** S3, S7.

### F5. No team-level progress signal
- **Evidence:** between 05:16 and 05:46 there was open work (a PR waiting on a decision, three agents waiting on the PR) and no commit, PR, review or card move.
- **Detect:** `fsd-progress` (new, token-free, no GitHub write): last movement across `git log` of the open PR heads, `gh` events (PR updated, review, comment) and board moves; open work = any card in a column that has an owner action. It compares the quiet time with `timing.stall…Min` (new key, in `agents.json`; per CONTRIBUTING.md the config must name the field, no default hidden in code).
- **Resolve:** it names the owner of the oldest open item (`OWNERS[column]`) and sends `fsd-notify kevin "parado: #n em <coluna> há N min, dono: <agente>"`. Kevin acts through the existing paths (`fsd-notify` to the owner, `fsd-judge` on an impasse). The author is told only on the judge path (#92).
- **Tokens:** 0 to detect; Kevin's reaction costs a normal turn.
- **Slice:** S7.

### F6. Alerts never reach the author
- **Evidence:** `act === 'alert'` runs `notify-send`; `command -v notify-send` finds nothing on this WSL machine (and the container has none), so a permission prompt and a usage limit are silent (`fsd-watch`, `act`).
- **Detect:** the existing `classify` states `permissão` and `limite de uso`; the delivery is what is missing.
- **Resolve:** one `fsd-alert` helper, tried in order, first that works wins and the result is logged: (1) `powershell.exe -NoProfile -Command` toast (WSL) **(verify the toast API works from the agent's environment)**; (2) `notify-send` when present; (3) a file the author's status line reads (`$FSD_STATE/ALERT`, one line per alert, cleared by the author); (4) a comment by Kevin on a standing GitHub issue, which reaches the container and any device. Only `permissão` that a team command cannot resolve, `limite de uso` and an `ALERT` from the judge path use it. A permission prompt an agent can avoid goes to the redirect (F9) first.
- **Tokens:** 0.
- **Slice:** S5.

### F7. A QA run killed the team's tmux server (02:51)
- **Evidence:** at 02:51:11 Bob ran, in the QA terminal, `export TMUX_TMPDIR=…; unset TMUX; tmux kill-server`. The next `watch.log` lines (02:51:55) start all four sessions again: every agent lost its in-flight work.
- **Root cause (hypothesis, not proved):** the team and the tests share the default tmux server. `fsd-qa` opens the test terminal as a session of the same server (`fsd-qa` line 63: `tmux new-session -d -s <T> …`), so any command typed there that reaches the default socket kills everyone. Whether `TMUX_TMPDIR` was ignored (for example because the server's socket directory differs from the one the shell resolved) must be reproduced first.
- **Detect:** a `kill-server` aimed at the default socket, in any agent's Bash or in the QA terminal.
- **Resolve:** (1) `fsd-qa` creates its terminal on its own socket (`tmux -L fsd-qa-<agent>`, one helper in `fsd-qa`'s `tmux()` wrapper, line 19) and the watcher/`fsd-stop` close that socket instead of a session name; (2) `redirects.json` gets a rule: `tmux kill-server` (and `kill-session` of a `fsd-*` session) with no `-L`/`-S` is denied and answered with `fsd-qa clean`; (3) the team's own server gets an explicit name (`-L fsd`) as a later hardening, not in this slice, because every `tmux` call in `team/bin` and the setup would change.
- **Tokens:** 0.
- **Slice:** S4.

### F8. The nudge is unsafe for some pane states
- **Evidence:** 02:41:20 the watcher pasted text and pressed Enter in Kevin's, Mel's and Stuart's panes while they were on the first-run trust dialog (default "No, exit"). A pane whose `claude` exited and fell back to a shell would run the nudge as a shell command. It also pastes over a prompt suggestion already in the input (cleared by luck with `C-u`).
- **Detect:** before any keys: `tmux display -p -t <pane> '#{pane_current_command}'` must be the Claude process; the last lines must not match a dialog (`❯ 1.`, `Do you want`, `Press Enter to continue`, `trust`); the input line must be empty.
- **Resolve:** one `safeSend(agent, text)` in `fsd-watch` used by `nudge` and `redirect`: if the pane is a shell, `respawn-pane` (as `restart` does) instead of typing; if a dialog is up, never type, go to the dialog path (F10/F6); if the input is not empty, clear it with `C-u` first and log it. Otherwise paste and Enter.
- **Tokens:** 0.
- **Slice:** S1.

### F9. Classifier denials are not redirected
- **Evidence:** the #112 hook handles deny rules. Auto-mode classifier denials (`[Undermining Oversight]` on `git checkout` in the main folder, a commit rewrite) are not a `PreToolUse` event the hook can answer, and end in "I need a permission rule from the author".
- **Detect:** the denial text in the tool result, seen by the `PostToolUseFailure` hook (already registered in `claude-settings.json`) **(verify: that the classifier denial reaches this hook and what it carries; otherwise a `PermissionDenied`-type hook, if the installed Claude Code has one)**.
- **Resolve:** the hook matches the denied command against `redirects.json` (the same table) and returns the team command as context; for a denial with no entry, it answers "do not ask the author: tell Kevin with `fsd-notify`".
- **Tokens:** 0.
- **Slice:** S9.

### F10. First run is manual
- **Evidence:** three agents sat on "Press Enter to continue" and "Do you trust this folder" at 02:41; nobody but the author could pass them.
- **Detect:** the dialog text in the pane (and the safe nudge refusing to type, F8).
- **Resolve:** prevent it. Each agent's `CLAUDE_CONFIG_DIR` profile gets the onboarding and trust state written by setup (`hasCompletedOnboarding` and the per-project `hasTrustDialogAccepted` in the profile's `.claude.json`, for the repo and its `.claude/worktrees/*`) **(verify the exact keys with a fresh profile; they are not a public contract)**. Setup writes them idempotently and `check-paths`-style test checks they exist. Keystrokes stay only as a last resort and only for an exact known dialog.
- **Tokens:** 0.
- **Slice:** S6.

### M1. The `claude` process exits inside a live tmux session
- **Evidence:** the pane shows a shell (the F8 risk). `classify` sees no `esc to interrupt`, no Monitor, and, after `idleMin`, nudges.
- **Detect:** `#{pane_current_command}` is a shell (`bash`, `zsh`, `sh`) instead of the launcher's process.
- **Resolve:** `respawn-pane -k` with the `kick` message, which `restart` already does. The only change is the detector.
- **Tokens:** 0. **Slice:** S1.

### M2. API errors, network loss, rate and usage limits, a session stuck retrying
- **Evidence:** `limite de uso` is detected and goes to `alert` (silent, F6). Retry loops show as `working` with tokens frozen: `tokenIdle` plus `silentMin` (10 min) already restarts them.
- **Detect:** existing (`classify`). **Resolve:** a usage limit must not restart (it would burn the retry); alert once with the reset time and let the session sit. The alert path is the F6 fix. Network loss: the existing `silentMin` restart is right.
- **Tokens:** 0. **Slice:** S5 (the alert); no change to the restart rules.

### M3. Context exhaustion mid-task, compaction loops
- **Evidence:** `classify` restarts on `Context limit reached|Prompt is too long`; `fsd-context-guard` denies new Monitors above `restartAbove` and warns earlier.
- **Detect / Resolve:** covered. The one gap is a restart that returns to the same task and fills again: the kick message makes the agent re-read the worktree, which is cheap, so no change. Revisit only if `watch.log` shows two `estourou` for the same agent in one hour (then alert Kevin).
- **Tokens:** 0. **Slice:** none (monitor via S7 log).

### M4. An interactive prompt from a tool (git editor, npm confirm, ssh host key, a pager)
- **Evidence:** not seen on 2026-11-15, but the shape is a Bash tool that never returns until its timeout. `classify` waits for `timeout + toolGraceMin`, then `restart`s.
- **Detect:** already bounded by the Bash timeout. **Resolve (prevent):** the launcher (`fsd-agent`) exports `GIT_EDITOR=true`, `GIT_TERMINAL_PROMPT=0`, `GIT_PAGER=cat`, `PAGER=cat`, `npm_config_yes=true`, `CI=1` and `GIT_SSH_COMMAND='ssh -o BatchMode=yes'`, so the prompt fails fast with an error the agent can read. Check first that none of them breaks a team flow (`CI=1` changes some tools).
- **Tokens:** 0. **Slice:** S10.

### M5. A Bash command hangs past its timeout; a Monitor that never fires
- **Evidence:** Bash is bounded (M4). A Monitor with a bad condition is healthy to the watcher (F3).
- **Detect:** the progress check (F5): open work for the agent's role and no movement while its Monitor is armed. `fsd-wait` itself ends with a notice at its expiry (30 minutes), so a stuck process dies; a wrong condition does not.
- **Resolve:** S7 flags it to Kevin, who tells the agent the right command; no keystrokes.
- **Tokens:** 0. **Slice:** S7.

### M6. Two agents waiting on each other; waiting on a closed or merged PR
- **Evidence:** cycles are covered by #91 (`DEADLOCK`, then `fsd-judge`). `fsd-wait pr <n> merged|closed` exists, but `any` has no case for "the PR I wait for no longer exists".
- **Detect:** in `fsd-progress`: a registered wait whose `--pr`/`--issue` is closed or merged. **Resolve:** notify the waiter ("#n is closed: continue") and delete the wait file.
- **Tokens:** 0. **Slice:** S11.

### M7. A card stuck with no owner action
- **Evidence:** Ready for Development with Stuart idle, Changes Requested ignored. `fsd-wait any` handles the owner's own column only when the agent is waiting on it.
- **Detect:** `fsd-progress` (F5): per card, `OWNERS[column]` and the time since the last event. **Resolve:** notify the owner first; if the owner has no session, `fsd-notify kevin`.
- **Tokens:** 0. **Slice:** S7.

### M8. Lost notices (offline agent, inbox never drained)
- **Evidence:** `fsd-notify` queues for an offline agent; delivery happens at `SessionStart` (`fsd-inbox drain`) and at each `fsd-wait` round. Kevin's `any` already reports "`<agente> offline, N pending`".
- **Detect:** covered for Kevin. **Resolve:** the watcher already starts a dead session, and `SessionStart` drains. The gap is an agent that is alive but not in `fsd-wait` or a new turn (it only reads at the next hook). `fsd-progress` flags a notice older than N minutes still in the inbox (S7).
- **Tokens:** 0. **Slice:** S7.

### M9. A `PAUSE` file left by mistake; who watches the watcher
- **Evidence:** `act` and `cleanupCheck` return `PAUSE: nada`; nothing reports a PAUSE that is days old. `fsd-watch` itself is a process nobody restarts (the 02:40 and 06:04 starts were manual).
- **Detect:** `fsd-progress` reports a PAUSE older than `timing.pause…Min` to Kevin. The watcher's liveness: a heartbeat file written each round (`$FSD_STATE/watch.beat`), checked by an external supervisor.
- **Resolve:** a systemd user timer on the host (`team/setup/systemd/` already ships `fsd-memory-backup` as a pattern; `check-paths` already validates those units) and a supervisord entry in the container (the Dockerfile already supervises services). The unit runs `fsd-watch --loop --fix` and `fsd-cleanup --loop`, restart-on-failure, and the existing single-instance pid files keep two from running. Never self-lift a PAUSE: it is the author's switch.
- **Tokens:** 0. **Slice:** S8 (supervisors, heartbeat), S7 (the old-PAUSE report).

### M10. Two copies of the team on two machines with the same GitHub App identities
- **Evidence:** the container and the host share the repo through Syncthing and the same App identities; two watchers could each restart "dead" sessions the other machine owns, and two agents would answer the same card.
- **Detect / Resolve:** one owner at a time. The watcher takes a lease (`$FSD_STATE/owner` with host id and a heartbeat) and does nothing while another host's lease is fresh; it logs and alerts if both are fresh. **(verify:** whether `$FSD_STATE` is itself synced between the two; if not, the lease must live in GitHub, for example a pinned issue comment by Kevin.) 
- **Tokens:** 0. **Slice:** S12.

### M11. The machine sleeps or reboots; `/tmp` is wiped (drafts and live registry gone)
- **Evidence:** the live registry (`liveDir`) is under `/tmp`; the drafts of `fsd-arq`/`fsd-review` and the QA workspace as well. A reboot kills tmux and every session; the watcher's `start` path recreates sessions, and `kick` tells them to re-check the worktree.
- **Detect:** the supervisor from S8 starts the watcher after boot; the watcher sees "no session" for all four. **Resolve:** keep the existing `start`; add to `kick` a hint to rebuild a lost draft from the worktree and the issue; and move the drafts that matter from `/tmp` to `$FSD_STATE/drafts/`. After a wake from sleep the next `classify` round sees stale timestamps: ignore a gap in the watcher's own heartbeat longer than a round (do not read "everyone idle 3 hours" as a stall).
- **Tokens:** 0. **Slice:** S12.

## 3. Architecture choices and why

**D1. A `Stop` hook beats phrase detection for author-asks.**
Phrase detection (F2) is a regex over free text in four languages of hesitation; every miss is a 30-minute stall, and the author finds it. The `Stop` hook runs at the one moment the agent tries to end its turn, sees the whole last message instead of six pane lines, and can refuse the stop. Two parts: a cheap rule check (the last message ends with a question to a human, or contains a request such as "preciso de uma regra", "can you run", "waiting for you") and, only on a hit, `{"decision": "block", "reason": "Do not wait for the author. Decide with the team (Kevin: fsd-issue decide) or take the team command, and continue."}` **(verify the hook output contract, and that the payload carries the last message or a `transcript_path` to read it from)**. The hook must honor `stop_hook_active` so it cannot loop: after one block in a row it lets the stop through and sends `fsd-notify kevin` instead. It runs next to the existing `fsd-context-guard` `Stop` entry. The phrase list stays in `redirects.json` (one source), and the watcher keeps its detection as the second net for sessions that started before the hook shipped.
Rejected: tightening the regex (it keeps missing), and a model call per turn (tokens on every turn for a rare event).

**D2. Self re-exec beats a systemd timer for stale code; the timer is for liveness only.**
Re-exec in place keeps one process, one pid file, no unit file to install in every environment (host, container, the simulated layouts of `simulate-envs`). A timer that restarts the watcher on every change would need the same fingerprint logic, plus a unit per environment. So S2 re-execs; S8 adds the supervisor only for what re-exec cannot do: bring the process back after it died or after a reboot. The re-exec checks `node --check` and keeps the old code running if the new one does not parse.

**D3. Detect from facts (git, GitHub, board), not from what agents report.**
F4 showed a registry that depends on the agent remembering to register is empty when it matters. `fsd-progress` reads only things that move on their own. It is read-only, token-free, and its output is a line to Kevin, so it cannot create new stalls.

**D4. Alert the author through a chain, with a file as the floor.**
No single channel works everywhere (WSL has no `notify-send`; the container has no desktop). The chain ends in a file and a GitHub comment, which work on both. The author is alerted only when a human is truly required.

**D5. Prevent where the platform allows (first-run state, tool prompts, a separate tmux socket), detect only the rest.**
Every prevention is token-free and removes a class of stalls; detection stays for what cannot be prevented.

**D6. No change of the restart rules, no new restart triggers on a screen phrase.**
The existing `restart` rules (context, silent, dead session) held in every incident. All new behavior is additive and goes through `safeSend` (S1).

## 4. What this study did not prove
- The hook contract details (D1, F9) and the profile keys (F10): each slice starts with a small reproduction.
- The cause of F7. Reproduce `export TMUX_TMPDIR=…; unset TMUX; tmux kill-server` against a throwaway server first, then confirm which socket the call reached.
- M10: whether the two machines share `$FSD_STATE`.

## 5. Slices, in dependency order

Each is one PR, about 400 lines at most, and names the replay scenario (1 to 7) of #124 acceptance 3; "variant" means the same fixture and harness with the stated change (replays run in an isolated tmux socket with fixtures, `tmux -L test-…`, never the team's server: S4 is what makes that rule enforceable, so until S4 lands the replays use `FSD_DRY=1` and a private `TMUX_TMPDIR` checked with `tmux -L … display -p '#{socket_path}'`).

| # | Slice | Covers | Replay | Depends on | Size |
|---|---|---|---|---|---|
| S1 | `safeSend` in `fsd-watch`: shell/dialog/non-empty-input checks, `respawn-pane` for a shell pane; use it in `nudge` and `redirect` | F8, M1 | 5 (pane falls back to a shell) | none | S |
| S2 | Self re-exec of `fsd-watch` and `fsd-cleanup` on source change; settings-hash per session, restart at a safe point | F1 | 3 (watcher source changes) | S1 (safe point) | M |
| S3 | `Stop` hook `fsd-stop-guard` (+ `redirects.json` phrase list, `fsd-wait --waiting-for author` refused) | F2, F3, F4 | 1 (turn ends asking the author), 2 (asks, then arms a Monitor) | S2 (reaches running sessions) | M |
| S4 | tmux isolation: `fsd-qa` on its own socket, a `redirects.json` rule against a bare `tmux kill-server` | F7 | 4 (QA calls `kill-server`) | none | S |
| S5 | `fsd-alert` chain (toast, `notify-send`, `ALERT` file, Kevin's GitHub comment) wired to `act === 'alert'` | F6, M2 | 7 (permission prompt appears) | S1 | M |
| S6 | Unattended first run: write onboarding and trust state in each profile at setup; detector for a leftover dialog | F10 | 6 (first-run screen appears) | S1, S5 | S |
| S7 | `fsd-progress` (team progress, cards without owner action, stale inbox, old PAUSE) reporting to Kevin; new `timing` keys | F5, M5, M7, M8, M9 (PAUSE) | acceptance 4 (team-wide stall reported within the time, to the author only through the judge path) | none (reads only); better after S3 | M |
| S8 | Supervisors: heartbeat file, systemd user timer on the host, supervisord entry in the container | M9 | 3 (variant: the watcher process dies instead of its source changing; the supervisor brings it back) | S2 | S |
| S9 | `PostToolUseFailure` hook answers a classifier denial with the team command | F9 | 7 (variant: the permission is denied by the classifier, and the hook answers with the team command) | S3 (same hook style), the **(verify)** | S |
| S10 | Launcher environment against interactive prompts | M4 | 7 (variant: a tool prompt for input, such as the git editor, fails fast instead of waiting) | none | S |
| S11 | `fsd-progress`: waits on a closed or merged PR are released | M6 | 2 (variant: the agent waits with a Monitor on a PR that is already closed) | S7 | S |
| S12 | Two hosts: lease; `/tmp` drafts moved to `$FSD_STATE`; sleep gap ignored by the watcher | M10, M11 | 5 (variant: after a reboot every session is gone and the watcher starts them with the kick) | S8 | M |

Priority: S1, S2, S3, S4 first (they remove the incidents of 2026-11-15, in this order because each needs the previous one to be safe or to reach running sessions); then S5, S6, S7; S8 to S12 afterward. S1 and S4 have no dependency and can run in parallel.
Acceptance 5 (an alert reaches the author on WSL and in the container) is closed by S5. Acceptance 6 (`simulate-envs` passes) is a gate on every slice that touches paths or setup: S2, S6, S8, S12.
