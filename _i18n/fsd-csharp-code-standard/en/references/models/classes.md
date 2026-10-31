# Class models by role

Each role of a feature has a shape. The models below come from the `BaseData/Vessels` feature of
`MyApp.Application` and `MyApp.Infrastructure` and are the example to follow: new code for a use case copies the shape of the role,
changing the names. The general standards (names, style, XML comment, async) still apply and are in the
other files; only what is specific to each class is here.

If the repository has a more recent feature that contradicts a model, follow the project's code and
warn the human.

## Use-case organization

Vertical Slice, with queries and commands separated: in `Application`,
`Features/<Feature>/{Queries,Commands}/<UseCase>/`, one file per type, the file name equal to that of the
type. The feature's repository lives in `Infrastructure`, in `Features/<Feature>/`.

```
Application/Features/BaseData/Vessels/
├── VesselsEndpoints.cs             route group of the feature
├── Shared/
│   └── VesselReadModel.cs          read model used by the list and the detail
└── Queries/
    ├── ListVessels/
    │   ├── ListVesselsEndpoint.cs      route of the use case
    │   ├── ListVesselsRequest.cs       HTTP parameters of the query
    │   ├── ListVesselsQuery.cs         query: validates the input and hands it to the handler
    │   ├── ListVesselsHandler.cs       use case
    │   ├── ListVesselsFilter.cs        filter that the handler hands to the repository
    │   └── IListVesselsRepository.cs   only what the use case uses from the repository
    └── GetVessel/
        ├── GetVesselEndpoint.cs
        ├── GetVesselQuery.cs           only the identifier: no Request
        ├── GetVesselHandler.cs
        └── IGetVesselRepository.cs

Infrastructure/Features/BaseData/Vessels/
├── VesselsRepository.cs            Oracle access (Dapper); implements the use cases' interfaces
└── Shared/
    └── VesselSql.cs                SQL snippets used by more than one query
```

- The use-case name is the verb plus the domain term (`List<Entities>`, `Get<Entity>`,
  `Register<Entity>`); the technical suffix is `Endpoint`, `Request`, `Query`, `Command`, `Handler`,
  `Repository`, or `ReadModel`. A use case that only reads goes in `Queries/` and has a `Query`; one that changes the database goes
  in `Commands/` and has a `Command`.
- Repository per feature (`<Feature>Repository`), no generic or per-entity repository. Each
  use case declares its own narrow interface (`I<UseCase>Repository`) in its folder, and the
  feature's repository implements all of them. Commands have their own repository, separate from the queries'.
- `Shared/` holds what more than one use case of the feature uses. A feature only uses from another
  what is in `Features/<Other>/Shared`.
- Visibility: handler, query, command, endpoint, repository, and auxiliary SQL are `internal`. Request, filter,
  read model, and the repository interface are `public` (the interface, because the implementation lives in another
  project).
- Tests in `tests/MyApp.Tests/Application/Features/<Feature>/` (handler, query) and
  `tests/MyApp.Tests/Infrastructure/Features/<Feature>/` (repository, SQL), with the same structure.

## Flow

1. The endpoint receives the `Request` (or the route identifier) and calls the **static** `ExecuteAsync` of the `Query` or
   the `Command`.
2. The `Query`'s `ExecuteAsync` instantiates the query from the request and calls `handler.HandleAsync(query, ...)`.
3. The `Query`/`Command` constructor validates the format and the required status of the input in C# and records the failures
   as Flunt notifications (`AddNotification`), without `Contract` and without DataAnnotations.
4. The first line of the handler returns the notifications when the `Query`/`Command` is `Invalid`.
5. The handler builds the filter, calls the repository, and returns a `Result<T>`; the endpoint translates with `ToActionResult()`.

## Handler

The use case: orchestrates the flow and returns a `Result<T>`. It has no interface, is not a mediator, and the class has no
HTTP rules.

