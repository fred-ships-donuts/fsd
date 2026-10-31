# Status, evidence and verdict

The checklist only counts if each status carries proof. This guide defines what each status requires, who can
change it and how the verdict comes out. The verdict is calculated by `scripts/consolidate.py`: no agent, nor
the main thread, writes it by hand.

## The five statuses

| Status | Means | Required fields in `items.json` |
|---|---|---|
| **OK** | The criterion was met and **seen on the screen** | `evidence`: the navigation path, what was done and what appeared (measured values, exact texts). `shot` when there is a screenshot |
| **OK (code)** | Met, proven only by the code, because the screen cannot reach the state | `evidence` with `file:line`, and `reason`: what was tried to trigger the state and why it did not work |
| **N/A** | The item does not apply to the screen | `reason`: the justification from the "N/A only when" column of the checklist |
| **Fail** | The criterion was not met | `evidence`: what was observed against what was expected; `next_step`; `origin` |
| **Not verified** | It was not possible to observe | `reason`: what prevented it, after 2 to 3 attempts; `next_step`: what unblocks it |

`evidence` and `reason` texts shorter than 10 characters invalidate the consolidation. "OK" without what was
seen is not evidence.

### Origin of the failure

`origin` says where the cause is, so the pending item goes to the right person:

- `implementation`: the prototype or the PRD define the behavior and the implementation does not meet it
- `prototype`: the prototype does not have the behavior either (the failure is of design or product, and an
  implementation faithful to it still fails the checklist)
- `undefined`: it was not possible to decide. Use only after checking the prototype document and the PRD

The checklist is mandatory even when the prototype does not meet it. The origin does not forgive the failure:
it only routes it.

### OK (code)

Accepted when the state cannot be triggered legitimately: a business-rule error with no way to simulate the
response, a destructive action outside test data, a state that only exists in another environment. Before
using it, try to trigger it (route with a simulated response, delay, offline). If the state is reachable, the
status is OK or Fail, never OK (code). The auditor reopens the OK (code) items that are blocking.

### N/A

The "N/A only when" column of the [checklist](checklist.md) is the only accepted justification. "I did not
see it", "it does not seem necessary" and "the prototype does not have it" are not N/A: the first is Not
verified, the second is OK or Fail, the third is Fail with `origin: prototype`. N/A on a blocking item is
always checked by the auditor.

### Not verified

It is not an exit for effort: only for a real tool or environment limit (cross-origin iframe without DOM
access, profile without credentials, state that only the prototype editor triggers). It requires 2 to 3
recorded attempts. On a blocking item, it prevents approval.

## Verdict

Calculated over the 66 items, in order. The first that matches applies:

| Verdict | When | Exit |
|---|---|---|
| **REJECTED** | Any blocking item with **Fail** | 1 |
| **INCONCLUSIVE** | No blocking Fail, but some blocking item **Not verified** | 1 |
| **APPROVED WITH PENDING ITEMS** | No blocking adverse item; some non-blocking item with Fail or Not verified | 0 |
| **APPROVED** | No item with Fail or Not verified | 0 |

The 20 blocking items are marked **B** in the [checklist](checklist.md). A non-blocking Fail does not reject,
but enters the pending items with the same rigor, and the approval with pending items says which ones.

**Approval is of the implementation at that moment.** If the code, the environment or the profile changed
after the inspection: the approval does not hold for the new version. Re-inspection
([SKILL.md](../SKILL.md#re-inspect-mode)) redoes only the items that were not OK and those the change touches.

## The audit only worsens

The `fsd-ui-auditor` reopens a sample of the favorable statuses and returns, per item, an opinion:

| Opinion | Effect on the consolidation |
|---|---|
| `confirmed` | None: the status stays |
| `downgraded` | The status becomes **Fail** or **Not verified**, with the auditor's evidence |
| `insufficient` | The inspector's evidence does not support the status and the auditor could not prove otherwise: the status becomes **Not verified** |

The audit never promotes an item: a Fail does not become OK by opinion. For an item to improve, the
implementation changes and the item is re-inspected.

## What the report never does

- Give a grade, a percentage or "almost approved". There are counts and a verdict
- Reclassify a blocking item as non-blocking, or the reverse
- Approve with an item without a status. All 66 are required
- Count N/A, OK (code) or Not verified as OK
