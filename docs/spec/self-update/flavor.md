# CLI self-update

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

"Atualização" aqui é a da **própria CLI**. A das skills é o `Instalar` do assistente e o `fsd update skill` (5.3).

Há dois gatilhos:

- **`fsd update`** (5.2): atualiza a CLI quando o usuário manda, sempre.
- **`fsd init`**: atualiza a CLI automaticamente antes de abrir o menu, se `autoUpdate` estiver ligado. Para não atualizar ao usar `fsd init`, o usuário desliga `autoUpdate` (passo 4 do assistente, 8.2).

Regras comuns:

- `autoUpdate: true | false` e `updateSkills: true | false` ficam na configuração (8.2). Padrões sugeridos no passo 4: `autoUpdate` ligado e `updateSkills` desligado.
- A CLI consulta o registro do npm pela última versão publicada de si mesma. Se houver versão maior que a instalada, atualiza.
- No auto-update (`fsd init`), a consulta é limitada: timeout curto (2 s), no máximo uma vez a cada 24 h (a hora da última checagem fica na configuração), e qualquer falha de rede é ignorada em silêncio. Nunca bloqueia nem quebra o assistente. A hora da checagem (`lastUpdateCheck`) **não é gravada na hora**: o `fsd init` a mantém em memória e a grava na fase Registrar junto com o `config.json`, se o usuário confirmar o Instalar, ou de imediato apenas se o `config.json` já existir. Assim o `fsd init` ao abrir nunca cria arquivo (4.2); se o usuário não confirmar nada em uma primeira execução, a próxima volta a consultar o npm. No `fsd update` explícito não há limite de 24 h, e a falha de rede é reportada com exit 1.
- Só atualiza quando a CLI está instalada globalmente (`npm i -g`). Rodando via `npx`, não faz nada, pois `npx -p fred-ships-donuts@latest fsd` já traz a versão nova.
- Com `autoUpdate` desligado, `fsd init` não consulta o registro. `fsd -v`, `fsd -h` e `fsd update skill` nunca consultam.
- Após atualizar no `fsd init`, a execução atual continua com a versão antiga e avisa que a nova vale a partir da próxima.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

### A1 12.15 Com `autoUpdate: false`, `fsd init` não faz nenhuma consulta de rede; `fsd update` continua atualizando a CLI.
### A2 12.33 `fsd init` ao abrir, com `autoUpdate` ligado e CLI instalada globalmente, não cria nenhum arquivo ou diretório.
