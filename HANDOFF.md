# HANDOFF — fsd (Fred Ships Donuts CLI)

Estado em 2026-11-02. Leia nesta ordem: este arquivo, `TASKS.md`, `docs/spec/MAP.md`, `docs/FSD-INDEX.md`.

> **CABEÇALHO DEFINITIVO (2026-11-07): ver SPEC 6.12 (`docs/spec/MAP.md`).** Rosquinha de 22 × 9 (mapa de pixels feito à mão, `src/cli/ui/art/donut.ts`) e palavras de 3 linhas (`src/cli/ui/art/words.ts`), sempre no tamanho do 80 × 24, sem moldura. Sem versionamento físico nem trechos congelados: só git.
>
> **ARQUITETURA REORGANIZADA (2026-11-07): ver `docs/ARQUITETURA.md`.** `src/cli/` em camadas (`core/`, `plan/`, `engine/`, `commands/`, `wizard/`, `ui/`), dependência só para baixo; código morto do cabeçalho antigo removido. Comportamento idêntico ao de antes (conferido comparando a saída do assistente e de 37 cenários de disco antes e depois). Branch `refactor/architecture`, dois commits sobre a `main`. **Os nomes de arquivo nas seções "Sessão: …" abaixo são os de antes da reorganização.**
>
> **Regras do autor:** (1) não escrever nem rodar testes de verificação visual para a rosquinha e as letras; (2) **fazer exatamente o que ele manda e não mexer em mais nada**: se o pedido cria conflito (ex.: 3 cores numa célula), parar e perguntar qual cede; (3) usar sempre a mesma janela (`tmux respawn-pane -k -t fsd`, que roda `tsx watch ... init`).


## Onde o projeto está

