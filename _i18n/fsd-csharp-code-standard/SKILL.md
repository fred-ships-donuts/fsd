---
name: fsd-csharp-code-standard
description: >
  **WORKFLOW SKILL** — Applies the project's C# coding standards when writing, changing, or reviewing C# code
  (compiler and analysis, names, modern C#, style, tests, build enforcement), and reviews a diff against them.
  The skill asks the language first (`pt-BR` or `en`) and then loads only that language's version.
  USE FOR: writing or changing C# code; writing unit tests; reviewing a diff against the coding standards;
  checking names, style, comments, and messages; configuring `.editorconfig` and analyzers.
  DO NOT USE FOR: architecture; test strategy; security or performance review; non-C# code.
  Triggers: "coding standards", "C# coding standard", "follow the standards", "review the style", "code style",
  "editorconfig", "test standard", "padrões de código", "padrão de código C#", "siga os padrões",
  "revisar o estilo", "nomes e comentários", "padrão de teste".
  **SKILL DE FLUXO** — Aplica os padrões de codificação C# do projeto ao escrever, alterar ou revisar código C# e
  revisa um diff contra eles. A skill pergunta o idioma primeiro (`pt-BR` ou `en`) e carrega só a versão desse
  idioma.
license: UNLICENSED
metadata:
  author: Frederico Jacobi Powered By Softdesign
  version: "1.0.0-alpha.2"
---

# fsd-csharp-code-standard — language selector

This skill has two complete, independent versions: `pt-BR/` and `en/`.

1. At the start of every use, ask the user to choose the language: `pt-BR` or `en`. Do not ask again if the
   user's message already states the language or if a choice was already made earlier in the session.
2. Load only `pt-BR/SKILL.md` or `en/SKILL.md`, according to the choice, and follow it.
3. Resolve every relative path used by that file (`references/`, `templates/`, `scripts/`, `agents/`) inside the
   chosen folder (`pt-BR/` or `en/`). Never mix the two trees.
