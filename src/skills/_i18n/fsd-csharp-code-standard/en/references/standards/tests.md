# Tests

The examples use xUnit v3, Moq, and Fluent Assertions. A test does not carry an XML comment.

## Shape of a test

- `sealed` class. The class name and the method name follow `compiler-and-naming.md`.
- AAA pattern in three blocks, without comments, separated by a blank line and with no blank line inside a block:
  - Arrange: sets up the scenario (data and Mocks);
  - Act: a single call to the unit under test;
  - Assert: the verifications.
- With nothing to prepare (the input comes from `[InlineData]`, or the Act is the construction itself), the test has only the Act and Assert blocks. One behavior per test.
- `[Fact]` for one case; `[Theory]` with `[InlineData]` for the same behavior with several inputs.
- The Mock is a class field: xUnit creates a new instance of the class for each test.

## Moq and Fluent Assertions

| I need | How |
|---|---|
| Create the Mock of a dependency | `private readonly Mock<IEntityRepository> _repository = new();` |
| Instantiate the class under test with the mocked dependencies | `new EntityService(_repository.Object, _logger.Object)` |
| Asynchronous return | `_repository.Setup(repository => repository.UpdateAsync(entity, It.IsAny<CancellationToken>())).ReturnsAsync(true);` |
| Return null | `.ReturnsAsync((Entity?)null)` |
| Verify it was not called | `_repository.Verify(repository => repository.UpdateAsync(It.IsAny<Entity>(), It.IsAny<CancellationToken>()), Times.Never());` |
| Boolean | `deactivated.Should().BeTrue();` |
| Value | `entity.Name.Should().Be("Example Entity");` |
| Collection | `fields.Should().ContainSingle(field => field.Equals("Name", StringComparison.Ordinal));` |

## Rules

- Do not mock the unit under test or the domain: the domain object is created for real in the Arrange.
- No ordering between tests, no shared state, no `Thread.Sleep`, and no real clock (use `FakeTimeProvider`).
- The test's token is `TestContext.Current.CancellationToken`.

| Don't | Do |
|---|---|
| `// Arrange`, `// Act`, `// Assert` | Blocks separated by a blank line |
| Two calls to the unit under test in the same test | One behavior per test |
| Three identical `[Fact]`s with different inputs | One `[Theory]` with three `[InlineData]` |
| `new Mock<Entity>()` | `new Entity("Example Entity", "52998224725")` |
| `Thread.Sleep(1000);` | `_timeProvider.Advance(TimeSpan.FromSeconds(1));` with `FakeTimeProvider` |
| `CancellationToken.None` in the test | `TestContext.Current.CancellationToken` |
| `public void Test1()` | `public void DeactivateAsync_NonexistentEntity_ReturnsFalseAsync()` |

## Examples

```csharp
public sealed class EntityServiceTests
{
    private readonly Mock<IEntityRepository> _repository = new();
    private readonly Mock<ILogger<EntityService>> _logger = new();

    [Fact]
    public async Task DeactivateAsync_NonexistentEntity_ReturnsFalseAsync()
    {
        _repository
            .Setup(repository => repository.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Entity?)null);
        var service = CreateService();

        var deactivated = await service.DeactivateAsync(42, TestContext.Current.CancellationToken);

        deactivated.Should().BeFalse();
        _repository.Verify(
            repository => repository.UpdateAsync(It.IsAny<Entity>(), It.IsAny<CancellationToken>()),
            Times.Never());
    }

    [Fact]
    public async Task DeactivateAsync_ActiveEntity_ReturnsTrueAsync()
    {
        var entity = new Entity("Example Entity", "52998224725");
        _repository
            .Setup(repository => repository.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(entity);
        _repository
            .Setup(repository => repository.UpdateAsync(entity, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var service = CreateService();

        var deactivated = await service.DeactivateAsync(42, TestContext.Current.CancellationToken);

        deactivated.Should().BeTrue();
        entity.Status.Should().Be(EntityStatus.Inactive);
    }

    private EntityService CreateService() => new EntityService(_repository.Object, _logger.Object);
}
```

`[Theory]` for the same behavior with several inputs; without an Arrange, the test has only Act and Assert.

```csharp
public sealed class StringExtensionsTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void IsEmpty_TextWithoutContent_ReturnsTrue(string? text)
    {
        var isEmpty = text.IsEmpty;

        isEmpty.Should().BeTrue();
    }
}
```

