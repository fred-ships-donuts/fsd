# Modelos de classe por papel

Cada papel de uma funcionalidade tem uma forma. Os modelos abaixo vêm da funcionalidade `DadosBase/Navios` do
`GestaoCaptacao.Application` e do `GestaoCaptacao.Infrastructure` e são o exemplo a seguir: código novo de um caso de uso copia a forma do papel,
trocando os nomes. Os padrões gerais (nomes, estilo, comentário XML, async) continuam valendo e estão nos
demais arquivos; aqui fica só o que é próprio de cada classe.

Se o repositório tiver uma funcionalidade mais recente que contradiga um modelo, siga o código do projeto e
avise o humano.

## Organização do caso de uso

Vertical Slice, com consultas e comandos separados: na `Application`,
`Features/<Funcionalidade>/{Consultas,Comandos}/<CasoDeUso>/`, um arquivo por tipo, o nome do arquivo igual ao do
tipo. O repositório da funcionalidade fica na `Infrastructure`, em `Features/<Funcionalidade>/`.

```
Application/Features/DadosBase/Navios/
├── NaviosEndpoints.cs              grupo de rotas da funcionalidade
├── Shared/
│   └── NavioReadModel.cs           read model usado pela lista e pelo detalhe
└── Consultas/
    ├── ListarNavios/
    │   ├── ListarNaviosEndpoint.cs     rota do caso de uso
    │   ├── ListarNaviosRequest.cs      parâmetros HTTP da consulta
    │   ├── ListarNaviosQuery.cs        consulta: valida a entrada e a entrega ao handler
    │   ├── ListarNaviosHandler.cs      caso de uso
    │   ├── ListarNaviosFiltro.cs       filtro que o handler entrega ao repositório
    │   └── IListarNaviosRepository.cs  só o que o caso de uso usa do repositório
    └── ObterNavio/
        ├── ObterNavioEndpoint.cs
        ├── ObterNavioQuery.cs          só o identificador: sem Request
        ├── ObterNavioHandler.cs
        └── IObterNavioRepository.cs

Infrastructure/Features/DadosBase/Navios/
├── NaviosRepository.cs             acesso ao Oracle (Dapper); implementa as interfaces dos casos de uso
└── Shared/
    └── NavioSql.cs                 trechos de SQL usados por mais de uma consulta
```

- O nome do caso de uso é o verbo em português mais o termo do domínio (`Listar<Entidades>`, `Obter<Entidade>`,
  `Cadastrar<Entidade>`); o sufixo técnico é em inglês (`Endpoint`, `Request`, `Query`, `Command`, `Handler`,
  `Repository`, `ReadModel`). Caso de uso que só lê fica em `Consultas/` e tem `Query`; o que altera o banco fica
  em `Comandos/` e tem `Command`.
- Repositório por funcionalidade (`<Funcionalidade>Repository`), sem repositório genérico nem por entidade. Cada
  caso de uso declara a própria interface estreita (`I<CasoDeUso>Repository`) na sua pasta, e o repositório da
  funcionalidade implementa todas. Os comandos têm repositório próprio, separado do das consultas.
- `Shared/` guarda o que mais de um caso de uso da funcionalidade usa. Uma funcionalidade só usa de outra
  o que está em `Features/<Outra>/Shared`.
- Visibilidade: handler, query, command, endpoint, repositório e SQL auxiliar são `internal`. Request, filtro,
  read model e a interface do repositório são `public` (a interface, porque a implementação fica em outro
  projeto).
- Testes em `tests/GestaoCaptacao.Tests/Application/Features/<Funcionalidade>/` (handler, query) e
  `tests/GestaoCaptacao.Tests/Infrastructure/Features/<Funcionalidade>/` (repositório, SQL), com a mesma estrutura.

## Fluxo

1. O endpoint recebe a `Request` (ou o identificador da rota) e chama o `ExecutarAsync` **estático** do `Query` ou
   do `Command`.
2. O `ExecutarAsync` do `Query` instancia a consulta a partir da request e chama `handler.HandleAsync(query, ...)`.
3. O construtor do `Query`/`Command` valida o formato e a obrigatoriedade da entrada em C# e registra as falhas
   como notificações do Flunt (`AddNotification`), sem `Contract` e sem DataAnnotations.
