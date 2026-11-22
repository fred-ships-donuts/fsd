# Method

1. Reproduce: the smallest case that fails every time.
2. Read the whole error and the stack.
3. One hypothesis at a time; test it; write down what was ruled out.
4. Bisect (`git bisect`, halving the input) when the cause is not obvious.
5. Fix the cause; search for the same pattern elsewhere.
6. A test that failed before the fix and passes after.

Never: an empty catch, a sleep or a retry to hide a failure.
