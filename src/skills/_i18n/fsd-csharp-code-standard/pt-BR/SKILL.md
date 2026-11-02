---
name: fsd-csharp-code-standard
description: >
  **WORKFLOW SKILL** — Aplica os padrões de codificação C# do projeto ao escrever, alterar ou revisar código:
  compilador e análise (C# 14, Nullable, sem `!` e sem `#pragma warning disable`), idioma e nomes (domínio em
  português, padrão técnico em inglês, siglas em PascalCase), C# moderno (construtor primário, pattern matching,
  `sealed`, Flunt, `TimeProvider`, `CancellationToken`, log estruturado), estilo (Allman, 120 colunas, só
  comentário XML, ordem dos membros, `var`, `using`), testes (xUnit v3, Moq, Fluent Assertions, AAA) e a
  imposição no build (`.editorconfig`, `Directory.Build.props`). Os padrões completos ficam em `references/`,
  carregados por tema; no projeto, `docs/padroes-codigo/` prevalece sobre a cópia da skill. Não refatora
  código que a tarefa não tocou, não altera a configuração do build sem pedido, não versiona por iniciativa
  própria.
  USE FOR: escrever ou alterar código C# do projeto; escrever testes de unidade; revisar um diff contra os
  padrões de código; conferir nomes, estilo, comentários e mensagens; configurar `.editorconfig` e analisadores.
  DO NOT USE FOR: arquitetura e escolha de camadas; estratégia de testes, cobertura e rastreabilidade da RN
  (é `testes.md` do projeto); revisão de segurança ou de performance; código que não é C#; reescrever código
  antigo sem relação com a tarefa.
  Triggers: "padrões de código", "padrão de código C#", "siga os padrões", "revisar o estilo", "nomes e
  comentários", "code style", "coding standards", "editorconfig", "padrão de teste".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.2"
---

# fsd-csharp-code-standard — Padrões de codificação C#

O código C# que sai desta skill tem a forma que o projeto manda: nomes, estilo, comentários, mensagens e
testes. Os padrões são a referência de codificação; esta skill os põe em prática, sem reabrir a discussão.

Os padrões são os do `my-project-api`. Em outro projeto, só vale se ele adotou os mesmos padrões; na
dúvida, pergunte ao humano antes de aplicar. O comentário `//` proibido é o do código C#: arquivos de
configuração (`.editorconfig`, `.csproj`, `.props`) mantêm o comentário do próprio formato.

## Regras

1. **O projeto manda.** Se o repositório tem `docs/padroes-codigo/`, leia os arquivos de lá: eles prevalecem
   sobre a cópia em `references/padroes/`. Sem a pasta, use a cópia. Divergência entre os dois: siga o projeto e
   avise o humano

2. **Leia o tema antes de escrever.** Carregue só o arquivo do tema da tarefa (tabela abaixo). Não escreva de
   memória um detalhe que o arquivo define

3. **Duas regras do projeto vencem qualquer exemplo dos padrões:** siglas do domínio em PascalCase, como
   palavra (`Cnpj`, `Cpf`, `NumeroBl`, `Dte`, `Ctis`, `Sgtap`), e mensagem de validação ou de recusa da RN
   com o texto do legado (`"Informe a viagem."`, `"Viagem duplicada, favor verificar!"`), inclusive a pontuação

4. **Os exemplos são ilustrativos.** `Entidade`, `Documento`, `Response`, `Error` e `ErrorType` são fictícios:
   copie a forma, não o nome

5. **Só o código da tarefa.** Aplique os padrões ao que você escreve ou altera. Não reformate nem renomeie
   código vizinho que a tarefa não tocou; se achar desvio, cite no relatório

6. **Sem supressão para passar.** Nada de `#pragma warning disable` nem de `!`. `[SuppressMessage]` só com
   `Justification`, no menor escopo (membro, não tipo)

7. **Não mude o build por conta própria.** `.editorconfig` e `Directory.Build.props` só mudam a pedido. Warning
   que o código novo gera é corrigido no código, não silenciado

8. **Nada de git.** Não versiona por iniciativa própria (`AI_GIT_POLICY`)

## Qual arquivo ler

