# Arquitetura do código

Como o código de `src/cli/` está dividido, por que, e onde entra cada coisa nova. (`docs/FSD-ARCHITECTURE.md` descreve o produto; `SPEC.md` 9 tem a árvore de arquivos.)

## Camadas

```
fsd.ts ──► commands/ ──┐
                       ├──► engine/ ──► plan/ ──► core/
ui/ ────► wizard/ ─────┘
```

| Camada | Responsabilidade | Pode importar |
|---|---|---|
| `core/` | Domínio e disco: escopos e caminhos, catálogo, registro, configuração, conflitos, leitura do diário, formato dos arquivos de task, versões, npm. Só lê, exceto as gravações atômicas de um arquivo (JSON e texto) de `core/fs.ts`. | `node:` e bibliotecas puras de formato de dados, cada uma isolada num único módulo (hoje: `yaml`, só em `core/taskFiles.ts`) |
| `plan/` | Planejadores: leem o disco e devolvem um `Plan` com o que fazer e o resultado de cada skill. **Nunca escrevem.** | `core/` |
| `engine/` | Executa um `Plan` em fases (6.9), com diário, desfazer e recuperação. Toda mudança com mais de uma operação passa por aqui; uma gravação de um arquivo só usa `core/fs.ts`. | `core/`, `plan/` |
| `commands/` | Um arquivo por comando da CLI: valida a entrada, chama planejador e motor, imprime e devolve o exit code. | `core/`, `plan/`, `engine/` |
| `wizard/` | Regras do assistente sem React: passos, escolhas, o que as telas mostram, executar depois do resumo. | `core/`, `plan/`, `engine/` |
| `ui/` | Só apresentação, em Ink: telas, componentes, cabeçalho, arte em células, escrita no terminal. | `wizard/`; de `core/`, `plan/` e `engine/` só tipos e o que é de exibição (`version`, `phases`, `formatResult`) |
| `fsd.ts` | Ponto de entrada: atalhos (`args.ts`), commander e exit code. Nenhuma regra. | `commands/` |

Regras:

1. **Dependência só para baixo.** Nada de `core/`, `plan/`, `engine/` ou `wizard/` importa React, Ink ou commander. `ui/` não importa de `commands/` (os códigos de saída estão em `exitCodes.ts`, compartilhado).
2. **Ler e escrever separados.** Quem decide (`plan/`) não escreve. Escrever é com o `engine/` (várias operações, com desfazer) ou com as gravações atômicas de `core/fs.ts` (um arquivo). O que uma camada precisa saber do disco para decidir e o motor precisa conferir na fase Verificar (os conflitos, o diário de execuções mortas) fica em `core/`, para os dois usarem a mesma resposta.
3. **Uma regra, um lugar.** Texto de resultado (`formatResult`), escopos com registro (`installedScopes`), "este caminho é um link para aquele" (`isLinkTo`), códigos de saída e os textos da interface (`ui/labels.ts`) existem uma vez só.
4. **Dependências injetáveis nas bordas.** O motor recebe `Ops` (as operações de arquivo) e `now`; os comandos recebem `Io`, `Env` e as dependências de rede/npm, com as reais por padrão.

## Por dentro de cada camada

**`core/`**: `scope.ts` (onde ficam `.fsd/`, `nook/` e o cache de cada escopo), `fs.ts` (consultas ao disco, `writeJsonAtomic`, `writeTextAtomic` e `updateTextFile`, que compara o conteúdo antes de gravar), `semver.ts`, `catalog.ts`, `registry.ts`, `config.ts`, `claudeLink.ts`, `conflicts.ts`, `runJournal.ts` (formato do diário e quais execuções estão mortas), `selfUpdate.ts`, `package.ts` (raiz, nome e versão do pacote), `slug.ts` (nome de task e de passo a partir do título), `taskFiles.ts` (formato do `plan.md` e dos passos, puro, o único que importa `yaml`) e `nook.ts` (tasks do `nook/`: localizar, ler e validar, só leitura).

**`plan/`**: `types.ts` (o `Plan`, seus itens e `emptyPlan`/`addItem`), `install.ts`, `uninstall.ts`, `link.ts`.

