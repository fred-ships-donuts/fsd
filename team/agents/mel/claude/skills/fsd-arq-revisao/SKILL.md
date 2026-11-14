---
name: fsd-arq-revisao
description: Revisar tecnicamente um PR do fsd contra a passagem e a arquitetura. Use quando houver PR para revisar (fsd-pr --todo).
---

# Revisão técnica de PR (em inglês)
1. `fsd-review start <n>` (card → In Review; lista os arquivos). Leia a passagem do issue.
2. `fsd-review diff <n> <caminho…>` só nos arquivos que importam. Confira camadas e contratos da passagem, erros acionáveis e exit codes, idempotência e casos de borda, e se nada fora do escopo entrou.
3. `fsd-review post <n> approve|changes - <<'X'` + o texto + `X`, no formato:
```
**Blocking**
- `file:line` — problem → what to do

**Suggestion** (does not block the merge)
- `file:line` — suggestion

**Checked:** <what you ran or read to conclude>
```
Com algo em Blocking, use `changes`; senão, `approve`. Se o PR mudou desde o `start`, ele recusa: rode `start` de novo. O comando move o card e avisa o autor do PR.
