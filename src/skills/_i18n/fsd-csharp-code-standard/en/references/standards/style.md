# Style

The base is the dotnet/runtime coding-style, with `var`.

## Formatting

| Rule | Example |
|---|---|
| Allman-style braces: each brace on its own line | `if (x)` and, on the line below, `{` |
| Four spaces, no tabs (two in `.csproj`, `.props`, `.json`, and `.slnx`) | |
| One statement and one declaration per line | |
| C# code line with at most 120 columns, including XML comments | |
| Never more than one blank line in a row; no trailing whitespace | |
| Trailing comma on the last item of an expression `switch`, initializer, and multi-line collection expression | `_ => null,` |
| One attribute per line, each in its own `[...]`; a parameter attribute stays on the same line as the parameter | `[Theory]` and, on the line below, `[InlineData("")]` |
| UTF-8 without BOM, CRLF line terminator (Windows standard) | |

| Don't | Do |
|---|---|
| `if (x) {` on the same line | `if (x)` and `{` on the line below |
| `var name = request.Name; var document = request.Document;` | One declaration per line |
| `int id, total;` | `var id = 0;` and `var total = 0;`, each on its own line |
| `[Theory, InlineData("")]` | One attribute per line |
| `_ => null` on the last item, without a comma | `_ => null,` |

## Line breaking

When the line goes over 120 columns:

- Parameters and arguments: all of them break, one per line, with four more spaces than the declaration. The closing parenthesis stays on the last item.
- Inheritance list: `: Interface` on the line below the type name, with four spaces.
- Expression body: `=>` on the line below, with four spaces.
- Binary operator and call chaining: the operator (`&&`, `+`, `.`) starts the line below.
- XML comment text: continues on the line below, with the same `///`.

```csharp
internal sealed class EntityService(
    IEntityRepository repository,
    ILogger<EntityService> logger)
    : IEntityService
```

```csharp
public async Task<IReadOnlyList<Entity>> ListByPeriodAsync(
    DateTimeOffset start,
    DateTimeOffset end,
    CancellationToken cancellationToken = default)
```

```csharp
var canDeactivate = entity.Status is EntityStatus.Active
    && entity.PendingItems.Count == 0;
```

Don't:

```csharp
public async Task<IReadOnlyList<Entity>> ListByPeriodAsync(DateTimeOffset start,
    DateTimeOffset end, CancellationToken cancellationToken = default)
```

Do: all parameters break, one per line, as in the example above.

## Blank lines

- One blank line between type members and between `using` groups.
- One blank line before and after each control statement (`if`, `foreach`, `while`, block `using`), with or without braces, except when it opens or closes the block it is in.
- The `return` that ends the method is always separated from the preceding code by a blank line. Inside an `if`, the `return` stays tight against the previous statement.
- No blank line right after `{` or right before `}`.

Don't:

```csharp
var entity = new Entity(name, document);
return await _repository.AddAsync(entity, cancellationToken);
```

Do:

```csharp
var entity = new Entity(name, document);

return await _repository.AddAsync(entity, cancellationToken);
```

Inside an `if`, tight:

```csharp
if (entity.Status is EntityStatus.Inactive)
{
    entity.Activate();
    return true;
}
```

One statement: no braces, on the line below.

```csharp
if (value is null)
    return string.Empty;
```

Braces when any block of the chain has braces, or when the body spans several lines.

```csharp
if (entity.Status is EntityStatus.Inactive)
{
    entity.Activate();
    return true;
}
else
{
    entity.Deactivate();
}
```

| Don't | Do |
|---|---|
| `if (value is null) return string.Empty;` on the same line | `if (value is null)` and `return string.Empty;` on the line below |
| `if (x) { return; }` with braces for one statement | No braces, on the line below |
| `if` with braces and `else` without braces | Braces on both blocks |

## Negative validation

Validate the negative cases first and exit early (guard clause): each failure condition becomes an `if` that returns right away, and the happy path comes last, with no extra indentation. This avoids horizontal sprawl: `if` inside `if` inside `if`, with the `return` at the end of the staircase.

```csharp
public async Task<Result<VesselReadModel>> HandleAsync(
    GetVesselQuery query,
    CancellationToken cancellationToken = default)
{
    if (query.Invalid)
        return new Result<VesselReadModel>(query.Notifications);

    if (await _repository.GetAsync(_context.Database, query.Id, cancellationToken) is not { } vessel)
        return new Result<VesselReadModel>(nameof(query.Id), $"Vessel {query.Id} not found.");

    return new Result<VesselReadModel>(vessel);
}
```

