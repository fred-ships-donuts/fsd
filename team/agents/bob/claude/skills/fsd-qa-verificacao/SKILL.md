---
name: fsd-qa-verificacao
description: Verificar um PR do fsd rodando o app real contra o aceite do issue. Use quando fsd-pr --todo mostrar PR ou alguém pedir verificação.
---

# Verificação de QA: roteiro fechado
Copie os comandos. Não improvise. Na dúvida, o item é FAIL.

Todo PR que fecha issue passa por este roteiro, inclusive o que só muda documentação. Não há outro jeito de aprovar.

1. `fsd-qa prep <N>` → mostra os itens de aceite numerados (1, 2, 3…) e abre o terminal de teste.
   - `JÁ VERIFICADO` → vá ao passo 6. Não procure outro jeito de verificar de novo. A única exceção é `FSD_QA_REDO=<N> fsd-qa prep <N>`, e só quando o próprio autor escrever `FSD_QA_REDO` no PR (team.md, "Impasse total").
   - `BUILD FALHOU` → `fsd-qa finish` e vá ao passo 6.
   - Outra mensagem → faça o que ela diz.
2. Para **cada** item k: `fsd-qa run <k> "<comando do item k>"` → mostra a saída e `EXIT=n`.
   - Nunca escreva `echo $?`, nem quando o aceite pede: o `EXIT=n` já é o `$?` do comando. Numa tela interativa, ele aparece no `fsd-qa key` que a fecha. O `fsd-qa` recusa comando com `$?`.
   - Comando com aspas, `$` ou várias linhas: `fsd-qa run <k> - <<'X'` + o comando + `X`.
   - Item com mais de um comando: repita `fsd-qa run <k> …` com o mesmo k.
   - Depois de uma tela interativa, pode seguir para o próximo `run`: ele fecha a anterior sozinho.
   - `TELA INTERATIVA` → `fsd-qa key Down`, `fsd-qa key Enter`, `fsd-qa key Escape`… até o resultado. Texto literal: `fsd-qa key --text "<texto>"`.
   - Item sem comando ("a tela mostra X") → `fsd-qa run <k> "fsd"` e confira a tela.
   - Item de documentação ("o arquivo X descreve Y") → `fsd-qa run <k> "grep -n '<termo>' <arquivo>"` ou `fsd-qa run <k> "sed -n 'A,Bp' <arquivo>"` e confira o texto. Dá para rodar: não é FAIL por "não dá para rodar".
   - Não confira a arte da rosquinha nem o cabeçalho.
3. PASS só se a saída e o código de saída forem exatamente os do aceite.
   - Falhou: `fsd-qa verdict <k> FAIL "<o esperado, em inglês>"`. O 1º FAIL de um item fica guardado, mas ainda não vale: o `fsd-qa` pede para repetir o item **do zero** (com o preparo dele). Repita e marque de novo. Se falhar outra vez, o FAIL está confirmado. Se passar, marque PASS, e o relatório mostra que o resultado oscilou.
   - Item que não dá para rodar ou ambíguo: `fsd-qa verdict <k> FAIL "<motivo, em inglês>"` e `fsd-notify kevin "item <k> do PR <N>: <dúvida>"`.
   - No fim, os que passaram com `EXIT=0`: `fsd-qa verdict --all-pass` (ele avisa os que não marcou; decida cada um com `verdict <k>`).
4. Bug que **não** é do aceite deste PR: `fsd-qa bug "<what fails, in English>" "<what was expected>" <k>` (não bloqueia o PR).
5. `fsd-qa finish` → publica o relatório (approve se tudo PASS, senão request-changes), move o card, avisa e limpa. Se disser `itens sem veredito`, rode esses itens (passo 2) ou marque FAIL com o motivo (passo 3) e repita.
6. Fim de tarefa: `fsd-restart`.

Depois de cada verificação: `fsd-restart`. Sessão nova sem PR para verificar: avise o Kevin (`fsd-notify kevin "parado: …"`), depois `Monitor` com `fsd-wait any` e comece no passo 1 com o número que ele mostrar.