4. A primeira linha do handler devolve as notificações quando o `Query`/`Command` é `Invalid`.
5. O handler monta o filtro, chama o repositório e devolve um `Result<T>`; o endpoint traduz com `ToActionResult()`.

## Handler

O caso de uso: orquestra o fluxo e devolve um `Result<T>`. Não tem interface, não é mediator, e a classe não tem
regra de HTTP.

```csharp
/// <summary>Caso de uso que obtém o detalhe de um navio.</summary>
internal sealed class ObterNavioHandler(
    IUserContext context,
    IObterNavioRepository repository,
    ILogger<ObterNavioHandler> logger)
{
    private readonly IUserContext _context = context;
    private readonly IObterNavioRepository _repository = repository;
    private readonly ILogger<ObterNavioHandler> _logger = logger;

    /// <summary>Obtém o navio da <paramref name="query"/> já válida.</summary>
    /// <param name="query">Consulta com o identificador do navio.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>
    /// O detalhe do navio, os erros de validação, 404 quando não existe, ou o erro de servidor quando a base falha.
    /// </returns>
    public async Task<Result<NavioReadModel>> HandleAsync(
        ObterNavioQuery query,
        CancellationToken cancellationToken = default)
    {
        if (query.Invalid)
            return new Result<NavioReadModel>(query.Notifications);

        try
        {
            if (await _repository.GetAsync(_context.Database, query.Id, cancellationToken) is not { } navio)
                return new Result<NavioReadModel>(nameof(query.Id), $"Navio {query.Id} não encontrado.");

            return new Result<NavioReadModel>(navio);
        }
        catch (DbException exception)
        {
            _logger.LogError(
                exception,
                "Falha ao obter o navio {NavioId} no banco {Database}.",
                query.Id,
                _context.Database);

            return new Result<NavioReadModel>(string.Empty, Result<NavioReadModel>.ServerErrorMessage);
        }
    }
}
```

Regras do handler:

- `internal sealed class`, construtor primário e uma dependência por campo `private readonly _camelCase`. O
  banco da requisição vem de `IUserContext.Database`, passado ao repositório.
- Um único método público, `HandleAsync(<query ou command>, CancellationToken cancellationToken = default)`,
  devolvendo `Task<Result<T>>`, em que `T` é o tipo da resposta (`NavioReadModel`).
- A primeira linha é `if (query.Invalid)` e, na linha de baixo, `return new Result<T>(query.Notifications);`: o handler confere a
  validação, mas não a refaz.
- Falha esperada é `Result<T>`, nunca exceção, e o handler nunca escolhe o status: o construtor do `Result<T>`
  usado define o código (ver "Result"). Não encontrado: `new Result<T>(nameof(query.Id), $"<Entidade> {query.Id} não encontrado.")`.
- Falha de base: `catch (DbException exception)` registra `LogError(exception, "<template>", ...)` com o banco e
  o identificador do dado, e devolve `new Result<T>(string.Empty, Result<T>.ServerErrorMessage)`. Só `DbException`: a
  exceção inesperada propaga para o middleware.
- Paginação: o handler monta o filtro com `Offset = (page - 1) * pageSize` e `Limit = pageSize + 1`, devolve
  `Take(pageSize)` (o `Result<T>` recebe a coleção e a paginação) e passa na tupla se há próxima página: `(page, pageSize, navios.Count > pageSize)`. A tupla
  também aceita `(página, tamanho, total)`, como `(1, 10, 353)`.
- A busca é normalizada no handler (`SearchText.Normalize(query.Search)`) antes de ir ao filtro.
- Sem SQL, sem tipo de HTTP e sem `DateTime.Now` (use `TimeProvider`).

### Handler que grava

O handler que cria ou altera dado segue a mesma forma, com um `Command` no lugar do `Query`. A regra de domínio é
validada pela fábrica `Criar` (Flunt): `Invalid` devolve o 400 com as notificações, antes de tocar o banco. O
sucesso sem corpo é `new Result<T>()` (201). Este modelo vem das regras acima, não de um arquivo do projeto: se uma
funcionalidade gravadora mais recente contradisser, siga o código do projeto e avise o humano.