**`engine/`**: `transactionRun.ts` é o núcleo de qualquer transação (trava, diário, ctrl+c, commit, desfazer, eventos de fase) e recebe do cliente o que verificar e o que fazer; `run.ts` é o cliente das skills (as cinco fases, `Phase`, `RunEvent`) e `verify.ts` é a sua fase Verificar; `transaction.ts` é a classe `Transaction`, que grava no diário (uma lista ordenada de ações, `schema: 2`, desfeita do fim para o começo) **antes** de cada mudança (criar, copiar, mover para dentro, deslocar uma pasta real, ligar, deslocar, gravar texto com cópia de segurança) e marca o ponto de não retorno (`commit`); `recovery.ts` desfaz pelo diário (cada undo pode rodar de novo) e recupera execuções mortas, parando diante de um diário de uma versão mais nova; `ops.ts` são as operações reais.

**`commands/`**: `init.ts`, `update.ts`, `link.ts`, `task.ts` (`fsd task …`: mensagens, `--json` do `list` e exit code); `guards.ts` (as checagens comuns aos comandos que gravam fora do motor, como a de execução viva). Exceção ao motor, como o `config.json`: `task new` e `task step add|start|done|skip` gravam um único arquivo por `core/fs.ts` (`createTextFile`, `updateTextFile`), sem diário, depois de recusar quando há outra execução viva; `skillPlans.ts` é o que `update skill` e `link skill` têm em comum (escopos, rodar um plano por escopo, relatório e exit code); `io.ts` é a saída.

**`wizard/`**: `choices.ts` (o que o usuário escolheu e o estado inicial), `steps.ts` (passos e progresso, puro), `queries.ts` (linhas do catálogo, instaladas, idiomas, conflitos), `execute.ts` (montar o pedido e as preferências, planejar e executar).

**`ui/`**:
- `run.ts` monta o Ink no terminal (tamanho como propriedade, resize síncrono, escritor de quadros).
- `App.tsx` guarda o estado e a navegação entre telas; não desenha os passos.
- `screens/`: `Menu`, `Step` (corpo de cada passo e o resumo), `Running`, `Result`.
- `components/`: `Header`, `Footer`, `Title`, `Pick`, `Conflicts`.
- `hero/`: o cabeçalho grande do menu; `layout.ts` decide o que cabe (puro) e `Hero.tsx` compõe e anima.
- `art/`: as figuras como grades de células, sem React: `donut.ts` (o mapa 22 × 9 feito à mão), `words.ts` (a fonte de 3 linhas), `snow.ts` (os granulados), `sextant.ts`, `cell.ts`.
- `terminal/`: `frameWriter.ts` (diff de linhas, uma escrita por quadro) e `useTerminalSize.ts`.
- `layout.ts` (linhas que o cabeçalho e o rodapé ocupam), `labels.ts` (textos), `theme.ts` (paletas e símbolos).

## Onde entra algo novo

- **Um comando novo**: `commands/<nome>.ts` com a função que devolve o exit code, e uma linha em `fsd.ts`. Se ele muda o disco, um planejador em `plan/` e `runPlan` do motor.
- **Uma regra nova de instalação**: no planejador (`plan/`), nunca no comando nem na tela.
- **Um passo novo no assistente**: `StepId` e `stepsFor` em `wizard/steps.ts`, o título em `ui/labels.ts`, o corpo em `ui/screens/Step.tsx`.
- **Uma mudança visual do cabeçalho**: `ui/art/` (pixels e cores) ou `ui/hero/` (layout); nada fora de `ui/` muda.
- **Uma operação de arquivo nova no motor**: em `Ops` (`engine/ops.ts`) e um método na `Transaction` que a registre no diário antes de fazê-la; o desfazer em `engine/recovery.ts`.

## Fora de `src/`

Raiz: `README.md`, `HANDOFF.md`, `SPEC.md`, `TASKS.md` e os arquivos do npm e do TypeScript. Documentos do produto em `docs/` (índice em `docs/FSD-INDEX.md`). Não há versionamento físico de arquivos nem testes (decisões do autor de 2026-11-07): o histórico é o git. `graft/` é gerado e ignorado pelo git.
