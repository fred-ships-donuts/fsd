# Testes

Os exemplos usam xUnit v3, Moq e Fluent Assertions. Teste não leva comentário XML.

## Forma de um teste

- Classe `sealed`. O nome da classe e o do método seguem `compilador-e-nomes.md`.
- Padrão AAA em três blocos, sem comentário, separados por uma linha em branco e sem linha em branco dentro de um bloco:
  - Arrange: monta o cenário (dados e Mocks);
  - Act: uma única chamada à unidade sob teste;
  - Assert: as verificações.
- Sem nada para preparar (a entrada vem do `[InlineData]`, ou o Act é a própria construção), o teste tem só os blocos Act e Assert. Um comportamento por teste.
- `[Fact]` para um caso; `[Theory]` com `[InlineData]` para o mesmo comportamento com várias entradas.
- O Mock é um campo da classe: o xUnit cria uma instância nova da classe a cada teste.

## Moq e Fluent Assertions

| Preciso de | Como |
|---|---|
| Criar o Mock de uma dependência | `private readonly Mock<IEntidadeRepository> _repository = new();` |
| Instanciar a classe sob teste com as dependências mockadas | `new EntidadeService(_repository.Object, _logger.Object)` |
| Retorno assíncrono | `_repository.Setup(repository => repository.UpdateAsync(entidade, It.IsAny<CancellationToken>())).ReturnsAsync(true);` |
| Retornar nulo | `.ReturnsAsync((Entidade?)null)` |
| Verificar que não chamou | `_repository.Verify(repository => repository.UpdateAsync(It.IsAny<Entidade>(), It.IsAny<CancellationToken>()), Times.Never());` |
| Booleano | `inativou.Should().BeTrue();` |
| Valor | `entidade.Nome.Should().Be("Entidade Exemplo");` |
| Coleção | `campos.Should().ContainSingle(campo => campo.Equals("Nome", StringComparison.Ordinal));` |

## Regras

- Não mocke a unidade sob teste nem o domínio: o objeto de domínio é criado de verdade no Arrange.
- Sem ordem entre testes, sem estado compartilhado, sem `Thread.Sleep` e sem relógio real (use `FakeTimeProvider`).
- O token do teste é `TestContext.Current.CancellationToken`.

| Não faça | Faça |
|---|---|
| `// Arrange`, `// Act`, `// Assert` | Blocos separados por uma linha em branco |
| Duas chamadas à unidade sob teste no mesmo teste | Um comportamento por teste |
| Três `[Fact]` iguais com entradas diferentes | Um `[Theory]` com três `[InlineData]` |
| `new Mock<Entidade>()` | `new Entidade("Entidade Exemplo", "52998224725")` |
| `Thread.Sleep(1000);` | `_timeProvider.Advance(TimeSpan.FromSeconds(1));` com `FakeTimeProvider` |
| `CancellationToken.None` no teste | `TestContext.Current.CancellationToken` |
| `public void Teste1()` | `public void InativarAsync_EntidadeInexistente_ReturnsFalseAsync()` |

## Exemplos

```csharp
public sealed class EntidadeServiceTests
{
    private readonly Mock<IEntidadeRepository> _repository = new();
    private readonly Mock<ILogger<EntidadeService>> _logger = new();

    [Fact]
    public async Task InativarAsync_EntidadeInexistente_ReturnsFalseAsync()
    {
        _repository
            .Setup(repository => repository.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Entidade?)null);
        var service = CriarService();

        var inativou = await service.InativarAsync(42, TestContext.Current.CancellationToken);

        inativou.Should().BeFalse();
        _repository.Verify(
            repository => repository.UpdateAsync(It.IsAny<Entidade>(), It.IsAny<CancellationToken>()),
            Times.Never());
    }

    [Fact]
    public async Task InativarAsync_EntidadeAtiva_ReturnsTrueAsync()
    {
        var entidade = new Entidade("Entidade Exemplo", "52998224725");
        _repository
            .Setup(repository => repository.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(entidade);
        _repository
            .Setup(repository => repository.UpdateAsync(entidade, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var service = CriarService();

        var inativou = await service.InativarAsync(42, TestContext.Current.CancellationToken);

        inativou.Should().BeTrue();
        entidade.Status.Should().Be(StatusEntidade.Inativa);
    }

    private EntidadeService CriarService() => new EntidadeService(_repository.Object, _logger.Object);
}
```

`[Theory]` para o mesmo comportamento com várias entradas; sem Arrange, o teste tem só Act e Assert.

```csharp
public sealed class StringExtensionsTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void IsEmpty_TextoSemConteudo_ReturnsTrue(string? texto)
    {
        var vazio = texto.IsEmpty;

        vazio.Should().BeTrue();
    }
}
```

