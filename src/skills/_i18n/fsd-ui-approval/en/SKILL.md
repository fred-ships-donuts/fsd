---
name: fsd-ui-approval
description: >
  **WORKFLOW SKILL** — Approves, or rejects, the **already developed** UI/UX of a screen, component or flow,
  checking the implementation running in a real browser against the interface checklist: 12 groups, 66 items,
  20 blocking, all mandatory, each with a status and proof (OK, OK (code), N/A, Fail, Not verified). The
  ruler is the checklist and the source of the expected is the Work Item and the prototype behavior document
  (`fsd-extract-prototype-behavior`). One skill, two agents, four phases: preflight and context in the
  main thread; `fsd-ui-inspector` inspects the screen and writes the statuses with evidence;
  `fsd-ui-auditor` tries to knock down the favorable statuses, and can only worsen them;
  `scripts/consolidate.py` validates the evidence, calculates the verdict (approved, approved with pending
  items, inconclusive, rejected) and writes the report. The verdict comes from the script, never from an
  agent's judgment. It does not fix code, does not publish anything, does not version on its own initiative.
  USE FOR: approving the UI/UX of a delivered screen; closing the screen development with the interface
  check; re-inspecting after fixing the failures; checking the implementation against the prototype and the
  interface checklist.
  DO NOT USE FOR: extracting the prototype behavior (that is `fsd-extract-prototype-behavior`);
  build, lint and tests; functional QA per persona; E2E automation; fixing the failures; front-end code
  quality review; designing or critiquing the prototype.
  Triggers: "approve the ui", "approve the ux", "interface approval", "interface checklist", "check the
  screen against the checklist", "re-inspect the screen", "ui approval", "approve ui", "review ui against
  checklist".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-ui-approval — UI/UX approval against the interface checklist

One skill, two agents, four phases. The screen goes in; out come the 66 items with status and proof, the
verdict and the pending items with next step.

**It belongs to the Dev, and closes the screen.** It comes after the implementation and after build, lint and tests pass,
before the handoff. The question is: **does the delivered interface meet the checklist, on all
66 items, with proof?** It is not "does the code match the spec" (build and tests) nor "can a persona use it"
(functional QA): it is the systematic check of states, forms, feedback, navigation, tables,
responsiveness, consistency, accessibility, motion, microcopy and flow.

## Rules

1. **The checklist is the ruler, and it is whole.** The 66 items receive a status in every approval
   ([checklist.md](references/checklist.md)). An item without a status invalidates the consolidation. Do not
   cut an item because it "does not seem relevant": the only way out is N/A with the justification from the
   "N/A only when" column

2. **A status without proof does not count.** OK is what was **seen on the screen**, with the path and the
   measured values. What only the code shows is OK (code), with the reason. Without evidence, it is Not
   verified, never a guess ([status-and-verdict.md](references/status-and-verdict.md))

3. **The verdict comes from the script.** `scripts/consolidate.py` calculates: a blocking item with Fail
   rejects; a blocking item Not verified leaves the consolidation inconclusive. Neither the main thread nor an
   agent writes or softens the verdict, and none reclassifies a blocking item

4. **The audit only worsens.** The `fsd-ui-auditor` can downgrade a favorable status; nothing promotes a
   status. For an item to improve, the implementation changes and the item is re-inspected

5. **The main thread orchestrates.** Inspecting and auditing in the browser belong to the subagents. You
   resolve the scope, dispatch, check the report, run the script and talk to the human. Opening the browser
   "just to check" blows up the context and contaminates the independence of the audit

6. **The source is on disk, not in the briefing.** The briefing passes **paths**, not pasted content. Each
   phase writes to `[UI_DIR]` and the next one reads from there

7. **A subagent that stopped, or a report without a mandatory section, is a blocker:** take to the human what
   it reported and stop. Do not re-dispatch the same briefing. If it stopped for an input only the human has,
   the answer goes into the briefing and you re-dispatch **once**

8. **Ask in a block, and last.** First: do the Work Item, `PROJECT.md` and the prototype document already
   answer? Only then ask, everything in one message

9. **Nothing goes outside.** The skill writes only to `[UI_DIR]`. It does not publish to the platform, does
   not change application code, does not touch the prototype (`CLAUDE_DESIGN_READONLY`) and does not version
   on its own initiative (`AI_GIT_POLICY`)

10. **An empty finding is a legitimate result.** A screen without failures is a good screen. Never ask for a
    number of failures

## The pipeline

```
   ┌──────────────────────────────────────────────────────────────────┐
   │ PREFLIGHT · screen, app, profiles, test data, source, driver     │
   └────────────────────────────────┬─────────────────────────────────┘
                                    ▼
   PHASE 0  CONTEXT        main thread        → closed scope · [UI_DIR] · what is already on disk
   PHASE 1  INSPECTION     fsd-ui-inspector   → items.json (66 statuses with proof) + evidence/
            GATE 1         coverage: 66/66 · Not verified and N/A on blocking items taken to the human
   PHASE 2  AUDIT          fsd-ui-auditor     → audit.json (confirmed · downgraded · insufficient)
   PHASE 3  CONSOLIDATION  scripts/consolidate.py → report.md · verdict
            ⛔ GATE 2      human receives the verdict and the pending items
```

