# Destinations, registry and state

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 4.1 Destinos das skills

| Escopo | Caminho | Quando |
|---|---|---|
| Global | `~/.fsd/skills/<nome>` | escolha "Global" no passo Escopo |
| Projeto | `<cwd>/.fsd/skills/<nome>` | escolha "Local" no passo Escopo |

Para o Claude Code enxergar a skill, a CLI cria um **link simbólico** `<raiz>/.claude/skills/<nome>` → `<raiz>/.fsd/skills/<nome>` (no Windows, junction). Se já existe uma skill de mesmo nome nesse caminho (e não é um link para a nossa), é um **conflito** (regra 3 da instalação). O `Apagar` remove o link só quando ele aponta para a skill registrada. **Falhar ao criar o link falha a instalação daquela skill e desfaz tudo o que a tentativa fez** (regra 9).

`~` é o `os.homedir()` (no Windows, `%USERPROFILE%`). `<cwd>` é o diretório de onde o comando foi executado; a CLI não procura a raiz do git.

### 4.2 Estrutura de diretórios da CLI

Segue `docs/FSD-ARCHITECTURE.md`. Em cada escopo há um diretório de sistema `.fsd/` e um workspace `nook/`, na raiz do escopo. As skills ficam dentro de `.fsd/`, em `.fsd/skills/`:

| Escopo | Raiz | Conteúdo |
|---|---|---|
| Global | `~` | `~/.fsd/` e `~/nook/` |
| Projeto | `<cwd>` | `<cwd>/.fsd/` e `<cwd>/nook/` |

| Diretório | Conteúdo |
|---|---|
| `.fsd/installed.json` | skills instaladas no escopo (4.3) |
| `~/.fsd/config.json` | preferências (8.2); só no escopo global |
| `.fsd/oven/`, `.fsd/cache/`, `.fsd/logs/` | sistema interno da CLI, criados vazios |
| `nook/kitchen/`, `nook/bakers/` | workspace do usuário, criados vazios |

**Estrutura base.** Ao confirmar o resumo do fluxo Instalar (como uma instalação de software qualquer), a CLI cria, no escopo escolhido e se ainda não existirem, `nook/kitchen/`, `nook/bakers/`, `.fsd/oven/`, `.fsd/cache/` e `.fsd/logs/`. Os demais diretórios de `nook/` (`bench/`, `cookbook/`, `rack/`, `fridge/`) não são criados. Cancelar não cria nada, e o fluxo Apagar não cria nem remove a estrutura. `fsd init` ao abrir não grava nada.

Os caminhos são calculados só a partir de `os.homedir()` e do `cwd`: a CLI não procura nem lê outros diretórios para decidir onde `.fsd/` e `nook/` ficam. No escopo de projeto, `.fsd/installed.json`, `.fsd/oven/` e `nook/` são versionáveis junto com o repositório, a critério do usuário.

**`.gitignore`.** No escopo de projeto, junto com a estrutura base (ao confirmar o fluxo Instalar), a CLI garante que `<cwd>/.gitignore` tenha as linhas `.fsd/cache/` e `.fsd/logs/`: acrescenta ao fim só as que faltam (comparação por linha exata, sem interpretar padrões) e cria o arquivo se ele não existir. Nada mais do arquivo é alterado, e uma segunda instalação não muda nada. O escopo global nunca toca em `.gitignore`. A gravação entra na fase Aplicar (6.9), com backup (gravação de texto, não de JSON), e é desfeita junto com o resto. Se o arquivo não termina em quebra de linha, uma quebra vem antes das linhas acrescentadas; o fim de linha existente (LF ou CRLF) é mantido; a comparação ignora espaços nas pontas e o BOM. A verificação do plano passa a aceitar esse caminho, que fica fora de `.fsd/` e de `nook/`.

Toda gravação em `.fsd/` é atômica (escreve em arquivo temporário e renomeia).

### 4.3 Registro `installed.json`

```json
{
  "schema": 1,
  "skills": {
    "fsd-csharp-code-standard": {
      "scope": "global",
      "lang": "pt-BR",
      "version": "1.0.0-alpha.2",
      "path": "/home/fulano/.fsd/skills/fsd-csharp-code-standard",
      "installedAt": "2026-10-31T12:00:00.000Z",
      "updatedAt": "2026-10-31T12:00:00.000Z"
    }
  }
}
```

Campo opcional `"linked": false`: a skill foi instalada em `.fsd/skills/<nome>` **sem** o link em `.claude/skills/<nome>`, porque lá já existe uma original que o usuário quis manter (6.2, regra 3). Ausente equivale a `true`.

**O registro é a fonte da verdade.** A CLI sabe o que instalou e onde olhando o `installed.json`, e não procurando em `.fsd/skills/`. O estado exibido nos passos de skills, a atualização e o `Apagar` nunca varrem o diretório do Claude: leem o registro e agem no `path` gravado (absoluto, definido na instalação).

### 4.4 Estado de uma skill

O estado vem da comparação entre a versão registrada e o `metadata.version` do catálogo, pela precedência do semver 2.0.0 (seção 11 da especificação em semver.org): `1.0.0-alpha.2 < 1.0.0-alpha.10 < 1.0.0-beta < 1.0.0`. O comparador é implementado em `skills.ts`, sem dependência extra; metadados de build (`+...`) são ignorados.

| Estado | Condição |
|---|---|
| `not installed` | não consta em `installed.json` |
| `up to date` | versão registrada >= catálogo |
| `outdated` | versão registrada < catálogo |
| `missing` | consta em `installed.json` mas a pasta do `path` gravado não existe mais (foi apagada à mão) |

`missing` é resolvido por `Instalar` (reinstala e atualiza o registro) ou por `Apagar` (só limpa a entrada). Se `installed.json` estiver ausente ou ilegível, o estado de todas as skills é `not installed`; nada é descoberto nem apagado no diretório do Claude.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