With more possibilities, keep validating the negatives, one exit `if` per case, all at the same level. Do not nest the happy path inside the success condition.

```csharp
if (xxxx is not true)
    return w;

if (yyyy is not true)
    return w;

if (zzzz is not true)
    return w;

return sucesso;
```

| Don't | Do |
|---|---|
| `if (xxxx)` with `if (yyyy)` with `if (zzzz)` nested and the `return` in the middle | One exit `if` per negative condition, at the same level, and the happy path at the end |
| `if (vessel is not null)` wrapping the rest of the method | `if (vessel is not { })` with the early exit, and the rest without indentation |
| `else` after an `if` that already returns | No `else`: the following code is the path that remains |

## Comments

The only comment allowed in C# code is the XML documentation comment (`///`).

Forbidden:

- line (`//`) and block (`/* */`) comments, in any position: inside a method, beside a statement, or between members;
- commented-out code;
- pending-work markers (`TODO`, `FIXME`, `HACK`): the pending item goes to the task manager.

When a piece of code seems to need a comment, it is the code that needs to become clearer: extract a method or a variable with a name that explains it, or, as a last resort, move the explanation to the member's `<remarks>`.

Required:

- `<summary>` on every `public` or `protected` type and member (CS1591). On `internal` and `private`, only when really necessary.
- `<param>` on each parameter of a positional record: it is what documents the generated property.
- `<exception>` for each exception the member throws on purpose.
- `<inheritdoc/>` on an interface implementation and on an `override`. Do not repeat the source's text.
- `<param>` and `<returns>` on the other members when the name and type are not enough. If one `<param>` is written, all of them are (CS1573).

Shape of the text:

- English, complete sentence, ending in a period.
- Type: what it is (`Domain entity.`). Method: what it does, with the verb in the third person (`Deactivates the entity.`). Property: what it holds (`Name of the entity.`).
- Say what is not obvious from the signature: rule, side effect, special return. Do not repeat the member's name.
- Reference to code with `<see cref="..."/>` and `<paramref name="..."/>`, never with the name in loose text.

The rule applies to C# code. Configuration files (`.editorconfig`, `.csproj`, `.props`) keep the comment syntax of their own format.

| Don't | Do |
|---|---|
| `// fetches the entity` before the line | A name that explains: `var activeEntity = ...` |
| `// TODO: validate document` | Task in the task manager |
| `// var old = ...;` | Delete the code |
| `/// <summary>Deactivate.</summary>` | `/// <summary>Deactivates the entity.</summary>` |
| `/// <summary>Finds by id.</summary>` | `/// <summary>Finds an entity by its <paramref name="id"/>.</summary>` |
| Repeating the interface's text in the implementation | `/// <inheritdoc/>` |
| `/// <summary>Returns the Status.</summary>` | `/// <summary>Status of the entity.</summary>` |

## Declarations

| Rule | Example |
|---|---|
| Visibility always explicit, as the first modifier (interface member stays without) | `private const string SqlGet`, never just `const string` |
| Fields at the top of the type, before constructors and members, in any order among themselves | `private const string SqlGet`, `private readonly IEntityRepository _repository` |
| No `this.` | `_repository`, not `this._repository` |
| Language keyword instead of the BCL type | `int`, `string`, `int.Parse`; never `Int32`, `String` |
| `nameof(...)` instead of a literal text | `nameof(Document)` |
| `new()` only on a field and property with the declared type; a local variable uses `var x = new T(...)` | `private readonly Lock _lock = new();`; never on a local variable, `return`, argument, or expression-bodied member |
| Property with restricted write | `private set` when it changes only through the type itself; `init` or `private init` when it is filled only at creation |
| Class split across files | `partial`, keeping `sealed`: `public sealed partial class EntityService` |

| Don't | Do |
|---|---|
| `const string SqlGet = ...;` | `private const string SqlGet = ...;` |
| `static private readonly Regex s_format` | `private static readonly Regex s_format` |
| `this._repository.AddAsync(...)` | `_repository.AddAsync(...)` |
| `Int32 total = Int32.Parse(text);` | `var total = int.Parse(text);` |
| `throw new ArgumentException("Document is invalid.", "document");` | `throw new ArgumentException("Document is invalid.", nameof(document));` |
| `return new();` | `return new Coordinate(latitude, longitude);` |
| `public EntityStatus Status { get; set; }` on a type that controls its own state | `public EntityStatus Status { get; private set; }` |
| `public Document Document { get; private set; }` for a value that does not change after creation | `public Document Document { get; private init; }` |
| `public partial class EntityService` | `public sealed partial class EntityService` |

