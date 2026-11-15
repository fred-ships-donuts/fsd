---
name: debugging-root-causes
description: Covers how to find and fix the root cause of a bug instead of its symptom. Reproduce the smallest failing case, isolate by bisection, state and test hypotheses, read the whole error, find where else the same pattern lives, fix the cause and lock it with a test that failed before, and never hide failures with empty catches, sleeps or retries. Use when something fails, a test breaks, or a review reports a defect.
---

# Debugging root causes

```
Debugging:
- [ ] 1. Reproduce
- [ ] 2. Read the whole error
- [ ] 3. Isolate
- [ ] 4. Hypothesis and proof
- [ ] 5. Root cause
- [ ] 6. Fix and lock
```

**1. Reproduce.** Get a failure that happens every time, from a clean state, with the fewest steps. Write the exact commands down. No reproduction means no fix, only a guess.

**2. Read the whole error.** The message, the full stack, the exit code, and the **first** failure, not the last one. Check which version, commit and environment it ran on.

**3. Isolate.** Halve the problem until one variable is left: `git bisect` between a good and a bad commit, half of the input, half of the code path, one environment difference at a time.

**4. Hypothesis and proof.** Write what you think is wrong and what observation would prove it. Run that observation (a log line, a debugger, a minimal script). If the result contradicts you, drop the hypothesis.

**5. Root cause.** Ask why the code allowed the bad state, not only where it appeared. Then search for the same pattern elsewhere: `fsd-map grep "<pattern>"`. One cause often has several symptoms.

**6. Fix and lock.** Change the cause, then add a test that failed before the fix and passes after it (`writing-unit-tests`). Re-run the original reproduction.

## Never

- An empty `catch`, a `sleep`, a retry or a wider timeout to make a failure go away.
- Changing the test to match the bug.
- Declaring "fixed" without re-running the reproduction.

## Answering a review

A reported defect is a bug report: reproduce it, fix the cause, and reply with the commit that resolves each point. A point you believe is wrong gets evidence, not silence.