```csharp
/// <summary>Use case that gets the detail of a vessel.</summary>
internal sealed class GetVesselHandler(
    IUserContext context,
    IGetVesselRepository repository,
    ILogger<GetVesselHandler> logger)
{
    private readonly IUserContext _context = context;
    private readonly IGetVesselRepository _repository = repository;
    private readonly ILogger<GetVesselHandler> _logger = logger;

    /// <summary>Gets the vessel of the already valid <paramref name="query"/>.</summary>
    /// <param name="query">Query with the vessel identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// The vessel detail, the validation errors, 404 when it does not exist, or the server error when the database fails.
    /// </returns>
    public async Task<Result<VesselReadModel>> HandleAsync(
        GetVesselQuery query,
        CancellationToken cancellationToken = default)
    {
        if (query.Invalid)
            return new Result<VesselReadModel>(query.Notifications);

        try
        {
            if (await _repository.GetAsync(_context.Database, query.Id, cancellationToken) is not { } vessel)
                return new Result<VesselReadModel>(nameof(query.Id), $"Vessel {query.Id} not found.");

            return new Result<VesselReadModel>(vessel);
        }
        catch (DbException exception)
        {
            _logger.LogError(
                exception,
                "Failed to get vessel {VesselId} in database {Database}.",
                query.Id,
                _context.Database);

            return new Result<VesselReadModel>(string.Empty, Result<VesselReadModel>.ServerErrorMessage);
        }
    }
}
```

Handler rules:

- `internal sealed class`, primary constructor, and one dependency per `private readonly _camelCase` field. The
  request's database comes from `IUserContext.Database`, passed to the repository.
- A single public method, `HandleAsync(<query or command>, CancellationToken cancellationToken = default)`,
  returning `Task<Result<T>>`, where `T` is the response type (`VesselReadModel`).
- The first line is `if (query.Invalid)` and, on the line below, `return new Result<T>(query.Notifications);`: the handler checks the
  validation, but does not redo it.
- An expected failure is a `Result<T>`, never an exception, and the handler never chooses the status: the constructor of the `Result<T>`
  used defines the code (see "Result"). Not found: `new Result<T>(nameof(query.Id), $"<Entity> {query.Id} not found.")`.
- Database failure: `catch (DbException exception)` records `LogError(exception, "<template>", ...)` with the database and
  the data identifier, and returns `new Result<T>(string.Empty, Result<T>.ServerErrorMessage)`. Only `DbException`: the
  unexpected exception propagates to the middleware.
- Pagination: the handler builds the filter with `Offset = (page - 1) * pageSize` and `Limit = pageSize + 1`, returns
  `Take(pageSize)` (the `Result<T>` receives the collection and the pagination) and passes in the tuple whether there is a next page: `(page, pageSize, vessels.Count > pageSize)`. The tuple
  also accepts `(page, size, total)`, such as `(1, 10, 353)`.
- The search is normalized in the handler (`SearchText.Normalize(query.Search)`) before going to the filter.
- No SQL, no HTTP type, and no `DateTime.Now` (use `TimeProvider`).

### Handler that writes

A handler that creates or changes data follows the same shape, with a `Command` in place of the `Query`. The domain rule is
validated by the `Create` factory (Flunt): `Invalid` returns the 400 with the notifications, before touching the database. Success
with no body is `new Result<T>()` (201). This model comes from the rules above, not from a project file: if a more recent
writing feature contradicts it, follow the project's code and warn the human.

```csharp
/// <summary>Use case that registers a vessel.</summary>
internal sealed class RegisterVesselHandler(
    IUserContext context,
    IRegisterVesselRepository repository,
    ILogger<RegisterVesselHandler> logger)
{
    private readonly IUserContext _context = context;
    private readonly IRegisterVesselRepository _repository = repository;
    private readonly ILogger<RegisterVesselHandler> _logger = logger;

    /// <summary>Registers the vessel of the already valid <paramref name="command"/>.</summary>
    /// <param name="command">Command with the vessel data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>201 without a body, 400 with the notifications, or the server error when the database fails.</returns>
    public async Task<Result<Vessel>> HandleAsync(
        RegisterVesselCommand command,
        CancellationToken cancellationToken = default)
    {
        if (command.Invalid)
            return new Result<Vessel>(command.Notifications);

        var vessel = Vessel.Create(command.Name, command.ImoCode);

        if (vessel.Invalid)
            return new Result<Vessel>(vessel.Notifications);

        try
        {
            await _repository.CreateAsync(_context.Database, vessel, cancellationToken);

            return new Result<Vessel>();
        }
        catch (DbException exception)
        {
            _logger.LogError(
                exception,
                "Failed to register vessel {Name} in database {Database}.",
                command.Name,
                _context.Database);

            return new Result<Vessel>(string.Empty, Result<Vessel>.ServerErrorMessage);
        }
    }
}
```

