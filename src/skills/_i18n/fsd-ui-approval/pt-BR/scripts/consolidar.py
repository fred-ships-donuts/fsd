#!/usr/bin/env python3
"""Consolida a inspeção de UI/UX contra o checklist de interface e emite o veredito.

Lê os 66 itens de references/checklist.md, junta os itens.json da inspeção (o último arquivo vence por id),
aplica a auditoria (que só pode piorar um status), valida as evidências e escreve o relatório.

Saída em stdout: uma linha JSON com veredito, contagens e pendências.
Código de saída: 0 aprovado ou aprovado com pendências · 1 reprovado ou não concluído · 2 entrada inválida.
Só biblioteca padrão.
"""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

STATUS = ["OK", "OK (código)", "N/A", "Falha", "Não verificado"]
ORIGENS = ["implementacao", "prototipo", "indefinida"]
PARECERES = ["confirmado", "rebaixado", "insuficiente"]
MIN_TEXTO = 10

ROW = re.compile(r"^\|\s*(\d{1,2}\.\d{1,2})\s*\|\s*(B)?\s*\|\s*(.+?)\s*\|")
GRUPO = re.compile(r"^##\s+(\d{1,2})\.\s+(.+?)\s*$")


def carregar_checklist(caminho):
    itens, grupos, grupo_atual = [], {}, None
    for linha in Path(caminho).read_text(encoding="utf-8").splitlines():
        g = GRUPO.match(linha)
        if g:
            grupo_atual = int(g.group(1))
            grupos[grupo_atual] = g.group(2)
            continue
        r = ROW.match(linha)
        if r and grupo_atual is not None:
            itens.append({"id": r.group(1), "grupo": grupo_atual,
                          "bloqueante": r.group(2) == "B", "item": r.group(3)})
    return itens, grupos


def texto(valor):
    return valor.strip() if isinstance(valor, str) else ""


def juntar(arquivos):
    meta, por_id = {"limites": []}, {}
    for arq in arquivos:
        dados = json.loads(Path(arq).read_text(encoding="utf-8"))
        m = dados.get("meta", {})
        for chave, valor in m.items():
            if chave == "limites":
                meta["limites"] += [x for x in valor if x not in meta["limites"]]
            else:
                meta[chave] = valor
        for it in dados.get("itens", []):
            por_id[it.get("id")] = dict(it)
    return meta, por_id


def validar(itens_checklist, por_id, parcial):
    erros, conhecidos = [], {i["id"] for i in itens_checklist}
    for iid in por_id:
        if iid not in conhecidos:
            erros.append(f"{iid}: id fora do checklist")
    if not parcial:
        for i in itens_checklist:
            if i["id"] not in por_id:
                erros.append(f"{i['id']}: sem status (todos os 66 itens são obrigatórios)")
    for iid, it in por_id.items():
        if iid not in conhecidos:
            continue
        st = it.get("status")
        if st not in STATUS:
            erros.append(f"{iid}: status inválido {st!r} (use {', '.join(STATUS)})")
            continue
        evid, mot = texto(it.get("evidencia")), texto(it.get("motivo"))
        if st in ("OK", "OK (código)", "Falha") and len(evid) < MIN_TEXTO:
            erros.append(f"{iid}: {st} exige `evidencia` (o que foi visto ou feito, com o caminho)")
        if st in ("OK (código)", "N/A", "Não verificado") and len(mot) < MIN_TEXTO:
            erros.append(f"{iid}: {st} exige `motivo`")
        if st in ("Falha", "Não verificado") and not texto(it.get("proximo_passo")):
            erros.append(f"{iid}: {st} exige `proximo_passo`")
        if st == "Falha" and it.get("origem") not in ORIGENS:
            erros.append(f"{iid}: Falha exige `origem` ({', '.join(ORIGENS)})")
    return erros


