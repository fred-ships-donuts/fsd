# C# moderno

Use o recurso da versão corrente quando ele simplifica o código. Não use só por usar.

## Recursos

| Recurso | Use para | Exemplo |
|---|---|---|
| Namespace de arquivo | Todo arquivo | `namespace X;`, nunca `namespace X { }` |
| Construtor primário | Classes com dependências injetadas | `internal sealed class EntidadeService(IEntidadeRepository repository)` |
| Expressão de coleção | No lugar de `new List<T>()`, `Array.Empty<T>()` e `new[] { }` | `IReadOnlyList<string> campos = [..origem, "Nome"];` |
| Pattern matching | Nulo, tipo e estado | `is null`, `is not { } entidade`, `switch` de expressão |
| Texto bruto `"""` | SQL e texto de várias linhas | `private const string Sql = """ SELECT ... """;` |
| `required` | Membro obrigatório de tipo com `init` | `public required string Nome { get; init; }` |
| `params` com coleção | No lugar de `params T[]` | `void Log(params ReadOnlySpan<string> campos)` |
| `System.Threading.Lock` | No lugar de `lock` sobre `object` | `private readonly Lock _lock = new();` |
| Palavra-chave `field` | Lógica no acessador sem campo de apoio | `public string Nome { get; private set => field = value.Trim(); }` |
| Bloco `extension` | Método e propriedade de extensão | `extension(string? texto) { public bool IsEmpty => ...; }` |
| Atribuição condicional nula | `objeto?.Propriedade = valor` | `options?.Timeout = TimeSpan.FromSeconds(30);` |
| Source generator | `Regex`; log em caminho muito executado | `[GeneratedRegex]`, `[LoggerMessage]` |

| Não faça | Faça |
|---|---|
| `namespace Solucao.Dominio { ... }` | `namespace Solucao.Dominio;` |
| `var campos = new List<string>();` | `List<string> campos = [];` |
| `return Array.Empty<string>();` | `return [];` |
| `var entidade = objeto as Entidade; if (entidade != null)` | `if (objeto is Entidade entidade)` |
| `if (entidade == null)` | `if (entidade is null)` |
| `private readonly object _lock = new();` | `private readonly Lock _lock = new();` |
| `"SELECT ID\n" + "FROM ENTIDADE"` | `""" SELECT ID FROM ENTIDADE """` em várias linhas |

Pattern matching: a checagem de nulo e a declaração no mesmo passo (`is not { } entidade`). Depois do `if`, a variável é não nula.

```csharp
if (await _repository.GetByIdAsync(id, cancellationToken) is not { } entidade)
    return false;
```

`switch` de expressão:

```csharp
var status = error.Type switch
{
    ErrorType.Error => StatusCodes.Status400BadRequest,
    ErrorType.NotFound => StatusCodes.Status404NotFound,
    ErrorType.Conflict => StatusCodes.Status409Conflict,
    _ => StatusCodes.Status500InternalServerError,
};
```

Bloco `extension`:

```csharp
/// <summary>Extensões de <see cref="string"/>.</summary>
public static class StringExtensions
{
    extension(string? texto)
    {
        /// <summary>Indica se o texto é nulo ou vazio.</summary>
        public bool IsEmpty => string.IsNullOrEmpty(texto);
    }
}
```

## Uso correto da plataforma

Guarda de argumento pelo método estático do framework:

```csharp
ArgumentNullException.ThrowIfNull(documento);
ArgumentException.ThrowIfNullOrEmpty(nome);
```

Comparação de texto sempre explícita, sem depender da cultura do servidor.

```csharp
texto.Equals(outro, StringComparison.OrdinalIgnoreCase);
texto.ToUpperInvariant();
```

| Não faça | Faça |
|---|---|
| `if (documento is null) throw new ArgumentNullException(nameof(documento));` | `ArgumentNullException.ThrowIfNull(documento);` |
| `texto.ToLower() == outro.ToLower()` | `texto.Equals(outro, StringComparison.OrdinalIgnoreCase)` |
| `texto.ToUpper()` | `texto.ToUpperInvariant()` |
| `texto.StartsWith("CPF")` | `texto.StartsWith("CPF", StringComparison.Ordinal)` |

Lista fechada de valores permitidos: o nome público mapeia para o valor interno, e o valor que o cliente envia nunca é repassado adiante.

```csharp
private static string? ColunaDeOrdenacao(string campo) => campo switch
{
    "nome" => "NOME",
    "criacao" => "CRIACAO",
    _ => null,
};
```

`field` é palavra contextual: um membro seu chamado `field` precisa de `@field` ou de outro nome.

## Log

