# Estilo

A base é o coding-style do dotnet/runtime, com `var`.

## Formatação

| Regra | Exemplo |
|---|---|
| Chaves no estilo Allman: cada chave em sua linha | `if (x)` e, na linha de baixo, `{` |
| Quatro espaços, sem tabs (dois em `.csproj`, `.props`, `.json` e `.slnx`) | |
| Uma instrução e uma declaração por linha | |
| Linha de código C# com no máximo 120 colunas, inclusive comentário XML | |
| Nunca mais de uma linha em branco seguida; sem espaço sobrando | |
| Vírgula final no último item de `switch` de expressão, inicializador e expressão de coleção em várias linhas | `_ => null,` |
| Um atributo por linha, cada um no seu `[...]`; atributo de parâmetro fica na mesma linha do parâmetro | `[Theory]` e, na linha de baixo, `[InlineData("")]` |
| UTF-8 sem BOM; acentos literais no código, nas mensagens e nos comentários XML | `"Entidade não encontrada."` |

| Não faça | Faça |
|---|---|
| `if (x) {` na mesma linha | `if (x)` e `{` na linha de baixo |
| `var nome = request.Nome; var documento = request.Documento;` | Uma declaração por linha |
| `int id, total;` | `var id = 0;` e `var total = 0;`, cada um na sua linha |
| `[Theory, InlineData("")]` | Um atributo por linha |
| `_ => null` no último item, sem vírgula | `_ => null,` |

## Quebra de linha

Quando a linha passa de 120 colunas:

- Parâmetros e argumentos: todos quebram, um por linha, com quatro espaços a mais que a declaração. O parêntese de fechamento fica no último item.
- Lista de herança: `: Interface` na linha de baixo do nome do tipo, com quatro espaços.
- Corpo de expressão: `=>` na linha de baixo, com quatro espaços.
- Operador binário e encadeamento de chamadas: o operador (`&&`, `+`, `.`) começa a linha de baixo.
- Texto do comentário XML: continua na linha de baixo, com o mesmo `///`.

```csharp
internal sealed class EntidadeService(
    IEntidadeRepository repository,
    ILogger<EntidadeService> logger)
    : IEntidadeService
```

```csharp
public async Task<IReadOnlyList<Entidade>> ListarPorPeriodoAsync(
    DateTimeOffset inicio,
    DateTimeOffset fim,
    CancellationToken cancellationToken = default)
```

```csharp
var podeInativar = entidade.Status is StatusEntidade.Ativa
    && entidade.Pendencias.Count == 0;
```

Não faça:

```csharp
public async Task<IReadOnlyList<Entidade>> ListarPorPeriodoAsync(DateTimeOffset inicio,
    DateTimeOffset fim, CancellationToken cancellationToken = default)
```

Faça: todos os parâmetros quebram, um por linha, como no exemplo acima.

## Linhas em branco

- Uma linha em branco entre membros do tipo e entre os grupos de `using`.
- Uma linha em branco antes e depois de cada instrução de controle (`if`, `foreach`, `while`, `using` em bloco), com ou sem chaves, exceto quando ela abre ou fecha o bloco em que está.
- O `return` que encerra o método é sempre separado do código anterior por uma linha em branco. Dentro de um `if`, o `return` fica colado à instrução anterior.
- Sem linha em branco logo depois de `{` nem logo antes de `}`.

Não faça:

```csharp
var entidade = new Entidade(nome, documento);
return await _repository.AddAsync(entidade, cancellationToken);
```

Faça:

```csharp
var entidade = new Entidade(nome, documento);

return await _repository.AddAsync(entidade, cancellationToken);
```

Dentro de `if`, colado:

```csharp
if (entidade.Status is StatusEntidade.Inativa)
{
    entidade.Ativar();
    return true;
}
```

Uma instrução: sem chaves, na linha de baixo.

```csharp
if (valor is null)
    return string.Empty;
```

