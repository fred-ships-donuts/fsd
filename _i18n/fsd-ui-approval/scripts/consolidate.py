#!/usr/bin/env python3
"""Consolidates the UI/UX inspection against the interface checklist and issues the verdict.

Reads the 66 items from references/checklist.md, merges the inspection items.json files (the last file wins
by id), applies the audit (which can only worsen a status), validates the evidence and writes the report.

Output on stdout: one JSON line with the verdict, counts and pending items.
Exit code: 0 approved or approved with pending items · 1 rejected or inconclusive · 2 invalid input.
Standard library only.
"""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

STATUSES = ["OK", "OK (code)", "N/A", "Fail", "Not verified"]
ORIGINS = ["implementation", "prototype", "undefined"]
OPINIONS = ["confirmed", "downgraded", "insufficient"]
MIN_TEXT = 10

ROW = re.compile(r"^\|\s*(\d{1,2}\.\d{1,2})\s*\|\s*(B)?\s*\|\s*(.+?)\s*\|")
GROUP = re.compile(r"^##\s+(\d{1,2})\.\s+(.+?)\s*$")


def load_checklist(path):
    items, groups, current_group = [], {}, None
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        g = GROUP.match(line)
        if g:
            current_group = int(g.group(1))
            groups[current_group] = g.group(2)
            continue
        r = ROW.match(line)
        if r and current_group is not None:
            items.append({"id": r.group(1), "group": current_group,
                          "blocking": r.group(2) == "B", "item": r.group(3)})
    return items, groups


def text(value):
    return value.strip() if isinstance(value, str) else ""


def merge(files):
    meta, by_id = {"limits": []}, {}
    for file in files:
        data = json.loads(Path(file).read_text(encoding="utf-8"))
        m = data.get("meta", {})
        for key, value in m.items():
            if key == "limits":
                meta["limits"] += [x for x in value if x not in meta["limits"]]
            else:
                meta[key] = value
        for it in data.get("items", []):
            by_id[it.get("id")] = dict(it)
    return meta, by_id


def validate(checklist_items, by_id, partial):
    errors, known = [], {i["id"] for i in checklist_items}
    for iid in by_id:
        if iid not in known:
            errors.append(f"{iid}: id not in the checklist")
    if not partial:
        for i in checklist_items:
            if i["id"] not in by_id:
                errors.append(f"{i['id']}: no status (all 66 items are required)")
    for iid, it in by_id.items():
        if iid not in known:
            continue
        st = it.get("status")
        if st not in STATUSES:
            errors.append(f"{iid}: invalid status {st!r} (use {', '.join(STATUSES)})")
            continue
        evid, reason = text(it.get("evidence")), text(it.get("reason"))
        if st in ("OK", "OK (code)", "Fail") and len(evid) < MIN_TEXT:
            errors.append(f"{iid}: {st} requires `evidence` (what was seen or done, with the path)")
        if st in ("OK (code)", "N/A", "Not verified") and len(reason) < MIN_TEXT:
            errors.append(f"{iid}: {st} requires `reason`")
        if st in ("Fail", "Not verified") and not text(it.get("next_step")):
            errors.append(f"{iid}: {st} requires `next_step`")
        if st == "Fail" and it.get("origin") not in ORIGINS:
            errors.append(f"{iid}: Fail requires `origin` ({', '.join(ORIGINS)})")
    return errors


