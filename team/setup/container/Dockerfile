# syntax=docker/dockerfile:1
#
# ══ fsd: a máquina portátil inteira num container ═══════════════════════════════════════════════════════
#
# UM arquivo só. Ele traz as ferramentas, os serviços e o assistente de configuração (`fsd-setup`).
# Funciona em Linux, Windows e Mac, com processador Intel/AMD (amd64) ou ARM (arm64, como Apple M1-M4).
# Tutorial para quem nunca usou Docker: docs/CONTAINER-PASSO-A-PASSO.md
#
# ── O que o host precisa ─────────────────────────────────────────────────────────────────────────────────
#   Windows e Mac: Docker Desktop (já traz o BuildKit).
#   Linux: Docker Engine com o plugin buildx (o script get.docker.com já instala).
#          No Ubuntu, com o pacote docker.io: `sudo apt install docker-buildx`.
#   Sem BuildKit, o build falha: este arquivo usa heredocs (COPY <<EOF), que só ele entende.
#   Fim de linha: LF ou CRLF (arquivo salvo no Windows), os dois funcionam (testado). Os scripts saem
#   sempre com LF. O setup/container/.gitattributes mantém LF num clone.
#
# ── Construir e criar (igual em qualquer sistema, cada comando numa linha só) ─────────────────────────
#   docker build -t fsd .
#   docker run -d --name fsd --hostname fsd-<nome-do-computador> --restart unless-stopped --cap-add NET_ADMIN --device /dev/net/tun -v fsd-home:/home/fsd -v fsd-projects:/media/fsd/Projects fsd
#   docker exec -it fsd entrar          ← entra na máquina (sempre por este comando)
#   fsd-setup                           ← já dentro: configura tudo, uma vez só
#
#   * A arquitetura é detectada sozinha: a imagem é construída no próprio host, do jeito certo para ele.
#     Uma imagem pronta só serve para hosts da mesma arquitetura. Para levar sem reconstruir:
#     docker save fsd | gzip > fsd.tar.gz   →   no outro host: docker load -i fsd.tar.gz
#   * --hostname: um nome por máquina (fsd-notebook, fsd-trabalho…). Ele vira o nome na Tailscale,
#     no Syncthing e na chave SSH, e é o que se apaga na matriz se a máquina for perdida.
#   * Sem /dev/net/tun (o host não deixa): tire --cap-add e --device. A Tailscale cai sozinha para
#     o modo userspace (proxy SOCKS5), e o Syncthing e o túnel passam por ele.
#   * Os volumes fsd-home (o HOME) e fsd-projects (o código) guardam tudo. Apagar o container não
#     apaga nada. Apagar os volumes apaga tudo. Sem eles, os logins somem a cada container novo.
#   * Opcionais no docker run: -e TS_AUTHKEY=tskey-… (entra na Tailscale sem abrir link),
#     -e FSD_GIT_NAME=… -e FSD_GIT_EMAIL=… (senão vêm da conta do GitHub), -e FSD_MATRIZ=<ip>.
#
# ── O que o fsd-setup faz sozinho, e o que só você pode fazer ────────────────────────────────────────
#   Sozinho: Tailscale; git config; clone do fsd e do fsd-agents; atalhos (fsd-agent, fsd-stats,
#   fsd-watch, fsd-sync-pair); chave do túnel; pareamento do Syncthing (começa em "receive only");
#   registro do MCP do ai-memory; npm ci, build e trail build; conferência.
#   Você: (1) o login do GitHub (`gh auth login`, que o setup abre); (2) o login do Claude (`/login`);
#   (3) a senha do secrets.tar.age; (4) aprovar a máquina na Tailscale (um link, ou o TS_AUTHKEY);
#   (5) colar, na matriz, a linha `fsd-aceitar …` que o setup mostra. Ela autoriza a chave do túnel e
#   pareia o Syncthing do lado da matriz. A matriz tem de confiar na máquina nova, e só ela pode dizer isso.
#   Nenhum segredo está na imagem: as chaves, os tokens e os logins ficam só no volume fsd-home.
#
# ── Versões (iguais às da matriz) ─────────────────────────────
# Mudou na matriz? Mude aqui e reconstrua. O NODE_VERSION entra no PATH sozinho, mas a statusline
# sincronizada da matriz chama ~/.nvm/versions/node/v<versão>/bin/node: troque na matriz e aqui juntos.
ARG NVM_VERSION=0.40.8
ARG NODE_VERSION=26.12.1
ARG CLAUDE_VERSION=2.1.322
ARG TRAIL_VERSION=0.29.0
ARG RTK_VERSION=1.1.0
ARG AIMEM_VERSION=3.4.3
ARG AGE_VERSION=1.3.2