Chaves quando algum bloco da cadeia tiver chaves, ou quando o corpo ocupar várias linhas.

```csharp
if (entidade.Status is StatusEntidade.Inativa)
{
    entidade.Ativar();
    return true;
}
else
{
    entidade.Inativar();
}
```

| Não faça | Faça |
|---|---|
| `if (valor is null) return string.Empty;` na mesma linha | `if (valor is null)` e `return string.Empty;` na linha de baixo |
| `if (x) { return; }` com chaves para uma instrução | Sem chaves, na linha de baixo |
| `if` com chaves e `else` sem chaves | Chaves nos dois blocos |

## Validação negativa

Valide os casos negativos primeiro e saia cedo (guard clause): cada condição de falha vira um `if` que devolve na hora, e o caminho feliz fica por último, sem recuo extra. Isso evita o alongamento horizontal: `if` dentro de `if` dentro de `if`, com o `return` no fim da escada.

```csharp
public async Task<Result<NavioReadModel>> HandleAsync(
    ObterNavioQuery query,
    CancellationToken cancellationToken = default)
{
    if (query.Invalid)
        return new Result<NavioReadModel>(query.Notifications);

    if (await _repository.GetAsync(_context.Database, query.Id, cancellationToken) is not { } navio)
        return new Result<NavioReadModel>(nameof(query.Id), $"Navio {query.Id} não encontrado.");

    return new Result<NavioReadModel>(navio);
}
```

Com mais possibilidades, siga validando os negativos, um `if` de saída por caso, todos no mesmo nível. Não aninhe o caminho feliz dentro da condição de sucesso.

```csharp
if (xxxx is not true)
    return w;

if (yyyy is not true)
    return w;

if (zzzz is not true)
    return w;

return sucesso;
```

| Não faça | Faça |
|---|---|
| `if (xxxx)` com `if (yyyy)` com `if (zzzz)` aninhados e o `return` no centro | Um `if` de saída por condição negativa, no mesmo nível, e o caminho feliz no fim |
| `if (navio is not null)` envolvendo o resto do método | `if (navio is not { })` com a saída cedo, e o resto sem recuo |
| `else` depois de um `if` que já devolve | Sem `else`: o código seguinte é o caminho que sobrou |

## Comentários

O único comentário permitido no código C# é o comentário de documentação XML (`///`).

Proibido:

- comentário de linha (`//`) e de bloco (`/* */`), em qualquer posição: dentro de método, ao lado de instrução ou entre membros;
- código comentado;
- marcador de pendência (`TODO`, `FIXME`, `HACK`): a pendência vai para o gerenciador de tarefas.

Quando um trecho parece precisar de comentário, é o código que precisa ficar mais claro: extraia um método ou uma variável com nome que explique, ou leve a explicação para o `<remarks>` do membro em último caso.

Obrigatório:

- `<summary>` em todo tipo e membro `public` ou `protected` (CS1591). Em `internal` e `private`, só quando realmente necessário.
- `<param>` em cada parâmetro de record posicional: é ele que documenta a propriedade gerada.
- `<exception>` para cada exceção que o membro lança de propósito.
- `<inheritdoc/>` em implementação de interface e em `override`. Não repita o texto da origem.
- `<param>` e `<returns>` nos demais membros quando o nome e o tipo não bastam. Se um `<param>` for escrito, todos são (CS1573).

Forma do texto:

- Português, frase completa, terminada em ponto.
- Tipo: o que ele é (`Entidade de domínio.`). Método: o que ele faz, com o verbo na terceira pessoa (`Inativa a entidade.`). Propriedade: o que ela guarda (`Nome da entidade.`).
- Diga o que não é óbvio pela assinatura: regra, efeito colateral, retorno especial. Não repita o nome do membro.
- Referência a código com `<see cref="..."/>` e `<paramref name="..."/>`, nunca com o nome em texto solto.

