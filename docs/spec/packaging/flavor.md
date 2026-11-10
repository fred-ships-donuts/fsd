# Packaging

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

- Nome do pacote npm: **`fred-ships-donuts`**.
- `package.json`: `bin` é `{ "fsd": "./dist/cli/fsd.js" }`, `files: ["dist", "src/skills"]`, `engines.node` é `>=22`.
- `ink` e `react` ficam em `dependencies`; `@types/react` e `tsx` em `devDependencies`. `commander` fica em `dependencies`; `@clack/prompts` sai.
- `tsconfig.json` com `jsx: react-jsx`; `tsc` compila os `.tsx` para `dist/`.
- `tsc` não copia `.md`/`.py`, por isso o catálogo é lido de `src/skills` e não de `dist`.
- `dist/cli/fsd.js` precisa do bit de execução e do shebang.
- Antes de publicar, conferir o conteúdo com `npm pack --dry-run`: precisa conter `dist/` e `src/skills/_i18n/`.
- O pacote se chama `fred-ships-donuts` e o comando é `fsd`. Como o nome do binário difere do nome do pacote, o `npx` não o escolhe sozinho: o uso é `npx -p fred-ships-donuts fsd init`.
- Distribuição por npm: `npx -p fred-ships-donuts fsd init` ou instalação global (`npm i -g fred-ships-donuts`); as versões novas chegam por `fsd update`, pelo auto-update do `fsd init` (7) ou reinstalando.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None