| A tarefa envolve | Leia |
|---|---|
| Visão geral e a lista de todas as regras | [visao-geral.md](references/padroes/visao-geral.md) |
| Compilador, nulidade, supressão, idioma, nomes, texto das mensagens | [compilador-e-nomes.md](references/padroes/compilador-e-nomes.md) |
| Recursos do C#, log, tipagem (`record`, Flunt `Criar`), `sealed`, construtor primário, async, tempo, `CancellationToken`, `await using` | [csharp.md](references/padroes/csharp.md) |
| Formatação, quebra de linha, linhas em branco, comentário XML, declarações, ordem dos membros, `var`, desconstrução, `using` | [estilo.md](references/padroes/estilo.md) |
| Criar ou alterar uma classe de um caso de uso: handler, endpoint, request, query/command, filtro, resposta, repositório e seus testes | [classes.md](references/modelos/classes.md) |
| Teste de unidade (AAA, Moq, Fluent Assertions, nome do teste) | [testes.md](references/padroes/testes.md) |
| `.editorconfig`, severidade dos analisadores, propriedades do projeto | [build.md](references/padroes/build.md) |

Código de produção costuma pedir `compilador-e-nomes`, `csharp` e `estilo`. Teste acrescenta `testes`. Classe
de caso de uso (handler, repositório, request, query/command, endpoint) acrescenta `classes.md`.

## Modelos de classe

[classes.md](references/modelos/classes.md) traz a forma de cada papel, tirada da funcionalidade
`DadosBase/Navios`. O **handler** é o modelo central: `internal sealed class` com construtor primário, um único
`HandleAsync(<query ou command>, CancellationToken cancellationToken = default)` que devolve `Result<T>`, `catch (DbException)`
que loga com template e devolve `new Result<T>(string.Empty, Result<T>.ServerErrorMessage)`, e sem SQL nem HTTP. A primeira linha do handler é `if (query.Invalid)` e, na linha de baixo, `return new Result<T>(query.Notifications);`: o
`Query`/`Command` (`internal sealed class : Notifiable`) valida a entrada no construtor, em C#, sem `Contract` e sem
DataAnnotations, e tem o `ExecutarAsync` estático que o endpoint chama. A leitura do banco é por `IOracleReader`,
aberto por `IOracleConnectionFactory`. O status HTTP é exclusivo do `Result<T>`: o handler escolhe o construtor (`new Result<T>()` 201,
`new Result<T>(obj)` 200, `new Result<T>(itens, (1, 10, 353))` 200, `new Result<T>(notifications)` 400,
`new Result<T>("Id", mensagem)` 404, `new Result<T>(string.Empty, mensagem)` 500) e nunca o código. Classe nova de um caso de uso
copia a forma do papel, trocando só os nomes do domínio; não invente uma forma diferente.

## Scripts, templates e agente

| Preciso de | Use |
|---|---|
| Conferir o que o analisador do build não pega (`//`, `!`, `.Result`, `DateTime.Now`, 120 colunas, log interpolado, DataAnnotations, `HandleAsync` sem `Invalid` na primeira linha, `Result` sem `<T>`, DataAnnotations, `== null`, método assíncrono sem `Async`) | `python <skill>/scripts/conferir.py <arquivo-ou-pasta>`: uma linha `arquivo:linha: regra -> forma correta` por desvio. Regex sobre o texto sem strings: confirme cada achado no código |
| Saber se a cópia dos padrões saiu de sincronia com o projeto | `python <skill>/scripts/sincronia.py <projeto>/docs/padroes-codigo`: só lê e lista o que divergiu, ignorando o prefixo `padroes-codigo-` das referências |
| O código de referência do `Result<T>` (construtores, status, `ServerErrorMessage`) | [Result.cs](templates/Result.cs). `Pagination` e `ToActionResult()` ficam no `Platform` do projeto: não são da skill |
| Entregar a lista de desvios de uma revisão | [relatorio-desvios.md](templates/relatorio-desvios.md) |
| Uma segunda leitura independente do diff | o agente [fsd-revisor-padroes](agents/fsd-revisor-padroes.md): só lê e devolve o relatório. Instalar: copiar `agents/*.md` para `.claude/agents/` do projeto ou do usuário |

Python 3, só biblioteca padrão.

## Fluxo

**Escrever ou alterar código**

1. Leia os arquivos dos temas da tarefa
2. Escreva o código já na forma do padrão
3. Rode `scripts/conferir.py` e a conferência abaixo no que você escreveu
4. Compile (`dotnet build`). Se o build tem `EnforceCodeStyleInBuild`, os warnings `IDE*` e `CS1591` do código
   novo precisam sair zerados