- The write stays inside the `try`, and the `catch` is only for `DbException`, as in the read handler.
- Both 400s come out before the `try`: validating does not open a connection.
- The write repository returns `Task` (or the generated identifier, when the body needs it), never `Result<T>`.

## Result

`Result<T>` (`sealed class Result<T> : Notifiable where T : class`, `Notifiable` from Flunt) is the only class that
knows the HTTP code. `T` is the type of the returned content. Whoever instantiates it chooses only the return type: the
constructor used defines the `Status` implicitly. There is no parameter, property with a setter, factory
method, or own `enum` to choose the status, and new code does not create one.

| Return | Code | Status |
|---|---|---|
| Success without data | `return new Result<Vessel>();` | 201 |
| Success with one object | `return new Result<Vessel>(vessel);` | 200 |
| Success with a paginated collection | `return new Result<VesselReadModel>(items, (1, 10, 353));` | 200 |
| Validation error | `return new Result<Vessel>(notifications);` | 400 |
| Resource not found | `return new Result<Vessel>("Id", $"Vessel {id} not found.");` | 404 |
| Database operation error | `return new Result<Vessel>(string.Empty, Result<Vessel>.ServerErrorMessage);` | 500 |

- Read members: `Content` (`IReadOnlyCollection<T?>`, empty on errors and on success without data),
  `Pagination` (null when there is none), `Status` (`HttpStatusCode`), `IsSuccess` (status below 400), and
  `IsFailure`. The notifications come from `Notifiable` (`Notifications`, `Invalid`).
- `new Result<T>(content)` receives the single object and stores it in `Content`; the collection only enters through the constructor with
  pagination (`items`, `pagination`).