- Pasta: `<repository folder>`. Branch `main`, remoto `origin` por **SSH** (`git@github.com:fredericojacobi/fred-ships-donuts.git`, chave `~/.ssh/id_ed25519`).
- **A `main` está 4 commits à frente do `origin`** (`21d9d91`, `aed7af4`, `2b59314`, `aad0e6c`); o push ainda não foi feito. **Além de `HANDOFF.md`, há mudanças sem commit** no cabeçalho e no tema (ver "Sessão: cabeçalho e tema" abaixo). Nada desta sessão foi commitado.
- **Backup da VERSÃO FINAL da rosquinha** (fora do repositório): `<backup folder>/fred-ships-donuts-header-FINAL-2026-11-02/`, com `README.md` de restauração e `SHA256SUMS`. O backup anterior, com a rosquinha em quadrantes, continua em `<backup folder>/fred-ships-donuts-header-2026-11-02/` e não deve ser sobrescrito.
- **Todas as tasks F-1.1 a F-35 foram executadas** e estão marcadas em `TASKS.md`. A Fase 5 (F-26 a F-35) veio de uma revisão da spec, hoje sem pontos em aberto.
- **Fase 6 (`fsd task`)**: F-36 a F-39 (`task new`, `list`, `step`) e F-43 (skill `fsd-nook-tasks`) estão na `develop`, assim como F-40a (#6, núcleo de transação). F-42 (#8, `.gitignore` do Install) também está na `develop`. **Pendente:** F-40b (#7, `task done` e `task archive`); a documentação (F-44, #10) é esta. Na `develop`, não na `main`.
- Não há testes no projeto (removidos por decisão do autor em 2026-11-07); `npm run build` compila.
- O pacote ainda **não foi publicado** no npm.

## O que existe

- Docs em `docs/`, com índice em `FSD-INDEX.md`. Estrutura de diretórios do framework em `FSD-DIRECTORY-STRUCTURE.md`: `nook/` (`kitchen/`, `bench/`, `cookbook/`, `bakers/`, `rack/`, `fridge/`) e `.fsd/` (`oven/`, `cache/`, `logs/`).
- CLI em `src/cli/`, em camadas (detalhe em `docs/ARQUITETURA.md`, árvore em `docs/ARQUITETURA.md#code-layout`):
  - `fsd.ts` (commander), `args.ts` (atalhos `-u -s -f`), `env.ts`, `exitCodes.ts`.
  - `core/`: escopos, catálogo, registro, configuração, conflitos, diário (leitura), semver, npm.
  - `plan/`: planejadores `install.ts`, `uninstall.ts`, `link.ts` e `types.ts`. Só leem o disco e montam um plano.
  - `engine/`: `run.ts` (fases), `verify.ts`, `transaction.ts` (diário antes de cada mudança), `recovery.ts` (desfazer, execução morta), `ops.ts`.
  - `commands/`: `init.ts`, `update.ts`, `link.ts` e o que os dois últimos compartilham (`skillPlans.ts`); `task.ts` (`fsd task new|list|step`).
  - Tasks: `core/nook.ts`, `core/taskFiles.ts` e `core/slug.ts` (pasta da task, `plan.md`, passos `.yaml`, slug do título). `engine/transactionRun.ts` é o núcleo de transação reutilizável (F-40a), que `task done`/`archive` vão usar (#7).
  - `wizard/`: regras do assistente sem React (passos, escolhas, consultas, execução).
  - `ui/`: assistente em Ink (`App.tsx`, `screens/`, `components/`, `hero/`, `art/`, `terminal/`, `theme.ts`).
- Catálogo em `src/skills/_i18n/` (`fsd-csharp-code-standard`, `fsd-nook-tasks`, `fsd-ui-approval`). A pasta `graft/` é ignorada pelo git e **não** é apagada.

## Decisões do autor

Comandos e atalhos:
- Binário único `fsd`: `init`, `update`, `update skill [nome]`, `link skill [nome]`, `-h`, `-v`. Atalhos `-u`, `-s`, `-f` como argumentos **separados e nessa ordem**; agrupados (`-usf`) ou fora de ordem são erro. `-s` e `-f` valem em `fsd link`, `-u` não. Não usar o termo "alias".
- O menu não tem "Atualizar": `Instalar` já atualiza skills desatualizadas.
- `fsd update skill` com original no caminho do link e sem `--force`: mensagem e **exit 1**. `--force`/`-f` substitui, sem confirmação, em todas as skills em conflito; só resolve conflito. Skill `linked: false` fica fora do `--force` do `update`.
- `fsd link skill [nome] [-f]` liga skills instaladas sem link; com original no lugar, exit 1 sem `--force`.

Instalação:
- Skills ficam em `.fsd/skills/<nome>` (`~/.fsd/skills` e `./.fsd/skills`), e cada uma ganha um link simbólico em `.claude/skills/<nome>` para o Claude Code enxergá-la.
- Conflito de skill de mesmo nome (pasta em `.fsd/skills` fora do registro, ou algo em `.claude/skills/<nome>` que não é o nosso link): **passo próprio** no assistente, com `keep` (padrão), `unlinked` (instala sem link, registro com `linked: false`; só existe se a original está em `.claude/skills`) e `replace`.
- `fsd init` cria a estrutura base **ao confirmar** o fluxo Instalar (`nook/kitchen`, `nook/bakers`, `.fsd/oven|cache|logs`); `update skill` e `link skill` nunca a criam.
- **Depois do `enter` no resumo, a execução roda em fases** (Verificar, Preparar, Aplicar, Registrar, Concluir; SPEC 6.9):
  - falha ou `ctrl+c` desfaz a execução inteira, não só a skill que falhou;
  - o diário fica em `.fsd/cache/run-<id>/`, criado sob demanda por qualquer operação e removido ao fim;
  - um processo morto é reconhecido pelo pid no nome da pasta e recuperado na execução seguinte; execução viva bloqueia (`another fsd run is in progress`);
  - o ponto de não retorno é o fim da fase Registrar.
- `fsd init` ao abrir **não cria arquivo**: o `lastUpdateCheck` fica em memória e é gravado com as preferências ao confirmar (ou na hora, só se o `config.json` já existir).
- Interface: sem escolha de símbolos (Unicode único), voltar com `←`, todas as skills começam marcadas, e a seleção muda o total de passos (7, 6 ou 5; idioma e conflitos são condicionais). No Apagar, as skills começam **desmarcadas**.
- `installed.json` (global e projeto) e `config.json` (só global) ficam em `.fsd/`. A CLI é agnóstica a serviços de agentes (sem campo `agent`).
- Vocabulário: `Cookbook` = `nook/cookbook/`; `Ingredient` e `Adapter` saíram; `Display` virou `Rack`. `Bench` e `Fridge` não guardam logs nem estado. Docs usam `-` no nome, nunca `_`.
- **Não mexer na versão das skills** (`metadata.version`), mesmo tendo mudado o conteúdo de `fsd-csharp-code-standard`.

## Sessão: cabeçalho e tema (não commitado)

**VERSÃO FINAL DA ROSQUINHA aprovada pelo autor em 2026-11-02** ("uma obra-prima"), vista no terminal real (tmux, 112×35). Não mudar o algoritmo de `donutArt.ts` sem ler este item; para voltar a este estado, use o backup acima.

Estado:

- **Cabeçalho da tela inicial** (`src/cli/ui/Chrome.tsx`): moldura de até 110 colunas (112 menos o `paddingX` da raiz do assistente), 14 linhas no tamanho máximo. À esquerda, o emoji 🍩 em alta definição (35 colunas por 14 linhas). À direita, `FRED`, `SHIPS` e `DONUTS` empilhados, em letras de bloco de 5 linhas. **Responsivo** (`heroLayout(colunas, linhas)` em `Chrome.tsx`): a moldura ocupa `min(110, colunas − 2)`; a rosquinha mantém a proporção do emoji e encolhe até caber na largura e na altura (reserva 15 linhas para a moldura e o menu), com no máximo 14 linhas (o tamanho aprovado) e no mínimo 5; abaixo disso, e sem cor, volta o cabeçalho de uma linha. Antes a moldura tinha 110 colunas fixas e, numa janela mais estreita, cada linha quebrava e a rosquinha aparecia fatiada.
- **Forma da rosquinha** (`donutArt.ts`): é o contorno do próprio emoji, sem curva imposta. O emoji é recortado pela caixa dos pixels opacos (`BOX`) e encaixado na grade inteira, então nada é cortado e o confeito do topo, as laterais quase verticais e a base dourada ficam como no ícone. Cada célula é amostrada em 8×8 e desenhada com o bloco que melhor a representa, entre quadrantes e oitavos (`▁▂▃▅▆▇`, `▏▎▍▋▊▉`, `▔`), com duas cores; isso reduziu em cerca de 45% o erro contra o emoji original, no mesmo tamanho (medido por erro quadrático médio). Lascas de um oitavo soltas na vertical são apagadas, e o limiar de opacidade é 0,7. A largura segue a proporção do emoji (`emojiCols(linhas)`: 35 colunas para 14 linhas); para mudar o tamanho, mude `HERO_DONUT_ROWS` em `Chrome.tsx`. Tentativas descartadas: máscara de elipse e de superelipse (a elipse deixava as pontas finas, "aparadas"; a superelipse deixava quadrada). As letras estão escondidas por `SHOW_WORDS = false` enquanto a rosquinha é ajustada.
- **Dados do emoji** (`emojiDonut.ts`): grade de 192×96 sub-pixels do emoji Noto Color Emoji, gerada uma vez; a CLI não lê a fonte.
- **Letras** (`blockFont.ts`): fonte de 5 linhas com traço engrossado (`embolden`) e `LETTER_STRETCH = 1.3`. `phraseRows` desenha em meia linha.
- **Tema**: uma paleta, `donut`, com três alternativas (`morango`, `chocolate`, `granulado`) em `theme.ts`. Escolha com `theme` em `~/.fsd/config.json`. O passo "Tema" está no fluxo Instalar. Ver `docs/PALETAS-DONUT.md`.
- **Tela de teste**: o renderizador de teste simula 100 colunas e não tem altura. Por isso o teste do menu não confere "Install" (coberto pelos testes dos passos).

Armadilhas descobertas (não óbvias pelo código):
- Máscara de elipse ou de superelipse sobre o emoji não serve: a elipse afina as pontas e parece "aparada", a superelipse fica quadrada. O ajuste de curva ao contorno do emoji deu n=2, mas o emoji real é uma vista em perspectiva (topo de chocolate, lateral dourada, confeito saindo do topo), então a forma certa é a dele, sem máscara.
- Só 2×2 sub-pixels por célula (quadrantes) deixa o desenho serrilhado; os oitavos (`▁▂▃▅▆▇`, `▏▎▍▋▊▉`) deram cerca de 45% menos erro contra o emoji. Tirar o `▔` piora (ele desenha o contorno inferior); o fio vertical solto é que vira pontinho e é apagado.
- A fronteira de opacidade (`OPAQUE_SHARE`) está em 0,7. Valores baixos criam fiapos nas bordas; 0,7 empata no erro e limpa os fiapos.
- Um glifo de primeiro plano nunca pode ficar sem cor (o terminal usaria a cor padrão); por isso só o fundo pode ficar transparente.
- Medir o cabeçalho pelo `ink-testing-library` não serve para largura: ele simula 100 colunas. Para verificar o visual, use um terminal real (`gnome-screenshot` com a janela do tmux) e compare com o emoji original; `tmux capture-pane` só devolve texto, sem cor.
- Reiniciar com `tmux respawn-pane -k -t fsd "<comando>"`, nunca `kill-session`: derruba quem está conectado.

Redimensionar a janela (arrastar com o mouse): o Ink desenha assim que o evento `resize` chega, antes de o React saber o tamanho novo; o quadro desenhado ainda tinha a altura antiga, maior que a janela, e empurrava o topo (a rosquinha) para cima até o quadro seguinte corrigir ("sobe, sobrepõe e volta"). Correção em `run.ts`: o tamanho entra no `App` como propriedade (`terminal`) e um ouvinte de `resize` registrado antes do Ink (`prependListener`) chama `app.rerender` (síncrono no Ink 8), então sai um quadro só, já no tamanho novo. Quando a largura diminui o próprio Ink limpa e redesenha o mesmo quadro uma vez (inofensivo). O `App` sem a propriedade (testes) continua lendo o tamanho do `stdout`. Medido gravando a saída real com `tmux pipe-pane`: antes, 2 escritas por redimensionamento (a primeira com 41 linhas numa janela de 36); depois, 1. Teste `resize.test.ts` roda o programa de verdade num tmux e falha sem a correção (é ignorado se não houver tmux). Não confirmado: o aspecto no meio de um arrasto real com o mouse, só a saída gravada e o estado final.

Testes do layout do cabeçalho (`heroLayout.test.ts`): em todas as janelas de 20 a 200 colunas por 10 a 60 linhas, a moldura e a rosquinha nunca passam da janela, a proporção do emoji se mantém, o tamanho nunca passa de 14 linhas e nunca encolhe quando a janela cresce; no 112×35 sai o 35×14 aprovado.

Testes de qualidade da rosquinha (`donutQuality.test.ts`), granulares:
- **Cada altura de 5 a 40 linhas** (36 tamanhos) passa por: erro de cor abaixo de uma curva única (`7200 / linhas^1,15`), sobreposição da silhueta acima de um piso, nenhuma piora de mais de 10% ao subir uma linha, proporção do emoji, sem corte nas quatro bordas, furo no meio, chocolate em cima e dourado embaixo, sem células soltas, só blocos conhecidos.
- **8 tamanhos fixos** (6, 8, 10, 12, 14, 18, 22, 28) têm limites próprios, mais apertados (folga de ~8% sobre a versão aprovada).
- **Larguras diferentes da proporção** (de metade ao dobro, em 8, 10, 14, 18 e 24 linhas): mesma definição, sem corte e sem células soltas.
- Uma **impressão digital** (sha256) do 35×14 aprovado. Se falhar, compare com o backup antes de atualizá-la.
- Validados sabotando o código: sem oitavos, topo cortado, limiar alto, proporção errada, e defeitos de um único tamanho (alturas 9, 17 e 29, fora dos 8 fixos): todos falham. A suíte inteira leva ~23 s por causa dos tamanhos grandes; a CLI só desenha 35×14.

## Sessão: cabeçalho responsivo com letras (não commitado)

Substitui o "tamanho aprovado 35×14 fixo" acima: o cabeçalho agora **segue a janela por inteiro**.

- **Layout** (`heroLayout(colunas, linhas)` em `Chrome.tsx`): a moldura ocupa `colunas − 2` (sem teto de 110); a rosquinha cresce de 5 a **26 linhas** (`HERO_MAX_DONUT_ROWS`; acima disso o quadro fica lento e a tela pisca em branco ao arrastar) e as três palavras `FRED` / `SHIPS` / `DONUTS` (uma por linha) ocupam cada uma um terço da altura da rosquinha, a partir de 4 linhas. Sem espaço para as palavras, fica só a rosquinha; sem espaço para ela, o cabeçalho de uma linha. Ao estreitar, a rosquinha encolhe para dar lugar às palavras (e volta a crescer quando elas saem): `heroLayout.test.ts` cobre isso.
- **Letras** (`shadowFont.ts`, `wordArt.ts`): sempre a fonte "ANSI Shadow" (a mesma do banner do GSD), em bege claro `#F5E6C8`, sombra em bege mais escuro. Cada caractere vira um bitmap de 8×16 (a sombra `╗ ║ ╝` como faixa cheia, porque linhas finas somem ao redimensionar) e é reamostrado com o mesmo método da rosquinha (`fit` de `donutArt.ts`: 8×8 amostras por célula, quadrantes e oitavos). Cortar linhas da fonte, achatar ou trocar por outra fonte foi descartado: ficou ilegível (ver tentativas no histórico da conversa).
- **Desempenho** (necessário para o arrasto da janela): `fit` reescrito com somas (mesma saída, o teste da impressão digital da rosquinha confirma, ~3× mais rápido), célula de cor única vira `█` direto, cache por tamanho de rosquinha e de palavras, pré-cálculo de todos os tamanhos em segundo plano (`warmHero`, chamado em `run.ts`), e `NODE_ENV=production` por `src/cli/env.ts` (importado primeiro em `fsd.ts`; o React em modo de desenvolvimento é bem mais lento).
- **Redesenho** (`run.ts`, inspirado em `claude-code/src/ink/ink.tsx`): resize síncrono, ignora eventos de mesmo tamanho, e **todo quadro do Ink é reescrito como sobreposição** (cursor no início, `ESC[K` no fim de cada linha, `ESC[J` no fim), em vez de apagar linha por linha. Num terminal que não segura a saída durante a atualização sincronizada (o gnome-terminal), apagar e pintar mostrava uma tela em branco ou quadros rasgados.
- **Como foi verificado**: num gnome-terminal real, redimensionado de verdade com `wmctrl` (de 1374×784 px a 700×380 e de volta, 80 passos), com captura só da janela (PIL `ImageGrab`) a cada 5 passos. Todos os tamanhos assentados ficam certos. Latência medida: tamanhos pequenos e médios completam em menos de 50 ms; o maior (cerca de 170×46) leva de 100 a 150 ms e mostra uma tela vazia por esse intervalo. **Limite conhecido**, não eliminado.
- **Não verificado**: arrastar com o mouse (usei `wmctrl`, que muda o tamanho em passos); outros emuladores além do gnome-terminal e do tmux.

## Sessão: escritor de quadros (não commitado)

Substitui o remendo de regex de `run.ts` por `src/cli/ui/frameWriter.ts`, no estilo do renderizador do claude-code: diff de linhas contra o quadro anterior com posição absoluta (CUP), um `write` por quadro entre BSU/ESU (só em terminal conhecido: VTE >= 0.68, kitty, ghostty...; nunca no tmux; `FSD_SYNC=1|0` força), repintura completa de todas as linhas quando o tamanho muda, cursor estacionado na última linha. A tela nunca é apagada antes de pintar (o claude-code apaga dentro do BSU; aqui não, porque o gnome-terminal já mostrou tela em branco).
- Armadilha: ao estreitar a janela o Ink escreve sozinho um apagamento de linhas (`ESC[2K ESC[1A`...). Se passar adiante, apaga o que o diff acha que está na tela e só a primeira linha volta. O escritor engole esse apagamento e invalida o quadro anterior.
- Verificado no gnome-terminal 3.52 (VTE 0.76), 80 passos de 974×682 a 1374×784 a 700×380 e de volta, com `wmctrl` + captura (PIL): nenhuma amostra em branco, todos os tamanhos assentados com conteúdo. Use `xwininfo -name` para a geometria; `wmctrl -lG` dá posição deslocada. Não verificado: arrasto com o mouse; outros terminais.
- `resize.test.ts` agora roda com `FSD_SYNC=1`, lê as linhas pelas posições absolutas e confere o que sobra na tela (sabotado: falha sem a correção).

## Sessão: janelas baixas e estreitas (não commitado)

Estudo do Claude Code 2.1.316 num gnome-terminal real (a janela dele ficou aberta para análise; capturas e bytes em `scratchpad/cc/`): topo e rodapé de altura fixa, folga elástica no meio, texto cortado com `…`, cursor estacionado no ponto de digitação; no resize ele apaga a tela (`ESC[2J`) e repinta tudo numa só escrita, sem BSU nessa versão.
- Defeito achado no fsd: com a janela mais baixa que o conteúdo o flexbox do Ink **comprime** os blocos e as linhas se desenham umas sobre as outras (`skillss`, rodapé colado em outra linha, a opção focada some). Correção (`App.tsx`, `Chrome.tsx`, `Pick.tsx`): cabeçalho e rodapé com `flexShrink={0}`, corpo com `overflowY="hidden"` e conteúdo interno `flexShrink={0}` (corta, não comprime); abaixo de 20 linhas o cabeçalho vira uma linha, abaixo de 12 o rodapé perde a barra; textos com `wrap="truncate-end"`; a barra encolhe com a largura; `Pick` rola (`maxRows`, via `listRows`) para manter a linha focada visível.
- Testes: `App.test.tsx` "wizard in small windows" (6 tamanhos de 100×30 a 24×5, mais a rolagem). Não sabotei o código para confirmar que todos eles falham sem a correção.
- Não feito: estacionar o cursor no ponto de digitação (o fsd não tem campo de texto), Conflicts e resumo só cortam (não rolam), tela inicial (rosquinha) não mudou.

## Sessão: cabeçalho com as três palavras empilhadas (não commitado)

Decisões do autor: conteúdo do cabeçalho alinhado à esquerda; a moldura do cabeçalho ocupa no máximo 35% da altura da janela; as palavras `FRED` / `SHIPS` / `DONUTS` têm de caber, na vertical, e **vencem o teto** quando brigam com ele; começar em 80×24; estética e legibilidade das letras ficam para a etapa seguinte.
- `heroLayout` (`Chrome.tsx`): palavras empilhadas, as maiores possíveis (4 a 8 linhas cada) dentro dos 35%; se não couberem, a moldura cresce só o necessário (palavras de 4, depois 3 linhas; a rosquinha não passa da altura delas); sem espaço para a rosquinha, só as palavras; sem espaço para elas, só a rosquinha; abaixo de 20 linhas, cabeçalho de uma linha. `HERO_RESERVED_ROWS = 11` é o que o menu ocupa abaixo do conteúdo da moldura (borda 2, margem 1, título 2, opções 3, rodapé 3).
- 80×24: palavras de 4 linhas + rosquinha de 12 (moldura de 14 linhas, 58%); menu inteiro embaixo.
- Tentativas descartadas nesta sessão: menu "compacto" (sem linha em branco e sem barra) para janelas até 130×35; arranjos de uma e duas linhas para as palavras. Ficaram sem uso e foram removidos.
- **Próxima etapa (estética):** a fonte `ANSI Shadow` só é nítida em 6 linhas (tamanho nativo); em 4 ou 5 ela é espremida e vira papa (R e E de `FRED` se fundem, fiapos sob as letras). Começo de uma fonte própria de pixels para 4 linhas (5×7 por letra, sombra de 1 pixel, meio-bloco = 2 pixels): `scratchpad/parked/pixelFont.ts`, guardada no backup em `parked/`; amostra de como fica a 4 linhas já foi gerada e parece boa. Em 3 linhas nada serve ainda.
- Verificação: gnome-terminal real (print do 80×24, 83×21, 120×35, 120×40); arrasto de 80 passos já passou antes desta mudança de layout, **não repetido** depois dela.

## Em aberto

Cabeçalho e tema:
- Rosquinha e nome: **concretizados** (SPEC 6.10). Seguem em evolução a estética das letras de 2 e 4 linhas (o `S` com bico, o `R`, o `N` de 2 linhas) e a definição da rosquinha de 6 linhas (limite de blocos; só imagem real ou mais linhas resolvem, e mais linhas passam do teto de 35%). Falta repetir o arrasto de 80 passos no gnome-terminal com o layout novo, e conferir os sextantes em outro terminal ou fonte.
- Paleta final ainda não escolhida: `donut`, `morango`, `chocolate` ou `granulado`.
- Nada desta sessão foi commitado.

Decisões do autor:
- **Layout (SPEC 6.7):** o cabeçalho foi decidido na sessão desta data (ver acima), mas a paleta final e a largura mínima de uma linha (40 colunas) ainda são provisórias. Utilidade do tema também.
- Formato das tasks (`.md` ou `.yaml`) e do campo `status`; o que entra no `.gitignore` (`.fsd/cache`, `.fsd/logs`?); quem move uma task de `rack` para `fridge`; formato das recipes; destino do `Dough` no projeto do usuário.
- Comentários da árvore de diretórios nos docs ficaram desalinhados após a troca para `rack`.

Decisões minhas a confirmar (SPEC 13, "Revisar"): remoção do passo "Serviço de IA"; `update skill` cobre global e projeto; `updateSkills` desligado por padrão; sem `fsd init --no-update`; `fsd update` ignora o limite de 24 h.

## Não verificado

- Consulta e instalação reais no npm (pacote não publicado).
- Uso do assistente por uma pessoa num terminal real; houve uma instalação completa em pseudo-terminal e os testes com `ink-testing-library`.
- Que o Claude Code carrega mesmo as skills pelo link simbólico em `.claude/skills` (só testado o link no disco).
- Matar o processo em outros momentos além de "antes de mover a cópia" e "antes de criar o link" (os dois cobertos com SIGKILL real).
- O `spawn` real de `fsd update skill` pelo `fsd update` com `updateSkills` ligado (testado com dependências simuladas).

## Cuidados ao mexer

- Os planejadores em `plan/` não escrevem nada; toda escrita passa por `engine/` (`Transaction` e `ops.ts`). Uma falha se injeta trocando as operações de `ops.ts` (`RunOptions.ops`), nunca com `chmod`.
- Respeitar a regra de dependência de `docs/ARQUITETURA.md`: nada abaixo de `ui/` importa React, Ink ou commander.
- O cálculo de conflitos ignora o que pertence a uma execução morta (`deadRunPaths`); a recuperação em si só acontece na fase Verificar.

## Como rodar

```bash
cd <repository folder>
npm run build                    # tsc para dist/
npm run dev -- --help            # src/cli/fsd.ts via tsx
node dist/cli/fsd.js init        # assistente (precisa de terminal)
```

Para testar sem sujar `~/.claude` e `~/.fsd`, use `HOME=$(mktemp -d)`.

## Próximos passos sugeridos

0. Levar a rosquinha do backup `…-donut-hole-2026-11-02` ao repositório (ver o aviso no topo) e, depois, **deixar a fonte das palavras cerca de 10% mais negrito**.
1. Fazer o push dos 4 commits.
2. Rodar o assistente num terminal real e conferir que o Claude Code enxerga uma skill pelo link.
3. Decidir o layout (logotipo, paletas) e publicar o pacote para testar `fsd update` e `npx -p fred-ships-donuts fsd init` de verdade.
4. Fase 6: mesclar #7 (`task done`/`archive`) e, ao mesclar, tirar a marca "(F-40b, #7)" do README e de `docs/FSD-DIRECTORY-STRUCTURE.md`. O #8 (`.gitignore`) já está na `develop` e sua marca foi removida.
