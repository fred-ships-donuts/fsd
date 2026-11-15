**Arquiteto: passagem**

F-40a. Base: o corpo deste issue, as melhorias do CP2 e o motor em `feat/nook-tasks` @ `d9f78c0` (PR #27). Respondo, ponto por ponto, às dúvidas que o Stuart enviou por mensagem, porque o App dele não comenta em issue.

**Branch:** `feature/6-transaction-core`, criado da `origin/develop` **depois** do merge do #27. A ordem dos merges é #26 → #27. O PR volta para a `develop` com `Closes #6`. O comentário anterior (branch `6-transaction-core`, PR para a `main`, merge do autor) ficou superado.

**Regra que manda em tudo:** sem mudança visível nas skills. No CP3, comparo a `develop` (com o #27) com o PR, olhando o disco, os eventos de fase, as mensagens e os exit codes.

## Respostas (1 a 6)

**1. API: confirmada, com três ajustes.**
- **`Phase` genérico, não `string`:**
  - `runTransaction<P extends string, R>(spec: TransactionSpec<P, R>, options)`;
  - os eventos e o `RunOutcome` usam `'verify' | P | 'conclude'`;
  - o `Phase`, o `phases` e o `RunEvent` das skills ficam em `engine/run.ts` como hoje, porque o `ui/screens/Running.tsx:2` e o `ui/App.tsx:3` importam de lá. Assim, o `ui/` não muda.
- **`firstPhase: P` no spec.** Hoje o diário é aberto **dentro** da fase `prepare` (`engine/run.ts:76-83`): o `mkdir` dos ancestrais, o `tx.save()` e o `recoverRuns(self)`. O núcleo entra em `firstPhase` antes de abrir o diário. Assim, uma falha ao criar o `.fsd/cache/run-…` continua saindo como `prepare`, como hoje, e não como `verify`. Depois disso, o `work` recebe o `tx` já com o diário aberto e segue chamando `ctx.enter` para as fases seguintes.
- **`keepAncestors: boolean` no spec**, no lugar do cálculo `runAncestors.includes(paths.cache) && !plan.ensureBase` de `run.ts:80`, que é das skills:
  - para as skills, `keepAncestors = plan.ensureBase`;
  - para as tasks, `false`, e o `.fsd/` criado pela execução sai no fim;
  - o núcleo grava `cacheCreated = runAncestors.includes(cache) && !keepAncestors` exatamente como hoje.
- O "plano vazio não roda nada" (`run.ts:72`) fica no cliente: ele devolve `done` sem chamar o núcleo. O `verify(ctx)` roda **depois** do `recoverRuns(cache, warnings)`, dentro da fase `verify`, como hoje.

**2. Diário v2: confirmado.**
- A conversão do v1 fica em `core/runJournal.ts`, no lado da leitura. O `undo` fica no `engine/`.
- O undo do `restore` passa a copiar para um temporário e fazer `rename`. Aceito: o caminho feliz não muda, e uma morte no meio deixa de truncar o arquivo.
- O undo do `moved` usa só `rename` (sem o fallback `EXDEV` de `ops.ts:21-28`), pelo mesmo motivo da F-40b: uma cópia pela metade de uma pasta real não se desfaz bem. Então o `Ops` ganha `rename(from, to)`, e o `Transaction.relocate` usa esse `rename`.
- O `moveIn` continua sobre o `ops.move` de hoje, que é o `tx.move` de `run.ts:161`, com o `EXDEV` incluído.
- `deadRunPaths` (`core/runJournal.ts:61`): só os `path` de `created` e `createdDir`, sem `moved.to`. Concordo. No v1, as pastas do `ensureDirs` já estavam em `created`, então o resultado é o mesmo.

**3. `schema > 2`: `Stop('failed')`, sem desfazer e sem apagar.** Concordo com o seu argumento: só avisar deixaria uma execução nova gravar sobre caminhos que aquele diário ainda precisa devolver.
- Mensagem: `<runDir> was written by a newer fsd; update fsd or remove it by hand`, exit 1.
- Ordem no `recoverRuns`: primeiro o `liveRun` (busy), depois a varredura. Um diário desconhecido para a varredura **antes** de recuperar os outros, para nada ficar pela metade.
- O `readJournal` com JSON ilegível continua `undefined`, e o runDir é removido como hoje. Isso não muda.
- No `deadRunPaths`, um diário desconhecido não contribui.

**4. `writeTextFiles`: confirmado, com objeto.**
- Contrato: `tx.writeTextFiles(files: Array<{ path: string; content: string; expected?: string }>)`.
- Intercalar arquivo por arquivo pode. Para cada arquivo, a ordem é:
  1. copiar o original para `backup-<n>`, onde `n` é o índice da action;
  2. gravar a action `restore`;
  3. `ops.writeText(path, content, { expected })`.

  Um arquivo que não existe vira `restore` com `backup: null`.
- Uma morte entre a cópia e a action deixa só o `backup-<n>` órfão dentro do runDir, e ele sai junto com o runDir.
- O `FileChangedError` vira `Stop('changed', '<arquivo> changed while writing, try again')`, com undo.
- O `writeJsonFiles` vira um invólucro: `JSON.stringify(data, null, 2) + '\n'` e nenhum `expected`. Os bytes têm que ser os mesmos do `writeJsonAtomic` de hoje.
- O `ops.writeJson` fica só para o diário.

**5. Verificar por cliente: confirmado.** O `verifyPlan` (`engine/verify.ts`) vira o `verify` do cliente das skills, sem mudar. O núcleo não confere caminhos.

**6. Mensagem: o label existe, mas as skills continuam com `install`.**
- O núcleo monta `${label} failed and was undone (${phase}: ${motivo})`.
- O cliente das skills passa `label: 'install'` para **todo** plano, inclusive o de apagar e o de ligar. Hoje o texto é fixo (`run.ts:130`), e o issue pede "sem mudar o comportamento". Um plano do assistente também pode misturar instalar e apagar, e aí `remove` ou `link` nem teriam um valor único.
- Trocar o texto nas skills é uma mudança visível. Proponho ao Kevin um issue de backlog para isso, e ela fica fora desta task.
- O cliente das tasks (F-40b) usa `task <t> was not moved`.

## Arquivos

- `src/cli/engine/transactionRun.ts` (novo): trava, `recoverRuns`, diário, sinais, `step`, commit, Concluir, undo e eventos `verify`/`conclude`.
- `src/cli/engine/run.ts`: fica como cliente das skills (`stage`, `applyItem`, `register`, `verifyPlan`), mantendo `Phase`, `phases` e `RunEvent`.
- `src/cli/engine/transaction.ts`: lista ordenada, `moveIn`, `relocate`, `createdDir`, `writeTextFiles` e `writeJsonFiles` como invólucro.
- `src/cli/engine/recovery.ts`: `undo` sobre `actions` de trás para frente, com o `restore` por temporário + `rename` e o `schema > 2`.
- `src/cli/engine/ops.ts`: `writeText` e `rename`.
- `src/cli/core/runJournal.ts`: o tipo v2, a conversão do v1, `readJournal` com a união e `deadRunPaths`.
- `src/cli/core/fs.ts`: só se faltar algo. `writeTextAtomic` e `updateTextFile` já existem desde a F-37.
- `docs/ARQUITETURA.md`: a linha do `engine/` com o núcleo e os clientes.

## Riscos

- **Undo idempotente:** a recuperação pode rodar duas vezes. Cada undo confere o estado antes de agir: o `created` faz `rm -rf force`, o `createdDir` faz `rmdir` só se a pasta estiver vazia, o `displaced` age só se o backup existe, o `moved` só se `to` existe e `from` não, e o `restore` age só se o backup existe.
- **Ancestrais do runDir:** o undo continua ignorando os caminhos de `runAncestors` e do `runDir`, como em `recovery.ts:32-35`. Isso vale também para o `createdDir`.
- **v1 em disco de uma execução morta com a versão antiga:** percorrida ao contrário, a conversão `[...restore, ...displaced, ...created]` tem que dar o mesmo resultado do `undo` de `recovery.ts:31-48`.
- **Sinais:** `process.on`/`off` de SIGINT/SIGTERM em volta de tudo, como hoje. Um `cancelled` depois do commit não desfaz nada.
- **Mensagem do undo que falhou:** `; undo failed (…); run fsd again to recover`, igual à de hoje.

## Corte em dois PRs (opção 1 da pergunta do Kevin, se o autor escolher)

Tecnicamente, o corte funciona, com um ajuste: **tudo o que define o formato do diário fica no PR (a)**. O `schema: 2` tem que nascer completo, para que nenhum diário em disco mude de formato entre os dois PRs.

- **PR (a), núcleo e formato:** pontos 1, 2, 3, 5 e 6.
  - `transactionRun`, o diário v2 com a conversão do v1, `moveIn`, `relocate`, o registro por cliente e o `label`;
  - **o `createdDir` também**: é um tipo de action do v2 (tipo, undo com `rmdir` só se vazia, `deadRunPaths`). Para as skills, o resultado é o mesmo de hoje, porque o undo de trás para frente esvazia a pasta antes;
  - **a guarda do `schema > 2` também**: ela é o que torna seguro subir o `schema`, e são poucas linhas no `recoverRuns`;
  - o `writeJsonFiles` continua com o caminho de gravação de hoje, gravando `restore` no formato v2.
- **PR (b), caminho de gravação de texto:** o ponto 4 e o undo do `restore`.
  - `tx.writeTextFiles` com a cópia para `backup-<n>` **antes** da action `restore`;
  - `expected` no `writeTextAtomic` e o `FileChangedError` virando `Stop('changed', …)`;
  - o undo do `restore` por temporário + `rename`;
  - o `writeJsonFiles` vira o invólucro do `writeTextFiles`, com os mesmos bytes.
- **Ordem:** (a) → (b) → F-40b. A F-40b só começa com o (b) mesclado, porque é ela que move pastas reais.
- **Branches:** `feature/6-transaction-core` para o (a) e `feature/6-text-writes` para o (b), os dois a partir da `origin/develop`. Só o (b) leva `Closes #6`; o (a) usa `Refs #6`.
- **CP3:** a prova de equivalência completa roda no (a). No (b), refaço os mesmos cenários e acrescento a falha injetada entre a cópia do backup e a gravação.

Se o autor ficar com a opção 3, vale a passagem acima num PR só, sem mudança.

## Fora do escopo

`fsd task done|archive` (F-40b, #7), o `.gitignore` (F-42) e a troca do texto `install failed` nas skills.

## Verificação

O aceite do issue e a prova de equivalência do CP3.
- **Aceite:**
  - instalar, fazer upgrade, apagar e ligar skills como antes;
  - uma falha injetada no install desfaz tudo;
  - uma morte entre a cópia do backup e a gravação deixa o original intacto;
  - um diário v1 escrito à mão é recuperado;
  - um diário com `schema: 3` fica intacto, com exit 1 e a mensagem do ponto 3.
- **Prova de equivalência (CP3), feita por mim com um script descartável fora do repositório:**
  - os mesmos cenários rodam nos dois códigos, com `HOME` e projeto temporários;
  - comparo o `find … -exec sha256sum`, o `installed.json` sem os carimbos de data, a sequência de `RunEvent`, o `RunOutcome` e o exit code;
  - as falhas são injetadas por `ops` em cada operação de cada fase.

  O PR relata o que rodou e o que saiu.

Pronto → Waiting for Development.
