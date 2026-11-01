# Padrões de código C#

Este é um arquivo pivô para os padrões de digitação de código C#: linguagem, estilo, nomes, comentários e a forma de cada trecho. Cada tema tem o seu arquivo, indicado na tabela. Os padrões são a referência de codificação do projeto. Os exemplos são ilustrativos: os nomes (`Entidade`, `Documento`) e as classes `Response`, `Error` e `ErrorType` são fictícios; o que vale é a forma.

Duas regras do projeto prevalecem sobre qualquer exemplo dos padrões:

- Siglas do domínio em PascalCase, como palavra (`Cnpj`, `Cpf`, `NumeroBl`, `Dte`, `Ctis`, `Sgtap`).
- Mensagens de validação e de recusa da RN com o texto do legado (`"Informe a viagem."`, `"Viagem duplicada, favor verificar!"`).

## Resumo

| Regra | Arquivo |
|---|---|
| C# 14 com Nullable e ImplicitUsings; sem `!` e sem `#pragma warning disable` | `compilador-e-nomes.md` |
| Domínio em português, padrão técnico em inglês; siglas em PascalCase (`Cpf`, `NumeroBl`) | `compilador-e-nomes.md` |
| Campo `_camelCase`, estático `s_camelCase`, constante em PascalCase, sufixo `Async` em método assíncrono | `compilador-e-nomes.md` |
| Parâmetro de lambda com nome completo; booleano em forma de afirmação | `compilador-e-nomes.md` |
| Mensagem afirma a regra violada, com o campo por `nameof`; a mensagem do legado mantém o texto original | `compilador-e-nomes.md` |
| Namespace de arquivo, construtor primário para dependências, expressão de coleção, pattern matching | `csharp.md` |
| Comparação de texto explícita; guarda de argumento por `ThrowIfNull` | `csharp.md` |
| Log com template constante e placeholders nomeados | `csharp.md` |
| Toda classe concreta é `sealed` | `csharp.md` |
| Valor com invariante: `sealed class : Notifiable`, construtor privado que valida, fábrica `Criar` | `csharp.md` |
| Endpoint Minimal API: dependência por parâmetro do delegate; o endpoint só delega | `csharp.md` |
| `async` de ponta a ponta, data e hora por `TimeProvider`, `CancellationToken` por último e sempre repassado | `csharp.md` |
| Chaves Allman, quatro espaços, 120 colunas, uma instrução por linha | `estilo.md` |
| Linha em branco antes do `return` final; dentro de `if`, colado | `estilo.md` |
| Validar os casos negativos primeiro e sair cedo, sem `if` aninhado nem `else` depois de `return` | `estilo.md` |
| Só comentário XML (`///`); `<summary>` em todo membro `public` e `protected` | `estilo.md` |
| Visibilidade explícita, sem `this.`, `int` em vez de `Int32`, `nameof` em vez de texto | `estilo.md` |
| Propriedade com `private set` ou `init`; campos, propriedades, construtores e métodos nessa ordem | `estilo.md` |
| `var` em toda variável local com tipo inferido; desconstrução com duas ou mais propriedades | `estilo.md` |
| `using` fora do namespace, `System` primeiro, um grupo por namespace raiz | `estilo.md` |
| Teste em AAA, sem comentário, nome `<Method>_<Cenario>_<Result>` | `testes.md` |
| `.editorconfig` e propriedades do projeto que impõem as regras no build | `build.md` |

A estratégia de testes (projetos, cobertura, rastreabilidade da RN) está em `testes.md`.
