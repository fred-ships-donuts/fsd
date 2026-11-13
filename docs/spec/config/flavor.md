# Persisted configuration

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 8.2 Configuração persistida

As preferências do assistente ficam em `~/.fsd/config.json`. É uma configuração do usuário: **não existe `config.json` no escopo de projeto**.

```json
{
  "schema": 1,
  "theme": "donut",
  "autoUpdate": true,
  "updateSkills": false,
  "lastUpdateCheck": "2026-10-31T12:00:00.000Z"
}
```

- Escopo e seleção de skills **não** são persistidos; só tema, `autoUpdate` e `updateSkills` (mais o `lastUpdateCheck`).
- O arquivo é lido ao abrir a CLI: o tema gravado vale já no cabeçalho e no menu, e os passos Atualização e Tema vêm pré-selecionados com os valores gravados.
- É gravado só quando o usuário confirma o resumo do fluxo Instalar, junto com a instalação. Cancelar e o fluxo Apagar não gravam nada.
- Arquivo ausente, ilegível ou com `schema` desconhecido: a CLI usa os padrões, sem erro, e o sobrescreve na próxima confirmação.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None
