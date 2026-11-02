#!/usr/bin/env python3
"""Compara references/padroes/ da skill com docs/padroes-codigo/ de um projeto e lista o que divergiu.

Os arquivos da skill perdem o prefixo `padroes-codigo-` (`padroes-codigo.md` é `visao-geral.md`), inclusive nas
referências cruzadas dentro do texto. A comparação ignora o prefixo dessas referências: só conta o que mudou de conteúdo.
Uso: sincronia.py <pasta-docs-padroes-codigo-do-projeto>
Saída: uma linha por arquivo divergente, com a primeira linha que difere.
Código de saída: 0 em sincronia · 1 com divergência · 2 entrada inválida. Só biblioteca padrão. Não altera nada.
"""
import re
import sys
from pathlib import Path

NOMES = {
    "padroes-codigo.md": "visao-geral.md",
    "padroes-codigo-compilador-e-nomes.md": "compilador-e-nomes.md",
    "padroes-codigo-csharp.md": "csharp.md",
    "padroes-codigo-estilo.md": "estilo.md",
    "padroes-codigo-testes.md": "testes.md",
    "padroes-codigo-build.md": "build.md",
}

REFERENCIA = re.compile(r"padroes-codigo-([\w-]+\.md)")


def normalizar(texto, do_projeto):
    """No texto do projeto, tira o prefixo dos nomes de arquivo."""
    if do_projeto:
        texto = REFERENCIA.sub(r"\1", texto).replace("padroes-codigo.md", "visao-geral.md")
    return texto


def primeira_diferenca(a, b):
    for numero, (x, y) in enumerate(zip(a.split("\n"), b.split("\n")), start=1):
        if x != y:
            return numero
    return min(len(a.split("\n")), len(b.split("\n"))) + 1


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 1 or not Path(argv[0]).is_dir():
        print(__doc__, file=sys.stderr)
        return 2
    projeto = Path(argv[0])
    skill = Path(__file__).resolve().parent.parent / "references" / "padroes"
    divergencias = 0
    for nome_projeto, nome_skill in NOMES.items():
        a, b = projeto / nome_projeto, skill / nome_skill
        if not a.is_file():
            print(f"falta no projeto: {nome_projeto}")
        elif not b.is_file():
            print(f"falta na skill: {nome_skill}")
        else:
            texto_projeto = normalizar(a.read_text(encoding="utf-8"), True)
            texto_skill = normalizar(b.read_text(encoding="utf-8"), False)
            if texto_projeto == texto_skill:
                continue
            linha = primeira_diferenca(texto_projeto, texto_skill)
            print(f"diverge: {nome_projeto} x references/padroes/{nome_skill} (primeira diferença na linha {linha})")
        divergencias += 1
    print(f"{divergencias} divergência(s)")
    return 1 if divergencias else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