`ILogger<T>` com `LogXxx` e template constante com placeholders nomeados: o valor vai como argumento, nunca dentro do texto.

| Proibido | Motivo |
|---|---|
| `_logger.LogInformation($"Entidade {idEntidade} inativada.");` | Interpolação: perde o campo estruturado |
| `_logger.LogInformation("Entidade " + idEntidade + " inativada.");` | Concatenação |
| `_logger.LogInformation(string.Format("Entidade {0} inativada.", idEntidade));` | Formatado antes do logger |
| `_logger.LogInformation("Entidade {0} inativada.", idEntidade);` | Placeholder numérico: o campo vira `0` |

Padrão:

```csharp
_logger.LogInformation("Entidade {IdEntidade} inativada em {OcorridoEm}.", idEntidade, ocorridoEm);
```

- Placeholder em PascalCase, com o nome do dado; um argumento por placeholder, na mesma ordem.
- O código depende só de `ILogger<T>`.
- A exceção é o primeiro argumento (`_logger.LogError(exception, "...", ...)`), nunca parte da mensagem.
- LGPD: nenhum dado pessoal nem secrets nos argumentos.

## Tipagem de dados

| Tipo | Forma | Exemplo |
|---|---|---|
| DTO, requisição, resposta e evento | `sealed record` posicional | `public sealed record InserirEntidadeRequest(string? Nome, string? Documento);` |
| Read model de consulta | `sealed record` posicional, nome `<Entidade>ReadModel` | `public sealed record NavioReadModel(long Id, string? Imo, string? Nome);` |
| Valor com invariante | `sealed class : Notifiable` (Flunt), construtor privado que valida, fábrica estática `Criar` | `public sealed class Cnpj : Notifiable` |
| Valor pequeno, sem invariante | `readonly record struct` | `public readonly record struct Coordenada(double Latitude, double Longitude);` |
| Conjunto fechado de valores | `enum` | `public enum StatusEntidade { Ativa, Inativa }` |

Exceção: a classe de linha (`internal`, em `Shared/` da `Infrastructure`) que um `*Repository` usa para ler o resultado do Dapper (por exemplo, `NavioRow`) é `sealed class` com propriedades `init`, e não `sealed record` posicional. O Dapper mapeia `record` pelo construtor e só o casa quando o tipo de cada coluna é exatamente o do parâmetro, e o `NUMBER` do Oracle não casa com `int` nem `long`. Com propriedades, o Dapper converte o tipo na leitura.

| Não faça | Faça |
|---|---|
| `public class EntidadeDto { public string? Nome { get; set; } }` | `public sealed record EntidadeDto(string? Nome);` |
| `public struct Coordenada { public double Latitude; ... }` | `public readonly record struct Coordenada(double Latitude, double Longitude);` |
| `public const string StatusAtiva = "A";` para um conjunto fechado | `public enum StatusEntidade { Ativa, Inativa }` |
| `public readonly struct Documento` com validação no construtor | `public sealed class Documento : Notifiable` com construtor privado e `Criar` |

O valor com invariante não é `struct`: o `default` do struct contornaria a validação do construtor.

A criação passa sempre pela fábrica `Criar`. O construtor é privado, valida e registra cada falha com `AddNotification` (Flunt), sem lançar exceção. Quem chama confere `Invalid` antes de usar o valor.

```csharp
/// <summary>CNPJ de um parceiro.</summary>
public sealed class Cnpj : Notifiable
{
    /// <summary>Somente os dígitos do CNPJ.</summary>
    public string Numero { get; }

    private Cnpj(string? texto)
    {
        var digitos = new string((texto ?? string.Empty).Where(char.IsDigit).ToArray());

        if (digitos.Length != 14)
            AddNotification(nameof(Numero), "CNPJ inválido.");

        Numero = digitos;
    }

    /// <summary>Cria o CNPJ. Se <see cref="Notifiable.Invalid"/>, a validação falhou.</summary>
    public static Cnpj Criar(string? texto) => new Cnpj(texto);
}
```

```csharp
var cnpj = Cnpj.Criar(request.Cnpj);

if (cnpj.Invalid)
    return new Result<Empresa>(cnpj.Notifications);
```

## `sealed`

Toda classe concreta é `sealed`, a menos que tenha sido projetada para ser herdada.

- Imposto pelo analisador CA1852.

| Não faça | Faça |
|---|---|
| `public class EntidadeService` | `public sealed class EntidadeService` |

## Construtor primário

Use nas classes que recebem dependências: serviços, repositórios, middleware e exceções.

Não use em classe que valida no construtor: o construtor primário não tem corpo.

Endpoint Minimal API: cada dependência (o handler, por exemplo) chega como parâmetro do delegate do endpoint, e o endpoint só delega ao `Query` ou ao `Command`.

