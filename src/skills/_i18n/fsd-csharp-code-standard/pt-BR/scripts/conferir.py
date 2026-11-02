#!/usr/bin/env python3
"""Confere em arquivos .cs as regras de codificação que o analisador do build não pega.

Cobre: comentário `//` e `/* */`, TODO/FIXME/HACK, `!` (null-forgiving), `#pragma warning disable`, `.Result`,
`.Wait()`, `async void`, `DateTime.Now`/`UtcNow` e `DateTimeOffset.Now`, linha acima de 120 colunas, log com
interpolação, `Result` sem tipo genérico, status escolhido por quem instancia o Result<T>, DataAnnotations, `HandleAsync` sem `Invalid` na primeira linha, `== null`/`!= null`, método assíncrono sem sufixo `Async`.
A varredura é por regex sobre o texto sem o conteúdo de strings: pode haver falso positivo, e quem revisa confirma.

Uso: conferir.py <arquivo-ou-pasta> [...]
Saída: uma linha `arquivo:linha: regra -> forma correta` por desvio; no fim, o total.
Código de saída: 0 sem desvios · 1 com desvios · 2 entrada inválida.
Só biblioteca padrão.
"""
import re
import sys
from pathlib import Path

MAX_COLUNAS = 120
PASTAS_IGNORADAS = {"bin", "obj", ".git", "node_modules", "Migrations"}

REGRAS = [
    ("comentario-barra", re.compile(r"//(?!/)"), "comentário `//` proibido: só comentário XML (`///`)"),
    ("comentario-bloco", re.compile(r"/\*"), "comentário `/* */` proibido: só comentário XML (`///`)"),
    ("pendencia", re.compile(r"\b(TODO|FIXME|HACK)\b"), "sem TODO/FIXME/HACK no código"),
    ("null-forgiving", re.compile(r"[\w)\]]!(?=[.;,)\]\s])"), "sem `!`: trate o nulo (`is not { } x`, `ThrowIfNull`)"),
    ("pragma", re.compile(r"#pragma\s+warning\s+disable"), "sem `#pragma warning disable`: corrija o código"),
    ("result-bloqueante", re.compile(r"\.Result\b(?!\s*[<(])"), "sem `.Result`: use `await`"),
    ("wait-bloqueante", re.compile(r"\.Wait\s*\("), "sem `.Wait()`: use `await`"),
    ("async-void", re.compile(r"\basync\s+void\b"), "sem `async void`: devolva `Task`"),
    ("data-hora", re.compile(r"\b(DateTime|DateTimeOffset)\.(Now|UtcNow)\b"), "use `TimeProvider` (`GetUtcNow()`)"),
    ("result-nao-generico", re.compile(r"\bnew\s+Result\s*\(|Task<Result>"), "use `Result<T>` (`new Result<T>(...)`, `Task<Result<T>>`)"),
    (
        "result-status-escolhido",
        re.compile(r"\bResult(<\w+>)?\.(NotFound|Validacao|Ok|Created|BadRequest)\b|new\s+Result<\w+>\(\s*HttpStatusCode"),
        "o status é do construtor do `Result<T>`; quem instancia não o escolhe",
    ),
    (
        "data-annotations",
        re.compile(r"System\.ComponentModel\.DataAnnotations|\[(property:\s*)?(AllowedValues|Range|Required|StringLength|MaxLength|MinLength|RegularExpression)\b"),
        "valide no construtor do `Query`/`Command` com notificações do Flunt, sem DataAnnotations",
    ),
    (
        "comparacao-com-null",
        re.compile(r"[!=]=\s*null\b"),
        "use `is null`/`is not null` (em árvore de expressão, como o `It.Is` do Moq, use outra forma sem padrão)",
    ),
]

ASYNC_SEM_SUFIXO = re.compile(r"\basync\s+(?:Task|ValueTask)(?:<.*?>)?\s+(\w+)\s*\(")
NOMES_IMPOSTOS = {"Process", "Main"}

LOG_INTERPOLADO = re.compile(r"\bLog(Trace|Debug|Information|Warning|Error|Critical)\s*\((?:[^;]*?,\s*)?\$@?\"")


