# Proposta: organização do projeto completo

Só um plano. Nada foi movido. (`docs/FSD-ARCHITECTURE.md` descreve o produto; este arquivo descreve onde cada coisa do repositório deveria morar.)

## Problemas hoje (raiz)

1. Quatro documentos de projeto soltos na raiz (`SPEC.md` 68 KB, `TASKS.md`, `HANDOFF.md`, `README.md`), enquanto `docs/` guarda só os documentos do produto e o `FSD-INDEX.md` aponta para `../SPEC.md` e `../TASKS.md`.
2. `header/`, `logos/` e `words/` são três pastas de raiz que não têm código do produto: só `save.sh` (versionamento físico, que o autor aboliu: a partir de agora só git), READMEs e a trava dos trechos congelados (`check-frozen.mjs` + JSON), também abolida.
3. Documentos desatualizados: `README.md` manda rodar `npm test`; `HANDOFF.md` fala em "181 testes" e `TASKS.md` tem um "Estado atual do código" que descreve o rascunho antigo (Clack, `cli.ts`, `index.ts`). `SPEC.md` e `TASKS.md` ainda citam testes.
4. `HANDOFF.md` mistura estado da sessão, regras do autor e histórico; é o arquivo que mais envelhece.
5. `.ignore` e `.gitignore` coexistem; `graft/` é gerado e já está ignorado (não apagar).
6. `src/`: ver abaixo.

## Árvore proposta

```
fred-ships-donuts/
  README.md                 uso e desenvolvimento (fica na raiz)
  package.json  package-lock.json  tsconfig.json  .gitignore
  src/                      código (estrutura detalhada abaixo)
  docs/
    FSD-INDEX.md            índice geral (atualizado com os novos caminhos)
    produto/                CONCEPT, DOUGH, IMPLEMENTATION-STRATEGY, ARCHITECTURE, DIRECTORY-STRUCTURE, GLOSSARY
    cli/                    SPEC.md, TASKS.md
    design/                 PALETAS-DONUT.md, ARQUITETURA.md (este arquivo)
  HANDOFF.md                fica na raiz, enxuto (só estado atual e regras do autor)
```

Versionamento físico e trava acabaram: `header/`, `logos/` e `words/` somem inteiros (`save.sh`, READMEs, `check-frozen.mjs`, JSON congelado). O histórico é o git. O que existe é só o arquivo em uso (`donutArt.ts`, `donutMap.ts`, `wordArt.ts` etc.).

Decisões embutidas (dizer se discorda):
- **README e HANDOFF ficam na raiz**: são o que se espera encontrar ali e o que o Claude lê primeiro.
- **SPEC e TASKS vão para `docs/cli/`**: junto da documentação, e o `FSD-INDEX.md` deixa de usar `../`.
- **Subpastas em `docs/`** só valem com 10+ arquivos; hoje são 8. Se preferir, `docs/` fica plano e só SPEC/TASKS entram nele.

### Estrutura de `src/`

```
src/cli/
  fsd.ts                 entrada (bin)
  env.ts                 NODE_ENV, precisa ser o 1º import da entrada
  args.ts                normalização de argumentos
  commands/              init, link, update            (como está)
  actions/               install, uninstall, link, conflicts, types   (como está)
  core/                  domínio e sistema de arquivos, sem Ink/React
    config.ts  fsdDir.ts  registry.ts  skills.ts  link.ts
    ops.ts  run.ts  recovery.ts  selfUpdate.ts
  ui/
    run.ts               monta o Ink
    screens/             App.tsx  Pick.tsx  Conflicts.tsx  Chrome.tsx  flows.ts  progress.ts
    header/              donutArt  donutMap  emojiDonut  wordArt  pixelFont  shadowFont
                         sextant  snow  frameWriter  theme
src/skills/              (como está)
```

O projeto não tem testes (removidos por decisão do autor).

### Regra de dependência

`ui → actions → core`, `commands → actions/core`. `core` nunca importa de `ui`, `actions` ou `commands`. `header/` não importa de `screens/` (o contrário vale). `ui/theme.ts` fica em `header/` porque a paleta é do cabeçalho; as telas só consomem.

### O que quebra ao mover em `src/`

- `docs/PALETAS-DONUT.md` cita `src/cli/ui/...`.
- A hierarquia de pastas muda os imports relativos (`../fsdDir.js` → `../core/fsdDir.js`); o `tsc` acusa tudo que sobrar.



1. Apagar `blockFont.ts` (confirmar antes: parece substituído por `pixelFont`/`shadowFont`).
2. Criar `core/` e mover os 8 arquivos de domínio.
3. Separar `ui/screens/` e `ui/header/` (só depois que o cabeçalho for dado como fechado e commitado, e com os scripts de versão ajustados no mesmo passo).
4. Commit por passo.


## Ordem sugerida (cada passo compila com `tsc`, um commit por passo)

0. Commitar o estado atual (a árvore está suja com cabeçalho, logos, words e UI; mover arquivos agora misturaria reorganização com mudança de comportamento).
1. Atualizar os documentos desatualizados (README sem `npm test`; HANDOFF sem "181 testes"; TASKS sem o "Estado atual" do rascunho antigo; menções a testes em SPEC/TASKS).
2. Apagar `src/cli/ui/blockFont.ts` (confirmar antes).
3. `docs/`: reorganizar e atualizar `FSD-INDEX.md` e os links cruzados (`grep` por `SPEC.md`, `TASKS.md`, `docs/`).
4. `src/cli/core/`: criar e mover os 8 arquivos de domínio.
5. Apagar `header/`, `logos/` e `words/` por inteiro; tirar de `HANDOFF.md`, `SPEC.md` 6.12 e `docs/PALETAS-DONUT.md` as menções a versões, `save.sh` e trechos congelados.
6. `src/cli/ui/screens/` e `ui/header/`.

## Quebra ao mover fora de `src/`

- `package.json` `files` e `bin` não mudam (`dist`, `src/skills`).
- Citações de `save.sh` das três pastas, "versão 0.4.0 / 1.0.0" em `HANDOFF.md`, `SPEC.md` 6.12, `README.md` e `docs/PALETAS-DONUT.md`.
- `~/Backups/fred-ships-donuts-versions/` fica fora do projeto e não é tocado por este plano; apagar ou não é decisão do autor.