A regra vale para o código C#. Arquivos de configuração (`.editorconfig`, `.csproj`, `.props`) mantêm o comentário do próprio formato.

| Não faça | Faça |
|---|---|
| `// busca a entidade` antes da linha | `Nome` que explica: `var entidadeAtiva = ...` |
| `// TODO: validar documento` | Tarefa no gerenciador de tarefas |
| `// var antigo = ...;` | Apagar o código |
| `/// <summary>Inativar.</summary>` | `/// <summary>Inativa a entidade.</summary>` |
| `/// <summary>Busca pelo id.</summary>` | `/// <summary>Busca uma entidade pelo <paramref name="id"/>.</summary>` |
| Repetir o texto da interface na implementação | `/// <inheritdoc/>` |
| `/// <summary>Retorna o Status.</summary>` | `/// <summary>Status da entidade.</summary>` |

## Declarações

| Regra | Exemplo |
|---|---|
| Visibilidade sempre explícita, como primeiro modificador (membro de interface fica sem) | `private const string SqlGet`, nunca só `const string` |
| Campos no topo do tipo, antes de construtores e membros, em qualquer ordem entre si | `private const string SqlGet`, `private readonly IEntidadeRepository _repository` |
| Sem `this.` | `_repository`, não `this._repository` |
| Palavra-chave da linguagem em vez do tipo do BCL | `int`, `string`, `int.Parse`; nunca `Int32`, `String` |
| `nameof(...)` em vez de texto literal | `nameof(Documento)` |
| `new()` só em campo e propriedade com o tipo declarado; variável local usa `var x = new T(...)` | `private readonly Lock _lock = new();`; nunca em variável local, `return`, argumento ou membro com corpo de expressão |
| Propriedade com escrita restrita | `private set` quando muda só pelo próprio tipo; `init` ou `private init` quando é preenchida só na criação |
| Classe dividida em arquivos | `partial`, mantendo `sealed`: `public sealed partial class EntidadeService` |

| Não faça | Faça |
|---|---|
| `const string SqlGet = ...;` | `private const string SqlGet = ...;` |
| `static private readonly Regex s_formato` | `private static readonly Regex s_formato` |
| `this._repository.AddAsync(...)` | `_repository.AddAsync(...)` |
| `Int32 total = Int32.Parse(texto);` | `var total = int.Parse(texto);` |
| `throw new ArgumentException("Documento inválido.", "documento");` | `throw new ArgumentException("Documento inválido.", nameof(documento));` |
| `return new();` | `return new Coordenada(latitude, longitude);` |
| `public StatusEntidade Status { get; set; }` em tipo que controla o próprio estado | `public StatusEntidade Status { get; private set; }` |
| `public Documento Documento { get; private set; }` para valor que não muda depois de criado | `public Documento Documento { get; private init; }` |
| `public partial class EntidadeService` | `public sealed partial class EntidadeService` |

## Ordem dos membros

1. Campos.
2. Propriedades.
3. Construtores.
4. Operadores e conversões.
5. Métodos: os `public` primeiro, depois os `private`.

Classe com construtor primário: campos das dependências, depois métodos. Classe de teste: campos dos Mocks, construtor, métodos de teste e métodos auxiliares `private`.

| Não faça | Faça |
|---|---|
| Construtor entre duas propriedades | Todas as propriedades, depois os construtores |
| Método `private` entre dois métodos `public` | Os `public` primeiro, depois os `private` |
| Campo declarado depois de um método | Campos no topo do tipo |

## Corpo de expressão

| Membro | Forma |
|---|---|
| Propriedade só de leitura e acessador | Corpo de expressão: `public bool IsEmpty => string.IsNullOrEmpty(texto);` |
| Método, operador e função local | Corpo de expressão quando o corpo é uma única expressão; com mais de uma instrução, bloco |
| Construtor | Sempre bloco |
| Lambda | Corpo de expressão quando é uma única expressão |

