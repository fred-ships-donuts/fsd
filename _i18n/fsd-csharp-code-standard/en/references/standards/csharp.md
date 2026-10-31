# Modern C#

Use the current version's feature when it simplifies the code. Do not use it just for the sake of it.

## Features

| Feature | Use for | Example |
|---|---|---|
| File-scoped namespace | Every file | `namespace X;`, never `namespace X { }` |
| Primary constructor | Classes with injected dependencies | `internal sealed class EntityService(IEntityRepository repository)` |
| Collection expression | In place of `new List<T>()`, `Array.Empty<T>()`, and `new[] { }` | `IReadOnlyList<string> fields = [..source, "Name"];` |
| Pattern matching | Null, type, and state | `is null`, `is not { } entity`, expression `switch` |
| Raw text `"""` | SQL and multi-line text | `private const string Sql = """ SELECT ... """;` |
| `required` | Required member of a type with `init` | `public required string Name { get; init; }` |
| `params` with a collection | In place of `params T[]` | `void Log(params ReadOnlySpan<string> fields)` |
| `System.Threading.Lock` | In place of `lock` over `object` | `private readonly Lock _lock = new();` |
| `field` keyword | Logic in the accessor without a backing field | `public string Name { get; private set => field = value.Trim(); }` |
| `extension` block | Extension method and property | `extension(string? text) { public bool IsEmpty => ...; }` |
| Null-conditional assignment | `target?.Property = value` | `options?.Timeout = TimeSpan.FromSeconds(30);` |
| Source generator | `Regex`; logging on a heavily executed path | `[GeneratedRegex]`, `[LoggerMessage]` |

| Don't | Do |
|---|---|
| `namespace Solution.Domain { ... }` | `namespace Solution.Domain;` |
| `var fields = new List<string>();` | `List<string> fields = [];` |
| `return Array.Empty<string>();` | `return [];` |
| `var entity = target as Entity; if (entity != null)` | `if (target is Entity entity)` |
| `if (entity == null)` | `if (entity is null)` |
| `private readonly object _lock = new();` | `private readonly Lock _lock = new();` |
| `"SELECT ID\n" + "FROM ENTITY"` | `""" SELECT ID FROM ENTITY """` over several lines |

Pattern matching: the null check and the declaration in the same step (`is not { } entity`). After the `if`, the variable is non-null.

```csharp
if (await _repository.GetByIdAsync(id, cancellationToken) is not { } entity)
    return false;
```

Expression `switch`:

```csharp
var status = error.Type switch
{
    ErrorType.Error => StatusCodes.Status400BadRequest,
    ErrorType.NotFound => StatusCodes.Status404NotFound,
    ErrorType.Conflict => StatusCodes.Status409Conflict,
    _ => StatusCodes.Status500InternalServerError,
};
```

`extension` block:

```csharp
/// <summary>Extensions of <see cref="string"/>.</summary>
public static class StringExtensions
{
    extension(string? text)
    {
        /// <summary>Indicates whether the text is null or empty.</summary>
        public bool IsEmpty => string.IsNullOrEmpty(text);
    }
}
```

## Correct use of the platform

Argument guard via the framework's static method:

```csharp
ArgumentNullException.ThrowIfNull(document);
ArgumentException.ThrowIfNullOrEmpty(name);
```

Text comparison always explicit, without depending on the server's culture.

```csharp
text.Equals(other, StringComparison.OrdinalIgnoreCase);
text.ToUpperInvariant();
```

| Don't | Do |
|---|---|
| `if (document is null) throw new ArgumentNullException(nameof(document));` | `ArgumentNullException.ThrowIfNull(document);` |
| `text.ToLower() == other.ToLower()` | `text.Equals(other, StringComparison.OrdinalIgnoreCase)` |
| `text.ToUpper()` | `text.ToUpperInvariant()` |
| `text.StartsWith("SSN")` | `text.StartsWith("SSN", StringComparison.Ordinal)` |

Closed list of allowed values: the public name maps to the internal value, and the value the client sends is never passed along.

```csharp
private static string? SortColumn(string field) => field switch
{
    "name" => "NAME",
    "created" => "CREATED_AT",
    _ => null,
};
```

`field` is a contextual keyword: a member of yours named `field` needs `@field` or another name.

