## fsd-map — mapa de código do repositório

Para entender como algo funciona, achar onde o código mora ou medir o alcance de uma
mudança, consulte o mapa antes de usar grep ou abrir arquivos. É barato: pergunte de novo
quando precisar e reaproveite identificadores literais que você já tem (símbolo, mensagem
de erro, nome de arquivo). Primeira vez no repo? `fsd-map map` dá a visão geral.

- `fsd-map ask "<pergunta>" --source`: trechos mais relevantes já com o código e o
  arquivo:linha (`--full` para a definição inteira). Para entender ou editar, o primeiro
  resultado costuma ser a resposta: edite a partir dele.
- `fsd-map grep "<literal>"`: todas as ocorrências, agrupadas pelo símbolo que as contém.
  Use quando precisar de todas (o `ask` traz só as melhores). Para arquivos fora do mapa,
  `grep -rn`.
- `fsd-map skeleton <arquivo>`: assinatura e linhas de cada definição, bem mais barato
  que ler o arquivo.
- `fsd-map callers <símbolo>`: quem chama; `--direction out` para o que ele chama;
  `--depth N` (ou `all`) para o alcance completo antes de renomear ou refatorar.
- `--in <pasta>/` restringe `ask`, `grep` e `callers` a uma parte do repo.

Se um trecho vier cortado ("+N more lines"), abra o arquivo exatamente naquele intervalo.
Abra fontes só quando o mapa não tiver o detalhe, e na linha que ele indica. O mapa se
atualiza sozinho a cada consulta; `fsd-map build` reconstrói. Cada checkout (worktree
incluído) tem o próprio mapa, fora do repositório.
