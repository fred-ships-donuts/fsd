# fsd-ui-approval — visual and behavioral analysis: prototype × implementation

Crosses the prototype (when there is one) with the front-end implementation of a screen, scenario by scenario,
looking at what it shows and at how it behaves, and approves or rejects the interface: checks the implementation
running in a real browser against the interface checklist (12 groups, 66 items, 20 blocking), with status and proof on
every item, and delivers the verdict and the pending items. One skill, two agents, four phases.

> **Version:** 1.0.0-alpha.2 · **License:** UNLICENSED · **Author:** Frederico Jacobi.
> The source of truth for behavior is [`SKILL.md`](SKILL.md).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | the **Dev**, with the screen implemented and the Validation of `pd-workflow` approved, before the handoff |
| **Input** | the URL of a running instance, the screen, the profiles, the Work Item and the prototype (optional) and its behavior document (`fsd-extract-prototype-behavior`) |
| **Crossing** | with a prototype: the same scenarios on both sides, side by side; each divergence is a `defect`, `intended` or `prototype-gap`. Without a prototype: no crossing |
| **Ruler** | the [interface checklist](references/checklist.md): the 66 items, all mandatory |
| **Proof** | OK is what was seen on the screen; what only the code shows is OK (code), with the reason; without proof, Not verified |
| **Verdict** | calculated by [`scripts/consolidate.py`](scripts/consolidate.py), never written by an agent |
| **Audit** | a second agent tries to knock down the favorable statuses and can only worsen them |
| **Orchestration** | the main thread resolves the scope, dispatches, runs the script and talks to the human |
| **Output** | `docs/ui-approval/<screen>/` in the frontend project: `crossing.md`, `items.json`, `audit.json`, `report.md`, `evidence/` |
| **Writes only to** | `[UI_DIR]`. Does not publish to the platform, does not change code, does not touch the prototype, does not version |

## How to use

**Approve a screen:**

```
/fsd-ui-approval approve the UI of the Base Data › Vessels screen at http://localhost:4200, profiles Administrator and Operator
```

**Cross the prototype with the implementation:**

```
/fsd-ui-approval compare the prototype with the implementation of the Base Data › Vessels screen at http://localhost:4200
```

**Re-inspect** after fixing the failures:

```
/fsd-ui-approval re-inspect the Base Data › Vessels screen
```

With `[UI_DIR]` empty, the skill starts with the inspection; with a complete `items.json` and no audit, with
the audit; with a `report.md` with failures, with the re-inspection.

## Flow

```
PREFLIGHT   screen · app · prototype · profiles · test data · source of the expected · driver
PHASE 0     Context        thread               scope · [UI_DIR] · what is already on disk
PHASE 1     Inspection     fsd-ui-inspector     crossing.md + items.json (66 statuses) + evidence/ → Gate 1
PHASE 2     Audit          fsd-ui-auditor       audit.json (confirmed · downgraded · insufficient)
PHASE 3     Consolidation  consolidate.py       report.md · verdict                               → Gate 2
```

## Verdict

| Verdict | When |
|---|---|
| **REJECTED** | any blocking item with Fail |
| **INCONCLUSIVE** | no blocking item with Fail, but some blocking item Not verified |
| **APPROVED WITH PENDING ITEMS** | no blocking adverse item; some non-blocking item with Fail or Not verified |
| **APPROVED** | no item with Fail or Not verified |

Details, and what each status requires as evidence, in
[status-and-verdict.md](references/status-and-verdict.md).

## Installation

```
fsd-ui-approval/                 → .claude/skills/fsd-ui-approval/
fsd-ui-approval/agents/*.md      → .claude/agents/        (the two agents are separate artifacts of the skill)
```

Requirements: Playwright MCP (headless and isolated) or `playwright-cli`; Python 3.

## Structure

```
fsd-ui-approval/
├── SKILL.md
├── README.md
├── agents/
│   ├── fsd-ui-inspector.md
│   └── fsd-ui-auditor.md
├── references/
│   ├── checklist.md              # the 66 items: source of the IDs, the blocking items and the criteria
│   ├── status-and-verdict.md
│   └── inspection.md
├── scripts/consolidate.py
├── templates/items.example.json
└── evals/evals.json
```

## Scope

It does not extract the prototype behavior (that is `fsd-extract-prototype-behavior`), does not critique or redesign the prototype, does not validate build
or tests, does not do functional QA, does not generate E2E, does not fix code and does not audit the
technical quality of the front-end code. Each has its own skill (`fsd-extract-prototype-behavior`,
`pd-workflow`, `pd-qa-validation`, `pd-workflow-qa`, `pd-frontend-audit-eval`).
