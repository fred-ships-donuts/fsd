# Desvios dos padrões de código

Escopo: <arquivos ou diff revisados>
Fonte dos padrões: <`docs/padroes-codigo/` do projeto ou `references/padroes/` da skill>

## Veredito

<Sem desvios | N desvios: X proibições, Y nomes e idioma, Z async e cancelamento, W estilo>

## Desvios

Ordem de gravidade: proibições, nomes e idioma, async e cancelamento, estilo.

| # | Arquivo:linha | Regra violada | Forma correta |
|---|---|---|---|
| 1 | `src/Exemplo.cs:42` | `.Result` em chamada assíncrona (`csharp.md`, async) | `await _repository.GetAsync(id, cancellationToken)` |

## Fora do escopo

Desvios em código vizinho que a tarefa não tocou: só citados, sem correção.

## Conferência automática

Saída de `scripts/conferir.py` (as regras que o analisador do build não pega) e o que ela não cobre, conferido à mão.
