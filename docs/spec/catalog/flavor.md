# Skill catalog

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

O catálogo fica em `src/skills/_i18n/`. Há um único formato: uma árvore completa por idioma.

```
src/skills/_i18n/<nome>/<lang>/SKILL.md   # + references/, scripts/, templates/, agents/
```

Exemplos: `_i18n/fsd-csharp-code-standard/{en,pt-BR}`, `_i18n/fsd-ui-approval/{en,pt-BR}`, `_i18n/fsd-nook-tasks/{en,pt-BR}`. A `fsd-nook-tasks` ensina o agente a trabalhar com as tasks do `nook/` (4.5): ler o `plan.md`, quebrar o plano em passos com `fsd task step add`, marcar cada passo com `start`/`done` pelos comandos (nunca editar o `status` nem mover pastas à mão), e **pedir a confirmação do usuário antes de `fsd task done`**. `archive` fica só com o usuário. Os idiomas de uma skill são as subpastas de `_i18n/<nome>/` que contêm `SKILL.md`. Diretórios soltos em `src/skills/` (fora de `_i18n/`) **não fazem parte do catálogo** e são ignorados pela CLI.

Regras:

- O identificador da skill é o nome do diretório `_i18n/<nome>`; ele deve ser igual ao `name` do frontmatter de todos os `SKILL.md` das suas variantes. A skill é instalada como `<destino>/<nome>/`, qualquer que seja o idioma escolhido.
- Todo `SKILL.md` tem frontmatter com `name`, `description` e **`metadata.version`** (semver 2.0.0, aceita pré-release: `1.0.0`, `1.0.0-alpha.2`). Skill sem `metadata.version` válido é erro de catálogo.

  ```yaml
  ---
  name: fsd-ui-approval
  description: ...
  metadata:
    author: Frederico Jacobi
    version: "1.0.0-alpha.2"
  ---
  ```
- Todas as variantes de idioma de uma skill têm o mesmo `metadata.version`.
- Skill com um único idioma é válida: a pergunta de idioma é pulada e esse idioma é instalado.
- Diretórios de `_i18n/` sem nenhuma variante com `SKILL.md` são ignorados pelo `list` e pelo `install` (e reprovados pelo teste do catálogo).
- O catálogo é lido do próprio pacote (resolvido relativo ao módulo, via `import.meta.url`), nunca do `cwd`.
- **Não são copiados** para o destino: `evals/` e `README.md` (em qualquer nível da skill). Todo o resto (`references/`, `scripts/`, `templates/`, `agents/`) é copiado como está.
- Mudar o conteúdo de uma skill **exige subir o `metadata.version`**, senão a instalação não enxerga a mudança e não faz `upgrade`.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None
