---
name: recording-decisions
description: Covers how to record a technical decision so nobody has to rediscover or undo it by mistake. Includes when a decision deserves a record, the short ADR format (context, options, decision, consequences), keeping one place of record that handoffs and reviews link to, superseding instead of deleting, and telling technical, product and author decisions apart. Use when choosing between real alternatives, making a hard-to-reverse choice, or correcting an earlier handoff.
---

# Recording decisions

## When

- A choice between real alternatives.
- A choice that is hard to reverse (a format, a dependency, a layer boundary).
- A rule that looks wrong to a newcomer.
- A correction of an earlier handoff or decision.

Routine choices that the code makes obvious need no record.

## Format (short ADR)

```
### <title> (<date>)
**Context:** the problem and the forces at play.
**Options:** each real alternative, one line each, with its main cost.
**Decision:** what we do.
**Consequences:** what becomes easier, what becomes harder, what is now forbidden.
```

Write for someone who arrives later and never saw the conversation: no shorthand from the thread, the why stated plainly, the date included.

## Where

- Technical decisions (yours): `docs/ARQUITETURA.md` for the standing rule, with the ADR entry in `docs/DECISIONS.md`.
- Product, scope and acceptance decisions are Kevin's (`fsd-issue decide`). Author decisions are the author's. Do not record either as yours.
- Handoffs and reviews link to the record; they do not repeat it.

## Lifecycle

Proposed → accepted → superseded. Never delete a record: mark it "superseded by <link>" and add the new one.

<!-- skill-files -->
## Files of this skill

- [`references/adr.md`](references/adr.md)
