# tmux in short

- Own socket and size: `tmux -L <name> new-session -d -x 80 -y 24`.
- Keys by name (`Enter`, `Down`, `C-c`); text with `send-keys -l`.
- Read with `capture-pane -p`; wait for a text, never a fixed sleep.
- The exit code of an interactive program comes from a file the shell writes after it ends.
- Kill only your own socket (`kill-server` on `-L <name>`).
