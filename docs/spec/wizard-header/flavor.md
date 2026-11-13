# Wizard header: donut and CLI name

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 6.10 A rosquinha e o nome no cabeçalho

O cabeçalho da tela inicial (6.1) é a rosquinha 🍩 e o nome `FRED` / `SHIPS` / `DONUTS`. Esta seção é a referência de como ele é feito e do que ficou decidido; a versão aprovada pelo autor está no backup `~/Backups/fred-ships-donuts-responsive-FINAL-2026-11-02`.

**Regras do autor**

- O conteúdo da moldura fica alinhado à esquerda.
- A moldura (o conteúdo mais a borda de 2 linhas) ocupa **no máximo 35% da altura da janela**.
- As três palavras, **na vertical**, são o mínimo que o cabeçalho tem de mostrar e têm de ficar legíveis: quando brigam com o teto de 35%, elas vencem.
- O tamanho de partida é **80 × 24**.
- A rosquinha adotada é a do backup `…-responsive-FINAL` (o autor a chamou de perfeita); o limite nos tamanhos pequenos é o que um terminal de blocos consegue desenhar (abaixo).

**A origem da rosquinha**

- `emojiDonut.ts` guarda o emoji 🍩 da fonte Noto Color Emoji como uma grade de 192 × 96 sub-pixels, gerada uma vez; a CLI não lê a fonte em tempo de execução.
- O terminal do autor (gnome-terminal, VTE 0.76) não anuncia sixel (resposta a DA1 `61;1;21;22`) e não tem protocolo gráfico, então a rosquinha é sempre **blocos de caractere** com duas cores por célula. O emoji de uma linha parece perfeito porque o terminal o desenha com pixels de verdade; a rosquinha de blocos não alcança isso.

**O algoritmo** (`donutArt.ts`)

1. O emoji é recortado pela caixa dos seus pixels opacos (`BOX`) e encaixado inteiro na grade: nada é cortado e nenhuma máscara é imposta (o topo de chocolate, a lateral dourada e o confeito do topo ficam como no ícone). Máscaras de elipse e de superelipse foram testadas e descartadas (a elipse afina as pontas, a superelipse fica quadrada).
2. As colunas seguem a proporção do emoji: `emojiCols(linhas)` = 12 (5 linhas), 15 (6), 22 (9), 25 (10), 30 (12), 35 (14), 65 (26).
3. Cada célula é uma grade de 8 × 8 amostras (`SUB`), cada uma a média de área da fonte; uma amostra com menos de 70% de opacidade (`OPAQUE_SHARE`) é transparente. Limiares menores criam fiapos nas bordas.
4. `fit` escolhe, por célula, o bloco e as duas cores que melhor representam as amostras. Candidatos: os 15 quadrantes, os oitavos inferiores `▁▂▃▅▆▇`, os oitavos à esquerda `▏▎▍▋▊▉` e `▔`. O custo é a dispersão das cores em torno da média, de cada lado, mais 15 000 por amostra do lado errado da transparência. O fundo só fica transparente quando metade ou mais das amostras de trás é transparente; uma célula de cor única vira `█`.
5. Lascas soltas de um oitavo na vertical (`▏` `▕`), sem nada acima nem abaixo, são apagadas.
6. Um bloco de primeiro plano nunca fica sem cor (o terminal usaria a cor padrão); só o fundo pode ficar transparente.
7. O desenho é guardado em cache por tamanho (64 entradas), porque arrastar a janela passa por um tamanho a cada passo.

**Versão no código (não confirmada como a boa: o autor a rejeitou no fim da sessão de 2026-11-02, e a versão boa está por identificar).** É a do backup `…-responsive-FINAL`, que ele havia chamado de perfeita: quadrantes e oitavos, sem mais nada, em todos os tamanhos (a impressão digital sha256 do 35 × 14 está nos testes). Erro de cor contra o emoji (menor é melhor) e sobreposição da silhueta, medidos nesta versão:

| Linhas | Erro | Silhueta |
|---|---|---|
| 5 | 920 | 0,933 |
| 6 | 802 | 0,943 |
| 7 | 670 | 0,951 |
| 8 | 591 | 0,954 |
| 9 | 527 | 0,963 |
| 10 | 439 | 0,968 |

Em 6 linhas são 15 × 6 células, no máximo uns 30 × 12 pixels de cor: o serrilhado é do meio (blocos), não do algoritmo. Só uma imagem real ou mais linhas resolveriam; a segunda passa do teto de 35%.

**Tentativa descartada: sextantes.** Até 9 linhas, os 60 sextantes de 2 × 3 pixels (U+1FB00…) como candidatos, mais uma penalização de 3 vezes para perder cor onde a imagem tem cor (um pontinho do fundo no meio do chocolate), baixaram o erro (6 linhas: 737; 8: 433; 9: 387) e deixaram o furo e os confeitos mais nítidos, mas o autor voltou à versão do backup. O código e o teste dessa versão estão guardados fora do projeto (`scratchpad/parked/donutArt.with-sextants.ts` e `donutQuality.with-sextants.test.ts`). Também foram testados e descartados o preenchimento de amostras transparentes isoladas e a cor dominante da amostra em vez da média (as manchas cinza-arroxeadas, de um granulado misturado ao chocolate dentro da mesma célula, continuam: vêm de a célula ter só duas cores).

**O nome** (`wordArt.ts`, `shadowFont.ts`, `pixelFont.ts`)

