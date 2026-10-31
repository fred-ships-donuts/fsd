# Status, evidência e veredito

O checklist só vale se cada status carrega prova. Este guia define o que cada status exige, quem pode
mudá-lo e como o veredito sai. O veredito é calculado por `scripts/consolidar.py`: nenhum agent, nem a thread
principal, o escreve à mão.

## Os cinco status

| Status | Significa | Campos obrigatórios em `itens.json` |
|---|---|---|
| **OK** | O critério foi cumprido e **visto na tela** | `evidencia`: o caminho de navegação, o que foi feito e o que apareceu (valores medidos, textos exatos). `shot` quando houver captura |
| **OK (código)** | Cumprido, comprovado só pelo código, porque a tela não alcança o estado | `evidencia` com `arquivo:linha`, e `motivo`: o que foi tentado para provocar o estado e por que não deu |
| **N/A** | O item não se aplica à tela | `motivo`: a justificativa da coluna "N/A só quando" do checklist |
| **Falha** | O critério foi descumprido | `evidencia`: o que foi observado contra o esperado; `proximo_passo`; `origem` |
| **Não verificado** | Não foi possível observar | `motivo`: o que impediu, depois de 2 a 3 tentativas; `proximo_passo`: o que destrava |

Textos de `evidencia` e `motivo` com menos de 10 caracteres invalidam a consolidação. "OK" sem o que foi visto
não é evidência.

### Origem da falha

`origem` diz onde está a causa, para a pendência ir à pessoa certa:

- `implementacao`: o protótipo ou o PRD definem o comportamento e a implementação não o cumpre
- `prototipo`: o protótipo também não tem o comportamento (a falha é de design ou de produto, e a
  implementação fiel a ele ainda descumpre o checklist)
- `indefinida`: não foi possível decidir. Use só depois de conferir o documento do protótipo e o PRD

O checklist é obrigatório mesmo quando o protótipo não o cumpre. A origem não perdoa a falha: só a
encaminha.

### OK (código)

Aceito quando o estado não pode ser provocado de forma legítima: erro de regra de negócio sem como
simular a resposta, ação destrutiva fora de massa de teste, estado que só existe em outro ambiente. Antes de
usar, tente provocar (rota com resposta simulada, atraso, offline). Se o estado é alcançável, o status é OK ou
Falha, nunca OK (código). O auditor reabre os OK (código) em itens bloqueantes.

### N/A

A coluna "N/A só quando" do [checklist](checklist.md) é a única justificativa aceita. "Não vi", "não parece
necessário" e "o protótipo não tem" não são N/A: o primeiro é Não verificado, o segundo é OK ou Falha, o
terceiro é Falha com `origem: prototipo`. N/A em item bloqueante é sempre conferido pelo auditor.

### Não verificado

Não é saída para esforço: só para limite real de ferramenta ou ambiente (iframe de outra origem sem acesso ao
DOM, perfil sem credencial, estado que só o editor do protótipo provoca). Exige 2 a 3 tentativas
registradas. Em item bloqueante, impede a aprovação.

## Veredito

Calculado sobre os 66 itens, em ordem. O primeiro que casar vale:

| Veredito | Quando | Exit |
|---|---|---|
| **REPROVADO** | Qualquer item bloqueante com **Falha** | 1 |
| **NÃO CONCLUÍDO** | Nenhuma Falha bloqueante, mas algum bloqueante **Não verificado** | 1 |
| **APROVADO COM PENDÊNCIAS** | Nenhum bloqueante adverso; algum não bloqueante com Falha ou Não verificado | 0 |
| **APROVADO** | Nenhum item com Falha ou Não verificado | 0 |

Os 20 itens bloqueantes estão marcados **B** no [checklist](checklist.md). Falha não bloqueante não reprova,
mas entra nas pendências com o mesmo rigor, e a aprovação com pendências diz quais são.

**Aprovação é da implementação naquele momento.** Mudou o código, o ambiente ou o perfil depois da
inspeção: a aprovação não vale para a versão nova. A reinspeção ([SKILL.md](../SKILL.md#modo-reinspecionar))
refaz só os itens que não estavam OK e os que a mudança toca.

## A auditoria só piora

O `fsd-ui-auditor` reabre uma amostra dos status favoráveis e devolve, por item, um parecer:

| Parecer | Efeito na consolidação |
|---|---|
| `confirmado` | Nenhum: o status fica |
| `rebaixado` | O status vira **Falha** ou **Não verificado**, com a evidência do auditor |
| `insuficiente` | A evidência do inspetor não sustenta o status e o auditor não conseguiu provar o contrário: o status vira **Não verificado** |

A auditoria nunca promove um item: Falha não vira OK por parecer. Para melhorar um item, a implementação muda
e o item é reinspecionado.

## O que o relatório nunca faz

- Dar nota, percentual ou "quase aprovado". Há contagens e um veredito
- Reclassificar um item bloqueante para não bloqueante, ou o contrário
- Aprovar com item sem status. Os 66 são obrigatórios
- Contar N/A, OK (código) ou Não verificado como OK