```csharp
/// <summary>Caso de uso que cadastra um navio.</summary>
internal sealed class CadastrarNavioHandler(
    IUserContext context,
    ICadastrarNavioRepository repository,
    ILogger<CadastrarNavioHandler> logger)
{
    private readonly IUserContext _context = context;
    private readonly ICadastrarNavioRepository _repository = repository;
    private readonly ILogger<CadastrarNavioHandler> _logger = logger;

    /// <summary>Cadastra o navio do <paramref name="command"/> já válido.</summary>
    /// <param name="command">Comando com os dados do navio.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>201 sem corpo, 400 com as notificações, ou o erro de servidor quando a base falha.</returns>
    public async Task<Result<Navio>> HandleAsync(
        CadastrarNavioCommand command,
        CancellationToken cancellationToken = default)
    {
        if (command.Invalid)
            return new Result<Navio>(command.Notifications);

        var navio = Navio.Criar(command.Nome, command.CodigoImo);

        if (navio.Invalid)
            return new Result<Navio>(navio.Notifications);

        try
        {
            await _repository.CreateAsync(_context.Database, navio, cancellationToken);

            return new Result<Navio>();
        }
        catch (DbException exception)
        {
            _logger.LogError(
                exception,
                "Falha ao cadastrar o navio {Nome} no banco {Database}.",
                command.Nome,
                _context.Database);

            return new Result<Navio>(string.Empty, Result<Navio>.ServerErrorMessage);
        }
    }
}
```

- A gravação fica dentro do `try`, e o `catch` é só de `DbException`, como no handler de leitura.
- Os dois 400 saem antes do `try`: validar não abre conexão.
- O repositório de gravação devolve `Task` (ou o identificador gerado, quando o corpo precisar dele), nunca `Result<T>`.

## Result

O `Result<T>` (`sealed class Result<T> : Notifiable where T : class`, `Notifiable` do Flunt) é a única classe que
conhece o código HTTP. `T` é o tipo do conteúdo de retorno. Quem o instancia escolhe só o tipo de retorno: o
construtor usado define o `Status` de forma implícita. Não existe parâmetro, propriedade com setter, método de
fábrica nem `enum` próprio para escolher o status, e o código novo não cria um.

| Retorno | Código | Status |
|---|---|---|
| Sucesso sem dados | `return new Result<Navio>();` | 201 |
| Sucesso com um objeto | `return new Result<Navio>(navio);` | 200 |
| Sucesso com coleção paginada | `return new Result<NavioReadModel>(itens, (1, 10, 353));` | 200 |
| Erro de validação | `return new Result<Navio>(notifications);` | 400 |
| Recurso não encontrado | `return new Result<Navio>("Id", $"Navio {id} não encontrado.");` | 404 |
| Erro de operação no banco | `return new Result<Navio>(string.Empty, Result<Navio>.ServerErrorMessage);` | 500 |

- Membros de leitura: `Content` (`IReadOnlyCollection<T?>`, vazio nos erros e no sucesso sem dados),
  `Pagination` (nula quando não há), `Status` (`HttpStatusCode`), `IsSuccess` (status abaixo de 400) e
  `IsFailure`. As notificações vêm do `Notifiable` (`Notifications`, `Invalid`).
- `new Result<T>(content)` recebe o objeto único e o guarda em `Content`; a coleção só entra pelo construtor com
  paginação (`items`, `pagination`).
- `notifications` é a coleção de `Notification` do Flunt (a `Notifications` de um `Notifiable`, como a do `Query`).
- A paginação é um `Pagination`, passado por tupla `(página, tamanho, próxima página)` ou
  `(página, tamanho, total)`, como `(1, 20, 102)`.
- O construtor `(campo, mensagem)` registra uma `Notification` e o campo decide o status: campo preenchido é
  "não encontrado" (404); campo vazio (`string.Empty`) é erro de servidor (500). Por isso o 404 leva sempre o nome
  do campo, e o 500 nunca.
