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
| mel | claude-opus-5-5 | medium | nenhuma |
| stuart | claude-opus-5-5 | medium | nenhuma |
| bob | claude-opus-5-5 | medium | Agent, WebSearch, WebFetch |

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
│   ├── fsd-token                  gera o token do GitHub App do agente
│   ├── fsd-secrets                pack/unpack dos segredos em secrets.tar.age (age, senha)
│   ├── gh                         gh dos agentes (só entra no PATH dentro do fsd-agent)
│   └── git-credential-fsd         entrega o token ao git
│
├── agents.json             ⚙️     por agente: model, effort, disallowedTools, dados do GitHub App
│                                  "claude_common": ferramentas cortadas para todos
├── claude-settings.json    ⚙️     comum: hooks (RTK, Trail, ai-memory), deny comuns, permissões do ai-memory
├── mcp.json                ⚙️     o único MCP dos agentes: ai-memory
├── common/
│   ├── team.md             ⚙️     regras do time (fluxo, memória, handoffs), importado em todo CLAUDE.md
│   └── skills/fsd-fluxo-github/SKILL.md  ⚙️  skill comum (link em cada agente)
│
├── agents/<kevin|mel|stuart|bob>/claude/      ← CLAUDE_CONFIG_DIR de cada agente
│   ├── CLAUDE.md           ⚙️     o papel do agente
│   ├── settings.json       ⚙️     deny e permissões próprias do papel (onde pode escrever)
│   ├── skills/             ⚙️     skills do papel + link para fsd-fluxo-github
│   │     kevin: fsd-pm-issue      mel: fsd-arq-passagem, fsd-arq-revisao
│   │     stuart: fsd-dev-entrega  bob: fsd-qa-verificacao
│   ├── projects/-media-…-fred-ships-donuts/
│   │   ├── memory/         🤖⚙️   memória do agente (MEMORY.md + .md)
│   │   └── <sessão>.jsonl  🤖     transcripts
│   ├── .claude.json        🤖     estado: projetos confiáveis, histórico
│   └── backups/ cache/ plugins/ sessions/ session-env/   🤖
│
├── sessions/              🤖     registro comum das sessões abertas (cada perfil tem um link para cá)
├── claude-oauth-token      🔒     login do Claude (o mesmo para os quatro)
├── ai-memory-tokens/<nome> 🔒     credencial aim_ do agente no ai-memory
├── keys/fsd-<nome>.pem     🔒     chave privada do GitHub App
├── cache/<nome>.json       🔒🤖   token do GitHub, renovado sozinho
├── gh-config/<nome>/       🤖     config do gh de cada agente
└── README.md                      este arquivo

── FORA DE ~/.config/fsd-agents, MAS USADO PELOS AGENTES ──
~/.claude/RTK.md                   importado no CLAUDE.md de cada agente
~/.claude/helpers/graft-hooks.cjs  script dos hooks do Trail (chamado pelo claude-settings.json)
~/.trail/settings.json      ⚙️     Trail: skills e ofertas desligadas (vale para você e para os agentes)
~/.local/share/ai-memory/
│   ├── config.toml         ⚙️     servidor ai-memory ([profile] fixado; [auth] no fim)
│   └── db/ wiki/ …         🤖     a memória compartilhada (páginas, sessões, handoffs)
~/.local/share/rtk/         🤖     histórico do RTK
/tmp/fsd-kevin/             🤖     rascunhos do Kevin (corpo de issue, comentário, PR)
/tmp/fsd-mel/               🤖     rascunhos do Mel (passagem, revisão, prova de equivalência)
/tmp/fsd-stuart/            🤖     rascunhos do Stuart (corpo de PR, resposta a revisão, testes manuais)
/tmp/fsd-qa/                🤖     rascunhos e capturas do Bob (worktree do PR em pr-<n>/)

── NO REPO (fred-ships-donuts) ──
graft/                      🤖     mapa de código do Trail (fora do git)
.claude/settings.json       ⚙️     hook do Trail no início da sessão
.trail/                     ⚙️     hook.cjs, README e .gitignore do Trail
AGENTS.md                   ⚙️     seção do Trail
```

**Para mudar algo, o arquivo é:**
- modelo, esforço ou ferramentas de um agente: `agents.json`;
- o que um agente pode escrever: `agents/<nome>/claude/settings.json`;
- o que vale para todos: `claude-settings.json` e `common/team.md`;
- um MCP novo: `mcp.json`.

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

- **Outra máquina:** os mesmos segredos vão cifrados em `secrets.tar.age`. Na matriz: `bin/fsd-secrets pack` e commit; na remota: `bin/fsd-secrets unpack`. Passo a passo do container em `docs/CONTAINER-PASSO-A-PASSO.md`; valores da sua instalação em `setup/team.env.example`.
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
