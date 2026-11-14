# fsd em container: passo a passo

Este tutorial monta o ambiente do fsd (Claude, git, Node, agentes) dentro de um **container Docker**, em **Windows, Mac ou Linux**. O resultado é igual à matriz.

⏱️ São uns **30 minutos** na primeira vez. Depois, é só ligar e usar.

**Você vai precisar de:**
- a sua conta do **GitHub**, da **Tailscale** e do **Claude**;
- a **senha dos segredos** (a do `secrets.tar.age`);
- o arquivo **`team.env`** da sua instalação (IP da matriz, ID do Syncthing, endereço do cofre privado). Ele mora no cofre privado, ao lado do `secrets.tar.age`. O modelo, com os campos, é o `team/setup/team.env.example`;
- acesso à **matriz** por uns 2 minutos, para colar um comando nela;
- a matriz **ligada**.

> **Como usar os comandos:** copie uma linha, cole no terminal e aperte **Enter**. Espere terminar antes da próxima.

---

## 1. Instalar o Docker

**Windows**
1. Baixe o **Docker Desktop** em [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) e instale. Deixe marcada a opção **WSL 2**.
2. Reinicie o computador.
3. Abra o Docker Desktop e espere a baleia 🐳 parar de se mexer, perto do relógio.
4. O seu terminal é o **Terminal** ou o **PowerShell**: aperte ⊞ e digite o nome.

**Mac**
1. Veja o tipo do seu Mac em  → **Sobre este Mac**: **Apple M1/M2/M3/M4** ou **Intel**.
2. Baixe a versão certa do **Docker Desktop** no mesmo link e arraste-a para **Aplicativos**.
3. Abra o Docker e espere a baleia 🐳 parar de se mexer, na barra de cima.
4. O seu terminal é o **Terminal**: aperte ⌘ + Espaço e digite "Terminal".

**Linux** (no Terminal, que abre com Ctrl + Alt + T)
```
curl -fsSL https://get.docker.com | sudo sh
```
```
sudo usermod -aG docker $USER
```
Depois, saia da sua conta e entre de novo.

**Teste:** `docker run --rm hello-world` tem de mostrar **"Hello from Docker!"**.

> No Windows e no Mac, o Docker Desktop tem de estar **aberto** sempre que você usar o container, mesmo pelo terminal.

---

## 2. Baixar o Dockerfile

1. Crie uma pasta vazia chamada **`fsd`**: em **Documentos** no Windows, ou na pasta pessoal no Mac e no Linux.
2. No GitHub, abra `fred-ships-donuts/fsd` e depois o arquivo `team/setup/container/Dockerfile`.
3. Clique em **⬇ Download raw file** e salve na pasta `fsd`. O nome tem de ser exatamente **`Dockerfile`**, sem `.txt`.
4. Ponha na mesma pasta o seu **`team.env`**. O nome tem de ser exatamente `team.env`.

---

## 3. Criar o container

No terminal, entre na pasta:

- Windows: `cd $HOME\Documents\fsd`
- Mac e Linux: `cd ~/fsd`

**Construa a imagem.** Leva uns 5 minutos. Não esqueça o **ponto** no final:
```
docker build -t fsd .
```

**Crie o container.** Troque `fsd-notebook` por um nome seu, sempre começando com `fsd-`:
```
docker run -d --name fsd --hostname fsd-notebook --env-file team.env --restart unless-stopped --cap-add NET_ADMIN --device /dev/net/tun -v fsd-home:/home/fsd -v fsd-projects:/media/fsd/Projects fsd
```

> Deu erro com `/dev/net/tun`? Rode `docker rm -f fsd` e repita o comando **sem** `--cap-add NET_ADMIN --device /dev/net/tun`.

---

## 4. Configurar (uma vez só)

**Entre no container:**
```
docker exec -it fsd entrar
```
Pelo Docker Desktop, também dá: **Containers → fsd → aba Exec**. Lá, digite `entrar`.

**Rode o assistente:**
```
fsd-setup
```

Ele faz quase tudo sozinho. Quando aparecer o **👉 amarelo**, é a sua vez:

| Etapa | O que fazer |
|---|---|
| **1. Tailscale** | Abra o link que aparecer, entre com a **mesma conta da matriz** e clique em **Connect**. |
| **2. GitHub** | Abra o link, cole o código de 8 letras e clique em **Authorize**. |
| **4. Segredos** | Digite a senha. As letras não aparecem enquanto você digita, e isso é normal. |
| **5. Matriz** | Copie a linha `fsd-aceitar …`, cole num terminal **da matriz** e aperte Enter. (Na matriz, o comando existe em `~/.local/bin`. Se não achar, rode `ln -sfn <repo>/team/bin/fsd-aceitar ~/.local/bin/`.) |
| **7. Claude** | Aperte Enter. O Claude abre. Digite `/login`, siga o link e, no fim, digite `/exit`. |

Termina com **🎉 Pronto!**.

> Deu erro ou fechou sem querer? Rode `fsd-setup` de novo. Ele continua de onde parou.

> **Copiar e colar no terminal:**
> - Windows: selecione o texto e aperte Ctrl+C. Para colar, Ctrl+V ou botão direito.
> - Mac: ⌘+C e ⌘+V.
> - Linux: Ctrl+Shift+C e Ctrl+Shift+V.
>
> Ctrl+C **sem** texto selecionado interrompe o comando que está rodando.

---

## 5. Abrir o código no VS Code

**Uma vez só:** instale o [VS Code](https://code.visualstudio.com/) e, na aba **Extensões**, a extensão **Dev Containers**, da Microsoft.

**Para abrir:**
1. Aperte **F1** e escolha **Dev Containers: Attach to Running Container…**.
2. Escolha **/fsd**.
3. A janela abre direto no código. O terminal dela, em **Terminal → New Terminal**, já está dentro do container.

**Da próxima vez:** use **File → Open Recent**.

> Abriu numa pasta vazia? Use **File → Open Folder…** e digite `/media/fsd/Projects/projetos/fred-ships-donuts`.

---

## Dia a dia

| Quero… | Faço… |
|---|---|
| **Começar** | Abra o Docker Desktop (Windows e Mac). Rode `docker start fsd` e abra o VS Code. |
| **Trabalhar** | No terminal do VS Code: `claude`, `git`, `npm` e `fsd-agent <nome> claude` (dentro do `tmux`). |
| **Parar** | Rode `git push`. Espere `fsd-sync-pair status` mostrar `falta receber 0`. Depois, `docker stop fsd`. |

**Usar esta máquina no lugar da matriz:** no começo, o container só **recebe** as configurações da matriz. Quando for trabalhar nele, e **só com a matriz parada**, rode `fsd-sync-pair promote`.

> ✋ Uma máquina por vez: nunca use o Claude no container e na matriz ao mesmo tempo.

---

## Problemas comuns

| Mensagem | Solução |
|---|---|
| `Cannot connect to the Docker daemon` | O Docker Desktop está fechado. Abra e espere a baleia. No Linux: `sudo systemctl start docker`. |
| `permission denied` (Linux) | Saia da sua conta e entre de novo, depois do `usermod` (passo 1). |
| O build fala em `buildx` ou `heredoc` (Linux) | Rode `sudo apt install docker-buildx`. |
| `container name "/fsd" is already in use` | O container já existe: use `docker start fsd`. |
| `defina FSD_MATRIZ no team.env` | O container foi criado sem `--env-file team.env`. Rode `docker rm -f fsd` e repita o comando do passo 3 na pasta onde está o `team.env`. |
| O passo 1 não alcança a matriz | A matriz está desligada ou fora da Tailscale, ou você entrou com outra conta da Tailscale. |
| O passo 5 fica nos pontinhos `....` | A linha `fsd-aceitar` não foi colada na matriz, ou deu erro lá. |
| Ver os logs dos serviços | `docker exec fsd tail -20 /var/log/fsd/tunnel.log`. Os outros são `syncthing.log` e `tailscaled.log`. |

---

## Apagar o container

⚠️ Isto apaga **tudo** o que está nele:
```
docker rm -f fsd
```
```
docker volume rm fsd-home fsd-projects
```

Na matriz, apague também as três coisas com o nome do container (ex.: `fsd-notebook`):
- a linha no `~/.ssh/authorized_keys`;
- o dispositivo no Syncthing;
- a máquina no painel da Tailscale.

**Computador perdido ou roubado:** faça isso **na hora** e troque todos os segredos do cofre privado (chaves dos GitHub Apps, tokens do ai-memory e do Claude).

> **Atalho:** os dois computadores são do mesmo tipo (Intel/AMD com Intel/AMD, ou Apple M com Apple M)? Então dá para copiar a imagem pronta em vez de construir: `docker save fsd -o fsd.tar` num, `docker load -i fsd.tar` no outro. Depois, siga do "Crie o container" em diante.