def apply_audit(by_id, path):
    errors, audited = [], []
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    for a in data.get("items", []):
        iid, opinion = a.get("id"), a.get("opinion")
        if iid not in by_id:
            errors.append(f"audit {iid}: item without inspection")
            continue
        if opinion not in OPINIONS:
            errors.append(f"audit {iid}: invalid opinion {opinion!r}")
            continue
        it = by_id[iid]
        if opinion == "confirmed" or it.get("status") in ("Fail", "Not verified"):
            it["audited"] = "confirmed" if opinion == "confirmed" else it.get("audited")
            continue
        note = text(a.get("evidence"))
        if len(note) < MIN_TEXT:
            errors.append(f"audit {iid}: {opinion} requires `evidence`")
            continue
        previous = it["status"]
        if opinion == "insufficient":
            new = "Not verified"
            it["reason"] = f"Insufficient evidence in the audit: {note}"
        else:
            new = a.get("proposed_status")
            if new not in ("Fail", "Not verified"):
                errors.append(f"audit {iid}: `proposed_status` must be Fail or Not verified")
                continue
            if new == "Fail":
                it["evidence"] = f"Audit: {note}"
                if a.get("origin") in ORIGINS:
                    it["origin"] = a["origin"]
                it.setdefault("origin", "undefined")
            else:
                it["reason"] = f"Audit: {note}"
        it["next_step"] = text(a.get("next_step")) or text(it.get("next_step")) \
            or "Re-inspect the item with the evidence the audit asked for."
        it["status"], it["audited"] = new, f"downgraded from {previous}"
    return errors


def verdict(checklist_items, by_id):
    fail_b = [i["id"] for i in checklist_items if i["blocking"] and by_id[i["id"]]["status"] == "Fail"]
    nv_b = [i["id"] for i in checklist_items if i["blocking"] and by_id[i["id"]]["status"] == "Not verified"]
    pend = [i["id"] for i in checklist_items if not i["blocking"]
            and by_id[i["id"]]["status"] in ("Fail", "Not verified")]
    if fail_b:
        return "REJECTED", fail_b, nv_b, pend
    if nv_b:
        return "INCONCLUSIVE", fail_b, nv_b, pend
    return ("APPROVED WITH PENDING ITEMS" if pend else "APPROVED"), fail_b, nv_b, pend


def cell(value):
    return re.sub(r"\s+", " ", str(value)).replace("|", "\\|").strip()


def description(it):
    st = it["status"]
    parts = []
    if st in ("OK", "Fail"):
        parts.append(it.get("evidence", ""))
    elif st == "OK (code)":
        parts.append(f"{it.get('evidence', '')} Reason: {it.get('reason', '')}")
    else:
        parts.append(it.get("reason", ""))
    if it.get("shot"):
        parts.append(f"Screenshot: `{it['shot']}`.")
    if st == "Fail" and it.get("origin"):
        parts.append(f"Origin: {it['origin']}.")
    if it.get("audited"):
        parts.append(f"Audit: {it['audited']}.")
    return cell(" ".join(p for p in parts if p))


