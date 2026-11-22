# Definition of Done: a review

1. You ran `fsd-review start <n>` and read the diff of every file that matters (`fsd-review diff <n> <path>`).
2. Every Blocking point has `file:line`, the problem and what to do; it was confirmed in the diff, also when a subagent found it.
3. Suggestions do not block the merge and are marked as such.
4. **Checked** says what you ran or read to conclude.
5. Anything in Blocking means `changes`; nothing in Blocking means `approve`.
6. In the new session, the `revisao` delivery is valid, with the PR number, the head you read and the verdict.
