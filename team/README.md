# fsd-agents

Identidades GitHub (GitHub Apps) dos agentes do fred-ships-donuts.

| agente | papel | bot |
|---|---|---|
| kevin | PM | fsd-kevin[bot] |
| mel | Arquiteto | fsd-mel[bot] |
| stuart | Dev Node/TS | fsd-stuart[bot] |
| bob | QA | fsd-bob[bot] |

## Uso

    fsd-agent stuart claude                 # Claude Code como fsd-stuart[bot]
    fsd-agent mel claude --effort high      # sobe o esforço só nesta sessão
    fsd-agent bob                           # shell como fsd-bob[bot]

`fsd-agent` é um atalho em `~/.local/bin/` para `bin/fsd-agent`. A pasta `bin/` inteira não
entra no seu PATH, porque o `gh` dela passaria por cima do seu.

Dentro da sessão:
- `gh` e `git push` usam o token do App (renovado sozinho, vale 1h);
- commits saem como o bot;
- o seu login do gh e as suas chaves SSH ficam de fora.

O Claude Code abre:
- só com o perfil do agente;
- com modelo, esforço e ferramentas do papel;
- com o ai-memory como único MCP, entrando como o próprio usuário do agente;
- com o nome de sessão igual ao do agente (`--name mel`; `-n`/`--name` no comando passa por cima);
- com a `sessions/` do perfil ligada a `~/.config/fsd-agents/sessions`, a pasta comum. Assim os
  quatro se veem no `ListAgents` e trocam mensagem com `SendMessage` (to: "stuart"), seja qual for
  a pasta em que cada um abriu. O link é criado sozinho na primeira abertura.

## Agentes no Claude Code

| agente | modelo | esforço | ferramentas cortadas além das comuns |
|---|---|---|---|
| kevin | claude-opus-5-5 | medium | Agent |
| mel | claude-sonnet-5-5 | medium | nenhuma |
| stuart | claude-sonnet-5-5 | medium | nenhuma |
| bob | claude-sonnet-5-5 | medium | Agent, WebSearch, WebFetch |

A tabela é o padrão versionado (`agents.json`). Para trocar modelo, esforço ou ferramentas **só nesta instalação**,
sem versionar, crie `~/.config/fsd-agents/agents.local.json`: o que estiver em `agents.<nome>.claude` passa por cima
do `agents.json`, campo a campo. Vale na próxima vez que o agente abrir.

    { "agents": { "mel": { "claude": { "model": "claude-sonnet-5-5", "effort": "medium" } } } }

O mesmo arquivo ajusta o contexto (`claude_common.context` do `agents.json`) só nesta instalação: `claude_common.context`
vale para todos e `agents.<nome>.context` para um agente. Ordem: `agents.json` (comum, depois o agente) e, por cima de
tudo, o arquivo local (comum, depois o agente); um valor local comum vence até o valor por agente do `agents.json`. O merge
é campo a campo também dentro de objetos: `bands.normal.urgentAt` sozinho não apaga o resto de `bands`. Quem lê é o
`bin/fsd-context.mjs` (guard, vigia, `fsd-restart`, `fsd-stats`), a cada chamada, sem reabrir o agente. Arquivo local
inválido: o vigia mostra `configuração inválida` no agente, sem ação, e segue no ar (uma linha no `watch.log` por erro).
Para mudar um agente só, sem passar por cima do valor de agente do `agents.json` de todos, use `agents.<nome>.context`.

    { "claude_common": { "context": { "restartAbove": 100000 } } }

