---
name: driving-terminal-apps
description: Covers how to drive and observe terminal programs automatically with tmux. Includes an isolated fixed-size session, sending named keys and literal text, reading the screen, waiting for text instead of sleeping, capturing the exit code of interactive programs, sending signals, resizing mid-run, comparing TTY, pipe and file output, controlling the environment, and capturing evidence. Use when a verification needs to run or interact with a CLI or a full-screen terminal UI.
---

# Driving terminal apps

## Session

- An isolated server and a fixed size: `tmux -L qa new-session -d -s app -x 80 -y 24`.
- Start the program with its environment explicit: `tmux -L qa send-keys -t app 'HOME=$T/home fsd init; echo EXIT=$?' Enter`.
- Keep the pane after exit to read the final screen: `tmux -L qa set-option -t app remain-on-exit on`.

## Keys and text

- Named keys: `Enter`, `Escape`, `Up`, `Down`, `Left`, `Right`, `Space`, `Tab`, `BSpace`, `C-c`.
- Literal text: `send-keys -l -- "<text>"` so nothing is read as a key name.
- One step at a time: send, wait for the expected screen, check, then send the next key.

## Reading and waiting

- Screen: `tmux -L qa capture-pane -p -t app` (add `-e` to keep colors, `-S -200` for scrollback).
- Wait for text, with a deadline, instead of `sleep`: `for i in $(seq 50); do tmux -L qa capture-pane -p -t app | grep -q 'step 2 of' && break; sleep 0.1; done`.
- Capture only after the screen settles: two identical captures in a row.

## Exit codes

- For a command, append `; echo EXIT=$?`.
- For a full-screen app, the code is printed after the app closes. Read it from the line after it exits, not from the screen while it runs.

## Signals and size

- Ctrl+C: `send-keys C-c` (expect 130). Kill: `kill -TERM <pid>` or `-9` for a crash.
- Resize mid-run: `tmux -L qa resize-window -t app -x 60 -y 15`; check that the layout redraws and nothing is cut.

## TTY versus pipe

Run the same command three ways and compare: in the pane (TTY), piped (`| cat`), and redirected to a file. Color, prompts and progress must disappear when not a TTY. Check with `NO_COLOR=1` and `CI=1` too.

## Evidence and cleanup

Save the final capture, the exit code and the file tree. Kill the server at the end: `tmux -L qa kill-server`.
