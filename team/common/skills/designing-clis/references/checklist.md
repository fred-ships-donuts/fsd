# CLI checklist

- [ ] Data on stdout, diagnostics on stderr; `--json` prints only JSON.
- [ ] Exit codes from the shared table; a new code is a contract change.
- [ ] Every error says what happened and what to do next.
- [ ] Destructive actions confirm on a TTY and need a flag in CI.
- [ ] Running twice is safe (idempotent).
- [ ] No color with `NO_COLOR` or a pipe.
- [ ] A removed flag is deprecated first, with a warning.