## Logging

`ILogger<T>` with `LogXxx` and a constant template with named placeholders: the value goes as an argument, never inside the text.

| Forbidden | Reason |
|---|---|
| `_logger.LogInformation($"Entity {entityId} deactivated.");` | Interpolation: loses the structured field |
| `_logger.LogInformation("Entity " + entityId + " deactivated.");` | Concatenation |
| `_logger.LogInformation(string.Format("Entity {0} deactivated.", entityId));` | Formatted before the logger |
| `_logger.LogInformation("Entity {0} deactivated.", entityId);` | Numeric placeholder: the field becomes `0` |

Standard:

```csharp
_logger.LogInformation("Entity {EntityId} deactivated at {OccurredAt}.", entityId, occurredAt);
```

- Placeholder in PascalCase, with the name of the data; one argument per placeholder, in the same order.
- The code depends only on `ILogger<T>`.
- The exception is the first argument (`_logger.LogError(exception, "...", ...)`), never part of the message.
- LGPD (Brazilian data-protection law): no personal data or secrets in the arguments.

## Data typing

| Type | Form | Example |
|---|---|---|
| DTO, request, response, and event | Positional `sealed record` | `public sealed record AddEntityRequest(string? Name, string? Document);` |
| Query read model | Positional `sealed record`, name `<Entity>ReadModel` | `public sealed record VesselReadModel(long Id, string? Imo, string? Name);` |
| Value with an invariant | `sealed class : Notifiable` (Flunt), private constructor that validates, static `Create` factory | `public sealed class Ein : Notifiable` |
| Small value, no invariant | `readonly record struct` | `public readonly record struct Coordinate(double Latitude, double Longitude);` |
| Closed set of values | `enum` | `public enum EntityStatus { Active, Inactive }` |

