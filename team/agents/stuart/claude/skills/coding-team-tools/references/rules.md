# Rules reviews enforced on team/

- Shared logic lives in `fsd-lib.mjs`; a script does not copy it.
- Timings and limits come from `agents.json`, never hard-coded.
- `FSD_DRY=1` prints what it would do and changes nothing.
- A reader never consumes shared state (inbox, waits) that belongs to someone else.
- Paths resolve through links (`readlink -f`); scripts work from any cwd.
- New behavior for the native team only acts with `FSD_RUNNER=session`; the tmux team stays as it is.
- A new folder under `team/` goes into `team/.gitignore` (an allow list).
