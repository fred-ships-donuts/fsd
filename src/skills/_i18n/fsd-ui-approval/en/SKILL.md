---
name: fsd-ui-approval
description: >
  Visual and behavioral UI/UX analysis of an already developed screen. Crosses the prototype (mock data, when
  there is one) with the front-end implementation running against the real API, scenario by scenario,
  registers every divergence, and approves or rejects the interface against a 66-item checklist (20 blocking),
  with a status and proof per item. The verdict comes from a script, never from an agent's judgment. Use to
  approve the UI/UX of a delivered screen, compare prototype vs implementation, run a visual or behavioral
  analysis, or re-inspect after fixes. Not for extracting prototype behavior (fsd-extract-prototype-behavior),
  build/lint/tests, functional QA, E2E automation, fixing code or reviewing code quality. Triggers: "approve
  the ui", "ui approval", "interface checklist", "prototype vs implementation", "visual analysis of the
  screen", "behavioral analysis", "re-inspect the screen".
compatibility: Requires a running app and its real API, Playwright MCP or playwright-cli, and Python 3. Two companion agents (agents/*.md) must be installed in .claude/agents/.
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.2"
---

# fsd-ui-approval — visual and behavioral analysis: prototype × implementation

One skill, two agents, four phases. The screen goes in; out come the divergences between prototype and
implementation, the 66 checklist items with status and proof, the verdict and the pending items with next step.

**The analysis is visual and behavioral, and it is a crossing.** Visual: what the screen shows (structure,
layout, spacing, typography, color, icons, texts). Behavioral: what it does when someone interacts (states,
feedback, transitions, keyboard, navigation, profiles, errors). The prototype, when it exists, and the
implementation go through **the same scenarios** and are put side by side; each difference is a divergence,
classified as a defect, an intended deviation (the PRD or the seam determines it) or a gap in the prototype.
Without a prototype, there is no crossing: the implementation is analyzed against the Work Item and the checklist.

**It belongs to the Dev, and closes the screen.** It comes after the implementation and after the Validation of `pd-workflow`,
before the handoff. The question is: **does the delivered interface meet the checklist, on all
66 items, with proof?** It is not "does the code match the spec" (Validation) nor "can a persona use it"
(`pd-qa-validation`): it is the systematic check of states, forms, feedback, navigation, tables,
responsiveness, consistency, accessibility, motion, microcopy and flow, **and of fidelity to the prototype**.

## Rules

0. **The API is real, and this is what makes the validation count.** The application is exercised against the
   **real API, running**. No response is simulated, intercepted, aborted or faked, and no mock server stands in
   for it. States are provoked through the real application: real filters, real invalid input, real sessions,
   real data on `test_data`. Offline, network throttling, media, viewport and locale are allowed, because they
   leave the traffic untouched. With the API down, the validation does not start. A state the real API cannot
   produce is OK (code) with the reason, or Not verified, never a mocked OK

1. **Cross, do not compare from memory.** With a prototype, both sides are observed **in the same scenario**,
   at the same width and state, and each divergence is registered with the evidence of both sides. A divergence
   is classified as `defect` (the implementation departs from the prototype with no reason), `intended` (the
   PRD or the seam determines it: noted, not Fail) or `prototype-gap` (the prototype does not define it: falls
   back to the checklist). The prototype runs on mock data and the implementation on real data from the real API: a difference in the content of the data (names, numbers, dates, counts) is never a divergence; what the data shapes (structure, format, states, behavior) is. Visual differences count as much as behavioral ones. Without a prototype, record
   `prototype: none`: nothing is crossed, and the scenario matrix runs on the implementation alone

2. **The checklist is the ruler, and it is whole.** The 66 items receive a status in every approval
   ([checklist.md](references/checklist.md)). An item without a status invalidates the consolidation. Do not
   cut an item because it "does not seem relevant": the only way out is N/A with the justification from the
   "N/A only when" column

3. **A status without proof does not count.** OK is what was **seen on the screen**, with the path and the
   measured values. What only the code shows is OK (code), with the reason. Without evidence, it is Not
   verified, never a guess ([status-and-verdict.md](references/status-and-verdict.md))

4. **The verdict comes from the script.** `scripts/consolidate.py` calculates: a blocking item with Fail
   rejects; a blocking item Not verified leaves the consolidation inconclusive. Neither the main thread nor an
   agent writes or softens the verdict, and none reclassifies a blocking item

5. **The audit only worsens.** The `fsd-ui-auditor` can downgrade a favorable status; nothing promotes a
   status. For an item to improve, the implementation changes and the item is re-inspected

6. **The main thread orchestrates.** Inspecting and auditing in the browser belong to the subagents. You
   resolve the scope, dispatch, check the report, run the script and talk to the human. Opening the browser
   "just to check" blows up the context and contaminates the independence of the audit

7. **The source is on disk, not in the briefing.** The briefing passes **paths**, not pasted content. Each
   phase writes to `[UI_DIR]` and the next one reads from there

8. **A subagent that stopped, or a report without a mandatory section, is a blocker:** take to the human what
   it reported and stop. Do not re-dispatch the same briefing. If it stopped for an input only the human has,
   the answer goes into the briefing and you re-dispatch **once**

9. **Ask in a block, and last.** First: do the Work Item and the prototype document already
   answer? Only then ask, everything in one message

10. **Nothing goes outside.** The skill writes only to `[UI_DIR]`. It does not publish to the platform, does
   not change application code, does not touch the prototype and does not version
   on its own initiative

11. **An empty finding is a legitimate result.** A screen without failures is a good screen. Never ask for a
    number of failures

## The pipeline

```
   ┌──────────────────────────────────────────────────────────────────┐
   │ PREFLIGHT · screen, app, API, prototype, profiles, test data, driver │
   └────────────────────────────────┬─────────────────────────────────┘
                                    ▼
   PHASE 0  CONTEXT        main thread        → closed scope · [UI_DIR] · what is already on disk
   PHASE 1  INSPECTION     fsd-ui-inspector   → crossing.md (scenarios · divergences) + items.json (66 statuses
                                                with proof) + evidence/ (prototype × implementation)
            GATE 1         coverage: 66/66 · scenarios crossed · Not verified and N/A on blocking items
                           taken to the human
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
├── crossing.md                      # Phase 1 — scenario matrix and, with a prototype, the crossing and divergence register
├── items.json                       # Phase 1 — meta + the 66 items (may come in parts: items-g1-6.json…)
├── audit.json                       # Phase 2
├── report.md                        # Phase 3 — generated by the script
└── evidence/<id>-<slug>.png         # Phase 1 and 2; crossing: <scenario>-prototype.png / <scenario>-implementation.png
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

Gather, and ask **in a block** only for what is missing. The **data confirmation** below is mandatory: it is
always asked, never assumed, and nothing starts without an explicit yes.

| Input | What it is | If missing |
|---|---|---|
| **Data confirmation (mandatory)** | the user confirms, explicitly, that **(1)** the implementation is validated against the **real API, running, with real data**, and that **(2)** the prototype, if any, runs on **mock data**. Ask: _"The implementation will be validated against the real API with real data, and the prototype runs on mock data. Confirm?"_ | **always ask**, even if everything else is known. Without an explicit yes, or if the answer contradicts either point, dispatch nothing: no phase starts |
| **Screen** | screen, component or flow, and the navigation path to it | ask |
| **App** | URL of an instance that is **already running**. The skill does not start it | ask |
| **API** | URL of the **real API** the app talks to, already running and reachable. **Nothing is simulated.** The skill does not start it | ask; with the API down or unreachable, stop: nothing can be validated |
| **Profiles** | the profiles to inspect and **where** each one's credential is (environment variable), never the value | a single profile only if the system has one; otherwise ask |
| **Test data** | the data that may be saved and deleted in the inspection, or `none` | `none`: actions that save or delete are read from the code |
| **Prototype** | link or file of the navigable prototype, and the entry point to the screen. **Optional**: without it, there is no crossing | has a prototype in the Work Item: ask for the link. None exists: record `prototype: none` and go on |
| **Source of the expected** | Work Item (PRD, seam), `docs/prototype-behavior/<screen>.md` | with a prototype and without the document, the visual crossing proceeds; the behavioral crossing asks for the extraction (`fsd-extract-prototype-behavior`) |
| **Excluded scope** | what the user removed from the approval (for example, 404) | none |

## Workflow

0. **Preflight** (above).
1. **Phase 0 — Context** ([inspection.md](references/inspection.md)): close the scope; resolve `[UI_DIR]`; read
   the listing of what already exists in it. Complete `items.json` and no `audit.json` ⇒ start from Phase 2;
   existing `report.md` with failures ⇒ [re-inspect](#re-inspect-mode) mode. Nothing on disk ⇒ Phase 1.
2. **Phase 1 — Inspection**: dispatch the `fsd-ui-inspector` with the briefing below. It builds the scenario
   matrix ([inspection.md](references/inspection.md#crossing-prototype--implementation)), crosses prototype and
   implementation scenario by scenario, writes `crossing.md`, goes through the 66 items (or the requested
   `groups`), writes `items.json` and the screenshots, and validates its own file with
   `consolidate.py --partial`. Every `defect` divergence becomes a Fail on the checklist item it breaks (8.4
   and the specific one). **Gate 1:** check the coverage in the report (66 of 66 and the scenarios crossed),
   and take to the human,
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
it persists, it is a blocker (Rule 8).

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
| 0 | `Data confirmed: yes · Screen: … · profiles X · source of the expected: PRD yes/no · prototype doc yes/no · app: <URL> · on disk: <what>` |
| 1 | `Scenarios crossed X/Y · divergences: defect X · intended X · prototype-gap X · Items X/66 · OK X · OK (code) X · N/A X · Fail X · Not verified X · adverse blocking X` |
| 2 | `Audited X · confirmed X · downgraded X · insufficient X` |
| 3 | `Verdict: … · blocking with Fail X · blocking Not verified X · non-blocking pending items X` |

## Subagents

| Subagent | When | Receives | Returns |
|---|---|---|---|
| `fsd-ui-inspector` | Phase 1, one per screen (or per half of groups), in sequence | `ui_dir`, `screen`, `app`, `driver`, `profiles` (profile → where the credential is), `test_data`, `api`, `sources` (paths: Work Item, prototype document), `prototype` (link or file, or `none`), `excluded`, `groups` (optional), `items` (optional, IDs only, in re-inspection), `references`, `template` | `crossing.md`, `items.json` and screenshots written + scenarios crossed, divergences per class, count per status, adverse blocking items, questions for the human |
| `fsd-ui-auditor` | Phase 2, only one | `ui_dir`, `items` (path of the complete `items.json`), `app`, `api`, `prototype`, `driver`, `profiles`, `test_data`, `references` | `audit.json` written + count per opinion and the list of downgraded items |

The subagents read the references **from the installed skill**: the briefing passes the paths of
`references/checklist.md`, `references/status-and-verdict.md` and `references/inspection.md`. No agent writes
the verdict, runs `git` or publishes to the platform.

### `fsd-ui-inspector` briefing

```
ui_dir: docs/ui-approval/<screen>/
screen: <name and navigation path>
app: <URL>
api: <URL of the real API>
driver: mcp | cli
profiles: <profile → environment variable>
test_data: <released test data | none>
sources: <path of the PRD/seam> · <docs/prototype-behavior/<screen>.md | absent>
prototype: <link or file of the navigable prototype + entry point | none>
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
**3.** The prototype observed, read-only, in the same scenario · **4.** The real screen, with evidence ·
**5.** The checklist · **6.** _"I am not sure about X — please check"_.

Behavior that the checklist requires and no source defines is **Fail with `origin: prototype`**, never
approval. The PRD prevails over the prototype: a divergence it determines is `intended`.

## Context Loading

| Phase | Load | Unload |
|---|---|---|
| Preflight | the listing of `[UI_DIR]` | — |
| Phase 1 | the `fsd-ui-inspector` report | `crossing.md`, `items.json` and the screenshots |
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
  the source of the behavioral crossing and of items 8.2 to 8.4 and 12.1. This skill does not extract, it
  crosses: the prototype is observed read-only, only to put the same scenario side by side
- **`pd-workflow`** — comes before: owner of the Work Item, the seam and the Validation. The blocking pending
  items go back to the Dev through it, as fix tasks, and re-inspection belongs to this skill
- **`pd-qa-validation`** — complementary: real-user QA per persona, on site. This skill checks the interface
  against the checklist; that one checks whether the person can use the feature
- **`pd-workflow-qa`** — complementary: generates the E2E automation, which is not done here
- **`pd-frontend-audit-eval`** — complementary: audits the front-end code in 14 dimensions. This skill audits
  the interface in execution

## Out of scope

- **Build, lint and tests**: not validated here (that is the Validation of `pd-workflow`); they come before
  this skill. The blocking pending items go back to the Dev as fix tasks, and re-inspection belongs to this skill.
- **Functional QA**: not covered (that is `pd-qa-validation`). This skill checks the interface against the
  checklist; functional QA checks whether the person can use the feature.
- **E2E automation**: not generated here (that is `pd-workflow-qa`).
- **Front-end code**: its technical quality is not audited here (that is `pd-frontend-audit-eval`). This skill
  audits the interface in execution.
- **Critique of the prototype**: the prototype is the reference, not the object. A flaw in it is a
  `prototype-gap`, judged by the checklist, not redesigned here.

## Output Behavior

Conversational, not robotic. Interact in the language the user is writing in (detect it from the user's messages; do not ask). Reports and generated documents stay in English. At any moment the human needs to know how far the approval
has gone and what is missing. When closing, say: the verdict, the counts, the blocking pending items with the
next step, where `report.md` is, and that **nothing was committed or published**. Rejected or inconclusive:
the next step is to fix (via `pd-workflow`) or unblock the item, and then re-inspect. With a prototype, also give the divergences
per class and the most visible ones, and say which scenarios were not crossed.
