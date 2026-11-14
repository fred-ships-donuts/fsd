---
name: fsd-arq-passagem
description: Preparar um issue do fsd para o desenvolvimento com o comentário "Architect handoff". Use quando um issue estiver em Ready for Architecture ou o Kevin pedir.
---

# Passagem para o dev (em inglês)
1. `fsd-arq start <n>` (card → Architecting; mostra o issue e o aceite).
2. Leia a `SPEC.md` citada, o `TASKS.md` e o código da área, conferindo em `arquivo:linha`. O que for de produto vai ao Kevin, com a sua recomendação; ele decide. Nada vai ao autor.
3. Publique com `fsd-arq publish <n> - <<'X'` + o texto + `X` (confere as seções, publica, card → Ready for Development, avisa o Stuart). As seções escalam pelo tamanho: **size:L** todas as seis; **size:M** só What to do, Files e Verification (as outras só se houver algo real a dizer); **size:S** não tem passagem (o `fsd-arq start` recusa e o Kevin manda direto para o dev):
```
**What to do:** <concrete steps, in order>
**Files:** <path — what changes>
**Contracts:** <signatures, types, exact error messages, exit codes>
**Risks:** <edge cases, concurrency, symlinks, Windows/paths…>
**Out of scope:** <what not to do now>
**Verification:** <how Bob confirms it, tied to the issue's acceptance>
```
