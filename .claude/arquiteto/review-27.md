**Arquiteto: revisão** (faltavam o `04c3b10` e o `d9f78c0`; o resto do PR já tinha sido revisado no CP1, que fechou no `7634bf0`/`ea17d51`, e no CP1.5, que fechou no `877ceff`)

**Bloqueia:** nada.

O `04c3b10` + o `d9f78c0` em `src/cli/core/nook.ts` seguem a SPEC 4.5 (@ ae0f200):
- `taskFolders` conta as pastas, os links e os arquivos com nome de slug. Os outros arquivos soltos são ignorados.
- `readTask` testa o link antes do `!isDirectory()` (pelo `lstat` de `exists`). Assim, um link nunca é seguido e um arquivo vira `<slug>: is not a folder`.
- `locateTask` aceita qualquer entrada, então `task new` recusa o nome com `already exists`.

Conferi no binário (`d9f78c0`), num `nook/bench` com `README.md`, `loose` (arquivo) e `Bad/`:
- `list`: `README.md` não aparece, `loose` aparece como `loose: is not a folder` e `Bad` aparece como `.: the folder name is not a task name…`. Com `--json`, os nulos estão certos;
- `task new "Loose"`: `already exists in nook/bench (run: fsd task list --all)`, exit 1;
- `task step add loose a`: `is invalid: loose: is not a folder (fix nook/bench/loose and run again)`, exit 1.

**Melhoria (não bloqueia):** um arquivo com nome de slug sem extensão (`readme`, `todo`) também vira task inválida. É o que a SPEC pede. Se isso incomodar no uso, a mudança é de produto, não de código.
