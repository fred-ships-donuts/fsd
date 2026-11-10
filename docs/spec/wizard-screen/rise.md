# Wizard screen: interface libraries

- Stage: Rise
- Owner: Architect
- Size limit: 60 lines (body, without this header block)
- Source: docs/spec/wizard-screen/flavor.md#acceptance — the layout the library must meet

## Feasible

None

## Risks

None

## Discarded alternatives

O assistente precisa de cabeçalho e rodapé presentes em todas as telas, barra de progresso, menu, seleção múltipla com "todas", voltar com `←`, temas com cores próprias. Dados verificados no registro do npm em 2026-10-31.

| Opção | Versão | Node | Modelo | Atende o layout | Pontos de atenção |
|---|---|---|---|---|---|
| **Ink** (escolhida) | 8.0.0 | >= 22 | Tela completa com componentes React e layout flexbox | Cabeçalho, corpo e rodapé fixos são naturais; `useInput` cobre as setas; temas e símbolos viram contexto React | Exige `react >= 19.3` como peer; 23 dependências; Node >= 22 |
| @opentui/core | 0.8.0 | >= 26.4 (ou Bun >= 1.3.14) | Núcleo de renderização em Zig | Atende, com bom desempenho | Pré-1.0 com lançamentos frequentes; restringe quem consegue rodar a CLI |
| @clack/core | 1.5.1 | >= 20.12 | Prompts de baixo nível com `render` customizável | Cabeçalho, rodapé e tema desenhados em cada `render`; `esc` e voltar à mão | Sem tela fixa nem layout |
| @inquirer/core | 12.0.6 | >= 20.17 | Prompts customizados com hooks e tema | Cabeçalho e rodapé via conteúdo extra do prompt; voltar é manual | Sem tela fixa; tema próprio, não de cores livres |
| terminal-kit | 3.1.4 | >= 16.13 | API imperativa de terminal | Atende com muito código manual de layout | Estilo antigo, pouco tipado para TypeScript |
| blessed / neo-blessed | 0.1.81 / 0.2.0 | — | Widgets de tela completa | Atenderia | Sem manutenção; descartada |
| enquirer | 2.4.1 | — | Prompts simples | Não atende | Sem manutenção desde 2023; descartada |
| Sem biblioteca (`node:readline` + ANSI) | — | qualquer | Renderização própria | Atende, com controle total | Todo o código de teclado, redesenho e largura de caracteres fica conosco |

O Ink cobre o layout pronto (tela completa, componentes, cabeçalho e rodapé fixos). O Claude Code também é construído sobre ele. O custo é o Node >= 22 e o React.

Fontes: registro do npm (`npm view`) para versões e `engines`; comparação Ink x OpenTUI em <https://blog.openreplay.com/opentui-alternative-ink/> e <https://betterstack.com/community/guides/scaling-nodejs/opentui-react/>.

## Open questions

None
