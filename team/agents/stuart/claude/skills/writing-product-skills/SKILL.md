---
name: writing-product-skills
description: Explains how to write and maintain the skills the fsd product ships to its users under src/skills, following Anthropic's skill authoring practices. Covers names and descriptions that trigger correctly, concise bodies with progressive disclosure, degrees of freedom, scripts, versioning, what reaches the npm package, and evaluation with skill-creator instead of unit tests. Use when creating or changing anything under src/skills.
---

# Writing the product skills (src/skills)

These are the `fsd-*` skills that `fsd init` installs for users (`fsd-craving`, `fsd-flavor`, `fsd-taste`, `fsd-nook-tasks`…). They are product, not team tooling. The authoritative guide is Anthropic's "Skill authoring best practices" (platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices); this skill applies it to fsd.

## Name and description

- `name`: `fsd-<noun>` from the product's donut vocabulary (`docs/GLOSSARY.md`), lowercase, digits and hyphens, at most 64 characters. Internal team skills use gerund names and never `fsd-`.
- `description`: at most 1,024 characters, third person, saying **what it does and when to use it**, with the words a user would actually type. It is the only text Claude sees when choosing among many skills; a vague description means the skill never loads.

## Body

- Assume Claude is already capable. Add only what it does not know: fsd's formats, paths (`nook/`, `.fsd/`), rules, decisions. Cut every sentence that explains general knowledge.
- `SKILL.md` under 500 lines. Move detail to files one level deep (`reference/…md`) linked from `SKILL.md`; a reference over 100 lines starts with a table of contents.
- Match freedom to fragility: heuristics where many paths work; an exact script where one wrong step corrupts state.
- Workflows with steps get a copyable checklist and a validation loop (run the validator, fix, repeat).
- Prefer a bundled script for deterministic work and say whether to run it or read it. Scripts handle their own errors with useful messages and justify every constant.
- One term per concept, the same as the spec and the glossary. Forward slashes in paths. No dates that will expire.
- Templates and examples where output format matters; concrete input and output pairs beat abstract rules.

## Versioning and packaging

- The frontmatter `version` follows semver (`1.0.0-alpha.1`). Any change users will see bumps it; the CLI uses it to report `outdated` and to upgrade.
- `package.json` → `files` ships `src/skills` without `evals/` and `README.md`. Check with `npm pack --dry-run` that nothing internal ships and nothing needed is missing.
- The catalog is read by `core/catalog.ts`. A change to the folder layout or the frontmatter is a CLI change too (`coding-cli`).

## Evaluation

Skills are measured with evals, never with unit tests (the output varies by design).

1. Before writing, run the task without the skill and note what goes wrong.
2. Write at least three eval scenarios with checkable expected behaviors (`evals/`).
3. Measure without the skill, then with it; keep only content that changes the result.
4. Use the `skill-creator` skill to run and compare, and test with the models users run (Haiku, Sonnet, Opus).
5. Watch a fresh session use the skill on real tasks; fix what it misses or never reads.