- A mensagem do 500 é uma só para toda falha de base: `Result<T>.ServerErrorMessage` ("Ocorreu um erro ao
  executar a operação."), nunca um texto novo por handler e nunca detalhe interno (`ORA-`, SQL, nome de banco).
- Nome do campo do 404 em PascalCase, como o campo da consulta (`"Id"`). A mensagem afirma o fato, com o
  identificador, em frase completa terminada em ponto.
- Não crie `Result<T>.NotFound(...)`, `Result<T>.Validacao(...)`, `new Result<T>(status, ...)` nem
  `result.Status = ...`. Se o caso não cabe em nenhum dos seis retornos, o novo retorno é decisão da classe
  `Result<T>`: leve ao humano.

## Endpoint e grupo de rotas

O endpoint só recebe a requisição e delega ao `Query` ou ao `Command`, sem regra de negócio. É `internal static
class` com um bloco `extension` (C# 14) sobre `IEndpointRouteBuilder` e um método `Map<CasoDeUso>` que devolve o
próprio `routes`. O `<param>` de `routes` vai no bloco `extension`; o método, por ser `public`, leva `<summary>` e
`<returns>`.

```csharp
internal static class ObterNavioEndpoint
{
    /// <param name="routes">Construtor de rotas.</param>
    extension(IEndpointRouteBuilder routes)
    {
        /// <summary>Mapeia o endpoint que obtém o detalhe de um navio.</summary>
        /// <returns>O próprio construtor de rotas.</returns>
        public IEndpointRouteBuilder MapObterNavio()
        {
            routes.MapGet(
                "/{id:long}",
                async (long id, ObterNavioHandler handler, CancellationToken cancellationToken) =>
                    (await ObterNavioQuery.ExecutarAsync(handler, id, cancellationToken)).ToActionResult());

            return routes;
        }
    }
}
```

- O handler chega como parâmetro da lambda; a request com vários campos de consulta usa `[AsParameters]` e vai
  ao `ExecutarAsync` do `Query`.
- O resultado é sempre traduzido por `.ToActionResult()`, um único método sobre `Result<T>` que serve a objeto
  único e a lista paginada. Ele traduz só os cinco status que o `Result<T>` produz: 200, 201, 400, 404 e 500. Não
  existe tradução para outro status (403, 409, 422): quem instancia o `Result<T>` não o escolhe, e um novo retorno é
  decisão da classe `Result<T>`.
- O `CancellationToken` da lambda é repassado ao `ExecutarAsync`.
- O grupo da funcionalidade (`NaviosEndpoints`) cria o `MapGroup` e chama o `Map<CasoDeUso>` de cada caso de uso.
  A validação não é filtro de endpoint: está no construtor do `Query`/`Command`.
- Endpoint não leva teste individual; a tradução para HTTP é testada uma vez, no `Platform`.

## Request

Dados HTTP do caso de uso: `public sealed record` posicional, com valor padrão nos parâmetros opcionais e **sem**
atributo de validação. A validação é do `Query`/`Command`.

```csharp
/// <summary>Parâmetros HTTP da consulta da lista de navios.</summary>
/// <param name="Search">Texto procurado no nome do navio e no número IMO.</param>
/// <param name="Status">Filtro de status: <c>ativo</c> (padrão), <c>inativo</c> ou <c>todos</c>.</param>
/// <param name="Page">Número da página, a partir de 1.</param>
public sealed record ListarNaviosRequest(
    string? Search = null,
    string Status = "ativo",
    int Page = 1)
{
    /// <summary>Quantidade de navios por página quando o cliente não informa.</summary>
    public const int DefaultPageSize = 20;
}
```

- Um `<param>` por parâmetro, em português, com o valor padrão e a lista de valores permitidos.
- Limites e padrões numéricos são `public const` do próprio record, com `<summary>`; o `Query` os usa na validação.
- Caso de uso sem corpo nem parâmetros de consulta (só o identificador da rota) não tem `Request`.

## Query e Command

Valida a entrada e a entrega ao handler. `internal sealed class : Notifiable` (Flunt 1.x), com propriedades só de
leitura, construtor que valida e um `ExecutarAsync` estático.

```csharp
/// <summary>Consulta do detalhe de um navio: valida a entrada e a entrega ao handler.</summary>
internal sealed class ObterNavioQuery : Notifiable
{
    /// <summary>Identificador do navio.</summary>
    public long Id { get; }

    /// <summary>Valida a entrada; as falhas ficam em <see cref="Notifiable.Notifications"/>.</summary>
    /// <param name="id">Identificador do navio.</param>
    public ObterNavioQuery(long id)
    {
        if (id < 1)
            AddNotification(nameof(Id), $"Campo {nameof(Id)} inválido.");

        Id = id;
    }

    /// <summary>Instancia a consulta a partir da requisição e a entrega ao handler.</summary>
    /// <param name="handler">Handler do caso de uso.</param>
    /// <param name="id">Identificador do navio.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>O detalhe do navio, ou os erros de validação.</returns>
    public static Task<Result<NavioReadModel>> ExecutarAsync(
        ObterNavioHandler handler,
        long id,
        CancellationToken cancellationToken = default)
    {
        var query = new ObterNavioQuery(id);

        return handler.HandleAsync(query, cancellationToken);
    }
}
```

- A validação é **em código C#**, no construtor, e registra cada falha por `AddNotification(nameof(Campo), mensagem)`.
  Nada de `Contract` do Flunt, de DataAnnotations nem de FluentValidation.
- A mensagem nova segue `Campo <campo> inválido.` ou `Campo <campo> é obrigatório.` com `nameof`; a mensagem do
  legado mantém o texto original.
- Lista fechada (status, coluna, sentido): `static readonly IReadOnlyList<string> s_statuses = [...]` e
  `if (!s_statuses.Contains(status, StringComparer.Ordinal)) AddNotification(...)`. O nome público nunca vira SQL
  direto (ver Repositório).
- Em consulta com `Request`, o `ExecutarAsync` desconstrói a request (`var (search, status, ...) = request;`),
  instancia o `Query` e chama o handler.
- Cada falha de validação é um teste do construtor (ver "Teste do Query").

## Filtro

O que o handler entrega ao repositório: `public sealed record` posicional com os valores já validados e
normalizados (`Search` normalizado, `Offset`, `Limit`). O repositório não valida nem normaliza.

```csharp
/// <summary>Filtro da lista de navios montado pelo handler a partir da consulta já válida.</summary>
/// <param name="Search">Texto de busca já normalizado, ou nulo.</param>
/// <param name="Offset">Quantidade de navios a pular.</param>
/// <param name="Limit">Quantidade máxima de navios a devolver.</param>
public sealed record ListarNaviosFiltro(
    string? Search,
    string Status,
    string SortBy,
    string Direction,
    int Offset,
    int Limit);
```

## Read model

O que a consulta devolve: `public sealed record` posicional `<Entidade>ReadModel`, um arquivo por tipo, com
`<summary>` e `<param>` em cada parâmetro. Lista e detalhe da mesma entidade compartilham o mesmo read model, em
`Shared/`; o campo que só o detalhe preenche é opcional (`= null`). Nome da coluna ausente é `string?`; booleano em
forma de afirmação (`EstaAtivo`). O repositório monta o read model direto do SQL, sem tipo intermediário de tabela
fora dele.

```csharp
/// <summary>Read model do navio, usado pela lista e pelo detalhe.</summary>
/// <param name="Id">Identificador do navio.</param>
/// <param name="Bandeira">País de registro, nulo quando não há dado.</param>
/// <param name="EstaAtivo">Indica se o navio está ativo.</param>
/// <param name="RapDte">Código da viagem da escala mais recente, preenchido só no detalhe.</param>
public sealed record NavioReadModel(
    long Id,
    string? Imo,
    string? Nome,
    string? Bandeira,
    bool EstaAtivo,
    string? RapDte = null);
```

- A lista chega ao `Result<T>` como `IReadOnlyCollection<T>` com a paginação; o objeto único, por `new Result<T>(content)`.

## Interface do repositório

`public interface I<CasoDeUso>Repository`, na pasta do caso de uso (`Application`), com `<summary>`, `<param>` e `<returns>` completos. O banco entra
como primeiro parâmetro, o `CancellationToken cancellationToken = default` por último, igual na interface e na
implementação. Expõe só o que o caso de uso usa; a lista devolve `IReadOnlyCollection<T>`.

```csharp
/// <summary>Acesso ao banco da consulta do detalhe de um navio.</summary>
public interface IObterNavioRepository
{
    /// <summary>Obtém o navio de identificador <paramref name="id"/>.</summary>
    /// <param name="database">Banco em que a consulta é executada.</param>
    /// <param name="id">Identificador do navio.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>O navio, ou nulo quando não existe.</returns>
    Task<NavioReadModel?> GetAsync(Database database, long id, CancellationToken cancellationToken = default);
}
```

## Repositório

Acesso ao Oracle por Dapper, com SQL parametrizado, sem ORM. Um por funcionalidade, na `Infrastructure`:
`internal sealed class <Funcionalidade>Repository`, que implementa as interfaces dos casos de uso, com
`/// <inheritdoc/>` em cada método. O `AddInfrastructure` o registra por convenção (toda classe `*Repository`) e
faz cada interface `I*Repository` que ele implementa resolver para a mesma instância.

```csharp
/// <summary>Consultas de navios ao banco: lista e detalhe, cada uma exposta pela interface do seu caso de uso.</summary>
internal sealed class NaviosRepository(IOracleConnectionFactory connections)
    : IListarNaviosRepository, IObterNavioRepository
{
    private readonly IOracleConnectionFactory _connections = connections;

    /// <inheritdoc/>
    public async Task<NavioReadModel?> GetAsync(Database database, long id, CancellationToken cancellationToken = default)
    {
        var command = new CommandDefinition(BuildSql(database), new { id }, cancellationToken: cancellationToken);
        await using var reader = await _connections.OpenAsync(database, cancellationToken);
        var row = await reader.QuerySingleOrDefaultAsync<NavioRow>(command);

        return row?.ToReadModel();
    }

    // ... ListAsync, de IListarNaviosRepository

    internal static string BuildSql(Database database) => $"""
        SELECT vessel.VSSL_ID AS Id, ...
        FROM CTIS.VESSEL vessel
        WHERE vessel.VSSL_ID = :id
        """;
}
```

- A conexão vem de `IOracleConnectionFactory.OpenAsync(database, cancellationToken)`, que devolve um
  `IOracleReader` (só `QueryAsync`, `QuerySingleOrDefaultAsync` e `QueryMultipleAsync`, sem escrita), liberado
  com `await using var reader`. Consulta usa conexão sem transação.
- O token entra no `CommandDefinition(..., cancellationToken: cancellationToken)`.
- Valor do usuário vai sempre por parâmetro de bind (`:id`, `:search`); nunca concatenado no SQL.
- Nome público de ordenação, filtro e sentido é mapeado por `switch` de expressão para o trecho de SQL
  (`SortColumnSql`, `StatusFilterSql`, `DirectionSql`), com `_ => null`; valor fora da lista lança
  `ArgumentOutOfRangeException(nameof(filtro), valor, null)`. O texto do cliente nunca chega ao SQL.
- SQL em texto bruto `"""`, montado por `internal static string BuildSql(...)` e parâmetros por
  `internal static DynamicParameters BuildParameters(...)`, para o teste conferir o SQL sem abrir conexão.
- O `Row` é `internal sealed class` com propriedades `init` (a exceção ao `record` posicional está em `csharp.md`, por
  causa do Dapper), num arquivo próprio em `Infrastructure/Features/<Funcionalidade>/Shared/`
  (`<Entidade>Row.cs`), usado por todas as consultas da funcionalidade. Ele converte a si mesmo no read model com
  `ToReadModel()` (`EstaAtivo == 1`), e o repositório devolve o read model. Coleção devolvida é
  `IReadOnlyCollection<T>` por expressão de coleção (`[.. rows.Select(row => row.ToReadModel())]`).
- Consulta nova da funcionalidade: interface na pasta do caso de uso e método no repositório da funcionalidade,
  que passa a implementar a interface.
- Repositório não captura exceção nem registra log: a falha de base é do handler.
- Trecho de SQL repetido entre consultas vai para `internal static class <Entidade>Sql`, em `Shared/` da
  `Infrastructure`, com `const string` em PascalCase e métodos por banco por `switch` de expressão.

## Teste do handler

`public sealed class <Handler>Tests`, os Mocks como campos, o `Setup` comum no construtor, `CriarHandler()` e os
auxiliares `private` no fim. O teste monta o `Query` por um auxiliar (`NovaConsulta`) e chama
`handler.HandleAsync`. Cobre: o que o handler envia ao repositório, a consulta inválida (400 sem consultar o
repositório), o resultado de sucesso e de vazio, a falha de base (`Result<T>` 500 com a mensagem padrão e o log
de erro) e a exceção inesperada propagando.

```csharp
public sealed class ListarNaviosHandlerTests
{
    private readonly Mock<IUserContext> _context = new();
    private readonly Mock<IListarNaviosRepository> _repository = new();
    private readonly Mock<ILogger<ListarNaviosHandler>> _logger = new();

    public ListarNaviosHandlerTests()
    {
        _context.Setup(context => context.Database).Returns(Database.TeconSantos);
        ConfigurarRepository([]);
    }

    [Fact]
    public async Task HandleAsync_FalhaDeBase_ReturnsServerErrorWithTheStandardMessageAsync()
    {
        var exception = new FakeDbException("ORA-01017: senha inválida para DESENV");
        ConfigurarFalha(exception);
        var handler = CriarHandler();

        var result = await handler.HandleAsync(NovaConsulta(), TestContext.Current.CancellationToken);

        result.Status.Should().Be(HttpStatusCode.InternalServerError);
        result.Notifications.Should().ContainSingle().Which.Message
            .Should().Be(Result<NavioReadModel>.ServerErrorMessage);
        VerificarLogDeErro(exception);
    }

    private static ListarNaviosQuery NovaConsulta(string? search = null, int page = 1, int pageSize = 20) =>
        new ListarNaviosQuery(search, "ativo", "nome", "asc", page, pageSize);

    private ListarNaviosHandler CriarHandler() =>
        new ListarNaviosHandler(_context.Object, _repository.Object, _logger.Object);
}
```

- Falha de base é simulada por `FakeDbException` (`GestaoCaptacao.Tests.Support`), sem banco.
- `[Theory]` para o mesmo comportamento com várias entradas (filtros, bancos, termos de busca).
- Auxiliar de verificação recebe `Func<Filtro, bool>` e usa `It.Is<...>` com `Times.Once()`.
- Teste do banco do contexto: um `[Theory]` com cada valor de `Database`.

## Teste do Query

Sem host: instancia o `Query` e confere `Invalid` e as `Notifications` (`Property` e `Message`). Cobre o padrão,
os limites (o primeiro e o último valor válidos), cada valor inválido com a mensagem `Campo <campo> inválido.`
(um teste por notificação), uma tentativa de injeção em campo de ordenação e vários campos inválidos juntos. O
`ExecutarAsync` estático tem dois testes, com o handler montado sobre Mocks: a request válida chega ao repositório
com o filtro esperado, e a inválida devolve o 400.

```csharp
[Theory]
[InlineData(0, 20, "Page")]
[InlineData(1, 101, "PageSize")]
public void Construtor_PaginaOuTamanhoInvalido_NotifiesTheField(int page, int pageSize, string field)
{
    var query = new ListarNaviosQuery(null, "ativo", "nome", "asc", page, pageSize);

    query.Notifications.Should().ContainSingle()
        .Which.Should().BeEquivalentTo(new { Property = field, Message = $"Campo {field} inválido." });
}
```

## Teste do repositório

Em `tests/GestaoCaptacao.Tests/Infrastructure/Features/<Funcionalidade>/`. Só o que não precisa de banco: `BuildSql` e `BuildParameters`, por banco (`[Theory]` sobre `Database`), conferindo
o filtro por parâmetro de bind, a coluna de ordenação, a combinação de busca e status e a rejeição de valor fora
da lista. Teste que abre conexão com o banco exige a autorização `#NNN` (`SQL_AUTORIZACAO_CODIGO`).
