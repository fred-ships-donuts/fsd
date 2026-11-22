# Usual suspects

- Races between processes or timers.
- Screens captured before the program finished drawing.
- State left by an earlier run (HOME, temp files, locks).
- Listing order (`readdir`, object keys) assumed stable.
- Terminal size and environment variables.
