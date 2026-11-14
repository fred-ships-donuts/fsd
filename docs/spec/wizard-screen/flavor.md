# Wizard screen: progress bar, themes and layout

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 6.4 Barra de progresso do rodapé

- No fluxo Instalar a barra representa os passos 1 a 7 (o menu não conta); no fluxo Apagar (6.8), os passos 1 a 3. Cada passo concluído preenche sua fração: `passos concluídos / total de passos`.
- Os passos 3 (idioma) e 4 (conflitos) são condicionais. Cada um que não se aplica tira 1 do total (7, 6 ou 5) e a barra é recalculada. Mudar a seleção de skills ou o escopo muda o total.
- A barra fica **cheia ao concluir o último passo** (o resumo). Em um passo ainda em andamento ela mostra só os passos já concluídos.
- Voltar com `←` diminui a barra.
- Com `NO_COLOR` ou terminal sem cor, a barra usa só os símbolos, sem cor.

### 6.5 Temas

- Um tema define as cores da interface: cabeçalho, título do passo, item em foco, item marcado, dica de teclas, barra de progresso (parte cheia e vazia), sucesso, aviso e erro.
- Temas: **Donut** (padrão, cores do emoji 🍩 na fonte Noto Color Emoji: cobertura de chocolate, massa dourada e laranja, cobertura rosa, granulado azul e vermelho), **Morango**, **Chocolate ao leite** e **Granulado**. As três últimas são alternativas à Donut para comparação; os valores estão em `docs/PALETAS-DONUT.md`.
- O passo **Tema** do fluxo Instalar (6) escolhe o tema e mostra a pré-visualização na própria tela. O tema gravado é o que vale desde a abertura da CLI.
- O campo `theme` do `config.json` (8.2) guarda o nome do tema. Um valor desconhecido cai no Donut.
- Os símbolos (marcador de seleção, setas, preenchimento da barra) são um conjunto único, Unicode; não há escolha de símbolos nem alternativa ASCII na v1 (decidido em 2026-11-09, #14).
- Os quatro temas ficam; não há paleta única final. Na v1 o tema é só aparência, sem outra utilidade (decidido em 2026-11-09, #15).

### 6.7 Pendências do layout

1. ~~**Logotipo e itens do cabeçalho**~~: decidido, e descrito por inteiro em 6.10 (a rosquinha, o nome, o layout responsivo e os testes). O emoji 🍩 é gerado uma vez a partir da fonte Noto Color Emoji e guardado em `emojiDonut.ts`, removido em 2026-11-07: hoje a rosquinha é o mapa de pixels da 6.12. O destino (`~/.fsd/skills`) saiu do cabeçalho.
2. ~~**Posição do idioma**~~: decidido (2026-11-09, #16): o passo de idioma fica logo após o passo 2, porque depende das skills escolhidas.
3. ~~**Símbolos**~~: decidido (2026-11-09, #14): o conjunto Unicode único é o definitivo; sem alternativa ASCII na v1.
4. ~~**Largura do terminal**~~: decidido em 6.10 e 6.11: o cabeçalho segue a janela a partir de 17 linhas e 18 colunas (os mínimos exatos estão em 6.10; abaixo deles, o cabeçalho de uma linha), e o corpo corta o que não cabe em vez de comprimir.
5. ~~**Paleta final**~~: decidido (2026-11-09, #15): os quatro temas continuam no passo Tema, com Donut como padrão (6.5).

### 6.11 Redesenho e janelas pequenas

- **Redesenho** (`ui/terminal/frameWriter.ts`, instalado por `ui/run.ts`): o Ink apaga o quadro anterior linha por linha e escreve o novo em pedaços, o que depois de um redimensionamento mostra tela em branco ou quadro rasgado. O escritor troca isso por um diff de linhas contra o quadro anterior, com posição absoluta de cada linha, em **uma única escrita** entre BSU e ESU (DEC 2026) quando o terminal é conhecido por respeitá-los (VTE 0.68 ou mais novo, kitty, ghostty, iTerm2, WezTerm, alacritty…; nunca no tmux; `FSD_SYNC=1` ou `0` força). No resize (ou no primeiro quadro) todas as linhas são reescritas, cada uma apagando o resto da linha, e o fim da tela é apagado; **a tela nunca é apagada antes de pintar**, então o terminal que ignora BSU também não mostra tela em branco. O cursor fica na última linha. O apagamento de linhas que o Ink faz sozinho ao estreitar a janela é descartado (ele apagaria o que o diff acha que está na tela) e o quadro seguinte é escrito inteiro.
- **Resize** (`ui/run.ts`): o tamanho entra no `App` como propriedade e um ouvinte de `resize` registrado antes do Ink chama `rerender` de forma síncrona, ignorando eventos de mesmo tamanho; sai um quadro só, já no tamanho novo.
- **Janelas baixas e estreitas**: cabeçalho e rodapé não encolhem; o corpo corta o que não cabe (`overflowY` oculto, com o conteúdo interno sem encolher) em vez de comprimir as linhas umas sobre as outras. Abaixo de 20 linhas o cabeçalho dos passos vira uma linha, abaixo de 12 o rodapé perde a barra de progresso, o texto longo é cortado com `…` e as listas rolam para manter a linha focada visível (`listRows`).
- **Desempenho**: `NODE_ENV=production` por `env.ts` (o React em modo de desenvolvimento é bem mais lento); o cabeçalho tem um só tamanho (6.12), então a rosquinha é desenhada uma vez e as figuras só são recompostas quando a janela muda.
- **Verificado** no gnome-terminal real (VTE 0.76): 80 passos de redimensionamento (974 × 682 → 1374 × 784 → 700 × 380 e de volta), com a janela à esquerda e à direita do monitor, sem nenhuma amostra em branco. O arrasto foi com `wmctrl` (em passos); **não foi verificado** o arrasto com o mouse nem outros terminais, e o arrasto não foi repetido depois da troca do layout para o teto de 35% e as fontes de 2 e 4 linhas.
- **Sextantes**: vêm de uma fonte reserva (Noto Sans Symbols2) no gnome-terminal; em outra fonte ou terminal podem sair desalinhados. Só as letras de 2 linhas dependem deles.
- **Testes** (removidos em 2026-11-07, ver 6.12): `frameWriter.test.ts` (diff, uma escrita, BSU/ESU, passagem de sequências que não são quadro, apagamento do Ink), `App.test.tsx` ("wizard in small windows": de 100 × 30 a 24 × 5, mais a rolagem da lista) e `resize.test.ts` (o programa de verdade num tmux: nenhum quadro maior que a janela, e o que sobra na tela depois de cada resize).

### 6.12 O cabeçalho definitivo (2026-11-07)

Substitui o que 6.10 e 6.11 dizem sobre tamanhos e moldura; o resto deles é histórico.

- **Um só tamanho, o do 80 × 24, em qualquer janela.** Nada escala com a janela: a rosquinha é sempre a de 22 × 9 células e as três palavras (`FRED`, `SHIPS`, `DONUTS`), empilhadas, são sempre as de 3 linhas cada (9 linhas de conteúdo). Janela estreita demais para os dois: só as palavras; nem elas: só a rosquinha; nem isso (ou menos de 9 linhas livres acima do menu): o cabeçalho de uma linha.
- **Sem moldura.** O cabeçalho do menu e a caixa das telas de passos não têm borda (a azul `#90C0E0` saiu); o título dessas telas continua no azul da paleta. O cabeçalho do menu ocupa 9 linhas, o das telas de passos 2 a 3.
- **A rosquinha é um mapa de pixels feito à mão** (`src/cli/ui/art/donut.ts`, `DONUT_MAP_22X9`: 44 × 27 pixels, 1 pixel = 1 sextante, paleta fixa de 9 cores, o preto é o fundo do terminal). Cada grupo de 2 × 3 pixels usa no máximo 2 cores (limite da célula). Só muda por ordem explícita do autor.
- **As palavras** são a fonte de pixels de 3 linhas de `src/cli/ui/art/words.ts`: letras de 8 pixels de altura (9 com a sombra), hastes de 3 e barras de 2, sombra de 1 pixel à direita e embaixo na cobertura `#875B4F`; numa célula com corpo, sombra e vazio, o vazio toma a cor da sombra. Cores: corpo na massa `#F5B03E`, sombra na cobertura `#875B4F` (a paleta da rosquinha, `docs/PALETAS-DONUT.md`). Por todo o cabeçalho (de uma borda à outra, sobre o fundo, as letras e a rosquinha) **caem granulados** (bastões de 3 pixels, em diagonal ou deitados, rosa, azul, vermelho, rosa claro e amarelo, cada um com movimento próprio: velocidade, deriva para um lado, balanço em curva ou em zigue-zague e giro, `src/cli/ui/art/snow.ts`), como neve; sobre a letra e a rosquinha só aparecem onde a célula cabe (duas cores no máximo), nas partes cheias.
- **Versões: só git.** O versionamento físico (pastas SemVer, `save.sh`, `logos/`, `words/`, `header/`) e a trava dos trechos congelados (`check-frozen.mjs`) foram abolidos em 2026-11-07; existe só o arquivo em uso, e o histórico é o do git.
- **Código antigo do cabeçalho** (a reamostragem do emoji, `emojiDonut.ts`, e as fontes de 6, 4 e 2 linhas) foi removido na reorganização de 2026-11-07, assim como os testes.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

### A1 12.13 A barra de progresso chega a 100% somente ao concluir o resumo, e usa 5 passos no fluxo Instalar quando nem o idioma nem os conflitos se aplicam (6 se só um deles se aplica, 7 se os dois).
### A2 12.14 Tema e auto-update escolhidos aparecem pré-selecionados e valem desde as primeiras telas na execução seguinte.
### A3 12.29 O passo Conflitos só aparece quando há conflito, e o total de passos acompanha escolhas de escopo e de skills (7, 6 ou 5).