## Member order

1. Fields.
2. Properties.
3. Constructors.
4. Operators and conversions.
5. Methods: `public` first, then `private`.

Class with a primary constructor: dependency fields, then methods. Test class: Mock fields, constructor, test methods, and `private` helper methods.

| Don't | Do |
|---|---|
| Constructor between two properties | All properties, then the constructors |
| `private` method between two `public` methods | The `public` ones first, then the `private` ones |
| Field declared after a method | Fields at the top of the type |

## Expression body

| Member | Form |
|---|---|
| Read-only property and accessor | Expression body: `public bool IsEmpty => string.IsNullOrEmpty(text);` |
| Method, operator, and local function | Expression body when the body is a single expression; with more than one statement, a block |
| Constructor | Always a block |
| Lambda | Expression body when it is a single expression |

| Don't | Do |
|---|---|
| `public bool IsEmpty { get { return string.IsNullOrEmpty(text); } }` | `public bool IsEmpty => string.IsNullOrEmpty(text);` |
| `public int Total() { return _itens.Count; }` | `public int Total() => _itens.Count;` |
| `public Entity(string name) => Name = name;` | Constructor with a block body |

## `var`

Diverges from the runtime. Use `var` on every local variable whose type the compiler infers: result of a call, of an `await`, of a constructor (`var x = new T(...)`), of a factory, and deconstruction. Explicit type only where `var` does not apply: collection expression and implicit conversion, where the target type is what makes the conversion happen.

```csharp
var entity = await _repository.GetByIdAsync(id, cancellationToken);
var (name, document) = request;

var text = new StringBuilder();

IReadOnlyList<string> fields = [];
Document document = "529.982.247-25";
```

| Don't | Do |
|---|---|
| `Entity? entity = await _repository.GetByIdAsync(id, cancellationToken);` | `var entity = await _repository.GetByIdAsync(id, cancellationToken);` |
| `string name = request.Name;` | `var name = request.Name;` |
| `var fields = [];` | `IReadOnlyList<string> fields = [];` |
| `StringBuilder text = new();` | `var text = new StringBuilder();` |

## Deconstruction

Use deconstruction when it makes sense: the type offers `Deconstruct` (positional record, tuple, or its own method) and two or more properties are read together. With just one, read the property.

```csharp
var (name, document) = request;
var entityId = request.Id;
```

| Don't | Do |
|---|---|
| `var name = request.Name;` and `var document = request.Document;` | `var (name, document) = request;` |
| `var (entityId, _) = request;` to read a single property | `var entityId = request.Id;` |

## `using` directives

The order is automatic (`dotnet format`, or Remove and Sort Usings in the IDE).

- At the top of the file, outside the namespace.
- First `System.*`, then one group per root namespace (`Dapper`, `Microsoft.*`, `<Solution>.*`), all in alphabetical order.
- One blank line between groups, none inside a group.
- Last, in its own group, the aliases.
- No repeated SDK `using` (ImplicitUsings) and none unused.
- No `global using` and no `using static`.

```csharp
using System.Data.Common;
using System.Text.RegularExpressions;

using Dapper;

using Microsoft.AspNetCore.Mvc;

using SystemTimer = System.Timers.Timer;
```

An alias exists in only three cases:

1. A type with the same name as a segment of the current namespace. The name resolves to the namespace (CS0118), and the alias gives the type the name with context: `EntityDomain`.
2. Two types with the same name in different namespaces (`System.Threading.Timer` also exists): `using SystemTimer = System.Timers.Timer;`.
3. A long tuple or generic that repeats in the file: `using Coordinate = (double Latitude, double Longitude);`.

The alias carries the context suffix (`EntityDomain`, `EntityRow`), never a generic name.

| Don't | Do |
|---|---|
| `using` inside the namespace | `using` at the top of the file |
| `using Dapper;` before `using System.Data.Common;` | `System.*` first |
| `using System.Linq;` with ImplicitUsings enabled | Remove |
| `global using Dapper;` | `using Dapper;` in the file that uses it |
| `using static System.Math;` | `Math.Round(...)` |
| `using Type = Solution.Domain.Entity;` | `using EntityDomain = Solution.Domain.Entity;` |

The build verification of these rules is in `build.md`.

