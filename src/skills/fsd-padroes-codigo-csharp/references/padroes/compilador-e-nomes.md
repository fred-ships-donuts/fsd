# Compilador e análise

C# 14, com Nullable e ImplicitUsings habilitados.

Regras:

- Warning não bloqueia o build (`TreatWarningsAsErrors` desligado).
- Supressão de warning só com `[SuppressMessage]` e `Justification`, no menor escopo (membro, não tipo). `#pragma warning disable` é proibido.
- `!` (null-forgiving) é proibido. Se o compilador não prova a não nulidade, reestruture com pattern matching ou guarda.

```csharp
[SuppressMessage("Design", "CA1031", Justification = "O middleware converte qualquer falha em resposta 500.")]
public async Task InvokeAsync(HttpContext context)
```

| Não faça | Faça |
|---|---|
| `#pragma warning disable CA1031` | `[SuppressMessage("Design", "CA1031", Justification = "...")]` no membro |
| `[SuppressMessage(...)]` na classe inteira | `[SuppressMessage(...)]` só no membro que precisa |
| `var nome = entidade!.Nome;` | `if (entidade is not { } encontrada)`, o `return` na linha de baixo, e depois `encontrada.Nome` |

## Idioma e nomes

Domínio em português, padrão técnico em inglês. O nome composto junta os dois: `<TermoDoDomínio><PadrãoEmInglês>`.

- `Entidade` + `Service` → `EntidadeService`
- `Entidade` + `Repository` → `IEntidadeRepository`
- `Documento` + `Extensions` → `DocumentoExtensions`
- `EntidadeInativada` + `Exception` → `EntidadeInativadaException`

Como decidir: a palavra existe no glossário do negócio, é português. Nomenclatura comum a qualquer sistema, é inglês.

Confira os dois lados em todo nome novo: o termo do domínio não vai para inglês e o padrão técnico não vai para português.

| Não faça | Faça |
|---|---|
| `NavioRepositorio`, `INavioRepositorio` | `NavioRepository`, `INavioRepository` |
| `ListNavioUseCase`, `ListShipsUseCase` | `ListarNavioUseCase` |
| `ShipRepository`, `ShipNotFoundException` | `NavioRepository`, `NavioNaoEncontradoException` |
| `NavioServico`, `NavioValidador` | `NavioService`, `NavioValidator` |

O escopo de um `Repository` é definido pela arquitetura: um por funcionalidade, expondo uma interface por caso de uso, nunca por entidade nem genérico. Os exemplos `IEntidadeRepository` deste guia são ilustrativos.

### Membros e código

| Elemento | Padrão | Exemplo |
|---|---|---|
| Campo `private` ou `internal` | `_camelCase` (instância), `s_camelCase` (estático) | `_repository`, `s_formato` |
| Constante | PascalCase | `SqlGet` |
| Propriedade, método e evento | PascalCase | `Documento`, `Inativar` |
| Variável local e parâmetro | camelCase; parâmetro de record posicional em PascalCase, porque vira propriedade | `idEntidade`; `record Request(string? Nome)` |
| Parâmetro de lambda | Nome completo, nunca uma letra | `repository => repository.GetByIdAsync(...)` |
| Método de ação do negócio | Verbo do domínio, em português | `Inativar`, `ModificarDescricao`, `InativarAsync` |
| Método técnico (persistência, infraestrutura, framework) | Verbo em inglês | `GetByIdAsync`, `AddAsync`, `ExecuteAsync` |
| Booleano | Afirmação que se responde com sim ou não; nunca `flag`, `check` ou `status` | `IsEmpty`, `IsSuccess`, `saoIguais`, `existeDocumento` |
| Enum | Singular, membros em PascalCase; plural só com `[Flags]` | `StatusEntidade { Ativa, Inativa }` |
| Método assíncrono | Sufixo `Async` em todo método assíncrono, inclusive teste, exceto o nome imposto pela biblioteca (`Process`) | `GetByIdAsync(id, cancellationToken)` |
| Método com termo do domínio | `<VerboEmInglês>By<Termo>Async` | `ExistsByDocumentoAsync` |
| Alias de `using` | Tipo + contexto | `EntidadeDominio` |
| Siglas | PascalCase, como palavra, no domínio e na parte técnica | `Cpf`, `ValidarCnpj`, `ExistsByCpfAsync`, `NumeroBl`, `HttpContext`, `SqlGet` |

| Não faça | Faça |
|---|---|
| `private readonly IEntidadeRepository repository;` | `private readonly IEntidadeRepository _repository;` |
| `private static readonly Regex _formato` | `private static readonly Regex s_formato` |
| `private const string SQL_GET` | `private const string SqlGet` |
| `public async Task<Entidade?> GetById(long id)` | `public async Task<Entidade?> GetByIdAsync(long id, CancellationToken cancellationToken = default)` |
| `_repository.Setup(r => r.GetByIdAsync(...))` | `_repository.Setup(repository => repository.GetByIdAsync(...))` |
| `var flag = existe;` | `var existeDocumento = existe;` |
| `public enum StatusesEntidade` | `public enum StatusEntidade` |
| `ValidarCPF`, `HTTPContext` | `ValidarCpf`, `HttpContext` |
| `GetEntidadeAsync` para buscar por documento | `GetByDocumentoAsync` |
| `InactivateEntity()` | `Inativar()` |

### Testes

| Elemento | Padrão | Exemplo |
|---|---|---|
| Classe de teste | `<Alvo>Tests` | `EntidadeServiceTests` |
| Método de teste | `<Method>_<Cenario>_<Result>`: `<Method>` é o nome do membro testado, como está no código; cenário no domínio; resultado em inglês; `Async` no fim quando o teste é assíncrono | `InativarAsync_EntidadeInexistente_ReturnsFalseAsync` |

### Limites da regra

- Vale para tipos, membros e arquivos.
- Nome imposto por biblioteca ou interface é mantido, inclusive o dos parâmetros: `Process(request, cancellationToken)`.
- Termos universais ficam como são: `Id`, `Login`, `Email`, `Cache`.
- Mensagens, logs e comentários XML são em português, inclusive o código de erro.

### Texto das mensagens

A mensagem de erro e de validação afirma a regra violada, em frase completa terminada em ponto. O campo é citado por `nameof`, nunca escrito no texto.

| Situação | Forma | Exemplo |
|---|---|---|
| Campo obrigatório | `Campo <campo> é obrigatório.` | `$"Campo {nameof(Nome)} é obrigatório."` |
| Valor fora da regra | `Campo <campo> inválido.` ou `<Termo> inválido.` | `$"Campo {nameof(Status)} inválido."`, `"Documento inválido."` |
| Estado que impede a ação | O estado atual | `"A entidade já está inativa."` |
| Não encontrado ou conflito | O fato | `"Entidade não encontrada."`, `"Já existe uma entidade com este documento."` |

**Exceção: texto do legado.** A mensagem que o legado já exibe, seja a recusa da regra de negócio ou a validação de entrada (`"Viagem duplicada, favor verificar!"`, `"Informe a viagem."`), mantém o texto original, inclusive a pontuação. A forma acima vale para a mensagem sem origem no legado.

| Não faça | Faça |
|---|---|
| `"Informe o nome."` (mensagem nova) | `$"Campo {nameof(Nome)} é obrigatório."` |
| `"Campo Nome é obrigatório."` | `$"Campo {nameof(Nome)} é obrigatório."` |
| `"Erro ao inativar"` | `"A entidade já está inativa."` |
| Reescrever `"Viagem duplicada, favor verificar!"` como `"A viagem já existe."` | Manter o texto do legado |

