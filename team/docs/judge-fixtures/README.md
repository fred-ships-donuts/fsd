# fsd-judge fixtures (#92)

Canned judge answers for a dry run, with no `claude` session. Run as Kevin. `FSD_JUDGE_STATE` moves only `judge.lock` and `judged/` to a temp dir; `FSD_STATE` stays the real one (the `gh` wrapper reads its credentials from there):

```
FSD_AGENT=kevin FSD_DRY=1 FSD_JUDGE_STATE=$(mktemp -d) FSD_JUDGE_FIXTURE=team/docs/judge-fixtures/<file> team/bin/fsd-judge <n>
```

| File | Acceptance | Expected |
|---|---|---|
| `high.json` | 1, 3 | verdict JSON on line 1, `Decision (judge, …)` comment, `continue`/`wait` notices |
| `low.json` | 4 | `author decision needed (low confidence)` |
| `overrides-author.json` | 4 | `author decision needed (overrides an author decision)` |
| `owner-author.json` | 4 | `author decision needed (reserved matter)` |
| `reserved-flag.json` | 4 | `author decision needed (reserved matter)` |
| `reserved-39.json` | 4 | `author decision needed (reserved matter)` (text mentions #39) |
| `reserved-main-word.json` | 4 | `author decision needed (reserved matter)` (text says `main`) |
| `not-json.txt` | 6 | `author decision needed (invalid JSON)` |
| `missing-confidence.json` | 6 | `author decision needed (invalid JSON)` |

Item 6 also covers a missing fixture file (`judge error`); use a path that does not exist.
Nothing is applied in any case, and no `judged/<n>.json` is written under `FSD_DRY=1`.
Acceptance 2 and 5 use the same temp dir: put `{"ref":"#91","pid":<live pid>,"since":"…"}` in `$FSD_JUDGE_STATE/judge.lock` (lock held), or an empty `judged/<n>.json` (second deadlock).