def limpar(texto):
    """Esvazia o conteúdo de strings, chars e comentários XML, preservando colunas e quebras de linha."""
    saida, i, n = [], 0, len(texto)
    while i < n:
        if texto.startswith("///", i):
            fim = texto.find("\n", i)
            fim = n if fim < 0 else fim
            saida.append(" " * (fim - i))
            i = fim
        elif texto[i] in "\"'":
            aspa = texto[i]
            if texto.startswith('"""', i):
                fim = texto.find('"""', i + 3)
                fim = n if fim < 0 else fim + 3
                saida.append("".join("\n" if x == "\n" else " " for x in texto[i:fim]))
                i = fim
                continue
            verbatim = aspa == '"' and i > 0 and texto[i - 1] == "@"
            j = i + 1
            while j < n:
                if texto[j] == "\\" and not verbatim:
                    j += 2
                    continue
                if texto[j] == aspa:
                    if verbatim and texto.startswith(aspa * 2, j):
                        j += 2
                        continue
                    break
                if texto[j] == "\n":
                    break
                j += 1
            miolo = "".join("\n" if x == "\n" else " " for x in texto[i + 1:j])
            saida.append(aspa + miolo + (aspa if j < n and texto[j] == aspa else ""))
            i = j + 1
        else:
            saida.append(texto[i])
            i += 1
    return "".join(saida)


HANDLER = re.compile(r"Handler\.cs$")
PRIMEIRA_INSTRUCAO_INVALID = re.compile(r"\s*\{\s*if\s*\(\s*\w+\.Invalid\s*\)")


def handle_sem_invalid(limpo):
    """Linhas dos `HandleAsync` cuja primeira instrução não é `if (<entrada>.Invalid)`."""
    linhas = []
    for achado in re.finditer(r"\bHandleAsync\s*\(", limpo):
        nivel, i = 1, achado.end()
        while i < len(limpo) and nivel:
            nivel += {"(": 1, ")": -1}.get(limpo[i], 0)
            i += 1
        if re.match(r"\s*\{", limpo[i:]) and not PRIMEIRA_INSTRUCAO_INVALID.match(limpo[i:]):
            linhas.append(limpo.count("\n", 0, achado.start()) + 1)
    return linhas


def conferir_arquivo(caminho):
    original = caminho.read_text(encoding="utf-8-sig")
    limpo = limpar(original)
    achados = []
    for numero, (linha, bruta) in enumerate(zip(limpo.splitlines(), original.splitlines()), start=1):
        if len(bruta) > MAX_COLUNAS:
            achados.append((numero, "colunas", f"{len(bruta)} colunas: no máximo {MAX_COLUNAS}"))
        if LOG_INTERPOLADO.search(bruta) and not bruta.lstrip().startswith("///"):
            achados.append((numero, "log-interpolado", "template constante com placeholders nomeados, valor como argumento"))
        for nome, padrao, correcao in REGRAS:
            if padrao.search(linha):
                achados.append((numero, nome, correcao))
        metodo = ASYNC_SEM_SUFIXO.search(linha)
        if metodo and not metodo.group(1).endswith("Async") and metodo.group(1) not in NOMES_IMPOSTOS:
            achados.append((numero, "async-sem-sufixo", "método assíncrono termina em `Async`, inclusive teste"))
    if HANDLER.search(caminho.name):
        for numero in handle_sem_invalid(limpo):
            achados.append((numero, "handler-sem-invalid", "a primeira linha do `HandleAsync` é `if (query.Invalid)` e, na linha de baixo, `return new Result<T>(query.Notifications);`"))
    return sorted(achados)


def listar(entradas):
    for entrada in entradas:
        p = Path(entrada)
        if p.is_file() and p.suffix == ".cs":
            yield p
        elif p.is_dir():
            for arquivo in sorted(p.rglob("*.cs")):
                if not PASTAS_IGNORADAS & set(arquivo.parts):
                    yield arquivo
        else:
            print(f"entrada inválida: {entrada}", file=sys.stderr)
            sys.exit(2)


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    if not argv:
        print(__doc__, file=sys.stderr)
        return 2
    total = 0
    for arquivo in listar(argv):
        for numero, regra, correcao in conferir_arquivo(arquivo):
            print(f"{arquivo}:{numero}: {regra} -> {correcao}")
            total += 1
    print(f"{total} desvio(s)")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