def aplicar_auditoria(por_id, caminho):
    erros, auditados = [], []
    dados = json.loads(Path(caminho).read_text(encoding="utf-8"))
    for a in dados.get("itens", []):
        iid, parecer = a.get("id"), a.get("parecer")
        if iid not in por_id:
            erros.append(f"auditoria {iid}: item sem inspeção")
            continue
        if parecer not in PARECERES:
            erros.append(f"auditoria {iid}: parecer inválido {parecer!r}")
            continue
        it = por_id[iid]
        if parecer == "confirmado" or it.get("status") in ("Falha", "Não verificado"):
            it["auditado"] = "confirmado" if parecer == "confirmado" else it.get("auditado")
            continue
        nota = texto(a.get("evidencia"))
        if len(nota) < MIN_TEXTO:
            erros.append(f"auditoria {iid}: {parecer} exige `evidencia`")
            continue
        anterior = it["status"]
        if parecer == "insuficiente":
            novo = "Não verificado"
            it["motivo"] = f"Evidência insuficiente na auditoria: {nota}"
        else:
            novo = a.get("status_proposto")
            if novo not in ("Falha", "Não verificado"):
                erros.append(f"auditoria {iid}: `status_proposto` deve ser Falha ou Não verificado")
                continue
            if novo == "Falha":
                it["evidencia"] = f"Auditoria: {nota}"
                if a.get("origem") in ORIGENS:
                    it["origem"] = a["origem"]
                it.setdefault("origem", "indefinida")
            else:
                it["motivo"] = f"Auditoria: {nota}"
        it["proximo_passo"] = texto(a.get("proximo_passo")) or texto(it.get("proximo_passo")) \
            or "Reinspecionar o item com a evidência que a auditoria pediu."
        it["status"], it["auditado"] = novo, f"rebaixado de {anterior}"
    return erros


def veredito(itens_checklist, por_id):
    falha_b = [i["id"] for i in itens_checklist if i["bloqueante"] and por_id[i["id"]]["status"] == "Falha"]
    nv_b = [i["id"] for i in itens_checklist if i["bloqueante"] and por_id[i["id"]]["status"] == "Não verificado"]
    pend = [i["id"] for i in itens_checklist if not i["bloqueante"]
            and por_id[i["id"]]["status"] in ("Falha", "Não verificado")]
    if falha_b:
        return "REPROVADO", falha_b, nv_b, pend
    if nv_b:
        return "NÃO CONCLUÍDO", falha_b, nv_b, pend
    return ("APROVADO COM PENDÊNCIAS" if pend else "APROVADO"), falha_b, nv_b, pend


def celula(valor):
    return re.sub(r"\s+", " ", str(valor)).replace("|", "\\|").strip()


def descricao(it):
    st = it["status"]
    partes = []
    if st in ("OK", "Falha"):
        partes.append(it.get("evidencia", ""))
    elif st == "OK (código)":
        partes.append(f"{it.get('evidencia', '')} Motivo: {it.get('motivo', '')}")
    else:
        partes.append(it.get("motivo", ""))
    if it.get("shot"):
        partes.append(f"Captura: `{it['shot']}`.")
    if st == "Falha" and it.get("origem"):
        partes.append(f"Origem: {it['origem']}.")
    if it.get("auditado"):
        partes.append(f"Auditoria: {it['auditado']}.")
    return celula(" ".join(p for p in partes if p))


