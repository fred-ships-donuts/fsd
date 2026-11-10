# Interactive wizard

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 6.1 Estrutura de toda tela

```
┌─ cabeçalho ─────────────────────────────────────────────┐
│  <logotipo>                                             │
│  <nome da CLI>  v<versão>   <outros itens do cabeçalho> │
└─────────────────────────────────────────────────────────┘

  <título do passo>
  <conteúdo do passo: menu, lista, seleção ou resumo>

  [██████░░░░░░░░░░░░░░░░░░]  passo 3 de 7        <rodapé>
```

- **Cabeçalho**: na tela inicial, o emoji 🍩 em blocos de caractere e o nome `FRED` / `SHIPS` / `DONUTS` em letras de pixel, empilhados à direita da rosquinha, dentro de uma moldura que ocupa a largura da janela e no máximo 35% da altura (o conteúdo fica alinhado à esquerda). Tudo acompanha o tamanho da janela, com o 80 × 24 como tamanho de partida; as regras, os tamanhos e a origem das imagens estão em 6.10. Nos passos, o cabeçalho é uma moldura pequena (ou uma linha, em janela baixa) com o nome da CLI, a versão (a de `package.json`), o escopo e o passo atual. Sem cor, volta o logotipo de uma linha.
- **Corpo**: um passo por tela. O assistente ocupa o terminal inteiro (largura e altura, acompanhando redimensionamento) e roda na tela alternativa do terminal; ao sair, o terminal volta ao que era antes.
- **Rodapé**: barra de progresso (6.4) e a dica de teclas do passo (ex.: `↑↓ mover · espaço marcar · enter confirmar · ← voltar`).

### 6.2 Fluxos e passos

O menu (passo 0) escolhe o fluxo. Fora da contagem da barra. `Sair` encerra com 0.

| Menu | Efeito |
|---|---|
| `Instalar` | Fluxo de instalação (abaixo). Também atualiza as skills: uma skill registrada com versão menor que a do catálogo é instalada por cima. Não há item "Atualizar" no menu. |
| `Apagar` | Fluxo de remoção (6.8). |
| `Sair` | Encerra com 0. |

**Fluxo Instalar**

| # | Passo | Conteúdo | Observação |
|---|---|---|---|
| 1 | Escopo | Global (`~/.fsd/skills`) ou local (`./.fsd/skills`) | |
| 2 | Skills | `Selecionar todas` ou escolha individual | **Começa com todas marcadas.** Marcar ou desmarcar muda o total de passos (o idioma só entra se alguma escolhida tem mais de um idioma). Cada item mostra nome, versão, idiomas disponíveis e o estado no escopo (4.4). |
| 3 | Idioma | Idiomas das skills escolhidas | **Condicional**: só aparece se alguma skill escolhida tem mais de um idioma. |
| 4 | Conflitos | Para cada skill escolhida que tem uma de mesmo nome que não é nossa (regra 3), os caminhos em conflito e a escolha entre as três opções | **Condicional**: só aparece se houver conflito no escopo escolhido. |
| 5 | Atualização | Duas opções: atualizar a CLI ao abrir `fsd init` (`autoUpdate`) e fazer o `fsd update` atualizar também as skills (`updateSkills`) | Seção 7. |
| 6 | Tema | Donut (padrão), Morango, Chocolate ao leite, Granulado | O usuário escolhe as cores; a pré-visualização aparece na própria tela. |
| 7 | Resumo | Tudo que foi escolhido + confirmar e instalar | Último passo. Ao confirmar, cria a estrutura base (4.2), executa a instalação e mostra o resultado de cada skill. |

Regras da instalação, aplicadas ao confirmar o resumo:

