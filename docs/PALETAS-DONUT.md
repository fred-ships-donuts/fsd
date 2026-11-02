# Paletas Donut

Referência das paletas testadas para a CLI. Os valores são os campos de `Palette` em `src/cli/ui/theme.ts`.

## 1. Donut Noto (versão atual, guardada)

Cores tiradas do emoji 🍩 renderizado pela fonte Noto Color Emoji, por contagem das cores dominantes (valores aproximados).

| Campo | Hex | Cor de origem |
|---|---|---|
| `header` | `#90c0e0` | granulado azul |
| `title` | `#f0b030` | massa dourada |
| `focus` | `#f070a0` | cobertura rosa |
| `checked` | `#f0a0a0` | rosa claro |
| `hint` | `#806050` | marrom discreto |
| `barFull` | `#d08010` | massa laranja |
| `barEmpty` | `#805040` | cobertura de chocolate |
| `success` | `#f0b030` | dourado |
| `warning` | `#d08010` | laranja |
| `error` | `#f05050` | granulado vermelho |

Ponto de atenção: `hint` e `barEmpty` têm pouco contraste sobre fundo escuro.

## 2. Alternativa A: Morango

Cobertura rosa dominante, com mel no título. Mais clara que a atual, para ganhar contraste no texto.

| Campo | Hex |
|---|---|
| `header` | `#ff8fb8` |
| `title` | `#ffd27a` |
| `focus` | `#ff6fa3` |
| `checked` | `#ffb3cc` |
| `hint` | `#9c7a6e` |
| `barFull` | `#ff6fa3` |
| `barEmpty` | `#4a3530` |
| `success` | `#90c0e0` |
| `warning` | `#ffb020` |
| `error` | `#ff5b5b` |

## 3. Alternativa B: Chocolate ao leite

Glacê castanho-claro e creme, com azul do granulado só para sucesso. Tons mais suaves, pensada para um terminal escuro sem fadiga.

| Campo | Hex |
|---|---|
| `header` | `#e8c39e` |
| `title` | `#d9a25f` |
| `focus` | `#f2b680` |
| `checked` | `#f5d9b5` |
| `hint` | `#8c6a52` |
| `barFull` | `#c8843a` |
| `barEmpty` | `#5a3e2e` |
| `success` | `#9ed9e8` |
| `warning` | `#f0c040` |
| `error` | `#e8604c` |

## 4. Alternativa C: Granulado

Versão mais colorida: cada elemento usa uma cor de granulado diferente. Azul, rosa, amarelo e vermelho vêm do emoji. Verde e laranja não aparecem no emoji e foram acrescentados de propósito, para ganhar mais cor.

| Campo | Hex | Origem |
|---|---|---|
| `header` | `#90c0e0` | granulado azul |
| `title` | `#f070a0` | granulado rosa |
| `focus` | `#f0b030` | granulado amarelo |
| `checked` | `#ff6464` | granulado vermelho |
| `hint` | `#a8a0b8` | lilás apagado (acrescentado) |
| `barFull` | `#f070a0` | granulado rosa |
| `barEmpty` | `#3c2a22` | cobertura escura |
| `success` | `#7ed8a0` | verde (acrescentado) |
| `warning` | `#ff9a4c` | laranja (acrescentado) |
| `error` | `#ff4f4f` | vermelho |

## Status

- Paleta 1 guardada aqui. Em `theme.ts` ela é o tema `donut`, o padrão.
- Alternativas A, B e C estão em `theme.ts` como `morango`, `chocolate` e `granulado`, para comparar.
- O passo **Tema** do assistente (6 de 7 no fluxo Instalar) escolhe entre os quatro. Também dá para trocar direto no campo `theme` de `~/.fsd/config.json`.