O teto de contexto é um só: `min(limit − outputReserve, restartAbove)`; as faixas 🟡/🔴 avisam antes dele e, acima de
`restartAbove`, o guard nega tudo, menos o fechamento. Configuração local inválida nunca derruba o guard: ele cai para o
`agents.json` e avisa uma vez. Uso da conta: `claude_common.usage` (`refreshSeconds` 300, `stopPct` 90); `bin/fsd-usage.mjs`
mantém `$FSD_STATE/usage.json` (token em `claude-oauth-token`), o vigia o chama a cada rodada e, a partir de `stopPct`, cria
`PAUSE` + `PAUSE.usage` e comenta uma vez na #147. O `PAUSE` só sai quando foi ele que o criou (`own` no `PAUSE.usage`): um
`PAUSE` feito à mão fica depois do reset. **Freio reativo:** o hook `StopFailure` (matcher `rate_limit`) chama
`fsd-usage.mjs stop-failure`, que pausa do mesmo jeito sem depender do endpoint (#214); sem `resets_at`, essa pausa sai
depois de `usage.reactiveHoldMin` (60 min). Todo PAUSE é `$FSD_STATE/PAUSE` (vigia, limpeza, `fsd-usage`, `fsd-restart`).
Testes: `FSD_USAGE_FIXTURE`, `FSD_USAGE_NOW`.

Os tempos do time (`timing`, ver "Tempos do time") também: o `timing` do arquivo local passa por cima do `agents.json`,
campo a campo, e as variáveis de ambiente (`FSD_READY_GRACE` etc.) por cima de tudo. Quem lê é o `bin/fsd-timing.mjs`;
o vigia e o `fsd-cleanup` reexecutam quando o arquivo local muda. Local inválido no `timing` é ignorado com aviso (stderr,
tabela e `watch.log` do vigia) e vale o `agents.json`: um erro de digitação não derruba vigia, limpeza nem Monitor.

    { "timing": { "readyGraceMin": 3 } }

Comuns a todos (`claude_common` no `agents.json`): NotebookEdit, Artifact*, DesignSync,
RemoteTrigger, Cron*, ScheduleWakeup, PushNotification. `--model` e `--effort` passados no
comando passam por cima do padrão.

## Mapa dos arquivos

⚙️ você edita para configurar · 🔒 segredo (600) · 🤖 gravado sozinho

```
~/.local/bin/
└── fsd-agent                      atalho: só chama o launcher de verdade

~/.config/fsd-agents/              ── TUDO DOS AGENTES ──
├── bin/
│   ├── fsd-agent           ⚙️     launcher: identidade, flags (modelo, esforço, ferramentas, MCP), tokens
│   ├── fsd-token                  gera o token do GitHub App do agente: só o repositório do time e as permissões do papel (agents.json → tokens), sem workflows
│   ├── fsd-diga                   mensagem para um colega (outbox; o supervisor entrega; remetente = dono do arquivo). Time nativo (F3.3)
│   ├── fsd-session-hook           hooks da sessão nova (FSD_RUNNER=session): caixa no meio do turno, ocioso/trabalhando
│   ├── fsd-entrega                valida e grava a entrega JSON contra team/contracts (F3.7)
│   ├── fsd-duvida                 encaminha dúvida: técnica → Mel, fluxo → Kevin, autor → "Deadlock: author decision needed" no ref (F3.4)
│   ├── fsd-espera                 espera um colega num PR/issue (lease com prazo); ciclo quieto no mesmo ref vai ao juiz (F3.4)
│   ├── fsd-admit                  issue de agente (aguardando-autor) entra no Backlog só com "Decision (author, …)"; recusa fecha (D8)
│   ├── fsd-audit                  audita uma sessão (0 token): comando proibido, entrega fora do contrato, card fora da vez, destino inválido, texto de issue como ordem, lista de tarefas (F3.8)
│   ├── fsd-session                sessão --bg de cada papel numa conversa fixa (--session-id/--resume): start, turn, stop, boot (F3.2)
│   ├── fsd-secrets                pack/unpack dos segredos em secrets.tar.age (age, senha)
│   ├── fsd-redirect-hook          hook PreToolUse (Bash): comando bloqueado → nega e nomeia o comando do time
│   ├── fsd-cleanup                apaga worktree, branch local e remoto de PR mesclado há mais de cleanup.mergedMin (sem agente); --once, --loop, --dry
│   ├── fsd-redirects(.mjs)        o casamento do hook, a tabela do team.md e as fixtures (--test, --write, --check)
│   ├── gh                         gh dos agentes (só entra no PATH dentro do fsd-agent)
│   ├── fsd-map                    mapa de código (ask, grep, skeleton, callers, map, build); motor privado, fora do PATH
│   └── git-credential-fsd         entrega o token ao git
│
├── agents.json             ⚙️     por agente: model, effort, disallowedTools, dados do GitHub App
│                                  "claude_common": ferramentas cortadas para todos
│                                  "timing": tempos do time (pings e prazos), ver "Tempos do time"
├── claude-settings.json    ⚙️     comum: hooks (RTK, ai-memory, fsd-context-guard, fsd-stop-guard), deny comuns, permissões do ai-memory e do fsd-map
├── redirects.json          ⚙️     fonte única de "ação negada → comando do time" (hook, vigia e tabela do team.md)
├── mcp.json                ⚙️     o único MCP dos agentes: ai-memory
├── common/
│   ├── team.md             ⚙️     regras do time (fluxo, memória, handoffs), importado em todo CLAUDE.md
│   └── skills/<nome>/SKILL.md  ⚙️  skills técnicas (ofício), ligadas por link na pasta skills/ de cada agente que as usa
│
├── agents/<kevin|mel|stuart|bob>/claude/      ← CLAUDE_CONFIG_DIR de cada agente
│   ├── CLAUDE.md           ⚙️     o papel do agente
│   ├── settings.json       ⚙️     deny e permissões próprias do papel (onde pode escrever)
│   ├── skills/             ⚙️     skills do agente, em inglês, nome no padrão oficial (gerúndio); `fsd-*` é só do produto
│   │     kevin:  running-pm-workflow, writing-issues, managing-product
│   │             + writing-acceptance-criteria, slicing-work, prioritizing-work, managing-releases
│   │     mel:    writing-handoffs, reviewing-prs, architecting-cli
│   │             + assessing-designs, designing-contracts, recording-decisions, assessing-security-risks
│   │     stuart: running-dev-workflow, self-reviewing-changes, coding-cli, coding-team-tools, writing-product-skills
│   │             + handling-files-safely, designing-clis, writing-unit-tests, debugging-root-causes
│   │     bob:    running-qa-workflow, testing-cli
│   │             + designing-test-cases, running-exploratory-tests, driving-terminal-apps, reporting-bugs,
│   │               investigating-flaky-results
│   │     (+ = link para common/skills/)
│   ├── projects/-media-…-fred-ships-donuts/
│   │   ├── memory/         🤖⚙️   memória do agente (MEMORY.md + .md)
│   │   └── <sessão>.jsonl  🤖     transcripts
│   ├── .claude.json        🤖     estado: projetos confiáveis, histórico
│   └── backups/ cache/ plugins/ sessions/ session-env/   🤖
│
├── sessions/              🤖     registro comum das sessões abertas (cada perfil tem um link para cá)
├── common/                ⚙️     link para team/common do repo, refeito pelo fsd-agent a cada subida: é de onde o
│                                  CLAUDE.md de cada agente importa o team.md (@~/.config/fsd-agents/common/team.md).
│                                  Verificação (decisão na #156): o QA confere o link e o simulate-envs; que uma sessão
│                                  real carrega o team.md (/memory) se confere depois do merge, no restart seguinte.
├── claude-oauth-token      🔒     login do Claude (o mesmo para os quatro)
├── ai-memory-tokens/<nome> 🔒     credencial aim_ do agente no ai-memory
├── keys/fsd-<nome>.pem     🔒     chave privada do GitHub App
├── cache/<nome>.json       🔒🤖   token do GitHub, renovado sozinho
├── gh-config/<nome>/       🤖     config do gh de cada agente
└── README.md                      este arquivo

── FORA DE ~/.config/fsd-agents, MAS USADO PELOS AGENTES ──
~/.claude/RTK.md                   importado no CLAUDE.md de cada agente
~/.local/share/fsd/map/     🤖     fsd-map: motor (engine/, versão no ARG MAP_VERSION do Dockerfile; no container fica em
                                   /opt/fsd/map), mapas por checkout (maps/) e HOME isolado do motor (home/)
~/.local/share/ai-memory/
│   ├── config.toml         ⚙️     servidor ai-memory ([profile] fixado; [auth] no fim)
│   └── db/ wiki/ …         🤖     a memória compartilhada (páginas, sessões, handoffs)
~/.local/share/rtk/         🤖     histórico do RTK
/tmp/fsd-kevin/             🤖     rascunhos do Kevin (corpo de issue, comentário, PR)
/tmp/fsd-mel/               🤖     rascunhos do Mel (passagem, revisão, prova de equivalência)
/tmp/fsd-stuart/            🤖     rascunhos do Stuart (corpo de PR, resposta a revisão, testes manuais)
/tmp/fsd-qa/                🤖     rascunhos e capturas do Bob (worktree do PR em pr-<n>/)

── NO REPO (fred-ships-donuts) ──
AGENTS.md                   ⚙️     como achar código com o fsd-map (lido também pelos agentes)
```

**Para mudar algo, o arquivo é:**
- modelo, esforço, ferramentas ou contexto de um agente: `agents.json` (padrão do time) ou `~/.config/fsd-agents/agents.local.json` (só esta instalação, fora do git);
- o que um agente pode escrever: `agents/<nome>/claude/settings.json`;
- o que vale para todos: `claude-settings.json` e `common/team.md`;
- um tempo de espera (ping ou prazo): `agents.json` → `timing`;
- um MCP novo: `mcp.json`.

## Tempos do time

Todos em `agents.json` → `timing`, lidos pelo `bin/fsd-timing.mjs`. Campo faltando é erro, não há valor escondido
no código. **Ping** é de quanto em quanto tempo algo confere; **prazo** é depois de quanto tempo algo age.

| campo | tipo | o que é |
|---|---|---|
| `wait.ready` | ping (s) | Kevin confere se há PR aprovado e parado |
| `wait.backlog` | ping (s) | Kevin confere se entrou card no Backlog (Kevin) |
| `wait.decision` | ping (s) | Kevin confere se surgiu issue com a label `decision` |
| `wait.todo` | ping (s) | Kevin, Mel e Bob conferem se há PR para revisar ou verificar |
| `wait.mine` | ping (s) | Stuart confere revisão, merge ou fechamento dos PRs dele |
| `wait.column` | ping (s) | Mel e Stuart conferem se chegou card na coluna deles |
| `wait.pr` | ping (s) | qualquer agente esperando um PR específico (`fsd-wait pr <n> …`) |
| `wait.default` | ping (s) | vale para o caso acima que ficar sem valor |
| `wait.retries` | contagem | falhas de rede seguidas antes de o `fsd-wait` desistir |
| `waits.expireMin` | prazo (min) | uma espera do registro `waits/` (`fsd-wait --waiting-for`) mais velha que isso é apagada |
| `deadlock.cycleMin` | prazo (min) | ciclo de esperas no mesmo PR/issue sem atividade vira `DEADLOCK` |
| `deadlock.stallMin` | prazo (min) | todos esperando, sem ciclo e sem atividade vira `STALLED` |
| `judge.timeoutMin` | prazo (min) | a sessão do `fsd-judge` que passa disso recebe SIGINT (SIGTERM 10 s depois, SIGKILL mais 10 s) e o caso vai para o autor |
| `readyGraceMin` | prazo (min) | depois da 2ª aprovação, antes de o Kevin mesclar no lugar do autor do PR |
| `watch.loopSeconds` | ping (s) | intervalo das rodadas do `fsd-watch --loop` |
| `watch.idleMin` | prazo (min) | agente parado sem Monitor leva um empurrão |
| `watch.silentMin` | prazo (min) | agente trabalhando, sem ferramenta em andamento e sem sinal de vida, é reiniciado |
| `watch.toolGraceMin` | prazo (min) | folga depois do timeout de um Bash em andamento |
| `watch.toolDefaultMin` | prazo (min) | outra ferramenta em andamento (Agent, WebFetch…) sem sinal de vida |
| `watch.cooldownMin` | prazo (min) | intervalo mínimo entre duas ações do vigia no mesmo agente |
| `cleanup.loopSeconds` | ping (s) | intervalo das rodadas do `fsd-cleanup --loop` (o `fsd-watch` o reinicia se morrer) |
| `cleanup.mergedMin` | prazo (min) | idade mínima do merge para o `fsd-cleanup` apagar o branch e o worktree |
| `progress.everyMin` | ping (min) | no máximo uma conferência do `fsd-progress` por esse tempo (o vigia o chama a cada rodada) |
| `progress.stallMin` | prazo (min) | card aberto (fora Backlog, Done e `blocked`) sem movimento (coluna, issue, PR, commit) há tanto tempo: `fsd-notify kevin "parado: #n em <coluna> há N min, dono: <agente>"`, o mais antigo só |
| `progress.pauseMin` | prazo (min) | `PAUSE` ligado há tanto tempo: um aviso ao Kevin; o arquivo fica |
| `progress.inboxMin` | prazo (min) | aviso parado na caixa de um agente há tanto tempo: um aviso ao Kevin por agente |
| `stop.pollSeconds` | ping (s) | `fsd-stop` confere se o agente confirmou o handoff |
| `stop.waitSeconds` | prazo (s) | `fsd-stop` desiste de esperar (a sessão fica aberta) |

`FSD_WAIT_SECONDS`, `FSD_READY_GRACE` e `FSD_STOP_WAIT` passam por cima numa sessão só.

**Sinal de vida.** O `fsd-watch` só reinicia quem está trabalhando quando não há nenhum destes sinais, todos sem
gastar token:
- gravação no transcript da sessão ou de um subagente;
- contador de tokens do rodapé do painel mudando entre duas rodadas (o modelo está gerando);
- **Hook Stop `fsd-stop-guard`:** o agente que termina o turno pedindo algo ao autor (última linha com `?`, ou um padrão de `redirects.json` → `stopAsks`/`authorAsks` no fim da mensagem) é bloqueado uma vez com "não espere o autor"; o mesmo pedido de novo em 30 min passa e o Kevin recebe um `fsd-notify`. Log em `$FSD_STATE/stop-guard.log`; o Kevin fica de fora (`authorAsksSkip`). `fsd-wait --waiting-for author` é recusado (exit 2).
- ferramenta em andamento: o hook `fsd-context-guard` grava um arquivo por ferramenta em `/tmp/fsd-live/<agente>/`
  no `PreToolUse` e apaga no `PostToolUse`. Um Bash em andamento vale até o timeout do próprio comando mais
  `toolGraceMin`, mesmo em silêncio (`npm ci`, testes).

O limite de travado é `silentMin` (10 min): o `fsd-watch` reinicia o agente depois de `silentMin` sem ferramenta em
andamento, sem mudança no contador de tokens e sem gravação de subagente. Esse limite substituiu o antigo `HUNG_MIN`,
de 20 min.

## Colunas do quadro

O nome de cada coluna do Status leva o responsável entre parênteses (`Ready for Development (Stuart)`). `bin/fsd-stages.mjs` é o único lugar com os nomes: nome e responsável saem da mesma linha da tabela (a mesma que diz quem é avisado quando um card chega na fila). `stageName()` aceita a chave (`devReady`), o nome com ou sem o responsável, em qualquer caixa, e os nomes antigos; `fsd-board`, `fsd-queue`, `fsd-wait column` e os movimentos de `fsd-lib` comparam sempre por ele, então o código serve com o quadro do GitHub nos nomes velhos ou nos novos. `fsd-board rename [--dry]` põe os nomes de `fsd-stages.mjs` nas opções do GitHub, no lugar (mesmos ids, nenhum card muda de coluna; o estado de antes vai para `$FSD_STATE/board-rename-<data>.json` e o resultado é conferido). Rode uma vez depois do merge de uma mudança de nomes.

## Ação negada → comando do time

`redirects.json` é a fonte única de "ação bloqueada → comando do time". Quem lê: o hook `fsd-redirect-hook`, a regra "pediu ao autor" do `fsd-watch` (`authorAsks`) e a tabela de `common/team.md` (entre `<!-- redirects:start -->` e `<!-- redirects:end -->`).

- **Hook** (`PreToolUse`, Bash): casa o comando por token (separa `&&`, `||`, `;`, `|`, ignora `rtk`/`sudo`/`VAR=x`/`cd`/caminho do programa, não olha dentro de aspas nem de heredoc) e nega com `Blocked: <por quê>. Use: <comando>. Do not ask the author.`, com `<worktree>` e `<n>` preenchidos quando dá para saber. Só nega: nunca `allow`; erro de qualquer tipo sai 0 calado. As regras de `deny` e o classificador seguem de guarda.
- **Vigia e limpeza sempre de pé:** `fsd-watch --loop` guarda `$FSD_STATE/watch.pid` (um só laço; o segundo sai 0 com "already running", pid morto é assumido; o pid file leva pid + starttime + `boot_id` (`bin/fsd-pid.mjs`), então um pid reaproveitado ou de antes de um reboot não segura o lugar) e grava `$FSD_STATE/watch.beat` (hora ISO) a cada rodada. No host, os timers de usuário `fsd-watch.timer` e `fsd-cleanup.timer` (`setup/systemd/`, `systemctl --user enable --now …`) chamam `fsd-watch --loop --fix` e `fsd-cleanup --loop` a cada minuto; no container, o supervisord roda `fsd-svc watch|cleanup` (confere de novo a cada 5 s). Laço morto volta sozinho; o supervisor nunca apaga o `PAUSE`. **Sem root, os agentes também sobem o vigia (#197):** o guard (a cada UserPromptSubmit e PostToolUse) e o `fsd-agent` (ao subir a sessão) chamam `bin/fsd-revive.mjs`: com `watch.beat` mais velho que 3 × `timing.watch.loopSeconds` e o pid de `watch.pid` morto, sobem `fsd-watch --fix --loop` destacado e deixam uma linha no `watch.log` (quem e por quê). Nunca com `FSD_DRY` nem com o `FSD_STATE` dentro do tmpdir (testes, QA, `simulate-envs`; #212). O estado das rodadas do vigia (cooldowns) fica em `$FSD_STATE/watch-state.json`, gravado por `.tmp` + rename. Vigia vivo nunca é tocado; o pid file garante um só.
- **Vigia, código e configuração velhos:** com `--loop`, o `fsd-watch` e o `fsd-cleanup` se reexecutam (`fsd-reload.mjs`, exit 0, mesmo pid file) quando muda um arquivo da fonte e todos compilam; se algum não compila, o código antigo segue e o log avisa uma vez. A sessão que subiu com outro `claude-settings.json`/`redirects.json` (hash em `$TMPDIR/fsd-live-hash/<agente>`, gravado pelo `fsd-agent`) é reiniciada só no ponto seguro (parada no prompt, sem ferramenta, sem diálogo); sem hash gravado, nada.
- **Vigia, diálogo da interface (#155):** um diálogo do próprio Claude Code que não é pedido de permissão (hoje o onboarding do auto mode, "Teach auto mode about your environment?") entra no estado `diálogo da interface`, ação `dismiss`, em vez de `permissão`, e o autor não é alertado. O `dismiss` manda a tecla da opção "Don't show again" (`3`) só àquele painel por `tmux send-keys`, e nunca a um painel que caiu no shell (`painel no shell (<cmd>): não digitou`); não passa pelo `safeSend`, que é do estado `redirect`/empurrão, e tem a checagem de shell própria. Vale o mesmo cooldown de toda ação (`watch.cooldownMin`, por agente e ação) e grava uma linha no `watch.log`: `<agente>: diálogo da interface → dispensou o diálogo "auto mode onboarding" (tecla 3)`. A lista e a tecla de cada diálogo ficam em `team/bin/fsd-dialogs.mjs` (`DIALOGS`); um diálogo novo é uma entrada ali, com todos os padrões (título e opções) casando em linhas inteiras do fim do painel, para que uma frase citada num texto ou diff não receba tecla. Um pedido de permissão de verdade (`Do you want` / `❯ 1. Yes` sem os padrões de um diálogo conhecido) continua no estado `permissão` e no alerta ao autor.
- **Checkout principal em dia (#173):** o time roda `team/bin` do checkout principal. Depois de cada `fsd-merge` e a cada rodada do `fsd-cleanup`, `fsd-follow.mjs` faz `git merge --ff-only origin/develop` nele, só se estiver na `develop` e com a árvore limpa; em outro branch ou com mudança local não toca em nada e o motivo vai ao log (uma vez por laço). O `fsd-watch` mostra "checkout principal atrás da develop (N commits)" quando está atrás. O código novo entra sozinho: o vigia e o `fsd-cleanup` se reexecutam (item acima).
- **Vigia:** agente parado cujo fim de painel pede uma ação ao autor (`authorAsks`) → `fsd-notify kevin "<agente> pediu ao autor: …"` e um empurrão "não espere o autor". Respeita `PAUSE` e `watch.cooldownMin`; o mesmo pedido na tela não repete; `[fsd-aviso …]` não conta. Toda tecla vai por `safeSend`: painel caído num shell (`bash`/`zsh`/`sh`) é reiniciado e nada é digitado; diálogo na tela (`❯ 1.`, `Do you want`, `Press Enter to continue`, `trust`) → não digita e loga `dialog on screen, not typing`; linha de entrada com texto → `C-u` antes (logado). `FSD_TMUX_SOCKET=<nome>` põe `-L <nome>` em todo `tmux` do `fsd-watch` e do `fsd-notify` (teste em servidor isolado).
- **Alerta ao autor (`fsd-alert`):** permissão que nenhum comando do time resolve e limite de uso (com a hora de reinício) viram um alerta por estado, até o estado sair da tela. Canais: toast do Windows (`powershell.exe`, WSL) e depois `notify-send` (o primeiro desktop que entrega vale), a linha em `$FSD_STATE/ALERT` (sempre) e um comentário do Kevin na issue fixa `agents.json → alert.issue` (só se nenhum desktop entregou). Sai 0 sempre; `FSD_DRY=1` não mostra toast nem comenta. O limite de uso nunca reinicia a sessão.
- `fsd-redirects --test` confere `docs/redirect-fixtures.tsv` (agente, pasta, comando, esperado) e sai 1 com a lista dos que diferem. `--write` reescreve o bloco do `team.md`; `--check` sai 1 se ele estiver velho. Os dois rodam no `simulate-envs`.
- `fsd-flow --write` regenera o fluxograma do processo em [CONTRIBUTING.md §2](../CONTRIBUTING.md#2-project-quadro) a partir de `fsd-stages.mjs` (`COLUMNS` e `TRANSITIONS`); `--check` sai 1 se estiver velho. `fsd-flow.test.mjs` (no `npm test`) confere o diagrama com o código dos comandos.

## Detector de impasse

O `fsd-wait any` do Kevin (e `fsd-wait deadlock`, só leitura, para qualquer agente) lê o registro `waits/` (sem chamar o GitHub) e agrupa as esperas por PR/issue. Um ciclo (`kevin→mel→kevin`) quieto há `deadlock.cycleMin` vira `DEADLOCK #n: kevin→mel→kevin`; um PR em que todos esperam, sem ciclo, quieto há `deadlock.stallMin`, vira `STALLED #n: <quem>→<por quem> "<o quê>"; …`. A atividade é o `updated_at` do issue/PR (comentário, revisão, label, push), consultado só para candidatos; mover o card no quadro não conta. Cada impasse é avisado uma vez: `$FSD_STATE/deadlocks.json` guarda a assinatura das esperas e só uma mudança nelas (ou o impasse desfeito e formado de novo) avisa outra vez. Esperas sem `--pr`/`--issue` não entram. `FSD_NOW` (ms ou data ISO) simula o relógio.

## Juiz de impasse

`fsd-judge <n>` (só o Kevin) roda uma sessão headless isolada e só de leitura (`claude -p --model sonnet --effort medium`, prompt em `judge-prompt.md`; argv em `bin/fsd-judge.mjs`: só `gh pr view|diff` e `gh issue view` no Bash, nenhum `git` (o `--output` escreve arquivo), `--settings` negando o estado do time, credenciais e arquivos de segredo, e `--json-schema` com o contrato da resposta) sob a trava `$FSD_JUDGE_STATE/judge.lock` (padrão: `$FSD_STATE`; só a trava e o `judged/` mudam de lugar, as credenciais e as esperas seguem no `FSD_STATE`) e devolve um veredito em JSON (Facts, Rule, Verdict). Confiança alta e sem trava: comenta `Decision (judge, …)` no PR/issue e avisa as partes. Confiança baixa, decisão do autor, assunto reservado (#39, #40, `main`, label `decision`), 2º impasse no mesmo PR (`judged/<n>.json`), erro, timeout ou JSON inválido: não aplica nada e imprime o comentário `Deadlock: author decision needed`, que o Kevin posta. `FSD_DRY=1` não comenta, não avisa e não grava; com `FSD_JUDGE_FIXTURE=<arquivo>` lê a resposta do arquivo em vez de chamar o `claude`.

## Avisos não entregues

`fsd-notify` cola o aviso na sessão tmux do agente. Se a sessão está fechada ou parada numa pergunta de permissão, o aviso fica em `$FSD_STATE/inbox/<agente>` (uma linha JSON por aviso) e chega no próximo início de sessão (hook SessionStart, `fsd-inbox drain`) ou na próxima rodada do `fsd-wait`. O Kevin vê no `fsd-wait any` quem está offline com avisos pendentes.

## Pastas de rascunho

Cada agente grava os rascunhos numa pasta própria em `/tmp`, sem pedir permissão, inclusive no
modo sem interface (`-p`):

| agente | pasta |
|---|---|
| kevin | `/tmp/fsd-kevin/` |
| mel | `/tmp/fsd-mel/` |
| stuart | `/tmp/fsd-stuart/` |
| bob | `/tmp/fsd-qa/` |

**Onde está configurado:** a pasta aparece numa linha do `CLAUDE.md` do agente. O
`settings.json` dele tem as duas regras abaixo, e as duas são necessárias:

    "allow": ["Edit(//tmp/fsd-<nome>/**)"],          ← libera a escrita
    "additionalDirectories": ["/tmp/fsd-<nome>"]     ← põe a pasta entre as de trabalho

**Três detalhes nas regras:**
- Caminho absoluto leva **duas barras** (`//tmp/...`). Com uma barra só, o caminho conta a partir
  da pasta do settings.
- Regra de arquivo é `Edit(...)`, que cobre todas as ferramentas de edição. `Write(...)` não é
  aplicada.
- O RTK reescreve `gh` para `rtk gh`. Uma permissão de Bash para o `gh` precisa cobrir as duas
  formas: `Bash(gh:*)` e `Bash(rtk gh:*)`.

O `/tmp` é apagado quando a máquina reinicia. As regras continuam, e a pasta volta a ser criada
quando o agente gravar o próximo rascunho.

## Segredos

- **Outra máquina:** os mesmos segredos vão cifrados em `secrets.tar.age`. Na matriz: `bin/fsd-secrets pack` e commit; na remota: `bin/fsd-secrets unpack`. Passo a passo do container em `team/docs/CONTAINER-PASSO-A-PASSO.md`; valores da sua instalação em `setup/team.env.example`.
- **Depois de mover ou renomear arquivos:** `setup/check-paths` (ou `npm run check:paths`) lista todo link, âncora, caminho de script e link simbólico quebrado, com `arquivo:linha`, e sai 1 se houver algum. Só lê; `--root <pasta>` confere outra árvore.
- **Antes de mexer em caminhos, setup ou scripts:** `setup/simulate-envs` clona o branch atual em vários layouts (containers com nomes e caminhos diferentes, a matriz, caminho com espaços) e mostra onde quebra; termina com saída 0 só sem falhas.
- **`keys/<slug>.pem`:** perdeu ou vazou? Gere outra na página do App e apague a antiga.
- **`claude-oauth-token`:** troca com `claude setup-token`. Salve sem ecoar na tela: `read -rsp "token: " T && umask 077 && printf '%s\n' "$T" > claude-oauth-token && unset T`.
- **`ai-memory-tokens/<nome>`:** troca com `ai-memory api-key rotate <ID> --json`, gravando o `aim_…` novo no arquivo. Para ver os IDs, use `ai-memory api-key list`.
- **`cache/`:** são tokens descartáveis.

## ai-memory

- Cada agente é um usuário próprio no servidor (`kevin`, `mel`, `stuart`, `bob`), com login web desligado.
- O handoff que um agente cria volta só para ele.
- Páginas e sessões do projeto `<workspace>/<projeto>` do ai-memory são compartilhadas com você.
- Para um agente novo:
  1. `ai-memory user add-human --username <nome> --role user`;
  2. `ai-memory user disable --yes <nome>`;
  3. `ai-memory api-key add --username <nome> --label fsd-<nome> --json`, com o `aim_…` gravado direto em `ai-memory-tokens/<nome>`.

## Regras no GitHub

- Ruleset `ProtMain` (main): só o Admin (você, bypass always) atualiza/faz merge;
  PR exige 1 aprovação; merge comum (sem squash). Agentes abrem e aprovam PRs de outros agentes.
- Interaction limits: collaborators_only, expira 2027-05-08 — renovar.

## fsd-agent fred

```bash
sed -i '/^name="\${1:-}"; shift || true$/a [ "$name" = fred ] \&\& { [ "${1:-}" = claude ] \&\& shift; d="$ROOT/agents/fred/claude"; mkdir -p "$d" "$ROOT/sessions"; (shopt -s dotglob; for f in "$HOME"/.claude/*; do n="${f##*/}"; [ "$n" = sessions ] || [ -e "$d/$n" ] || ln -s "$f" "$d/$n"; done); ln -sfn "$HOME/.claude.json" "$d/.claude.json"; ln -sfn "$ROOT/sessions" "$d/sessions"; CLAUDE_CONFIG_DIR="$d" exec claude -n fred "$@"; }' ~/.config/fsd-agents/bin/fsd-agent
fsd-agent fred
```
