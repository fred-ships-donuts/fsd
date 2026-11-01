# Compiler and analysis

C# 14, with Nullable and ImplicitUsings enabled.

Rules:

- A warning does not block the build (`TreatWarningsAsErrors` off).
- Warning suppression only with `[SuppressMessage]` and `Justification`, in the smallest scope (member, not type). `#pragma warning disable` is forbidden.
- `!` (null-forgiving) is forbidden. If the compiler cannot prove non-nullability, restructure with pattern matching or a guard.

```csharp
[SuppressMessage("Design", "CA1031", Justification = "The middleware converts any failure into a 500 response.")]
public async Task InvokeAsync(HttpContext context)
```

| Don't | Do |
|---|---|
| `#pragma warning disable CA1031` | `[SuppressMessage("Design", "CA1031", Justification = "...")]` on the member |
| `[SuppressMessage(...)]` on the whole class | `[SuppressMessage(...)]` only on the member that needs it |
| `var name = entity!.Name;` | `if (entity is not { } found)`, the `return` on the line below, and then `found.Name` |

## Language and names

Everything is in English: identifiers, messages, logs, XML comments, and tests. The domain term is the one in the business glossary, written in English, and the compound name joins it with the technical pattern: `<DomainTerm><TechnicalPattern>`.

- `Entity` + `Service` → `EntityService`
- `Entity` + `Repository` → `IEntityRepository`
- `Document` + `Extensions` → `DocumentExtensions`
- `EntityDeactivated` + `Exception` → `EntityDeactivatedException`

One concept has one name across the code: the glossary term, never a synonym.

| Don't | Do |
|---|---|
| `ShipRepository`, `ShipNotFoundException` when the glossary term is `Vessel` | `VesselRepository`, `VesselNotFoundException` |
| `VesselManager`, `VesselHelper` | `VesselService`, `VesselValidator` |

The scope of a `Repository` is defined by the architecture: one per feature, exposing one interface per use case, never per entity or generic. The `IEntityRepository` examples in this guide are illustrative.

### Members and code

| Element | Standard | Example |
|---|---|---|
| `private` or `internal` field | `_camelCase` (instance), `s_camelCase` (static) | `_repository`, `s_format` |
| Constant | PascalCase | `SqlGet` |
| Property, method, and event | PascalCase | `Document`, `Deactivate` |
| Local variable and parameter | camelCase; positional record parameter in PascalCase, because it becomes a property | `entityId`; `record Request(string? Name)` |
| Lambda parameter | Full name, never a single letter | `repository => repository.GetByIdAsync(...)` |
| Business action method | Domain verb | `Deactivate`, `ChangeDescription`, `DeactivateAsync` |
| Technical method (persistence, infrastructure, framework) | Technical verb | `GetByIdAsync`, `AddAsync`, `ExecuteAsync` |
| Boolean | A statement answered with yes or no; never `flag`, `check`, or `status` | `IsEmpty`, `IsSuccess`, `areEqual`, `documentExists` |
| Enum | Singular, members in PascalCase; plural only with `[Flags]` | `EntityStatus { Active, Inactive }` |
| Asynchronous method | `Async` suffix on every asynchronous method, including tests, except the name imposed by the library (`Process`) | `GetByIdAsync(id, cancellationToken)` |
| Method with a domain term | `<Verb>By<Term>Async` | `ExistsByDocumentAsync` |
| `using` alias | Type + context | `EntityDomain` |
| Acronyms | PascalCase, as a word | `Ssn`, `ValidateEin`, `ExistsBySsnAsync`, `BlNumber`, `HttpContext`, `SqlGet` |

| Don't | Do |
|---|---|
| `private readonly IEntityRepository repository;` | `private readonly IEntityRepository _repository;` |
| `private static readonly Regex _format` | `private static readonly Regex s_format` |
| `private const string SQL_GET` | `private const string SqlGet` |
| `public async Task<Entity?> GetById(long id)` | `public async Task<Entity?> GetByIdAsync(long id, CancellationToken cancellationToken = default)` |
| `_repository.Setup(r => r.GetByIdAsync(...))` | `_repository.Setup(repository => repository.GetByIdAsync(...))` |
| `var flag = exists;` | `var documentExists = exists;` |
| `public enum EntityStatuses` | `public enum EntityStatus` |
| `ValidateSSN`, `HTTPContext` | `ValidateSsn`, `HttpContext` |
| `GetEntityAsync` to search by document | `GetByDocumentAsync` |
| `InactivateEntity()` | `Deactivate()` |

### Tests

| Element | Standard | Example |
|---|---|---|
| Test class | `<Target>Tests` | `EntityServiceTests` |
| Test method | `<Method>_<Scenario>_<Result>`: `<Method>` is the name of the member under test, as it is in the code; `Async` at the end when the test is asynchronous | `DeactivateAsync_NonexistentEntity_ReturnsFalseAsync` |

### Limits of the rule

- Applies to types, members, and files.
- A name imposed by a library or interface is kept, including that of the parameters: `Process(request, cancellationToken)`.
- Universal terms stay as they are: `Id`, `Login`, `Email`, `Cache`.
- Messages, logs, XML comments, and the error code are in English.

### Message text

The error and validation message states the violated rule, in a complete sentence ending in a period. The field is cited via `nameof`, never written in the text.

| Situation | Form | Example |
|---|---|---|
| Required field | `Field <field> is required.` | `$"Field {nameof(Name)} is required."` |
| Value outside the rule | `Field <field> is invalid.` or `<Term> is invalid.` | `$"Field {nameof(Status)} is invalid."`, `"Document is invalid."` |
| State that prevents the action | The current state | `"The entity is already inactive."` |
| Not found or conflict | The fact | `"Entity not found."`, `"An entity with this document already exists."` |

| Don't | Do |
|---|---|
| `"Enter the name."` | `$"Field {nameof(Name)} is required."` |
| `"Field Name is required."` | `$"Field {nameof(Name)} is required."` |
| `"Error while deactivating"` | `"The entity is already inactive."` |
