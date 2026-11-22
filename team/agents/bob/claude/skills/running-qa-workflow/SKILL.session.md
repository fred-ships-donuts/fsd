---
name: running-qa-workflow
description: Runs the closed QA script on an fsd PR in the native team session. Prepares the test terminal, runs every acceptance item exactly as written, repeats each failure from scratch, records verdicts, files out-of-scope bugs, and publishes the report that approves or requests changes. Use when a PR is waiting for QA or someone asks for a verification.
---

# QA verification: closed script

Copy the commands. Do not improvise. When in doubt, the item is FAIL.

Every PR that closes an issue goes through this script, including one that only changes documentation. There is no other way to approve. The PR code runs as another user (`fsd-run`), with a clean environment, and each item's exit comes from a file, not from the screen.

1. `fsd-qa prep <N>` → shows the numbered acceptance items (1, 2, 3…) and opens the test terminal.
   - `JÁ VERIFICADO` → go to step 6. Do not look for another way to verify again. The only exception is `FSD_QA_REDO=<N> fsd-qa prep <N>`, and only when the author writes `FSD_QA_REDO` on the PR (team.md, "Impasse total").
   - `BUILD FALHOU` → `fsd-qa finish --entrega <file.json>` (the `qa` contract with verdict `fail`) and go to step 6.
   - Any other message → do what it says.
2. For **each** item k: `fsd-qa run <k> "<command of item k>"` → shows the output and `EXIT=n`. To reach the state an item needs (installed, outdated, missing, a forced failure), use the skill `testing-cli`; to drive a screen, `driving-terminal-apps`.
   - Never write `echo $?`, even when the acceptance asks for it: `EXIT=n` already is the `$?` of the command. On an interactive screen it appears in the `fsd-qa key` that closes it. `fsd-qa` refuses a command with `$?`.
   - A command with quotes, `$`, `&&`, `|`, a redirect or several lines: write it to a file with Write (e.g. `/tmp/item<k>.sh`), then `fsd-qa run <k> --file /tmp/item<k>.sh`. No heredoc: `fsd-qa` runs outside the Bash sandbox, so the guard accepts it only alone on the line: never chain it with another command.
   - An item with more than one command: repeat `fsd-qa run <k> …` with the same k.
   - After an interactive screen you may go on to the next `run`: it closes the previous one by itself.
   - `TELA INTERATIVA` → `fsd-qa key Down`, `fsd-qa key Enter`, `fsd-qa key Escape`… until the result. Literal text: `fsd-qa key --text "<text>"`.
   - An item with no command ("the screen shows X") → `fsd-qa run <k> "fsd"` and check the screen.
   - A documentation item ("file X describes Y") → `fsd-qa run <k> "grep -n '<term>' <file>"` or `fsd-qa run <k> "sed -n 'A,Bp' <file>"` and check the text. It can be run: it is not a FAIL for "cannot run".
   - Do not check the donut art or the header.
3. PASS only if the output and the exit code are exactly those of the acceptance.
   - Failed: `fsd-qa verdict <k> FAIL "<what was expected>"`. The first FAIL of an item is kept but does not count yet: `fsd-qa` asks you to repeat the item **from scratch** (with its setup). Repeat and mark it again. If it fails again, the FAIL is confirmed. If it passes, mark PASS, and the report shows the result flipped (skill `investigating-flaky-results`).
   - An item that cannot be run or is ambiguous: `fsd-qa verdict <k> FAIL "<reason>"` and `fsd-duvida fluxo "item <k> of PR <N>: <question>" --ref #<N>`.
   - At the end, the ones that passed with `EXIT=0`: `fsd-qa verdict --all-pass` (it lists the ones you did not mark; decide each with `verdict <k>`).
4. A bug that is **not** in this PR's acceptance: `fsd-qa bug "<what fails>" "<what was expected>" <k>` (does not block the PR; write it with the skill `reporting-bugs`).
   - **Mandatory, on every PR:** run the PR's `team/setup/simulate-envs` as an item: `fsd-qa run <k> "../pr/team/setup/simulate-envs"` (it runs as `fsd-run`, in the PR copy). It spends no tokens and touches no real state. Copy its last line (`== total: N PASS, M FAIL`) into the QA comment. The card advances only with **zero FAIL**: with any FAIL, mark the item that covers it FAIL (step 3) or request changes. Do not reject a PR for red CI: GitHub already blocks those.
5. Write the delivery: `fsd-entrega modelo qa > /tmp/q.json`, then fill it (each acceptance item with its command, exit and result; the evidence; the Definition of Done all `true`). `fsd-qa finish --entrega /tmp/q.json` → publishes the report (approve if everything is PASS, otherwise request-changes), moves the card, notifies and cleans up. If it says `itens sem veredito`, run those items (step 2) or mark FAIL with the reason (step 3) and repeat.
6. Optional, after `finish`: a time-boxed exploratory session (skill `running-exploratory-tests`). What it finds becomes bugs and never changes the verdict.
7. End the turn. The next PR to verify comes as a new turn.

<!-- skill-files -->
## Files of this skill

- [`references/definition-of-done.md`](references/definition-of-done.md)
- [`templates/qa.json`](templates/qa.json)
- [`scripts/qa-verdict.mjs`](scripts/qa-verdict.mjs)