5. Rode os testes do que mudou só se nenhum abre conexão com banco. Se algum abre, não rode: apresente o
   comando e peça a autorização `#NNN` (`SQL_AUTORIZACAO_CODIGO`)

**Revisar um diff**

1. Rode `scripts/conferir.py` no diff e leia os arquivos dos temas que ele toca
2. Para cada desvio, registre `arquivo:linha`, a regra violada e a forma correta, nesta ordem de gravidade:
   proibições (`!`, `#pragma`, `async void`, `.Result`, `DateTime.Now`, comentário `//`), nomes e idioma,
   async e cancelamento, estilo
3. Não reporte preferência pessoal que o padrão não define. Diff sem desvio é resultado legítimo
4. As regras de `compilador-e-nomes`, `csharp`, `estilo` e `testes` valem sempre. O modelo de classe
   ([classes.md](references/modelos/classes.md): `Result<T>`, `try`/`catch (DbException)` do handler,
   `IOracleReader`, nome da interface, pasta do caso de uso) só é cobrado quando o projeto o adota, isto é, quando
   `docs/padroes-codigo/` ou as classes de caso de uso já existentes seguem a mesma forma. Sem isso, cite como
   observação e não como desvio

## Conferência rápida

Resumo de apoio, não substitui os arquivos de `references/`: em caso de conflito, vale o arquivo. O que o
analisador do build **não** pega e a revisão precisa conferir:

- sem comentário `//` nem `/* */`, sem código comentado, sem `TODO`/`FIXME`/`HACK`
- sem `!` (null-forgiving) e sem `#pragma warning disable`
- idioma de cada nome composto (`<TermoDoDomínio><PadrãoEmInglês>`): regra de negócio em português, o restante em
  inglês. Confira tipo por tipo e membro por membro: `NavioRepository`, não `NavioRepositorio`;
  `ListarNavioUseCase`, não `ListNavioUseCase`; `NavioNaoEncontradoException`, não `ShipNotFoundException`. Termo do
  domínio traduzido para inglês e padrão técnico traduzido para português são desvios
- nomes: domínio em português (caso de uso com verbo em português: `ListarNavios`), padrão técnico em inglês, siglas em PascalCase, `Async` em todo método
  assíncrono (inclusive teste), lambda com nome completo, booleano em forma de afirmação
- mensagem nova: `$"Campo {nameof(Nome)} é obrigatório."`; mensagem do legado: texto original
- `DateTime.Now`, `DateTime.UtcNow` e `DateTimeOffset.Now` fora do `TimeProvider`; sem `.Result`, `.Wait()`
  nem `async void`
- `CancellationToken cancellationToken = default` por último e repassado a toda chamada que aceita um
- dependência capturada uma vez em campo `_camelCase`; o corpo usa o campo, não o parâmetro do construtor
- classe concreta `sealed`; DTO como `sealed record`; valor com invariante como `sealed class : Notifiable`
  com `Criar`
- UTF-8 sem BOM; `is null`/`is not null`; no máximo 120 colunas; linha em branco antes do `return` final (colado dentro de `if`); membros na ordem
  campos, propriedades, construtores, operadores, métodos (`public` antes de `private`)
- validação negativa primeiro: cada condição de falha vira um `if` que devolve na hora, todos no mesmo nível, e o
  caminho feliz fica por último; sem `if` aninhado para o sucesso (alongamento horizontal) e sem `else` depois de
  `return`
- `Result<T>`: nenhum status escolhido por quem instancia (sem `Result.NotFound`, `Result.Validacao`, status como
  argumento ou propriedade); 404 com campo preenchido, 500 com `string.Empty`
- classe de caso de uso na forma do papel: handler sem SQL e sem HTTP, repositório sem `catch` nem log, SQL só
  por bind e lista fechada, endpoint só delega, request como `sealed record` sem atributo de validação, query/command `: Notifiable` que valida no
  construtor (sem `Contract` e sem DataAnnotations), handler com `HandleAsync` e `Invalid` na primeira linha,
  repositório que só lê por `IOracleReader`
- teste: AAA sem comentário, `sealed`, `<Method>_<Cenario>_<Result>`, `TestContext.Current.CancellationToken`,
  sem `Thread.Sleep`, sem Mock do domínio
