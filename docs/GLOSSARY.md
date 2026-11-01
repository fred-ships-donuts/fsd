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
| Ingredient | Reusable knowledge or context |
| Dough | FSD principles and foundation |
| Kitchen | Conceptual project preparation layer |
| Bench | Active workspace directory for tasks |
| Oven | Execution environment |
| Artifact | Generated output |
| Fridge | Archiving and long-term storage layer |
| Craft | Baker specialization description |
| Context | Information provided during execution |

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

---

### Recipe

A Recipe defines a workflow.

It describes how different capabilities are combined to produce a result.

---

### Bench

The Bench is the active workspace directory where task definitions and inputs reside before being processed.

---

### Fridge

The Fridge is the cold storage and archiving layer used to preserve completed tasks, history, and past artifacts.

---

### Ingredient

Ingredients represent reusable information used during development.

Examples:

- project knowledge;
- conventions;
- documentation;
- rules.

---

### Artifact

An Artifact is a result produced by FSD.

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