**One browser, one session at a time.** Inspector and auditor run **in sequence**, and the auditor only after
`items.json` exists complete. One screen, one `fsd-ui-inspector`; a large screen splits by groups (`groups`
`1-6` and then `7-12`), each half in a subagent, in sequence.

## Project Structure

```
[UI_DIR]/                            # docs/ui-approval/<screen>/ in the frontend project
├── items.json                       # Phase 1 — meta + the 66 items (may come in parts: items-g1-6.json…)
├── audit.json                       # Phase 2
├── report.md                        # Phase 3 — generated by the script
└── evidence/<id>-<slug>.png         # Phase 1 and 2
```

The `docs/ui-approval/` folder lives in the frontend project, next to `docs/prototype-behavior/`. Create
`[UI_DIR]` if it does not exist. `report.md` is a status report: it describes what was observed in that
inspection. This skill and the checklist, which are reference documentation, describe only the current state.

## Prerequisites — probes at the start of the session

**1. The two agents.** `fsd-ui-inspector` and `fsd-ui-auditor`. If either is missing, **block** and say how to
install: copy `agents/*.md` of this skill to `.claude/agents/` of the project (or of the user). Installing
the skill does not install the agents. Without them, inspecting in the main thread blows up the context and
the audit stops being independent

**2. A browser driver** for Phase 1 and Phase 2 ([inspection.md](references/inspection.md#browser-driver)):
Playwright MCP (`browser_*`), `playwright-cli` as a fallback. Neither: stop and say how to configure

**3. Python 3** for `scripts/consolidate.py` (standard library only)

## Preflight — before dispatching any phase

Gather, and ask **in a block** only for what is missing:

| Input | What it is | If missing |
|---|---|---|
| **Screen** | screen, component or flow, and the navigation path to it | ask |
| **App** | URL of an instance that is **already running**. The skill does not start it | ask |
| **Profiles** | the profiles to inspect and **where** each one's credential is (environment variable), never the value | a single profile only if the system has one; otherwise ask |
| **Test data** | the data that may be saved and deleted in the inspection, or `none` | `none`: actions that save or delete are read from the code |
| **Source of the expected** | Work Item (PRD, seam), `docs/prototype-behavior/<screen>.md`, prototype link | without a prototype document and with a prototype in the Work Item, ask for the extraction; item 8.4 depends on it |
| **Excluded scope** | what the user removed from the approval (for example, 404) | none |
| **Database** | does the application query a database? If so, `SQL_AUTORIZACAO_CODIGO` applies: confirm that the instance is the one authorized by the user | ask before opening the screen |

## Workflow

0. **Preflight** (above).
1. **Phase 0 — Context** ([inspection.md](references/inspection.md)): close the scope; resolve `[UI_DIR]`; read
   the listing of what already exists in it. Complete `items.json` and no `audit.json` ⇒ start from Phase 2;
   existing `report.md` with failures ⇒ [re-inspect](#re-inspect-mode) mode. Nothing on disk ⇒ Phase 1.
2. **Phase 1 — Inspection**: dispatch the `fsd-ui-inspector` with the briefing below. It inspects the 66 items
   (or the requested `groups`), writes `items.json` and the screenshots, and validates its own file with
   `consolidate.py --partial`. **Gate 1:** check the coverage in the report (66 of 66), and take to the human,
   in a block, the blocking N/A and Not verified items whose cause the human resolves (credential, test data,
   environment). Offer to run again only those items.
3. **Phase 2 — Audit**: dispatch the `fsd-ui-auditor` with the complete `items.json`. It reopens the favorable
   blocking items and a sample of the others and writes `audit.json`.
4. **Phase 3 — Consolidation**: run the script (below). Present the verdict and the pending items at **Gate
   2**.

```bash
python <skill>/scripts/consolidate.py --items <UI_DIR>/items.json [<UI_DIR>/other.json …] \
    --audit <UI_DIR>/audit.json --out <UI_DIR>/report.md
```

Exit `0` ⇒ approved (with or without pending items). Exit `1` ⇒ rejected or inconclusive. Exit `2` ⇒ invalid
input: the error JSON lists each item. Return to the `fsd-ui-inspector` **once** with the list of errors; if
it persists, it is a blocker (Rule 7).

At the end of **each** phase, announce:

```
✓ Phase X completed — <name>
  Artifacts: <paths in [UI_DIR]>
  <count line>
  Gate X: OPEN | BLOCKED (<reason>)
  → Next: Phase Y — <name>  |  WAITING FOR YOU: <what is missing>
```

| Phase | Count line |
|---|---|
| 0 | `Screen: … · profiles X · source of the expected: PRD yes/no · prototype doc yes/no · app: <URL> · on disk: <what>` |
| 1 | `Items X/66 · OK X · OK (code) X · N/A X · Fail X · Not verified X · adverse blocking X` |
| 2 | `Audited X · confirmed X · downgraded X · insufficient X` |
| 3 | `Verdict: … · blocking with Fail X · blocking Not verified X · non-blocking pending items X` |

## Subagents

| Subagent | When | Receives | Returns |
|---|---|---|---|
| `fsd-ui-inspector` | Phase 1, one per screen (or per half of groups), in sequence | `ui_dir`, `screen`, `app`, `driver`, `profiles` (profile → where the credential is), `test_data`, `sources` (paths: Work Item, prototype document), `excluded`, `groups` (optional), `items` (optional, IDs only, in re-inspection), `references`, `template` | `items.json` and screenshots written + count per status, adverse blocking items, questions for the human |
| `fsd-ui-auditor` | Phase 2, only one | `ui_dir`, `items` (path of the complete `items.json`), `app`, `driver`, `profiles`, `test_data`, `references` | `audit.json` written + count per opinion and the list of downgraded items |

The subagents read the references **from the installed skill**: the briefing passes the paths of
`references/checklist.md`, `references/status-and-verdict.md` and `references/inspection.md`. No agent writes
the verdict, runs `git` or publishes to the platform.

### `fsd-ui-inspector` briefing

```
ui_dir: docs/ui-approval/<screen>/
screen: <name and navigation path>
app: <URL>
driver: mcp | cli
profiles: <profile → environment variable>
test_data: <released test data | none>
sources: <path of the PRD/seam> · <docs/prototype-behavior/<screen>.md | absent>
excluded: <what the user removed from the scope | none>
groups: 1-12
references: <skill>/references/checklist.md · status-and-verdict.md · inspection.md
template: <skill>/templates/items.example.json
```

## Re-inspect mode

After the Dev fixed the failures, or when the code changed. Re-inspect **the items that were not OK**
(Fail, Not verified, OK (code)) **plus the items the change touches** (ask the human or read the diff).
Dispatch the `fsd-ui-inspector` with `items: [IDs]`: it writes an `items-reinspection-NN.json` with only
those. The consolidation merges the files, and the last wins by `id`:

```bash
python <skill>/scripts/consolidate.py --items <UI_DIR>/items.json <UI_DIR>/items-reinspection-01.json \
    --out <UI_DIR>/report.md
```

Run the auditor again on the re-inspected items that ended up favorable. A big change (screen redone) ⇒ full
inspection, not re-inspection.

## Knowledge Verification Chain

In strict order: **1.** The Work Item (PRD, seam) · **2.** The prototype behavior document ·
**3.** The real screen, with evidence · **4.** The checklist · **5.** _"I am not sure about X — please check"_.

Behavior that the checklist requires and no source defines is **Fail with `origin: prototype`**, never
approval.

## Context Loading

| Phase | Load | Unload |
|---|---|---|
| Preflight | the listing of `[UI_DIR]` | — |
| Phase 1 | the `fsd-ui-inspector` report | `items.json` and the screenshots |
| Phase 2 | the `fsd-ui-auditor` report | `audit.json` |
| Phase 3 | the script's JSON output and the pending items | the raw `report.md` |

**You print, you do not read:** what a subagent wrote in `[UI_DIR]` does not come back into your context. Its
report and the script output are enough for the gate.

## Commands

| Trigger | Reference |
|---|---|
| The checklist | [checklist.md](references/checklist.md) |
| Status & verdict | [status-and-verdict.md](references/status-and-verdict.md) |
| How to inspect | [inspection.md](references/inspection.md) |
| Consolidate and compute the verdict | [consolidate.py](scripts/consolidate.py) |
| Items format | [items.example.json](templates/items.example.json) |

## Skill Integrations

- **`fsd-extract-prototype-behavior`** — comes before: produces `docs/prototype-behavior/<screen>.md`,
  the source of the expected for items 8.2 to 8.4 and 12.1. This skill does not extract, it only checks

## Out of scope

- **Build, lint and tests**: not validated here; they come before this skill. The blocking pending items go back
  to the Dev as fix tasks, and re-inspection belongs to this skill.
- **Functional QA**: not covered. This skill checks the interface against the checklist; functional QA checks
  whether the person can use the feature.
- **E2E automation**: not generated here.
- **Front-end code**: its technical quality is not audited here. This skill audits the interface in execution.

## Output Behavior

Conversational, not robotic. Interact in the language the user is writing in (detect it from the user's messages; do not ask). Reports and generated documents stay in English. At any moment the human needs to know how far the approval
has gone and what is missing. When closing, say: the verdict, the counts, the blocking pending items with the
next step, where `report.md` is, and that **nothing was committed or published**. Rejected or inconclusive:
the next step is to fix or unblock the item, and then re-inspect.
