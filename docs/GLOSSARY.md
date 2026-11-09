# 🍩 FSD Glossary

## Purpose

This document defines the terminology used by FSD.

Some terms represent FSD concepts and may map to existing technical implementations.

For architecture details, see:

`FSD-ARCHITECTURE.md`

---

| Term | Meaning |
|---|---|
| Agent | Technical AI worker |
| Baker | FSD terminology for Agent |
| Skill | Executable capability |
| Recipe | Workflow definition |
| Cookbook | Collection of Recipes (`nook/cookbook/`) |
| Dough | FSD principles and foundation (see `FSD-DOUGH.md`) |
| Kitchen | Conceptual project preparation layer; also holds the per-delivery preparation documents (`nook/kitchen/<slug>/`) |
| Bench | Active workspace directory for task folders |
| Oven | Execution coordination layer |
| Donuts (Artifacts) | Generated output |
| Rack | Showcase layer for finished work |
| Step | A `NN-<slug>.yaml` in a task folder; the unit the agent starts and finishes |
| Fridge | Archiving and long-term storage layer |
| Craft | Baker specialization description |
| Context | Information provided during execution |
| nook/ | User-facing workspace directory |
| .fsd/ | Internal system directory (execution state) |

---

## Document chain

Each delivery moves through six documents. Each one answers one question and points to the exact section of the one before it.

| Donut name | Plain name | Owner | Question it answers |
|---|---|---|---|
| Craving | PRD | PM | What problem, for whom, what result, what is out? |
| Flavor | SPEC | PM + Architect | What exact behavior: inputs, outputs, messages, edge cases? |
| Rise | TECH REVIEW | Architect | Is the specified behavior feasible, what are the risks and the discarded alternatives? |
| Tray | PLAN | Architect | In what order do we deliver, and which files change? |
| Step | TASK | Dev | What is one executable, verifiable step? |
| Taste | QA REVIEW | QA | Does the real app meet the acceptance criteria? |

Step is not a new term: the TASK stage is the existing Step (`NN-<slug>.yaml`). Paths are in `FSD-DIRECTORY-STRUCTURE.md`.

---

## Term Notes

### Baker

A Baker is the FSD representation of an AI Agent.

The term describes the role and identity of the worker.

It does not necessarily replace the technical implementation.

---

### Craft

Craft describes what a Baker specializes in.

Craft is descriptive.

Skills define execution capabilities.

---

### Skill

A Skill represents an action or capability that can be executed.

Skills should remain focused and reusable.

The word has two senses in this project: the executable capability of a Baker (architecture) and a skill of the AI assistant that the `fsd` CLI installs (CLI specification). Both follow the same format.

---

### Recipe

A Recipe defines a workflow.

It describes how different capabilities are combined to produce a result. Recipes live in the Cookbook.

---

### Bench

The Bench is the active workspace directory (`nook/bench/`) where task folders (`plan.md` and steps) reside while they are worked on. It does not store logs or execution state.

---

### Fridge

The Fridge (`nook/fridge/`) is the cold storage and archiving layer used to preserve archived task folders and past work. It does not store logs or execution state.

---

### Cookbook

The Cookbook is the directory `nook/cookbook/`. It contains the Recipes (declarative workflows) of the project.

---

### Dough

The Dough is the set of principles that guide FSD decisions. See `FSD-DOUGH.md`.

---

### Step

A Step is a `NN-<slug>.yaml` file in a task folder. It has a `title`, a `status` (`pending`, `in_progress`, `done` or `skipped`) and an optional `description`. It is the unit the agent starts and finishes (`fsd task step start|done|skip`).

---

### Oven

The Oven is the execution coordination layer. It manages the execution lifecycle and invokes workflows. Its runtime state lives in `.fsd/oven/`.

---

### Rack

The Rack (`nook/rack/`) is the showcase layer where completed task folders (`status: done`) and delivered Donuts are placed for review.

---

### nook/ and .fsd/

`nook/` is the user-facing workspace (`kitchen/`, `bench/`, `cookbook/`, `bakers/`, `rack/`, `fridge/`). `.fsd/` is the internal system directory (`oven/`, `cache/`, `logs/`).

---

### Donuts (Artifacts)

Donuts, also called Artifacts, are the results produced by FSD.

Examples:

- source code;
- documentation;
- plans;
- reports.

---

### Context

Context is the information available during execution.

Good context should be relevant, focused, and intentional.


---
🍩 Bake small.  
🍩 Ship often.  
🍩 Keep improving.