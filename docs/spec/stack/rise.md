# Rise (TECH REVIEW)

- Stage: Rise
- Owner: Architect
- Size limit: 60 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal this stack serves

## Feasible

| Item | Decisão |
|---|---|
| Linguagem | TypeScript (ESM, `module: nodenext`, `strict`) |
| React com TSX | Componentes em arquivos `.tsx`; `jsx: react-jsx` no `tsconfig.json` (sem `import React` em cada arquivo); `@types/react` em dev |
| Execução em desenvolvimento | `tsx` (`npm run dev` roda `src/cli/fsd.ts` direto, sem compilar); o build de produção é `tsc` → `dist/` |
| Runtime | Node >= 22 (exigência do Ink 8) |
| Parser de CLI | `commander`: comandos `init`, `update` e `update skill`, ajuda gerada e erros de uso padronizados. A versão usa `-v` (não o `-V` padrão do commander) |
| Interface interativa | Ink 8 (React para terminal); ver apêndice A |
| Dependências de runtime | `commander`, `ink`, `react` (>= 19.3), `yaml` (>= 2.9, eemeli/yaml: frontmatter e passos das tasks, 4.5) |
| Binário | Um só: `fsd` → `dist/cli/fsd.js` |

## Risks

None

## Discarded alternatives

None

## Open questions

None
