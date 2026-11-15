# Kitchen files in nook/

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves; the project context reaches the agent on purpose

## Behavior

Decisão do autor (PM, 2026-11-15). Só no escopo de projeto (`<cwd>/nook/kitchen/`); o escopo global não tem `nook/`.

**Arquivos.** Diretamente em `nook/kitchen/` podem existir exatamente três arquivos, todos opcionais, em Markdown simples, sem frontmatter nem títulos obrigatórios:

| Arquivo | Formato | Propósito | Autor |
|---|---|---|---|
| `rules.md` | Markdown | regras do projeto | usuário |
| `settings.md` | Markdown | preferências | usuário |
| `context.md` | Markdown | contexto do projeto | usuário |

**Só o usuário escreve.** A CLI nunca cria, edita, move nem valida esses arquivos. Não existe comando `fsd` para o Kitchen.

**Instalação não cria nada.** O fluxo Instalar (e `fsd init`) não cria nenhum deles: `nook/kitchen/` continua vazio, como diz `docs/spec/state/flavor.md` (linhas 35 e 37: "`nook/kitchen/`, `nook/bakers/` | workspace do usuário, criados vazios") e como confirma o critério A6 12.20 desse Flavor.

**Qualquer outra coisa é ignorada.** Qualquer outro arquivo ou pasta solto diretamente em `nook/kitchen/` é ignorado pela skill. As pastas `<slug>/` (Craving, Flavor, Rise; ver `docs/FSD-DIRECTORY-STRUCTURE.md`) são outra coisa e continuam como estão.

**Leitura pela skill `fsd-nook-tasks`.**
1. Lê cada arquivo que existe quando planeja uma task (passo "Plan", antes de propor os passos). Só nesse momento; nunca para executar um passo.
2. Ordem fixa: `rules.md`, `settings.md`, `context.md`.
3. Lê no máximo 200 linhas por arquivo. Um arquivo maior é lido até a linha 200 e a skill avisa o usuário que cortou.
4. Arquivo ausente ou vazio é pulado em silêncio: sem erro, sem menção, e a skill não pede ao usuário que o crie.

## Inputs

- Os três nomes exatos, em minúsculas: `rules.md`, `settings.md`, `context.md`.
- Local: `<cwd>/nook/kitchen/`, só escopo de projeto.
- Limite: 200 linhas por arquivo, contadas por quebras de linha (a última linha sem quebra final conta).
- "Vazio" = zero bytes ou só espaço em branco.

## Outputs and messages

Um aviso por arquivo cortado, mostrado ao usuário uma vez por planejamento (não por passo), no idioma da skill:

- en: `rules.md: only the first 200 lines were read.`
- pt-BR: `rules.md: só as primeiras 200 linhas foram lidas.`

O nome do arquivo muda conforme o caso (`settings.md`, `context.md`). Nenhuma outra mensagem e nenhum código de saída novo: a leitura é da skill, não da CLI.

## Edge cases

- Arquivo ausente ou vazio: pulado em silêncio.
- Arquivo com exatamente 200 linhas: lido inteiro, sem aviso.
- Uma pasta chamada `rules.md` (ou outro dos três nomes) não é arquivo: ignorada como qualquer entrada fora da lista.
- Link simbólico: a skill lê o que o usuário colocou. Lê através de um link para arquivo regular; ignora, sem mensagem, um link para pasta ou um link quebrado (mesma regra das pastas de task, 4.5).
- Arquivo binário ou fora de UTF-8: é lido como texto e pode virar lixo; o conteúdo é responsabilidade do usuário, sem validação.
- `notes.md`, ou qualquer nome fora dos três, solto em `nook/kitchen/`: ignorado.
- Os comandos `fsd task` não leem nem alteram esses arquivos.

## Acceptance

### A1 `fsd init` em um projeto vazio deixa `nook/kitchen/` vazio

Confirmar o fluxo Instalar no escopo de projeto e rodar `ls -A nook/kitchen`: não lista nada.

### A2 Com os três arquivos presentes, a skill os lê em ordem antes de propor os passos

Criar `rules.md`, `settings.md` e `context.md` com uma linha distinta cada, pedir à skill `fsd-nook-tasks` que planeje uma task: ela lê `rules.md`, `settings.md` e `context.md`, nessa ordem, antes de propor os passos.

### A3 Um `rules.md` de 250 linhas é lido até a linha 200 e o usuário é avisado

Criar `rules.md` com 250 linhas numeradas e pedir o planejamento de uma task: a skill usa até a linha 200, não a 201, e mostra `rules.md: only the first 200 lines were read.` uma vez.

### A4 Arquivo ausente ou vazio não gera erro nem mensagem

Deixar `settings.md` ausente e `context.md` com zero bytes, planejar uma task: nenhum erro, nenhuma menção a esses arquivos, nenhum pedido para criá-los.

### A5 Um `notes.md` solto é ignorado

Criar `nook/kitchen/notes.md` com uma linha única e planejar uma task: a skill não usa essa linha.

### A6 `fsd task list` e os outros comandos `fsd task` não tocam nesses arquivos

Rodar `sha256sum nook/kitchen/*.md` antes e depois de `fsd task list`, `fsd task new` e `fsd task done`: as somas são iguais.