As palavras só são desenhadas em tamanhos que têm letras nítidas; a fonte `ANSI Shadow` (a do banner do GSD) só é nítida no seu tamanho de 6 linhas e, espremida em 3, 4 ou 5, vira papa (a perna do `R` e a barra do `E` se fundem, sobram fiapos sob as letras). Por isso há uma fonte para cada tamanho:

| Linhas por palavra | Fonte | Células por palavra (`FRED` / `SHIPS` / `DONUTS`) |
|---|---|---|
| 6 | `ANSI Shadow` no tamanho nativo (`shadowFont.ts`, reamostrada por `wordArt.ts`); sombra de `╗ ║ ╝` como faixa cheia | 32 / 35 / 53 |
| 4 | fonte de pixels em quadrantes: letras de 10 × 7 pixels, curvas e diagonais, sombra de 2 pixels à direita e 1 abaixo; a sombra não é desenhada dentro do vazio da própria letra | 24 / 28 / 36 |
| 2 | fonte de pixels em sextantes (2 × 3 por célula): letras de 8 × 5 pixels, hastes de 2 pixels, **sem sombra** (ela pesava tanto quanto a letra e virava um xadrez cinza) e uma linha de pixels de folga entre as palavras | 20 / 24 / 30 |

Cores: corpo `#f5e6c8` (bege claro); sombra `#9c9076` em 6 linhas e `#6a624e` em 4 (escura o bastante para o corpo ser o que o olho lê); a moldura usa a cor de cabeçalho do tema.

**O layout** (`heroLayout` em `Chrome.tsx`)

- A moldura toma a largura da janela menos 2 (o padding da raiz); `heroShareRows(linhas)` = `floor(linhas × 0,35) − 2` é o máximo de linhas de conteúdo dentro dos 35%, e `HERO_RESERVED_ROWS = 11` é o que o menu ocupa abaixo do conteúdo da moldura (borda 2, margem 1, título 2, três opções, rodapé 3).
- Ordem de escolha: (1) as maiores palavras (6, 4 ou 2 linhas) que cabem dentro dos 35%, com a maior rosquinha ao lado (até 26 linhas, no máximo a altura permitida); (2) as mesmas palavras sozinhas, se a rosquinha não cabe na largura; (3) passando dos 35% só o necessário, as palavras de 2 linhas (6 linhas de conteúdo) com a rosquinha não mais alta que elas; (4) essas palavras sozinhas; (5) só a rosquinha, a maior dentro dos 35%; (6) o cabeçalho de uma linha.
- Com 6 a 11 linhas de conteúdo dentro dos 35% as palavras têm 2 linhas, de 12 a 17 têm 4, e de 18 em diante têm 6; o teto manda, mesmo com espaço sobrando na janela.
- Menores janelas: as palavras (de 2 linhas) cabem a partir de 17 linhas e 36 colunas (com a rosquinha, a partir de 51 colunas); só a rosquinha, a partir de 20 linhas e 18 colunas; abaixo disso, o cabeçalho de uma linha.

| Janela | Palavras (linhas) | Rosquinha (linhas × colunas) | Moldura |
|---|---|---|---|
| 80 × 24 | 2 | 6 × 15 | 8 linhas (33%) |
| 100 × 28 | 2 | 7 × 17 | 9 (32%) |
| 120 × 30 | 2 | 8 × 20 | 10 (33%) |
| 120 × 35 | 2 | 10 × 25 | 12 (34%) |
| 120 × 40 | 4 | 12 × 30 | 14 (35%) |
| 150 × 60 | 6 | 19 × 47 | 21 (35%) |
| 80 × 20 | 2 | 6 × 15 | 8 (40%, passa do teto: as palavras vencem) |
| 80 × 17 | 2 | 6 × 15 | 8 (47%) |
| 80 × 16 | uma linha | — | — |
| 38 × 40 | 2 | — (sem espaço) | 8 |
| 20 × 40 | — | 5 × 12 | 7 |

**Arquivos** (histórico: removidos na reorganização de 2026-11-07, ver 6.12 e 9): `Chrome.tsx` (layout e desenho), `donutArt.ts`, `emojiDonut.ts`, `wordArt.ts`, `shadowFont.ts`, `pixelFont.ts`, `sextant.ts` (só as letras de 2 linhas usam os sextantes).

**Testes**

- `donutQuality.test.ts`: contra o próprio emoji, em todas as alturas de 5 a 40 linhas (erro abaixo da curva `7200 / linhas^1,15`, sobreposição da silhueta acima de um piso, sem queda de mais de 10% ao subir uma linha), limites próprios em 8 tamanhos (erro máximo 870, 640, 475, 375, 340, 255, 190 e 148 em 6, 8, 10, 12, 14, 18, 22 e 28 linhas), larguras de metade ao dobro da proporção, proporção, sem corte, furo no meio, cores, sem células soltas e a impressão digital do 35 × 14.
- `heroLayout.test.ts`: em toda janela de 20 a 200 colunas por 10 a 60 linhas, nada passa da janela, a proporção do emoji se mantém, a moldura tem no máximo 35% (a única exceção são as palavras de 2 linhas, e então a moldura é só as palavras), as palavras aparecem onde cabem e nunca encolhem quando a janela cresce (exceto quando a rosquinha entra ao lado); o 80 × 24 como caso explícito.
- `pixelFont.test.ts`: cada letra do nome nos tamanhos de 2 e 4 linhas, só blocos de quadrante (4 linhas) e de sextante (2 linhas), numeração dos sextantes como no Unicode, o vazio de um `O` sem sombra, a linha de folga vazia e o contraste da sombra.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None
