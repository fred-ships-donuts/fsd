# Filesystem checklist

- [ ] Writes go to a temp file in the same folder, then rename (atomic).
- [ ] Locks with `O_EXCL`; a stale lock is taken over safely.
- [ ] No exists-then-open: open and handle `ENOENT`/`EEXIST`.
- [ ] `EACCES`, `EISDIR`, `ENOTDIR`, `EXDEV`, `ENOSPC` handled on purpose.
- [ ] Symlinks resolved or refused on purpose; never followed out of the tree by accident.
- [ ] CRLF and BOM kept as found.
- [ ] Dry run changes nothing.
