# HANDOFF — fsd (Fred Ships Donuts CLI)

Estado em 2026-11-01. Leia nesta ordem: este arquivo, `TASKS.md`, `SPEC.md`, `docs/`.

## Onde o projeto está

O projeto **mudou de pasta**: agora é `/media/fredericojacobi/Projects/projetos/fred-ships-donuts/`. O caminho antigo (`.../Projects/fred-ships-donuts`) não existe mais. Em `.../Projects/` sobrou `fred-ships-donuts (another copy)/` (cópia antiga com `dist/` e `src/`) e a lixeira; não foram tocadas.

**Nenhuma task foi executada.** Esta sessão só produziu documentação e planejamento:

- `SPEC.md` reescrita (comandos, atalhos, atualização).
- `TASKS.md` criado com 25 tasks (`F-1.1`, `F-1.2` e `F-2` a `F-25`; a F-1 original foi dividida).
- O código em `src/cli/` continua o rascunho antigo (Clack, `.fsd.json` por skill). Compila e passa 18 testes, mas está defasado em relação à spec.
- `package.json` ainda está antigo: nome `fred-ship-donuts`, dois `bin` apontando para `index.js`, `@clack/prompts` e `commander` nas dependências. A F-3 corrige.


## Decisões do autor nesta sessão

- Binário único `fsd`, com `commander`. Comandos: `fsd init`, `fsd update`, `fsd update skill [nome]`, `-h/--help`, `-v/--version`. `fsd` sem argumentos mostra o help (exit 0). `fsd init` sem TTY sai com 1.
- Atalhos: `-u` tem o efeito de `update` e `-s` o de `skill`; as formas se misturam (`fsd -u -s nome`, `fsd update -s nome`). Não usar o termo "alias" (não é um alias do commander).
- O menu do assistente não tem "Atualizar": `Instalar` já atualiza skills desatualizadas.
- `fsd update` atualiza a CLI; `fsd init` também atualiza a CLI, com opção para desligar. `fsd update skill` atualiza todas as skills; com nome, só uma. A opção `updateSkills` faz o `fsd update` atualizar as skills junto.
- Sem `--force`: skill em dia vira `skip`; pasta fora do registro vira conflito e o resumo pergunta se sobrescreve (padrão não).
- Pacote npm `fred-ships-donuts`; comando `fsd`; uso `npx -p fred-ships-donuts fsd init`.
- Tarefas têm prefixo `F` (`F-1`, `F-2`...).
- A estrutura de diretórios do FSD em um projeto passa a ser a do `docs/FSD-ARCHITECTURE.md` (`nook/` + `.fsd/`); a árvore só com `.fsd/` que o autor colou antes deixou de valer.
- `Bench` e `Fridge` **não** guardam logs nem estado de execução. O `Bench` guarda as tarefas, e o `status` fica no arquivo de cada tarefa.
- A pasta `graft/` **não** deve ser apagada (revisto em 2026-11-01).
- `Ingredient` sai do vocabulário e vira `Cookbook`: diretório `nook/cookbook/` que contém as recipes e substitui `nook/recipes/`.
- Todos os docs usam `-` no nome de arquivo, nunca `_`.
- A F-1 foi dividida em F-1.1 (análise, só leitura) e F-1.2 (pivô, alinhamento e correções). Ao fim da F-1.2, todas as demais tasks são atualizadas para `nook/` + `.fsd/`.

## Planejado, mas NÃO executado (o autor pediu só planejar)

Está no `TASKS.md`:

- **F-1.1** (analisar os docs, 8 entregáveis): só relatório.
- **F-1.2** (3 entregáveis): documento pivô em `docs/`, alinhamento ao `FSD-ARCHITECTURE.md` e correções de docs.
- **Correções da F-1.2:** renomear `FSD_CONCEPT.md` → `FSD-CONCEPT.md` e `FSD_DOUGH.md` → `FSD-DOUGH.md` com links corrigidos; corrigir typos de `FSD-IMPLEMENTATION-STRATEGY.md`; alinhar `GLOSSARY.md` ao `FSD-ARCHITECTURE.md`; tirar logs e estado das seções `Bench` e `Fridge` da arquitetura.
- **F-2:** organização de diretórios (`nook/` + `.fsd/`) e conciliação com a SPEC 4.2.
- **F-4:** apagar `src/skills/fsd-padroes-codigo-csharp/` (a migração do catálogo já está commitada; `graft/` fica).

## Para conversar amanhã

Itens da revisão que o autor ainda não respondeu:

1. (Resolvido) Dependências faltantes adicionadas ao `TASKS.md`.
2. (Resolvido) Título da F-2 agora cita `nook/` + `.fsd/`.
3. Hierarquia de fontes: o `TASKS.md` diz que a `SPEC.md` é a fonte da verdade, mas a F-1.2 toma o `FSD-ARCHITECTURE.md` como referência.
4. (Resolvido) A F-23 não fixa mais a quantidade de itens.
5. (Resolvido) A Fase 0 foi separada: Fase 0 (documentação e estrutura: F-1.1, F-1.2, F-2) e Fase 0.5 (preparação técnica: F-3, F-4).
6. (Resolvido) `Ingredient` vira `Cookbook`.
7. Inconsistências da arquitetura ainda abertas: falta o status de tarefa pendente (só há `in_progress` e `done`); `Context` não tem diretório explícito (presumivelmente `nook/kitchen/`); `Kitchen` fala em "global settings" mas o diretório é do projeto; dois sentidos de "Skill" (capacidade do Baker vs skill do Claude Code instalada pela CLI).

Pendências antigas do autor, ainda válidas:

- Layout: logotipo e cabeçalho, conjuntos de símbolos, largura mínima do terminal, paletas dos 4 temas (SPEC 6.7).
- Apagar ou manter o `SKILL.md` roteador em `src/skills/_i18n/fsd-csharp-code-standard/`.
- Utilidade do tema (o autor explicará depois).

## Decisões que eu tomei sem confirmação (revisar)

Também estão na SPEC 13 ("Revisar"):

- `update skill` cobre os escopos global e projeto (o de projeto só se existir `./.fsd/installed.json`).
- `updateSkills` vem desligado por padrão e é configurado no passo 5 do assistente.
- Não há flag `fsd init --no-update`, só a opção salva `autoUpdate`.
- `fsd update` explícito ignora o limite de 24 h e falha de rede sai com 1.
- Padrões do auto-update (ligado, 24 h, timeout de 2 s) e `config.json` só global.
- Estrutura do `TASKS.md` como arquivo local (em vez de issues do GitHub; o `gh` não está instalado).
- O padrão do `installed.json` foi descrito de memória como inspirado nos manifestos do Claude Code, sem conferir o formato real; que o Claude Code usa Ink também não foi verificado.

## Fora do projeto

`~/.claude/statusline.js` mostra o horário de reset do consumo (original em `~/.claude/statusline.js.bak`).

## Como rodar

```bash
cd /media/fredericojacobi/Projects/projetos/fred-ships-donuts
npm test                         # tsc + node --test dist (18 testes, código antigo)
node dist/cli/index.js list      # catálogo atual (CLI antiga)
```

Para testar sem sujar `~/.claude`, use `HOME=$(mktemp -d)`. O fluxo interativo precisa de um terminal real: não dá para validar pelo agente.

## Próximo passo sugerido

1. Conversar os pontos de "Para conversar amanhã".
2. Mandar executar a F-1.1, depois a F-1.2 e a F-2. As demais tasks dependem do resultado delas.
