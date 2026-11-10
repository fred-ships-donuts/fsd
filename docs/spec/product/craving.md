# Craving (PRD)

- Stage: Craving
- Owner: PM
- Size limit: 40 lines (body, without this header block)
- Source: none (start of the chain)

## Problem

None

## Who

None

## Expected result

Dado um catálogo de skills versionado neste repositório (`src/skills/`), permitir que qualquer máquina instale uma ou mais skills em `~/.fsd/skills` (global) ou `./.fsd/skills` (projeto) com um único comando, e manter um registro próprio do que foi instalado.

A CLI tem **um único binário, `fsd`**, com poucos comandos:

- `fsd init` abre o assistente interativo, onde se instala e apaga skills e se escolhe escopo, idioma, tema e atualização.
- `fsd update` atualiza a própria CLI; `fsd update skill [nome]` atualiza as skills instaladas.
- `fsd task ...` cria e acompanha as tasks do projeto em `nook/` (bench → rack → fridge, 4.5 e 5.5).
- `fsd -h`/`--help` mostra a ajuda (também mostrada quando `fsd` é chamado sem argumentos) e `fsd -v`/`--version` mostra a versão.

Instalar e apagar skills só existe dentro do assistente: não há `fsd install` nem `fsd uninstall`.

## Out of scope

- Criar/editar skills (o autoramento continua manual).
- Instalar skills de terceiros ou de repositórios arbitrários.
- Publicar skills em um registry próprio.