def relatorio(meta, itens_checklist, grupos, por_id, parcial, res):
    ver, falha_b, nv_b, pend = res
    n_b = sum(1 for i in itens_checklist if i["bloqueante"])
    cont = {s: sum(1 for i in itens_checklist if i["id"] in por_id and por_id[i["id"]]["status"] == s)
            for s in STATUS}
    total = sum(cont.values())
    L = [f"# Aprovação de UI/UX: {meta.get('tela', '(tela não informada)')}", ""]
    L.append("Regra aplicada: checklist de interface "
             f"({len(grupos)} grupos, {len(itens_checklist)} itens, {n_b} bloqueantes). "
             "Régua: `references/checklist.md` da skill fsd-ui-approval.")
    for rotulo, chave in (("Aplicação", "app"), ("Build", "build"), ("Protótipo", "prototipo"),
                          ("Perfis", "perfis"), ("Driver", "driver"), ("Data", "data")):
        if meta.get(chave):
            L.append(f"{rotulo}: {meta[chave]}.")
    L += ["", "Legenda: **OK** = visto na tela. **OK (código)** = só pelo código, com o motivo. "
          "**N/A** = não se aplica (motivo). **Falha** = descumpre o item. "
          "**Não verificado** = sem evidência (motivo). **[B]** = bloqueante.", ""]
    if meta.get("limites"):
        L += ["Limites desta verificação:"] + [f"- {x}" for x in meta["limites"]] + [""]
    for g, titulo in grupos.items():
        L += [f"## {g}. {titulo}", "", "| Item | Status | Evidência |", "|---|---|---|"]
        for i in itens_checklist:
            if i["grupo"] != g or i["id"] not in por_id:
                continue
            it = por_id[i["id"]]
            rot = ("[B] " if i["bloqueante"] else "") + i["item"]
            L.append(f"| {i['id']} {celula(rot)} | {it['status']} | {descricao(it)} |")
        L.append("")
    L += ["## Resumo", ""]
    L.append(f"{total} itens: " + ", ".join(f"**{cont[s]} {s}**" for s in STATUS) + ".")
    L.append("")
    if parcial:
        L += ["**Consolidação parcial: não é veredito.** Faltam itens do checklist.", ""]
    else:
        L += [f"**Veredito: {ver}.**", ""]
        L.append("Bloqueantes com Falha: " + (", ".join(falha_b) if falha_b else "nenhum") + ".")
        L.append("Bloqueantes Não verificado: " + (", ".join(nv_b) if nv_b else "nenhum") + ".")
        L.append("Não bloqueantes com Falha ou Não verificado: " + (", ".join(pend) if pend else "nenhum") + ".")
        L += ["", "Regra do veredito: qualquer bloqueante com Falha reprova; sem Falha bloqueante, qualquer "
              "bloqueante Não verificado deixa a consolidação não concluída; só pendência não bloqueante "
              "aprova com pendências.", ""]
    adversos = [i for i in itens_checklist if i["id"] in por_id
                and por_id[i["id"]]["status"] in ("Falha", "Não verificado")]
    adversos.sort(key=lambda i: (not i["bloqueante"], [int(x) for x in i["id"].split(".")]))
    L += ["## Pendências", ""]
    if not adversos:
        L.append("Nenhuma.")
    else:
        L += ["| # | Item | Pendência | Bloqueante | Origem | Próximo passo |", "|---|---|---|---|---|---|"]
        for n, i in enumerate(adversos, 1):
            it = por_id[i["id"]]
            causa = it.get("evidencia") if it["status"] == "Falha" else it.get("motivo")
            L.append(f"| {n} | {i['id']} | {it['status']}: {celula(causa)} | "
                     f"{'Sim' if i['bloqueante'] else 'Não'} | {it.get('origem', '-')} | "
                     f"{celula(it.get('proximo_passo', ''))} |")
    return "\n".join(L) + "\n", cont


def main():
    raiz = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--itens", nargs="+", required=True, help="itens.json da inspeção; o último vence por id")
    ap.add_argument("--auditoria", help="auditoria.json do fsd-ui-auditor")
    ap.add_argument("--checklist", default=str(raiz / "references" / "checklist.md"))
    ap.add_argument("--out", help="caminho do relatorio.md")
    ap.add_argument("--parcial", action="store_true",
                    help="aceita subconjunto dos itens e não emite veredito (conferência do inspetor)")
    args = ap.parse_args()

    try:
        itens_checklist, grupos = carregar_checklist(args.checklist)
    except (OSError, ValueError) as e:
        print(json.dumps({"erro": str(e)}, ensure_ascii=False))
        return 2
    if len(itens_checklist) != 66:
        print(json.dumps({"erro": f"checklist com {len(itens_checklist)} itens, esperado 66"}))
        return 2
    try:
        meta, por_id = juntar(args.itens)
        meta.setdefault("data", date.today().isoformat())
        erros = validar(itens_checklist, por_id, args.parcial)
        if args.auditoria and not erros:
            erros += aplicar_auditoria(por_id, args.auditoria)
            erros += validar(itens_checklist, por_id, args.parcial)
    except (OSError, ValueError, AttributeError, TypeError) as e:
        print(json.dumps({"erro": str(e)}, ensure_ascii=False))
        return 2
    if erros:
        print(json.dumps({"erro": "entrada inválida", "detalhes": erros}, ensure_ascii=False))
        return 2

    presentes = [i for i in itens_checklist if i["id"] in por_id]
    res = veredito(presentes, por_id)
    texto_md, cont = relatorio(meta, itens_checklist, grupos, por_id, args.parcial, res)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(texto_md, encoding="utf-8")
    ver, falha_b, nv_b, pend = res
    print(json.dumps({"veredito": "PARCIAL" if args.parcial else ver, "contagens": cont,
                      "bloqueantes_falha": falha_b, "bloqueantes_nao_verificado": nv_b,
                      "pendencias_nao_bloqueantes": pend, "relatorio": args.out},
                     ensure_ascii=False))
    return 0 if args.parcial or ver in ("APROVADO", "APROVADO COM PENDÊNCIAS") else 1


if __name__ == "__main__":
    sys.exit(main())