1. "Já instalada" significa constar no `installed.json` do escopo. Se consta: com a versão do catálogo maior, instala por cima (`upgrade`); igual ou menor, `skip (up to date)`, sem erro.
2. Estado `missing` (consta no registro, pasta apagada à mão): reinstala e atualiza o registro.
3. Se já existe uma skill de mesmo nome que não é nossa, é um **conflito**: uma pasta em `.fsd/skills/<nome>` que não consta no registro, ou qualquer coisa em `.claude/skills/<nome>` que não seja o link para a nossa. O passo **Conflitos** (4) avisa de cada conflito, mostra os caminhos e pede uma escolha por conflito:
   - **Manter a original e pular a nossa** (`keep`, **padrão**): nada é alterado; resultado `skip` com aviso.
   - **Instalar a nossa e manter a original** (`unlinked`): a nossa é instalada em `.fsd/skills/<nome>` e registrada com `linked: false`, **sem** criar o link; o Claude Code continua carregando a original. O usuário liga a nossa depois com `fsd link skill <nome>` (5.4). Só existe quando a original está em `.claude/skills/<nome>`; se a original é uma pasta em `.fsd/skills/<nome>`, o caminho é o mesmo da nossa e restam `keep` e `replace`.
   - **Substituir a original pela nossa** (`replace`): a original é trocada pela nossa e o link é criado. A original só é apagada depois que a skill inteira deu certo (regra 9).
   O resumo mostra a escolha feita em cada conflito. Essas são as únicas checagens fora do registro, feitas no momento de gravar.
4. Instalar por cima remove a pasta registrada e copia de novo (substituição completa, sem merge, para não deixar arquivos órfãos).
5. Cria o diretório de destino se não existir. Preserva o bit de execução dos scripts (`scripts/*.py`).
6. Registra a skill em `.fsd/installed.json` do escopo (idioma, versão, caminho e datas). Nada é gravado dentro da pasta da skill. O registro é o último passo, gravado só depois da cópia e do link (quando há link) terem dado certo.
7. Skill com um único idioma pula o passo de idioma (3) e instala esse idioma. Sem conflito algum, o passo Conflitos (4) também é pulado.
8. A estrutura base (4.2) é criada pelo assistente na fase Preparar (6.9), depois da confirmação do resumo. `plan/install.ts` **não** a cria (só o destino da skill e o `installed.json`), para que `fsd update skill` nunca a crie.
9. **Tudo ou nada:** a execução depois da confirmação acontece em fases (6.9). Se qualquer fase falhar, a CLI desfaz tudo o que a tentativa fez e devolve o que deslocou, reporta `<ação> failed and was undone (<fase>: <motivo>)`, onde `<ação>` é `install`, `upgrade`, `remove` ou `enable` (a ação do plano; num plano misto vale a primeira que se aplica: install > upgrade > enable), e sai com exit 1. Se o desfazer também falhar, acrescenta `; undo failed (<motivo>); run fsd again to recover`.
10. **Interrupção antes de confirmar.** Enquanto o resumo não é confirmado, nada é gravado: `ctrl+c` em qualquer passo (inclusive na tela do resumo, antes do `enter`) sai com 130 e deixa o disco idêntico ao de antes (sem `nook/`, `.fsd/`, `.claude/` nem `config.json` novos). Uma instalação feita logo em seguida, no fluxo normal, termina sem erro e sem sobras: uma pasta por skill em `.fsd/skills`, um único link por skill em `.claude/skills` apontando para ela, uma entrada por skill no registro, sem arquivos temporários nem cópias duplicadas, e as demais execuções (`skip (up to date)`) não mudam nada.
11. **Interrupção durante a execução.** `ctrl+c` durante as fases desfaz a tentativa e sai com 130; se o processo morrer sem poder desfazer (kill, queda de energia), a próxima execução recupera pelo diário da execução, antes de qualquer outra coisa (6.9).

Navegação: `enter` avança, `←` (seta para a esquerda) volta ao passo anterior mantendo as escolhas, `ctrl+c` cancela sem escrever nada (exit 130). Nada é gravado em disco antes da confirmação no resumo.

Implementação: cada passo é um componente Ink em `.tsx`; `useInput` trata as teclas, e cabeçalho e rodapé são componentes comuns a todas as telas.

### 6.3 Resultado

Depois de confirmar o resumo, cada skill mostra uma linha de resultado (`install`, `upgrade`, `remove` ou `skip`, com versão, idioma e destino; o resultado de `unlinked` é `install` com a nota `original kept, not linked`), na paleta da CLI. A CLI termina com exit 0, ou 1 se houve falha de I/O. A confirmação do fluxo Instalar também grava as preferências (8.2).

### 6.6 Entrada sem terminal

O assistente nunca abre sem TTY (`fsd init`). Ver 5.1.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
