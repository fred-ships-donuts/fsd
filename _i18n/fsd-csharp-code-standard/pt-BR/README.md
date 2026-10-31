# fsd-csharp-code-standard — Padrões de codificação C#

Aplica os padrões de codificação C# do projeto ao escrever, alterar ou revisar código: compilador e nomes,
C# moderno, estilo, testes e imposição no build. Uma skill e um agente revisor (só lê); `scripts/conferir.py` confere as regras que o
analisador do build não pega.

> **Versão:** 1.0.0-alpha.2 · **Licença:** UNLICENSED · **Autor:** Frederico Jacobi.
> A fonte de verdade de comportamento é o [`SKILL.md`](SKILL.md).

## O que caracteriza esta skill

| | |
|---|---|
| **Quem e quando** | o **Dev**, ao escrever, alterar ou revisar código C# |
| **Entrada** | a tarefa (código a escrever ou diff a revisar) |
| **Régua** | `docs/padroes-codigo/` do projeto; sem a pasta, a cópia em [`references/padroes/`](references/padroes/) |
| **Carga** | só o arquivo do tema da tarefa, nunca todos de uma vez |
| **Saída** | código na forma do padrão, ou lista de desvios com `arquivo:linha`, regra e forma correta |
| **Não faz** | refatorar o que a tarefa não tocou, mudar `.editorconfig` ou `Directory.Build.props` sem pedido, versionar |

## Como usar

```
/fsd-csharp-code-standard escreva o EntidadeService seguindo os padrões
/fsd-csharp-code-standard revise o diff atual contra os padrões de código
```

## Estrutura

```
fsd-csharp-code-standard/
├── SKILL.md
├── README.md
├── agents/
│   └── fsd-revisor-padroes.md          revisão independente do diff, só lê
├── scripts/
│   ├── conferir.py                     regras que o analisador do build não pega, por regex
│   └── sincronia.py                    compara references/padroes/ com docs/padroes-codigo/ do projeto
├── templates/
│   ├── Result.cs                       código de referência do Result<T>
│   └── relatorio-desvios.md            formato da lista de desvios
├── evals/
│   └── evals.json                      casos de teste da skill
└── references/
    ├── padroes/                        cópia de docs/padroes-codigo/ do projeto
    │   ├── visao-geral.md              pivô: resumo de todas as regras
    │   ├── compilador-e-nomes.md       compilador, nulidade, idioma, nomes, mensagens
    │   ├── csharp.md                   C# moderno, log, tipagem, async, cancelamento
    │   ├── estilo.md                   formatação, comentários, declarações, `using`
    │   ├── testes.md                   xUnit v3, Moq, Fluent Assertions
    │   └── build.md                    `.editorconfig` e propriedades do projeto
    └── modelos/
        └── classes.md                  modelo de cada classe: handler, endpoint, request, query/command, repositório, testes
```

Os arquivos de `references/padroes/` são cópia de `my-project-api/docs/padroes-codigo/`. Os nomes
perdem o prefixo `padroes-codigo-` (`padroes-codigo-estilo.md` vira `estilo.md`, `padroes-codigo.md` vira
`visao-geral.md`). Para atualizar, rode `scripts/sincronia.py` (que ignora o prefixo e o terminador de linha) e leve as diferenças para a
cópia, mantendo os nomes sem o prefixo, inclusive nas referências cruzadas do texto. O `classes.md` é da skill, tirado da
funcionalidade `DadosBase/Navios`: não existe no projeto e não é sobrescrito pela cópia.
