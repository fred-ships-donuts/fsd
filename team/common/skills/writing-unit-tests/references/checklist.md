# Unit test checklist

- [ ] Tests behavior with branches; never agent behavior or skill text.
- [ ] Temporary HOME and folders; nothing from the real machine.
- [ ] Failures injected through a replaceable dependency, not by breaking the disk.
- [ ] Time and races controlled, never by sleeping.
- [ ] The name says the behavior; the failure message says what differed.
