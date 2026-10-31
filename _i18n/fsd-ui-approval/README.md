# fsd-ui-approval — UI/UX approval against the interface checklist

Approves, or rejects, the already developed interface of a screen: checks the implementation running in a
real browser against the interface checklist (12 groups, 66 items, 20 blocking), with status and proof on
every item, and delivers the verdict and the pending items. One skill, two agents, four phases.

> **Version:** 1.0.0-alpha.1 · **License:** UNLICENSED · **Author:** Frederico Jacobi.
> The source of truth for behavior is [`SKILL.md`](SKILL.md).

## What characterizes this skill

| | |
|---|---|
| **Who and when** | the **Dev**, with the screen implemented and build, lint and tests approved, before the handoff |
| **Input** | the URL of a running instance, the screen, the profiles, the Work Item and the prototype behavior document (`fsd-extract-prototype-behavior`) |
| **Ruler** | the [interface checklist](references/checklist.md): the 66 items, all mandatory |
| **Proof** | OK is what was seen on the screen; what only the code shows is OK (code), with the reason; without proof, Not verified |
| **Verdict** | calculated by [`scripts/consolidate.py`](scripts/consolidate.py), never written by an agent |
| **Audit** | a second agent tries to knock down the favorable statuses and can only worsen them |
| **Orchestration** | the main thread resolves the scope, dispatches, runs the script and talks to the human |
| **Output** | `docs/ui-approval/<screen>/` in the frontend project: `items.json`, `audit.json`, `report.md`, `evidence/` |
| **Writes only to** | `[UI_DIR]`. Does not publish to the platform, does not change code, does not touch the prototype, does not version |

## How to use

**Approve a screen:**

```
/fsd-ui-approval approve the UI of the Base Data › Vessels screen at http://localhost:4200, profiles Administrator and Operator
```

**Re-inspect** after fixing the failures:

```
/fsd-ui-approval re-inspect the Base Data › Vessels screen
```

With `[UI_DIR]` empty, the skill starts with the inspection; with a complete `items.json` and no audit, with
the audit; with a `report.md` with failures, with the re-inspection.

## Flow

```
PREFLIGHT   screen · app · profiles · test data · source of the expected · driver
PHASE 0     Context        thread               scope · [UI_DIR] · what is already on disk
PHASE 1     Inspection     fsd-ui-inspector     items.json (66 statuses with proof) + evidence/   → Gate 1
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

It does not extract the prototype behavior (that is `fsd-extract-prototype-behavior`), does not validate build,
lint or tests, does not do functional QA, does not generate E2E, does not fix code and does not audit the
technical quality of the front-end code.