Exception: the row class (`internal`, in the `Infrastructure`'s `Shared/`) that a `*Repository` uses to read the Dapper result (for example, `VesselRow`) is a `sealed class` with `init` properties, and not a positional `sealed record`. Dapper maps `record` through the constructor and only matches it when the type of each column is exactly that of the parameter, and Oracle's `NUMBER` does not match `int` or `long`. With properties, Dapper converts the type on read.

| Don't | Do |
|---|---|
| `public class EntityDto { public string? Name { get; set; } }` | `public sealed record EntityDto(string? Name);` |
| `public struct Coordinate { public double Latitude; ... }` | `public readonly record struct Coordinate(double Latitude, double Longitude);` |
| `public const string StatusActive = "A";` for a closed set | `public enum EntityStatus { Active, Inactive }` |
| `public readonly struct Document` with validation in the constructor | `public sealed class Document : Notifiable` with a private constructor and `Create` |

A value with an invariant is not a `struct`: the struct's `default` would bypass the constructor's validation.

Creation always goes through the `Create` factory. The constructor is private, validates, and records each failure with `AddNotification` (Flunt), without throwing an exception. Whoever calls it checks `Invalid` before using the value.

```csharp
/// <summary>EIN of a partner.</summary>
public sealed class Ein : Notifiable
{
    /// <summary>Only the digits of the EIN.</summary>
    public string Number { get; }

    private Ein(string? text)
    {
        var digits = new string((text ?? string.Empty).Where(char.IsDigit).ToArray());

        if (digits.Length != 9)
            AddNotification(nameof(Number), "EIN is invalid.");

        Number = digits;
    }

    /// <summary>Creates the EIN. If <see cref="Notifiable.Invalid"/>, the validation failed.</summary>
    public static Ein Create(string? text) => new Ein(text);
}
```

```csharp
var ein = Ein.Create(request.Ein);

if (ein.Invalid)
    return new Result<Company>(ein.Notifications);
```

## `sealed`

Every concrete class is `sealed`, unless it was designed to be inherited.

- Enforced by analyzer CA1852.

| Don't | Do |
|---|---|
| `public class EntityService` | `public sealed class EntityService` |

## Primary constructor

Use it on classes that receive dependencies: services, repositories, middleware, and exceptions.

Do not use it on a class that validates in the constructor: the primary constructor has no body.

Minimal API endpoint: each dependency (the handler, for example) arrives as a parameter of the endpoint's delegate, and the endpoint only delegates to the `Query` or the `Command`.

```csharp
internal sealed class EntityService(
    IEntityRepository repository,
    ILogger<EntityService> logger)
    : IEntityService
{
    private readonly IEntityRepository _repository = repository;
    private readonly ILogger<EntityService> _logger = logger;

    /// <inheritdoc/>
    public async Task<bool> DeactivateAsync(long id, CancellationToken cancellationToken = default)
    {
        if (await _repository.GetByIdAsync(id, cancellationToken) is not { } entity)
            return false;

        entity.Deactivate();

        if (!await _repository.UpdateAsync(entity, cancellationToken))
            return false;

        _logger.LogInformation("Entity {EntityId} deactivated.", id);

        return true;
    }
}
```

Rules:

- Parameters in camelCase, without `_`.
- Capture each dependency exactly once, in a `private readonly` field in `_camelCase`, and use the field in the body. The parameter only appears in that assignment.
- Do not reassign the parameter or the field.
- Do not expose the parameter as a public property (in positional `record`s, that is the record's own behavior).
- A primary constructor parameter is for a dependency. State the class maintains becomes a field or property.

| Don't | Do |
|---|---|
| `await repository.GetByIdAsync(...)` using the parameter in the body | `await _repository.GetByIdAsync(...)` using the field |
| `EntityService(IEntityRepository _repository)` | `EntityService(IEntityRepository repository)` |
| `repository = otherRepository;` | `private readonly` field, assigned only once |
| `public IEntityRepository Repository => repository;` | The dependency stays `private` |

## Async, time, and collections

| Forbidden | Standard |
|---|---|
| `var now = DateTime.UtcNow;` | `var now = _timeProvider.GetUtcNow();` |
| `var entity = _repository.GetByIdAsync(id).Result;` | `var entity = await _repository.GetByIdAsync(id, cancellationToken);` |
| `public async void Execute() { }` | `public async Task ExecuteAsync(CancellationToken cancellationToken = default) { }` |
| `public List<string> Fields { get; }` | `public IReadOnlyList<string> Fields { get; }` |
| `using var connection = ...;` on an `IAsyncDisposable` type | `await using var connection = ...;` |

- `async` end to end: `.Result`, `.Wait()`, and `async void` are forbidden.
- Date and time only through `TimeProvider`. No `DateTime.Now`, `DateTime.UtcNow`, or `DateTimeOffset.Now`.
- Collection in a public API: `IReadOnlyList<T>` or `IReadOnlyCollection<T>`.
- No mutable static state.

## Cancellation and resource disposal

`CancellationToken`:

- Every asynchronous method receives `CancellationToken cancellationToken = default` as the last parameter (CA1068).
- The default value is declared the same in the interface and in the implementation.
- The received token is always passed on to every call that accepts one (CA2016). `CancellationToken.None` only where there is no token to pass on.
- A signature imposed by the library stays as the library defines it, without `= default`: `Process(request, cancellationToken)`.
- A test method follows the test framework's signature and does not receive the token: it uses `TestContext.Current.CancellationToken`.

`await using`:

- A resource that implements `IAsyncDisposable` (connection, transaction, stream) is disposed with `await using`.
- Use the declaration (`await using var x = ...;`), which disposes at the end of the scope. The `await using (...) { }` block only when the resource must be disposed before the end of the method.
- Synchronous `using` only for a type that implements just `IDisposable`.

```csharp
/// <inheritdoc/>
public async Task<long> AddAsync(Entity entity, CancellationToken cancellationToken = default)
{
    await using var connection = await _dataSource.OpenConnectionAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

    var id = await InsertAsync(connection, transaction, entity, cancellationToken);

    await transaction.CommitAsync(cancellationToken);

    return id;
}
```

| Don't | Do |
|---|---|
| `Task<long> AddAsync(CancellationToken cancellationToken, Entity entity)` | `Task<long> AddAsync(Entity entity, CancellationToken cancellationToken = default)` |
| `await _repository.GetByIdAsync(id);` inside a method that received the token | `await _repository.GetByIdAsync(id, cancellationToken);` |
| `= default` in the implementation and no `= default` in the interface | `= default` the same in both |
| `await using (var connection = ...) { ... }` through the end of the method | `await using var connection = ...;` |