# ══ estágio 1: baixa e instala as ferramentas em /opt/fsd ══════════════════════════════════════════════
FROM ubuntu:24.04 AS tools
ARG TARGETARCH
ARG NVM_VERSION NODE_VERSION CLAUDE_VERSION TRAIL_VERSION RTK_VERSION AIMEM_VERSION AGE_VERSION
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils libatomic1 git \
 && rm -rf /var/lib/apt/lists/*
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN set -eux; O=/opt/fsd; ARCH="${TARGETARCH:-$(dpkg --print-architecture)}"; \
    case "$ARCH" in \
      amd64) A=x86_64;  R=x86_64-unknown-linux-musl;  G=amd64 ;; \
      arm64) A=aarch64; R=aarch64-unknown-linux-gnu;  G=arm64 ;; \
      *) echo "arquitetura sem suporte: $ARCH (só amd64 e arm64)"; exit 1 ;; esac; \
    mkdir -p $O/bin $O/ai-memory /tmp/dl; \
    curl -fsSL "https://github.com/akitaonrails/ai-memory/releases/download/v$AIMEM_VERSION/ai-memory-linux-$A.tar.gz" | tar -xz -C $O/ai-memory; \
    rm -rf $O/ai-memory/docs $O/ai-memory/crates; \
    curl -fsSL "https://github.com/rtk-ai/rtk/releases/download/v$RTK_VERSION/rtk-$R.tar.gz" | tar -xz -C /tmp/dl; \
    install -m755 "$(find /tmp/dl -type f -name rtk | head -1)" $O/bin/rtk; \
    curl -fsSL "https://github.com/FiloSottile/age/releases/download/v$AGE_VERSION/age-v$AGE_VERSION-linux-$G.tar.gz" | tar -xz -C /tmp/dl; \
    install -m755 /tmp/dl/age/age /tmp/dl/age/age-keygen $O/bin/; \
    rm -rf /tmp/dl
# Node via nvm em /opt/fsd/nvm (só uma versão) + trail; sem caches.
RUN set -eux; export NVM_DIR=/opt/fsd/nvm; mkdir -p $NVM_DIR; \
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh" | PROFILE=/dev/null bash; \
    . $NVM_DIR/nvm.sh; nvm install "$NODE_VERSION"; nvm alias default "$NODE_VERSION"; \
    npm i -g "@trailhq/trail-code@$TRAIL_VERSION"; \
    npm cache clean --force; rm -rf $NVM_DIR/.cache $NVM_DIR/.git /root/.npm; \
    rm -rf $NVM_DIR/versions/node/v$NODE_VERSION/include   # headers C: só para compilar módulos nativos (o fsd não tem)
# Claude Code nativo: instala num HOME temporário e move para /opt/fsd/claude.
RUN set -eux; export HOME=/tmp/h; mkdir -p $HOME; \
    curl -fsSL https://claude.ai/install.sh | bash -s "$CLAUDE_VERSION"; \
    mv $HOME/.local/share/claude /opt/fsd/claude; rm -rf $HOME; \
    echo "node=$NODE_VERSION claude=$CLAUDE_VERSION trail=$TRAIL_VERSION rtk=$RTK_VERSION ai-memory=$AIMEM_VERSION age=$AGE_VERSION" > /opt/fsd/VERSIONS; \
    echo "$NODE_VERSION" > /opt/fsd/NODE_VERSION; echo "$CLAUDE_VERSION" > /opt/fsd/CLAUDE_VERSION

# ══ estágio 2: a imagem final ══════════════════════════════════════════════════════════════════════════
FROM ubuntu:24.04
ARG NODE_VERSION
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8 \
    TERM=xterm-256color COLORTERM=truecolor GRAFT_NO_STATUSLINE=1 \
    PATH=/home/fsd/.nvm/versions/node/v${NODE_VERSION}/bin:/home/fsd/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    FSD_REPO=/media/fsd/Projects/projetos/fred-ships-donuts \
    FSD_REPO_URL=https://github.com/fred-ships-donuts/fsd.git
# Valores da SUA instalação (IP da matriz, ID do Syncthing, usuário na matriz, URL do cofre privado) NÃO
# ficam na imagem: vêm do team.env, passado no `docker run --env-file team.env`. Modelo: setup/team.env.example

# Pacotes do sistema (gh 2.45.0, syncthing 1.27.2, tmux 3.4: apt do Ubuntu 24.04, iguais à matriz) + Tailscale.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git gh tmux jq python3 openssh-client syncthing supervisor \
      netcat-openbsd iptables iproute2 procps less sudo util-linux libatomic1 \
 && curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg -o /usr/share/keyrings/tailscale-archive-keyring.gpg \
 && curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list -o /etc/apt/sources.list.d/tailscale.list \
 && apt-get update && apt-get install -y --no-install-recommends tailscale \
 && apt-get purge -y gnupg && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /var/cache/apt/* /var/log/apt /var/log/dpkg.log

# Mesmo usuário da matriz (UID/GID 1000). A imagem traz "ubuntu" com UID 1000: sai antes.
RUN userdel -r ubuntu \
 && groupadd -g 1000 fsd && useradd -m -u 1000 -g 1000 -s /bin/bash fsd \
 && echo 'fsd ALL=(root) NOPASSWD: /usr/bin/tailscale' > /etc/sudoers.d/fsd-tailscale \
 && mkdir -p /media/fsd/Projects/projetos /var/log/fsd /run/tailscale \
 && chown -R 1000:1000 /media/fsd

COPY --from=tools --chown=1000:1000 /opt/fsd /opt/fsd

# ── fsd-entrypoint: o primeiro programa do container (root) ────────────────────────────────────────────
COPY <<'EOF' /usr/local/bin/fsd-entrypoint
#!/usr/bin/env bash
# Entrypoint do container fsd (roda como root): garante os links das ferramentas no HOME, escolhe a rede
# da Tailscale e sobe o supervisord (tailscaled, syncthing, túnel do ai-memory).
set -euo pipefail
H=/home/fsd

# 1. Dono certo nos volumes e links para /opt/fsd (volume novo, volume antigo ou imagem nova).
chown 1000:1000 "$H" /media/fsd/Projects 2>/dev/null || true
mkdir -p /media/fsd/Projects/projetos && chown 1000:1000 /media/fsd/Projects/projetos
su fsd -c /usr/local/bin/fsd-links
echo "fsd: ferramentas $(cat /opt/fsd/VERSIONS)"

# 2. Rede da Tailscale: tun (precisa de --cap-add NET_ADMIN --device /dev/net/tun) ou userspace (proxy SOCKS5).
mkdir -p /run/tailscale /var/log/fsd "$H/.local/share/tailscale"
chown 1000:1000 "$H/.local/share/tailscale"
if [ -c /dev/net/tun ] && [ "${TS_USERSPACE:-0}" != 1 ]; then echo tun > /run/fsd-net-mode
else echo userspace > /run/fsd-net-mode; echo "fsd: sem /dev/net/tun, Tailscale em userspace (SOCKS5 127.0.0.1:1055)"; fi

# 3. Comando dado ao container (ex.: docker run ... fsd bash)? Roda em vez do supervisord.
[ $# -gt 0 ] && exec "$@"
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
EOF

# ── fsd-svc: os 3 serviços, chamados pelo supervisord ──────────────────────────────────────────────────
COPY <<'EOF' /usr/local/bin/fsd-svc
#!/usr/bin/env bash
# fsd-svc tailscaled|syncthing|tunnel — serviços do container fsd, chamados pelo supervisord.
set -uo pipefail
H=/home/fsd; MODE="$(cat /run/fsd-net-mode 2>/dev/null || echo tun)"
STATE=(--state="$H/.local/share/tailscale/tailscaled.state" --socket=/run/tailscale/tailscaled.sock)
case "${1:-}" in
  tailscaled)
    if [ "$MODE" = tun ]; then exec /usr/sbin/tailscaled "${STATE[@]}"
    else exec /usr/sbin/tailscaled --tun=userspace-networking --socks5-server=127.0.0.1:1055 "${STATE[@]}"; fi ;;
  syncthing)
    [ "$MODE" = userspace ] && export all_proxy=socks5://127.0.0.1:1055 ALL_PROXY=socks5://127.0.0.1:1055
    exec /usr/bin/syncthing serve --no-browser --no-restart ;;
  tunnel)
    # Túnel 127.0.0.1:49374 -> ai-memory da matriz. Espera a chave (~/.ssh/id_matriz) e a Tailscale; tenta de novo a cada 5 s.
    M="${FSD_MATRIZ:?defina FSD_MATRIZ (team.env)}"; P=()
    [ "$MODE" = userspace ] && P=(-o "ProxyCommand=nc -X 5 -x 127.0.0.1:1055 %h %p")
    while true; do
      if [ -f "$H/.ssh/id_matriz" ]; then
        ssh -NT -i "$H/.ssh/id_matriz" "${P[@]}" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
            -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=2 \
            -L 127.0.0.1:49374:127.0.0.1:49374 "${FSD_MATRIZ_USER:?defina FSD_MATRIZ_USER (team.env)}@$M"
      fi
      sleep 5
    done ;;
  *) echo "uso: fsd-svc tailscaled|syncthing|tunnel"; exit 2 ;;
esac
EOF

# ── fsd-links: liga o HOME (volume) às ferramentas da imagem, nos caminhos da matriz ──────────────────
COPY <<'EOF' /usr/local/bin/fsd-links
#!/usr/bin/env bash
# fsd-links — (re)cria no HOME os links para as ferramentas de /opt/fsd, nos mesmos caminhos da matriz.
# Idempotente; roda no build e a cada início do container (volumes antigos ou imagem nova).
set -euo pipefail
H=/home/fsd; O=/opt/fsd; CV="$(cat $O/CLAUDE_VERSION)"
mkdir -p "$H/.local/bin" "$H/.local/share" "$H/.local/lib"
link() { # link <destino> <link>: troca pasta real antiga (layout anterior) por link
  if [ -e "$2" ] && [ ! -L "$2" ]; then rm -rf "$2"; fi
  ln -sfn "$1" "$2"
}
link "$O/nvm"        "$H/.nvm"
link "$O/claude"     "$H/.local/share/claude"
link "$O/ai-memory"  "$H/.local/lib/ai-memory"
link "$O/ai-memory/ai-memory"        "$H/.local/bin/ai-memory"
link "$O/claude/versions/$CV"        "$H/.local/bin/claude"
for b in rtk age age-keygen; do link "$O/bin/$b" "$H/.local/bin/$b"; done
# HOME sem .bashrc ou .profile (volume criado vazio): copia os padrões do Ubuntu.
for f in .bashrc .profile .bash_logout; do [ -e "$H/$f" ] || cp "/etc/skel/$f" "$H/$f"; done
# .bashrc igual à matriz (nvm + PATH + GRAFT_NO_STATUSLINE)
grep -q '# fsd (igual à matriz)' "$H/.bashrc" 2>/dev/null || cat >> "$H/.bashrc" <<'RC'

# fsd (igual à matriz)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"
export GRAFT_NO_STATUSLINE=1
RC
# Lembrete na entrada, até o fsd-setup terminar.
grep -q '# fsd (lembrete do setup)' "$H/.bashrc" 2>/dev/null || cat >> "$H/.bashrc" <<'RC'

# fsd (lembrete do setup)
[ -f "$HOME/.local/state/fsd-setup.ok" ] || printf '\n\033[1;35m🍩 Máquina nova! Digite \033[1;33mfsd-setup\033[1;35m e aperte Enter.\033[0m\n\n'
RC
EOF

# ── entrar: abre o terminal como o usuário, na pasta do projeto ───────────────────────────────────────
COPY <<'EOF' /usr/local/bin/entrar
#!/usr/bin/env bash
# entrar [comando…] — chamado por `docker exec -it fsd entrar`. Vira o usuário fsd, entra na
# pasta do projeto (ou no HOME, se ainda não há clone) e abre o bash. Com argumentos, roda o comando.
set -euo pipefail
H=/home/fsd; REPO=/media/fsd/Projects/projetos/fred-ships-donuts
if [ "$(id -u)" = 0 ]; then
  cd "$REPO" 2>/dev/null || cd "$H"
  exec runuser -u fsd -- env HOME="$H" USER=fsd LOGNAME=fsd SHELL=/bin/bash "$0" "$@"
fi
[ $# -gt 0 ] && exec bash -lc "$*"
exec bash -l
EOF

# ── fsd-setup: o assistente que configura a máquina nova ──────────────────────────────────────────────
COPY <<'EOF' /usr/local/bin/fsd-setup
#!/usr/bin/env bash
# fsd-setup — configura a máquina nova do fsd, do zero até pronta.
# Pode rodar quantas vezes quiser: o que já está feito é pulado. Só para quando precisa de você:
# os logins (Tailscale, GitHub, Claude), a senha dos segredos e a linha para colar na matriz.
set -uo pipefail
H=/home/fsd
REPO=/media/fsd/Projects/projetos/fred-ships-donuts
AG="$H/.config/fsd-agents"; TEAM="$REPO/team"
[ -f "${FSD_TEAM_ENV:-$H/.config/fsd-agents/team.env}" ] && . "${FSD_TEAM_ENV:-$H/.config/fsd-agents/team.env}"
M="${FSD_MATRIZ:?defina FSD_MATRIZ no team.env (docker run --env-file team.env)}"; MSID="${FSD_MATRIZ_SYNC_ID:?defina FSD_MATRIZ_SYNC_ID no team.env}"
: "${FSD_AGENTS_URL:?defina FSD_AGENTS_URL (cofre privado) no team.env}"; FSD_AGENTS_BRANCH="${FSD_AGENTS_BRANCH:-main}"
MODE="$(cat /run/fsd-net-mode 2>/dev/null || echo tun)"
NOME="$(hostname)"

passo()  { printf '\n\033[1;35m🍩 %s\033[0m\n' "$*"; }
ok()     { printf '   \033[32m✓ %s\033[0m\n' "$*"; }
voce()   { printf '   \033[1;33m👉 %s\033[0m\n' "$*"; }
falha()  { printf '   \033[31m✗ %s\033[0m\n' "$*"; printf '   Arrume e rode \033[1mfsd-setup\033[0m de novo: ele continua daqui.\n'; exit 1; }
alcanca() { # alcanca <ip> <porta>: abre uma conexão TCP pela tailnet (tun ou SOCKS5)
  if [ "$MODE" = userspace ]; then nc -z -w 5 -X 5 -x 127.0.0.1:1055 "$1" "$2" 2>/dev/null
  else nc -z -w 5 "$1" "$2" 2>/dev/null; fi
}
tunel_ok() { curl -sf -m 3 http://127.0.0.1:49374/healthz >/dev/null; }
stcfg() { local c="$H/.local/state/syncthing/config.xml"; [ -f "$c" ] || c="$H/.config/syncthing/config.xml"; echo "$c"; }

[ "$(id -u)" = 1000 ] || { echo "Rode como fsd. Entre com: docker exec -it fsd entrar"; exit 2; }
case "$NOME" in fsd-*) ;; *) echo "aviso: esta máquina se chama '$NOME'. O normal é começar com fsd- (docker run --hostname fsd-…).";; esac

passo "1/9  Tailscale: o caminho secreto até a matriz"
if tailscale status >/dev/null 2>&1; then ok "conectada como $NOME ($(tailscale ip -4 | head -1))"
else
  [ -n "${TS_AUTHKEY:-}" ] || voce "Vai aparecer um link. Abra no navegador, entre na sua conta e aprove esta máquina."
  sudo tailscale up --hostname "$NOME" ${TS_AUTHKEY:+--authkey="$TS_AUTHKEY"} || falha "a Tailscale não conectou"
  ok "conectada ($(tailscale ip -4 | head -1))"
fi
for _ in $(seq 1 15); do alcanca "$M" 22 && break; sleep 2; done
alcanca "$M" 22 && ok "a matriz ($M) responde" || falha "não alcanço a matriz em $M. Ela está ligada e na Tailscale?"

passo "2/9  GitHub (o login é seu)"
if gh auth status >/dev/null 2>&1; then ok "logado como $(gh api user -q .login)"
else
  voce "Vai aparecer um código de 8 letras e um link. Abra o link, cole o código e autorize."
  gh auth login -h github.com -p https -w -s repo,workflow,project,admin:org,gist,user:email || falha "o login do GitHub não terminou"
fi
gh auth setup-git || falha "gh auth setup-git falhou"
[ -n "$(git config --global user.name)" ] || git config --global user.name "${FSD_GIT_NAME:-$(gh api user -q '.name // .login')}"
if [ -z "$(git config --global user.email)" ]; then
  e="${FSD_GIT_EMAIL:-$(gh api user/emails -q '[.[] | select(.primary)][0].email' 2>/dev/null)}"
  [ -n "$e" ] || e="$(gh api user -q '"\(.id)+\(.login)@users.noreply.github.com"')"
  git config --global user.email "$e"
fi
git config --global core.autocrlf false
ok "git: $(git config --global user.name) <$(git config --global user.email)>"

passo "3/9  Código"
[ -d "$REPO/.git" ] || git clone "$FSD_REPO_URL" "$REPO" || falha "não consegui clonar o fsd"
ok "fsd em $REPO"
[ -d "$AG/.git" ] || git clone -b "$FSD_AGENTS_BRANCH" "$FSD_AGENTS_URL" "$AG" || falha "não consegui clonar o cofre (fsd-agents)"
ok "cofre (segredos e estado) em $AG; código do time em $TEAM"

passo "4/9  Segredos (a senha é sua)"
if [ -s "$H/.local/share/ai-memory/config.toml" ] && compgen -G "$AG/keys/*.pem" >/dev/null; then ok "já estão aqui"
else
  voce "Digite a senha do secrets.tar.age. As letras não aparecem enquanto você digita, e isso é normal."
  "$TEAM/bin/fsd-secrets" unpack || falha "a senha não abriu os segredos"
fi
mkdir -p "$H/.local/bin"
printf '#!/bin/sh\nexec "%s/bin/fsd-agent" "$@"\n' "$TEAM" > "$H/.local/bin/fsd-agent" && chmod +x "$H/.local/bin/fsd-agent"
for b in fsd-stats fsd-watch fsd-sync-pair; do ln -sfn "$TEAM/bin/$b" "$H/.local/bin/$b"; done
ok "atalhos: fsd-agent, fsd-stats, fsd-watch, fsd-sync-pair"

passo "5/9  A matriz aceita esta máquina (túnel do ai-memory e Syncthing)"
mkdir -p "$H/.ssh" && chmod 700 "$H/.ssh"
[ -f "$H/.ssh/id_matriz" ] || ssh-keygen -q -t ed25519 -N '' -C "$NOME" -f "$H/.ssh/id_matriz"
for _ in $(seq 1 30); do "$TEAM/bin/fsd-sync-pair" id >/dev/null 2>&1 && break; sleep 2; done
SID="$("$TEAM/bin/fsd-sync-pair" id 2>/dev/null)" || falha "o Syncthing daqui não responde (veja /var/log/fsd/syncthing.log)"
MYIP="$(tailscale ip -4 | head -1)"
if tunel_ok; then ok "túnel do ai-memory no ar"
else
  voce "Na MATRIZ, abra um terminal, cole esta linha inteira e aperte Enter:"
  printf '\n\033[1mfsd-aceitar %s %s %s '\''%s'\''\033[0m\n\n' "$NOME" "$MYIP" "$SID" "$(cat "$H/.ssh/id_matriz.pub")"
  voce "Eu espero aqui. Uns segundos depois de você colar, o túnel sobe sozinho."
  until tunel_ok; do sleep 5; printf '.'; done; echo
  ok "túnel do ai-memory no ar"
fi

passo "6/9  Syncthing: copiar as configurações da matriz"
if grep -q "$MSID" "$(stcfg)"; then ok "já pareado com a matriz"
else "$TEAM/bin/fsd-sync-pair" add "$MSID" "$M" matriz --first || falha "o pareamento do Syncthing falhou"; fi
voce "Esperando todas as pastas chegarem. Na primeira vez, pode levar alguns minutos."
st=""
for i in $(seq 1 360); do
  st="$("$TEAM/bin/fsd-sync-pair" status 2>/dev/null)"
  [ -n "$st" ] && ! grep -qv 'idle, falta receber 0,' <<<"$st" && break
  [ $((i % 6)) = 1 ] && { sed 's/^/     /' <<<"$st"; echo; }
  sleep 5
done
[ -n "$st" ] && ! grep -qv 'idle, falta receber 0,' <<<"$st" || falha "as pastas não terminaram de chegar em 30 min. Rode fsd-sync-pair status para ver"
ok "pastas em dia"

passo "7/9  Claude (o login é seu)"
claude mcp get ai-memory >/dev/null 2>&1 || claude mcp add -s user ai-memory -- "$H/.local/lib/ai-memory/ai-memory" mcp-bridge --server-url http://127.0.0.1:49374/mcp >/dev/null
ok "MCP do ai-memory registrado"
if [ -s "$H/.claude/.credentials.json" ]; then ok "já logado"
else
  voce "O Claude vai abrir. Responda o que ele perguntar, digite /login e siga o link. No fim, digite /exit."
  read -rp "   Aperte Enter para abrir o Claude… " _
  (cd "$REPO" && claude) || true
  [ -s "$H/.claude/.credentials.json" ] && ok "logado" || falha "o login do Claude não terminou"
fi
[ "$(grep -c aim_ "$H/.claude/settings.json" 2>/dev/null)" = 0 ] || [ ! -f "$H/.claude/settings.json" ] \
  || echo "   aviso: ~/.claude/settings.json tem um token aim_ (não devia)"

passo "8/9  Projeto: instalar e construir"
cd "$REPO" || falha "falta $REPO"
[ -d node_modules ] || npm ci || falha "npm ci falhou"
npm run build >/dev/null || falha "npm run build falhou (rode npm run build para ver o erro)"
trail build >/dev/null 2>&1 || echo "   aviso: trail build falhou (não impede o uso)"
ok "instalado e construído"

passo "9/9  Conferência"
if pgrep -x tailscaled >/dev/null && pgrep -x syncthing >/dev/null && pgrep -f '49374:127.0.0.1:49374' >/dev/null
then ok "3 serviços rodando"; else echo "   aviso: algum serviço parou (docker exec -u root fsd supervisorctl status)"; fi
tunel_ok && ok "ai-memory responde pelo túnel" || echo "   aviso: o túnel caiu"
ai-memory status >/dev/null 2>&1 && ok "ai-memory status ok" || echo "   aviso: ai-memory status falhou (rode ai-memory doctor)"
mkdir -p "$H/.local/state" && date -Is > "$H/.local/state/fsd-setup.ok"

printf '\n\033[1;32m🎉 Pronto! A máquina %s está configurada.\033[0m\n' "$NOME"
cat <<'FIM'
   As pastas do Syncthing estão em "receive only": a matriz manda e nada daqui volta para ela.
   Quando esta for a máquina de trabalho (e a matriz estiver parada), rode:  fsd-sync-pair promote
   Para usar: claude  ·  fsd-agent <nome> claude (dentro do tmux)  ·  git e npm como sempre
FIM
EOF

COPY <<'EOF' /etc/supervisor/conf.d/fsd.conf
; Serviços do container fsd (no lugar do systemd). Logs em /var/log/fsd/. Estado: supervisorctl status
[program:tailscaled]
command=/usr/local/bin/fsd-svc tailscaled
priority=10
autorestart=true
stdout_logfile=/var/log/fsd/tailscaled.log
redirect_stderr=true

[program:syncthing]
command=/usr/local/bin/fsd-svc syncthing
user=fsd
environment=HOME="/home/fsd",USER="fsd",STNORESTART="1"
priority=20
autorestart=true
stdout_logfile=/var/log/fsd/syncthing.log
redirect_stderr=true

[program:fsd-tunnel]
command=/usr/local/bin/fsd-svc tunnel
user=fsd
environment=HOME="/home/fsd",USER="fsd"
priority=30
autorestart=true
stdout_logfile=/var/log/fsd/tunnel.log
redirect_stderr=true
EOF

# Arquivo editado no Windows (CRLF) quebra os scripts: tira o \r e garante a permissão de execução.
RUN cd /usr/local/bin && sed -i 's/\r$//' fsd-entrypoint fsd-svc fsd-links entrar fsd-setup /etc/supervisor/conf.d/fsd.conf \
 && chmod 755 fsd-entrypoint fsd-svc fsd-links entrar fsd-setup \
 && su fsd -c /usr/local/bin/fsd-links

# VS Code (extensão Dev Containers → "Attach to Running Container"): entra como o usuário, e não como root
# (senão os arquivos criados ficam com dono root), e abre direto na pasta do projeto.
LABEL devcontainer.metadata='[{"remoteUser":"fsd","workspaceFolder":"/media/fsd/Projects/projetos/fred-ships-donuts"}]'

VOLUME ["/home/fsd", "/media/fsd/Projects"]
ENTRYPOINT ["/usr/local/bin/fsd-entrypoint"]