```csharp
internal sealed class EntidadeService(
    IEntidadeRepository repository,
    ILogger<EntidadeService> logger)
    : IEntidadeService
{
    private readonly IEntidadeRepository _repository = repository;
    private readonly ILogger<EntidadeService> _logger = logger;

    /// <inheritdoc/>
    public async Task<bool> InativarAsync(long id, CancellationToken cancellationToken = default)
    {
        if (await _repository.GetByIdAsync(id, cancellationToken) is not { } entidade)
            return false;

        entidade.Inativar();

        if (!await _repository.UpdateAsync(entidade, cancellationToken))
            return false;

        _logger.LogInformation("Entidade {IdEntidade} inativada.", id);

        return true;
    }
}
```

Regras:

- Parâmetros em camelCase, sem `_`.
- Capture cada dependência uma única vez, num campo `private readonly` em `_camelCase`, e use o campo no corpo. O parâmetro só aparece nessa atribuição.
- Não reatribua o parâmetro nem o campo.
- Não exponha o parâmetro como propriedade pública (nos `record` posicionais, isso é o comportamento do próprio record).
- Parâmetro de construtor primário é para dependência. Estado que a classe mantém vira campo ou propriedade.

| Não faça | Faça |
|---|---|
| `await repository.GetByIdAsync(...)` usando o parâmetro no corpo | `await _repository.GetByIdAsync(...)` usando o campo |
| `EntidadeService(IEntidadeRepository _repository)` | `EntidadeService(IEntidadeRepository repository)` |
| `repository = outroRepository;` | Campo `private readonly`, atribuído só uma vez |
| `public IEntidadeRepository Repository => repository;` | Dependência fica `private` |

## Async, tempo e coleções

| Proibido | Padrão |
|---|---|
| `var agora = DateTime.UtcNow;` | `var agora = _timeProvider.GetUtcNow();` |
| `var entidade = _repository.GetByIdAsync(id).Result;` | `var entidade = await _repository.GetByIdAsync(id, cancellationToken);` |
| `public async void Execute() { }` | `public async Task ExecuteAsync(CancellationToken cancellationToken = default) { }` |
| `public List<string> Campos { get; }` | `public IReadOnlyList<string> Campos { get; }` |
| `using var connection = ...;` sobre tipo `IAsyncDisposable` | `await using var connection = ...;` |

- `async` de ponta a ponta: proibidos `.Result`, `.Wait()` e `async void`.
- Data e hora só por `TimeProvider`. Nada de `DateTime.Now`, `DateTime.UtcNow` nem `DateTimeOffset.Now`.
- Coleção em API pública: `IReadOnlyList<T>` ou `IReadOnlyCollection<T>`.
- Sem estado estático mutável.

## Cancelamento e liberação de recursos

`CancellationToken`:

- Todo método assíncrono recebe `CancellationToken cancellationToken = default` como último parâmetro (CA1068).
- O valor padrão é declarado igual na interface e na implementação.
- O token recebido é sempre repassado a toda chamada que aceita um (CA2016). `CancellationToken.None` só onde não existe token a repassar.
- Assinatura imposta pela biblioteca fica como a biblioteca define, sem `= default`: `Process(request, cancellationToken)`.
- Método de teste segue a assinatura do framework de teste e não recebe o token: usa `TestContext.Current.CancellationToken`.

`await using`:

- Recurso que implementa `IAsyncDisposable` (conexão, transação, stream) é liberado com `await using`.
- Use a declaração (`await using var x = ...;`), que libera ao fim do escopo. O bloco `await using (...) { }` só quando o recurso precisa ser liberado antes do fim do método.
- `using` síncrono só para tipo que implementa apenas `IDisposable`.

```csharp
/// <inheritdoc/>
public async Task<long> AddAsync(Entidade entidade, CancellationToken cancellationToken = default)
{
    await using var connection = await _dataSource.OpenConnectionAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

    var id = await InsertAsync(connection, transaction, entidade, cancellationToken);

    await transaction.CommitAsync(cancellationToken);

    return id;
}
```

| Não faça | Faça |
|---|---|
| `Task<long> AddAsync(CancellationToken cancellationToken, Entidade entidade)` | `Task<long> AddAsync(Entidade entidade, CancellationToken cancellationToken = default)` |
| `await _repository.GetByIdAsync(id);` dentro de método que recebeu o token | `await _repository.GetByIdAsync(id, cancellationToken);` |
| `= default` na implementação e sem `= default` na interface | `= default` igual nas duas |
| `await using (var connection = ...) { ... }` até o fim do método | `await using var connection = ...;` |