- `notifications` is the Flunt `Notification` collection (the `Notifications` of a `Notifiable`, such as the `Query`'s).
- Pagination is a `Pagination`, passed as a tuple `(page, size, next page)` or
  `(page, size, total)`, such as `(1, 20, 102)`.
- The `(field, message)` constructor records a `Notification` and the field decides the status: a filled field is
  "not found" (404); an empty field (`string.Empty`) is a server error (500). That is why the 404 always carries the name
  of the field, and the 500 never does.
- The 500 message is a single one for every database failure: `Result<T>.ServerErrorMessage` ("An error occurred while
  executing the operation."), never a new text per handler and never an internal detail (`ORA-`, SQL, database name).
- Field name of the 404 in PascalCase, like the query's field (`"Id"`). The message states the fact, with the
  identifier, in a complete sentence ending in a period.
- Do not create `Result<T>.NotFound(...)`, `Result<T>.Validation(...)`, `new Result<T>(status, ...)`, or
  `result.Status = ...`. If the case fits none of the six returns, the new return is a decision for the
  `Result<T>` class: take it to the human.

## Endpoint and route group

The endpoint only receives the request and delegates to the `Query` or the `Command`, without business rules. It is an `internal static
class` with an `extension` block (C# 14) over `IEndpointRouteBuilder` and a `Map<UseCase>` method that returns
`routes` itself. The `<param>` for `routes` goes on the `extension` block; the method, being `public`, carries `<summary>` and
`<returns>`.

```csharp
internal static class GetVesselEndpoint
{
    /// <param name="routes">Route builder.</param>
    extension(IEndpointRouteBuilder routes)
    {
        /// <summary>Maps the endpoint that gets the detail of a vessel.</summary>
        /// <returns>The route builder itself.</returns>
        public IEndpointRouteBuilder MapGetVessel()
        {
            routes.MapGet(
                "/{id:long}",
                async (long id, GetVesselHandler handler, CancellationToken cancellationToken) =>
                    (await GetVesselQuery.ExecuteAsync(handler, id, cancellationToken)).ToActionResult());

            return routes;
        }
    }
}
```

- The handler arrives as a lambda parameter; a request with several query fields uses `[AsParameters]` and goes
  to the `Query`'s `ExecuteAsync`.
- The result is always translated by `.ToActionResult()`, a single method over `Result<T>` that serves a single
  object and a paginated list. It translates only the five statuses that `Result<T>` produces: 200, 201, 400, 404, and 500. There is
  no translation for another status (403, 409, 422): whoever instantiates the `Result<T>` does not choose it, and a new return is a
  decision for the `Result<T>` class.
- The lambda's `CancellationToken` is passed on to `ExecuteAsync`.
- The feature's group (`VesselsEndpoints`) creates the `MapGroup` and calls the `Map<UseCase>` of each use case.
  Validation is not an endpoint filter: it is in the `Query`/`Command` constructor.
- An endpoint has no individual test; the translation to HTTP is tested once, in `Platform`.

## Request

The use case's HTTP data: a positional `public sealed record`, with a default value on optional parameters and **without**
a validation attribute. Validation belongs to the `Query`/`Command`.

```csharp
/// <summary>HTTP parameters of the vessel list query.</summary>
/// <param name="Search">Text searched in the vessel name and IMO number.</param>
/// <param name="Status">Status filter: <c>active</c> (default), <c>inactive</c>, or <c>all</c>.</param>
/// <param name="Page">Page number, starting at 1.</param>
public sealed record ListVesselsRequest(
    string? Search = null,
    string Status = "active",
    int Page = 1)
{
    /// <summary>Number of vessels per page when the client does not provide it.</summary>
    public const int DefaultPageSize = 20;
}
```

- One `<param>` per parameter, in English, with the default value and the list of allowed values.
- Numeric limits and defaults are `public const` of the record itself, with `<summary>`; the `Query` uses them in validation.
- A use case with no body or query parameters (only the route identifier) has no `Request`.

## Query and Command

Validates the input and hands it to the handler. `internal sealed class : Notifiable` (Flunt 1.x), with read-only
properties, a constructor that validates, and a static `ExecuteAsync`.

```csharp
/// <summary>Query for the detail of a vessel: validates the input and hands it to the handler.</summary>
internal sealed class GetVesselQuery : Notifiable
{
    /// <summary>Vessel identifier.</summary>
    public long Id { get; }

    /// <summary>Validates the input; the failures stay in <see cref="Notifiable.Notifications"/>.</summary>
    /// <param name="id">Vessel identifier.</param>
    public GetVesselQuery(long id)
    {
        if (id < 1)
            AddNotification(nameof(Id), $"Field {nameof(Id)} is invalid.");

        Id = id;
    }

    /// <summary>Instantiates the query from the request and hands it to the handler.</summary>
    /// <param name="handler">Use-case handler.</param>
    /// <param name="id">Vessel identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The vessel detail, or the validation errors.</returns>
    public static Task<Result<VesselReadModel>> ExecuteAsync(
        GetVesselHandler handler,
        long id,
        CancellationToken cancellationToken = default)
    {
        var query = new GetVesselQuery(id);

        return handler.HandleAsync(query, cancellationToken);
    }
}
```

- Validation is **in C# code**, in the constructor, and records each failure through `AddNotification(nameof(Field), message)`.
  No Flunt `Contract`, no DataAnnotations, and no FluentValidation.
- A message follows `Field <field> is invalid.` or `Field <field> is required.` with `nameof`.
- Closed list (status, column, direction): `static readonly IReadOnlyList<string> s_statuses = [...]` and
  `if (!s_statuses.Contains(status, StringComparer.Ordinal)) AddNotification(...)`. The public name never becomes SQL
  directly (see Repository).
- In a query with a `Request`, `ExecuteAsync` deconstructs the request (`var (search, status, ...) = request;`),
  instantiates the `Query`, and calls the handler.
- Each validation failure is a constructor test (see "Query test").

## Filter

What the handler hands to the repository: a positional `public sealed record` with the already validated and
normalized values (`Search` normalized, `Offset`, `Limit`). The repository does not validate or normalize.

```csharp
/// <summary>Vessel list filter built by the handler from the already valid query.</summary>
/// <param name="Search">Already normalized search text, or null.</param>
/// <param name="Offset">Number of vessels to skip.</param>
/// <param name="Limit">Maximum number of vessels to return.</param>
public sealed record ListVesselsFilter(
    string? Search,
    string Status,
    string SortBy,
    string Direction,
    int Offset,
    int Limit);
```

## Read model

What the query returns: a positional `public sealed record` `<Entity>ReadModel`, one file per type, with
`<summary>` and `<param>` on each parameter. The list and the detail of the same entity share the same read model, in
`Shared/`; a field that only the detail fills is optional (`= null`). A column that may be absent is `string?`; boolean as
an affirmative statement (`IsActive`). The repository builds the read model straight from the SQL, with no intermediate table type
outside it.

```csharp
/// <summary>Read model of the vessel, used by the list and the detail.</summary>
/// <param name="Id">Vessel identifier.</param>
/// <param name="Flag">Country of registration, null when there is no data.</param>
/// <param name="IsActive">Indicates whether the vessel is active.</param>
/// <param name="RapDte">Voyage code of the most recent call, filled only in the detail.</param>
public sealed record VesselReadModel(
    long Id,
    string? Imo,
    string? Name,
    string? Flag,
    bool IsActive,
    string? RapDte = null);
```

- The list reaches the `Result<T>` as an `IReadOnlyCollection<T>` with the pagination; the single object, through `new Result<T>(content)`.

## Repository interface

`public interface I<UseCase>Repository`, in the use case's folder (`Application`), with complete `<summary>`, `<param>`, and `<returns>`. The database enters
as the first parameter, the `CancellationToken cancellationToken = default` last, the same in the interface and in the
implementation. It exposes only what the use case uses; the list returns `IReadOnlyCollection<T>`.

```csharp
/// <summary>Database access of the vessel detail query.</summary>
public interface IGetVesselRepository
{
    /// <summary>Gets the vessel with identifier <paramref name="id"/>.</summary>
    /// <param name="database">Database in which the query runs.</param>
    /// <param name="id">Vessel identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The vessel, or null when it does not exist.</returns>
    Task<VesselReadModel?> GetAsync(Database database, long id, CancellationToken cancellationToken = default);
}
```

## Repository

Oracle access through Dapper, with parameterized SQL, no ORM. One per feature, in `Infrastructure`:
`internal sealed class <Feature>Repository`, which implements the use cases' interfaces, with
`/// <inheritdoc/>` on each method. `AddInfrastructure` registers it by convention (every `*Repository` class) and
makes each `I*Repository` interface it implements resolve to the same instance.

```csharp
/// <summary>Vessel database queries: list and detail, each exposed by the interface of its use case.</summary>
internal sealed class VesselsRepository(IOracleConnectionFactory connections)
    : IListVesselsRepository, IGetVesselRepository
{
    private readonly IOracleConnectionFactory _connections = connections;

    /// <inheritdoc/>
    public async Task<VesselReadModel?> GetAsync(Database database, long id, CancellationToken cancellationToken = default)
    {
        var command = new CommandDefinition(BuildSql(database), new { id }, cancellationToken: cancellationToken);
        await using var reader = await _connections.OpenAsync(database, cancellationToken);
        var row = await reader.QuerySingleOrDefaultAsync<VesselRow>(command);

        return row?.ToReadModel();
    }

    // ... ListAsync, from IListVesselsRepository

    internal static string BuildSql(Database database) => $"""
        SELECT vessel.VSSL_ID AS Id, ...
        FROM CTIS.VESSEL vessel
        WHERE vessel.VSSL_ID = :id
        """;
}
```

- The connection comes from `IOracleConnectionFactory.OpenAsync(database, cancellationToken)`, which returns an
  `IOracleReader` (only `QueryAsync`, `QuerySingleOrDefaultAsync`, and `QueryMultipleAsync`, no writing), disposed
  with `await using var reader`. A query uses a connection without a transaction.
- The token goes into `CommandDefinition(..., cancellationToken: cancellationToken)`.
- A user value always goes through a bind parameter (`:id`, `:search`); never concatenated into the SQL.
- A public name for ordering, filter, and direction is mapped by an expression `switch` to the SQL snippet
  (`SortColumnSql`, `StatusFilterSql`, `DirectionSql`), with `_ => null`; a value outside the list throws
  `ArgumentOutOfRangeException(nameof(filter), value, null)`. The client's text never reaches the SQL.
- SQL in raw text `"""`, built by `internal static string BuildSql(...)` and parameters by
  `internal static DynamicParameters BuildParameters(...)`, so the test can check the SQL without opening a connection.
- The `Row` is an `internal sealed class` with `init` properties (the exception to the positional `record` is in `csharp.md`, because
  of Dapper), in its own file in `Infrastructure/Features/<Feature>/Shared/`
  (`<Entity>Row.cs`), used by all of the feature's queries. It converts itself into the read model with
  `ToReadModel()` (`IsActive == 1`), and the repository returns the read model. A returned collection is
  `IReadOnlyCollection<T>` through a collection expression (`[.. rows.Select(row => row.ToReadModel())]`).
- A new query of the feature: interface in the use case's folder and method in the feature's repository,
  which starts to implement the interface.
- The repository does not catch exceptions or log: the database failure belongs to the handler.
- An SQL snippet repeated across queries goes into `internal static class <Entity>Sql`, in the `Infrastructure`'s `Shared/`,
  with a `const string` in PascalCase and per-database methods through an expression `switch`.

## Handler test

`public sealed class <Handler>Tests`, the Mocks as fields, the common `Setup` in the constructor, `CreateHandler()`, and the
`private` helpers at the end. The test builds the `Query` through a helper (`NewQuery`) and calls
`handler.HandleAsync`. It covers: what the handler sends to the repository, the invalid query (400 without querying the
repository), the success and empty result, the database failure (`Result<T>` 500 with the standard message and the error
log), and the unexpected exception propagating.

```csharp
public sealed class ListVesselsHandlerTests
{
    private readonly Mock<IUserContext> _context = new();
    private readonly Mock<IListVesselsRepository> _repository = new();
    private readonly Mock<ILogger<ListVesselsHandler>> _logger = new();

    public ListVesselsHandlerTests()
    {
        _context.Setup(context => context.Database).Returns(Database.Main);
        ConfigureRepository([]);
    }

    [Fact]
    public async Task HandleAsync_DatabaseFailure_ReturnsServerErrorWithTheStandardMessageAsync()
    {
        var exception = new FakeDbException("ORA-01017: invalid password for DESENV");
        ConfigureFailure(exception);
        var handler = CreateHandler();

        var result = await handler.HandleAsync(NewQuery(), TestContext.Current.CancellationToken);

        result.Status.Should().Be(HttpStatusCode.InternalServerError);
        result.Notifications.Should().ContainSingle().Which.Message
            .Should().Be(Result<VesselReadModel>.ServerErrorMessage);
        VerifyErrorLog(exception);
    }

    private static ListVesselsQuery NewQuery(string? search = null, int page = 1, int pageSize = 20) =>
        new ListVesselsQuery(search, "active", "name", "asc", page, pageSize);

    private ListVesselsHandler CreateHandler() =>
        new ListVesselsHandler(_context.Object, _repository.Object, _logger.Object);
}
```

- A database failure is simulated by `FakeDbException` (`MyApp.Tests.Support`), without a database.
- `[Theory]` for the same behavior with several inputs (filters, databases, search terms).
- A verification helper receives `Func<Filter, bool>` and uses `It.Is<...>` with `Times.Once()`.
- Test of the context's database: a `[Theory]` with each `Database` value.

## Query test

Without a host: instantiates the `Query` and checks `Invalid` and the `Notifications` (`Property` and `Message`). It covers the default,
the limits (the first and last valid values), each invalid value with the message `Field <field> is invalid.`
(one test per notification), an injection attempt in an ordering field, and several invalid fields together. The
static `ExecuteAsync` has two tests, with the handler built over Mocks: the valid request reaches the repository
with the expected filter, and the invalid one returns the 400.

```csharp
[Theory]
[InlineData(0, 20, "Page")]
[InlineData(1, 101, "PageSize")]
public void Constructor_InvalidPageOrSize_NotifiesTheField(int page, int pageSize, string field)
{
    var query = new ListVesselsQuery(null, "active", "name", "asc", page, pageSize);

    query.Notifications.Should().ContainSingle()
        .Which.Should().BeEquivalentTo(new { Property = field, Message = $"Field {field} is invalid." });
}
```

## Repository test

In `tests/MyApp.Tests/Infrastructure/Features/<Feature>/`. Only what does not need a database: `BuildSql` and `BuildParameters`, per database (`[Theory]` over `Database`), checking
the filter by bind parameter, the ordering column, the combination of search and status, and the rejection of a value outside
the list. A test that opens a connection to the database requires the `#NNN` authorization (`SQL_AUTORIZACAO_CODIGO`).