| Não faça | Faça |
|---|---|
| `public bool IsEmpty { get { return string.IsNullOrEmpty(texto); } }` | `public bool IsEmpty => string.IsNullOrEmpty(texto);` |
| `public int Total() { return _itens.Count; }` | `public int Total() => _itens.Count;` |
| `public Entidade(string nome) => Nome = nome;` | Construtor com corpo de bloco |

## `var`

Diverge do runtime. Use `var` em toda variável local cujo tipo o compilador infere: resultado de chamada, de `await`, de construtor (`var x = new T(...)`), de fábrica e desconstrução. Tipo explícito só onde o `var` não se aplica: expressão de coleção e conversão implícita, em que o tipo de destino é o que faz a conversão acontecer.

```csharp
var entidade = await _repository.GetByIdAsync(id, cancellationToken);
var (nome, documento) = request;

var texto = new StringBuilder();

IReadOnlyList<string> campos = [];
Documento documento = "529.982.247-25";
```

| Não faça | Faça |
|---|---|
| `Entidade? entidade = await _repository.GetByIdAsync(id, cancellationToken);` | `var entidade = await _repository.GetByIdAsync(id, cancellationToken);` |
| `string nome = request.Nome;` | `var nome = request.Nome;` |
| `var campos = [];` | `IReadOnlyList<string> campos = [];` |
| `StringBuilder texto = new();` | `var texto = new StringBuilder();` |

## Desconstrução

Use a desconstrução quando fizer sentido: o tipo oferece `Deconstruct` (record posicional, tupla ou método próprio) e duas ou mais propriedades são lidas juntas. Com uma só, leia a propriedade.

```csharp
var (nome, documento) = request;
var idEntidade = request.Id;
```

| Não faça | Faça |
|---|---|
| `var nome = request.Nome;` e `var documento = request.Documento;` | `var (nome, documento) = request;` |
| `var (idEntidade, _) = request;` para ler uma só propriedade | `var idEntidade = request.Id;` |

## Diretivas `using`

A ordem é automática (`dotnet format`, ou Remover e Classificar Usings no IDE).

- No topo do arquivo, fora do namespace.
- Primeiro `System.*`, depois um grupo por namespace raiz (`Dapper`, `Microsoft.*`, `<Solucao>.*`), tudo em ordem alfabética.
- Uma linha em branco entre os grupos, nenhuma dentro de um grupo.
- Por último, em grupo próprio, os aliases.
- Sem `using` repetido do SDK (ImplicitUsings) nem sem uso.
- Sem `global using` e sem `using static`.

```csharp
using System.Data.Common;
using System.Text.RegularExpressions;

using Dapper;

using Microsoft.AspNetCore.Mvc;

using TimerDeSistema = System.Timers.Timer;
```

O alias só existe em três casos:

1. Tipo com o mesmo nome de um segmento do namespace atual. O nome resolve para o namespace (CS0118), e o alias dá ao tipo o nome com o contexto: `EntidadeDominio`.
2. Dois tipos com o mesmo nome em namespaces diferentes (`System.Threading.Timer` também existe): `using TimerDeSistema = System.Timers.Timer;`.
3. Tupla ou genérico longo que se repete no arquivo: `using Coordenada = (double Latitude, double Longitude);`.

O alias leva o sufixo do contexto (`EntidadeDominio`, `EntidadeRow`), nunca um nome genérico.

| Não faça | Faça |
|---|---|
| `using` dentro do namespace | `using` no topo do arquivo |
| `using Dapper;` antes de `using System.Data.Common;` | `System.*` primeiro |
| `using System.Linq;` com ImplicitUsings habilitado | Remover |
| `global using Dapper;` | `using Dapper;` no arquivo que usa |
| `using static System.Math;` | `Math.Round(...)` |
| `using Tipo = Solucao.Dominio.Entidade;` | `using EntidadeDominio = Solucao.Dominio.Entidade;` |

A verificação dessas regras no build está em `build.md`.

