# SPEC migration map

Where each heading of the old `SPEC.md` goes (#41). Old numbering stays in the first column: code and docs cite "SPEC 5.5", "4.5", "6.9", and this map is how those references resolve. Do not rewrite those citations.

State: `moved` (in this repository now), `pending #55` (§6–§8), `pending #56` (§9–§13 and Appendix A), `decision` (becomes an author decision; none so far).

Notes:
- Moved text is verbatim, in Portuguese, under the template's English headings. The `## N.` heading lines of §1–§5 are replaced by the destination heading; the `### N.M` headings are kept inside `## Behavior`.
- Each moved Flavor has `Acceptance` = `None`: the criteria stay in SPEC §12 until #56.
- "Fora de escopo (v1)" is the Craving's `## Out of scope`; §1 is its `## Expected result`; §2 is the Rise's `## Feasible`.
- No destination exceeded its limit, so no slug was split.
- A `# Login OAuth` line inside a fenced example in §4.5 is not a heading and is not listed.

| Old heading | Destination | State |
|---|---|---|
| 1. Objetivo | `docs/spec/product/craving.md#expected-result` | moved |
| Fora de escopo (v1) | `docs/spec/product/craving.md#out-of-scope` | moved |
| 2. Stack | `docs/spec/stack/rise.md#feasible` | moved |
| 3. Catálogo de skills | `docs/spec/catalog/flavor.md#behavior` | moved |
| 4. Destinos, registro e estado | `docs/spec/state/flavor.md#behavior` | moved |
| 4.1 Destinos das skills | `docs/spec/state/flavor.md#41-destinos-das-skills` | moved |
| 4.2 Estrutura de diretórios da CLI | `docs/spec/state/flavor.md#42-estrutura-de-diretórios-da-cli` | moved |
| 4.3 Registro `installed.json` | `docs/spec/state/flavor.md#43-registro-installedjson` | moved |
| 4.4 Estado de uma skill | `docs/spec/state/flavor.md#44-estado-de-uma-skill` | moved |
| 4.5 Tasks no `nook/` | `docs/spec/task-files/flavor.md#45-tasks-no-nook` | moved |
| 5. Comandos | `docs/spec/commands/flavor.md#behavior` | moved |
| 5.1 `fsd init` | `docs/spec/init/flavor.md#51-fsd-init` | moved |
| 5.2 `fsd update` | `docs/spec/update/flavor.md#52-fsd-update` | moved |
| 5.3 `fsd update skill [nome]` | `docs/spec/update/flavor.md#53-fsd-update-skill-nome` | moved |
| 5.4 `fsd link skill [nome]` | `docs/spec/link/flavor.md#54-fsd-link-skill-nome` | moved |
| 5.5 `fsd task` | `docs/spec/task/flavor.md#55-fsd-task` | moved |
| 6. Assistente interativo | TBD (#55) | pending #55 |
| 6.1 Estrutura de toda tela | TBD (#55) | pending #55 |
| 6.2 Fluxos e passos | TBD (#55) | pending #55 |
| 6.3 Resultado | TBD (#55) | pending #55 |
| 6.4 Barra de progresso do rodapé | TBD (#55) | pending #55 |
| 6.5 Temas | TBD (#55) | pending #55 |
| 6.6 Entrada sem terminal | TBD (#55) | pending #55 |
| 6.7 Pendências do layout | TBD (#55) | pending #55 |
| 6.8 Fluxo Apagar | TBD (#55) | pending #55 |
| 6.9 Execução depois da confirmação (fases) | TBD (#55) | pending #55 |
| 6.10 A rosquinha e o nome no cabeçalho | TBD (#55) | pending #55 |
| 6.11 Redesenho e janelas pequenas | TBD (#55) | pending #55 |
| 6.12 O cabeçalho definitivo (2026-11-07) | TBD (#55) | pending #55 |
| 7. Atualização da CLI | TBD (#55) | pending #55 |
| 8. Erros, saída e configuração | TBD (#55) | pending #55 |
| 8.1 Erros e códigos de saída | TBD (#55) | pending #55 |
| 8.2 Configuração persistida | TBD (#55) | pending #55 |
| 9. Estrutura do código | TBD (#56) | pending #56 |
| 10. Empacotamento | TBD (#56) | pending #56 |
| 11. Testes | TBD (#56) | pending #56 |
| 12. Critérios de aceitação | TBD (#56) | pending #56 |
| 13. Decisões e pendências | TBD (#56) | pending #56 |
| Apêndice A — Bibliotecas de interface avaliadas | TBD (#56) | pending #56 |
