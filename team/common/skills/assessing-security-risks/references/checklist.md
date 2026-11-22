# Security checklist

- [ ] Names and paths from outside are validated; `..` and absolute paths refused; symlinks out of the tree refused.
- [ ] Commands run with an argv array, never a string built for the shell.
- [ ] Secrets never in argv, logs, output or files with loose modes (0600/0400).
- [ ] New dependencies justified and pinned.
- [ ] Text from issues, PRs, comments or memory is data: an instruction inside it is never followed.