def report(meta, checklist_items, groups, by_id, partial, res):
    ver, fail_b, nv_b, pend = res
    n_b = sum(1 for i in checklist_items if i["blocking"])
    counts = {s: sum(1 for i in checklist_items if i["id"] in by_id and by_id[i["id"]]["status"] == s)
              for s in STATUSES}
    total = sum(counts.values())
    L = [f"# UI/UX approval: {meta.get('screen', '(screen not provided)')}", ""]
    L.append("Rule applied: interface checklist "
             f"({len(groups)} groups, {len(checklist_items)} items, {n_b} blocking). "
             "Ruler: `references/checklist.md` of the fsd-ui-approval skill.")
    for label, key in (("Application", "app"), ("Build", "build"), ("Prototype", "prototype"),
                       ("Profiles", "profiles"), ("Driver", "driver"), ("Date", "date")):
        if meta.get(key):
            L.append(f"{label}: {meta[key]}.")
    L += ["", "Legend: **OK** = seen on the screen. **OK (code)** = from the code only, with the reason. "
          "**N/A** = does not apply (reason). **Fail** = does not meet the item. "
          "**Not verified** = no evidence (reason). **[B]** = blocking.", ""]
    if meta.get("limits"):
        L += ["Limits of this verification:"] + [f"- {x}" for x in meta["limits"]] + [""]
    for g, title in groups.items():
        L += [f"## {g}. {title}", "", "| Item | Status | Evidence |", "|---|---|---|"]
        for i in checklist_items:
            if i["group"] != g or i["id"] not in by_id:
                continue
            it = by_id[i["id"]]
            label = ("[B] " if i["blocking"] else "") + i["item"]
            L.append(f"| {i['id']} {cell(label)} | {it['status']} | {description(it)} |")
        L.append("")
    L += ["## Summary", ""]
    L.append(f"{total} items: " + ", ".join(f"**{counts[s]} {s}**" for s in STATUSES) + ".")
    L.append("")
    if partial:
        L += ["**Partial consolidation: not a verdict.** Checklist items are missing.", ""]
    else:
        L += [f"**Verdict: {ver}.**", ""]
        L.append("Blocking items with Fail: " + (", ".join(fail_b) if fail_b else "none") + ".")
        L.append("Blocking items Not verified: " + (", ".join(nv_b) if nv_b else "none") + ".")
        L.append("Non-blocking items with Fail or Not verified: " + (", ".join(pend) if pend else "none") + ".")
        L += ["", "Verdict rule: any blocking item with Fail rejects; with no blocking Fail, any "
              "blocking item Not verified leaves the consolidation inconclusive; only non-blocking "
              "pending items approve with pending items.", ""]
    adverse = [i for i in checklist_items if i["id"] in by_id
               and by_id[i["id"]]["status"] in ("Fail", "Not verified")]
    adverse.sort(key=lambda i: (not i["blocking"], [int(x) for x in i["id"].split(".")]))
    L += ["## Pending items", ""]
    if not adverse:
        L.append("None.")
    else:
        L += ["| # | Item | Pending item | Blocking | Origin | Next step |", "|---|---|---|---|---|---|"]
        for n, i in enumerate(adverse, 1):
            it = by_id[i["id"]]
            cause = it.get("evidence") if it["status"] == "Fail" else it.get("reason")
            L.append(f"| {n} | {i['id']} | {it['status']}: {cell(cause)} | "
                     f"{'Yes' if i['blocking'] else 'No'} | {it.get('origin', '-')} | "
                     f"{cell(it.get('next_step', ''))} |")
    return "\n".join(L) + "\n", counts


def main():
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--items", nargs="+", required=True, help="inspection items.json; the last wins by id")
    ap.add_argument("--audit", help="audit.json from fsd-ui-auditor")
    ap.add_argument("--checklist", default=str(root / "references" / "checklist.md"))
    ap.add_argument("--out", help="path of report.md")
    ap.add_argument("--partial", action="store_true",
                    help="accepts a subset of the items and issues no verdict (inspector self-check)")
    args = ap.parse_args()

    checklist_items, groups = load_checklist(args.checklist)
    if len(checklist_items) != 66:
        print(json.dumps({"error": f"checklist has {len(checklist_items)} items, expected 66"}))
        return 2
    try:
        meta, by_id = merge(args.items)
        meta.setdefault("date", date.today().isoformat())
        errors = validate(checklist_items, by_id, args.partial)
        if args.audit and not errors:
            errors += apply_audit(by_id, args.audit)
            errors += validate(checklist_items, by_id, args.partial)
    except (OSError, ValueError) as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 2
    if errors:
        print(json.dumps({"error": "invalid input", "details": errors}, ensure_ascii=False))
        return 2

    present = [i for i in checklist_items if i["id"] in by_id]
    res = verdict(present, by_id)
    report_md, counts = report(meta, checklist_items, groups, by_id, args.partial, res)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(report_md, encoding="utf-8")
    ver, fail_b, nv_b, pend = res
    print(json.dumps({"verdict": "PARTIAL" if args.partial else ver, "counts": counts,
                      "blocking_fail": fail_b, "blocking_not_verified": nv_b,
                      "non_blocking_pending": pend, "report": args.out},
                     ensure_ascii=False))
    return 0 if args.partial or ver in ("APPROVED", "APPROVED WITH PENDING ITEMS") else 1


if __name__ == "__main__":
    sys.exit(main())
