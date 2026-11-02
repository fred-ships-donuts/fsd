# HANDOFF — fsd (Fred Ships Donuts CLI)

Estado em 2026-11-02. Leia nesta ordem: este arquivo, `TASKS.md`, `SPEC.md`, `docs/FSD-INDEX.md`.

## Onde o projeto está

- Pasta: `/media/fredericojacobi/Projects/projetos/fred-ships-donuts/`. Branch `main`, remoto `origin` por **SSH** (`git@github.com:fredericojacobi/fred-ships-donuts.git`, chave `~/.ssh/id_ed25519`).
- **A `main` está 4 commits à frente do `origin`** (`21d9d91`, `aed7af4`, `2b59314`, `aad0e6c`); o push ainda não foi feito. **Além de `HANDOFF.md`, há mudanças sem commit** no cabeçalho e no tema (ver "Sessão: cabeçalho e tema" abaixo). Nada desta sessão foi commitado.
- **Backup da VERSÃO FINAL da rosquinha** (fora do repositório): `/home/fredericojacobi/Backups/fred-ships-donuts-header-FINAL-2026-11-02/`, com `README.md` de restauração e `SHA256SUMS`. O backup anterior, com a rosquinha em quadrantes, continua em `/home/fredericojacobi/Backups/fred-ships-donuts-header-2026-11-02/` e não deve ser sobrescrito.
- Commits sem `Co-Authored-By` e sem citar quebras de linha (regras do autor).
- **Todas as tasks F-1.1 a F-35 foram executadas** e estão marcadas em `TASKS.md`. A Fase 5 (F-26 a F-35) veio de uma revisão da spec, hoje sem pontos em aberto.
- `npm test` passa (109 testes). Só o último commit compila e passa sozinho; os três anteriores dependem uns dos outros.
- O pacote ainda **não foi publicado** no npm.

## O que existe

- Docs em `docs/`, com índice em `FSD-INDEX.md`. Estrutura de diretórios do framework em `FSD-DIRECTORY-STRUCTURE.md`: `nook/` (`kitchen/`, `bench/`, `cookbook/`, `bakers/`, `rack/`, `fridge/`) e `.fsd/` (`oven/`, `cache/`, `logs/`).
- CLI em `src/cli/`:
  - `fsd.ts` (commander) e `args.ts` (atalhos `-u -s -f`).
  - `commands/{init,update,link}.ts`.
  - `actions/`: planejadores `install.ts`, `uninstall.ts`, `link.ts`, mais `conflicts.ts` e `types.ts`. Eles só leem o disco e montam um plano.
  - `run.ts` (motor de fases), `recovery.ts` (diário, desfazer, execução morta), `ops.ts` (operações de arquivo injetáveis), `link.ts` (link simbólico).
  - `fsdDir.ts`, `registry.ts`, `config.ts`, `selfUpdate.ts`, `skills.ts`.
  - `ui/`: assistente em Ink (`App.tsx`, `Conflicts.tsx`, `Pick.tsx`, `flows.ts`, `progress.ts`, `theme.ts`).
  - Só para testes: `testing.ts` e `crashChild.ts` (ficam fora do pacote publicado).
- Catálogo em `src/skills/_i18n/` (`fsd-csharp-code-standard`, `fsd-ui-approval`). A pasta `graft/` é ignorada pelo git e **não** é apagada.

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

- **Cabeçalho da tela inicial** (`src/cli/ui/Chrome.tsx`): moldura de 110 colunas (112 menos o `paddingX` da raiz do assistente), 14 linhas. À esquerda, o emoji 🍩 em alta definição (35 colunas por 14 linhas). À direita, `FRED`, `SHIPS` e `DONUTS` empilhados, em letras de bloco de 5 linhas. Tamanho fixo, sem depender da janela. Abaixo de 110 colunas o layout quebra; sem cor, volta o logotipo de uma linha.
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

Testes de qualidade da rosquinha (`donutQuality.test.ts`), granulares:
- **Cada altura de 5 a 40 linhas** (36 tamanhos) passa por: erro de cor abaixo de uma curva única (`7200 / linhas^1,15`), sobreposição da silhueta acima de um piso, nenhuma piora de mais de 10% ao subir uma linha, proporção do emoji, sem corte nas quatro bordas, furo no meio, chocolate em cima e dourado embaixo, sem células soltas, só blocos conhecidos.
- **8 tamanhos fixos** (6, 8, 10, 12, 14, 18, 22, 28) têm limites próprios, mais apertados (folga de ~8% sobre a versão aprovada).
- **Larguras diferentes da proporção** (de metade ao dobro, em 8, 10, 14, 18 e 24 linhas): mesma definição, sem corte e sem células soltas.
- Uma **impressão digital** (sha256) do 35×14 aprovado. Se falhar, compare com o backup antes de atualizá-la.
- Validados sabotando o código: sem oitavos, topo cortado, limiar alto, proporção errada, e defeitos de um único tamanho (alturas 9, 17 e 29, fora dos 8 fixos): todos falham. A suíte inteira leva ~23 s por causa dos tamanhos grandes; a CLI só desenha 35×14.

## Em aberto

Cabeçalho e tema:
- Rosquinha: **fechada** (versão final aprovada). As letras seguem escondidas por `SHOW_WORDS = false` em `Chrome.tsx`; falta decidir quando voltar com elas e como encaixá-las ao lado da rosquinha de 35 colunas.
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

- Os planejadores em `actions/` não escrevem nada; toda escrita passa por `run.ts` e por `ops.ts`. Testes de falha trocam as operações de `ops.ts` (`failingOps`), nunca dependem de `chmod`.
- O cálculo de conflitos ignora o que pertence a uma execução morta (`deadRunPaths`); a recuperação em si só acontece na fase Verificar.
- Testes de interface usam `HOME` e o diretório atual temporários (`process.env.HOME` + `process.chdir`).

## Como rodar

```bash
cd /media/fredericojacobi/Projects/projetos/fred-ships-donuts
npm test                         # tsc + node --test dist (101 testes)
npm run dev -- --help            # src/cli/fsd.ts via tsx
node dist/cli/fsd.js init        # assistente (precisa de terminal)
```

Para testar sem sujar `~/.claude` e `~/.fsd`, use `HOME=$(mktemp -d)`.

## Próximos passos sugeridos

1. Fazer o push dos 4 commits.
2. Rodar o assistente num terminal real e conferir que o Claude Code enxerga uma skill pelo link.
3. Decidir o layout (logotipo, paletas) e publicar o pacote para testar `fsd update` e `npx -p fred-ships-donuts fsd init` de verdade.
