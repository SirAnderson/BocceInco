#!/usr/bin/env python3
"""
Report dei cambiamenti nei dati del torneo: confronta lo stato committato
(git HEAD) con il working tree dopo aver rilanciato build_data.py, e genera
un report HTML + un riepilogo testuale.

  python tools/report_changes.py                 # HEAD  vs  data/tournament.json
  python tools/report_changes.py --before-ref HEAD~1
  python tools/report_changes.py --before A.json --after B.json

Mostra: nuovi risultati / risultati modificati, modifiche di calendario (orari),
partite aggiunte o rimosse, variazioni di classifica e il check "campo unico"
(nessuna sovrapposizione di slot). Scrive `_report_cambiamenti.html` nella radice
del progetto e ne stampa il percorso.
"""
import argparse
import html
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AFTER_DEFAULT = ROOT / "data" / "tournament.json"
OUT_HTML = ROOT / "_report_cambiamenti.html"


def load_after(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_before(args):
    if args.before:
        return json.loads(Path(args.before).read_text(encoding="utf-8"))
    # da git: <ref>:data/tournament.json
    try:
        raw = subprocess.run(
            ["git", "show", f"{args.before_ref}:data/tournament.json"],
            cwd=ROOT, capture_output=True, check=True).stdout
        return json.loads(raw.decode("utf-8"))
    except Exception as e:  # noqa: BLE001 - report best-effort
        print(f"[avviso] stato precedente non disponibile da git "
              f"({args.before_ref}): {e}", file=sys.stderr)
        return None


# --- diff -------------------------------------------------------------------

def mkey(m):
    """Identita' di una partita indipendente da id/orario."""
    return (m["phase"], m.get("group"), frozenset([m["team1"], m["team2"]]))


def index_real(data):
    """Indicizza solo le partite con due squadre reali (esclude KO da assegnare)."""
    out = {}
    for m in data["matches"]:
        if m["team1"] and m["team2"]:
            out[mkey(m)] = m
    return out


def diff_matches(before, after):
    bi, ai = index_real(before), index_real(after)
    added = [ai[k] for k in ai if k not in bi]
    removed = [bi[k] for k in bi if k not in ai]
    results, schedule = [], []
    for k in ai:
        if k not in bi:
            continue
        b, a = bi[k], ai[k]
        bl = (b["when"] or {}).get("label")
        al = (a["when"] or {}).get("label")
        if (b["score1"], b["score2"]) != (a["score1"], a["score2"]):
            results.append({
                "label": a["phaseLabel"], "t1": a["team1"], "t2": a["team2"],
                "before": None if not b["played"] else f"{b['score1']}-{b['score2']}",
                "after": f"{a['score1']}-{a['score2']}"})
        if bl != al:
            schedule.append({"label": a["phaseLabel"], "t1": a["team1"],
                             "t2": a["team2"], "before": bl, "after": al})
    return added, removed, results, schedule


def diff_standings(before, after):
    changed = {}
    bstand = (before or {}).get("standings", {})
    for letter, rows in after["standings"].items():
        b = bstand.get(letter, [])
        bo = [r["team"] for r in b]
        ao = [r["team"] for r in rows]
        bmap = {r["team"]: r for r in b}
        stat_changes = []
        for r in rows:
            rb = bmap.get(r["team"])
            if rb and (rb["won"], rb["played"], rb["diff"]) != (r["won"], r["played"], r["diff"]):
                stat_changes.append(r["team"])
        if bo != ao or stat_changes:
            changed[letter] = {"before": b, "after": rows, "order_changed": bo != ao}
    return changed


def find_overlaps(after):
    byslot = defaultdict(list)
    for m in after["matches"]:
        iso = (m.get("when") or {}).get("iso")
        if iso:
            byslot[iso].append(m)
    return {iso: ms for iso, ms in byslot.items() if len(ms) > 1}


# --- HTML -------------------------------------------------------------------

def e(s):
    return html.escape(str(s)) if s is not None else "&mdash;"


def fmt_row(r):
    return f"{r['pos']}. {e(r['team'])} <span class=mut>({r['won']}/{r['played']}, {r['diff']:+d})</span>"


def build_html(before, after, added, removed, results, schedule, standings, overlaps):
    meta_a = after["meta"]
    meta_b = (before or {}).get("meta", {})
    played_b = meta_b.get("playedMatches", "?")
    played_a = meta_a.get("playedMatches", "?")

    parts = []
    parts.append(f"""<!doctype html><html lang=it><head><meta charset=utf-8>
<title>Cambiamenti torneo</title>
<style>
 body{{font:15px/1.5 system-ui,Segoe UI,Arial;margin:0;background:#0f1115;color:#e6e6e6}}
 .wrap{{max-width:980px;margin:0 auto;padding:28px}}
 h1{{font-size:22px;margin:0 0 4px}} h2{{font-size:16px;margin:28px 0 10px;border-bottom:1px solid #2a2f3a;padding-bottom:6px}}
 .sub{{color:#8b93a3;margin:0 0 18px}}
 .cards{{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}}
 .card{{background:#161a22;border:1px solid #232838;border-radius:10px;padding:12px 16px;min-width:130px}}
 .card .n{{font-size:22px;font-weight:700}} .card .l{{color:#8b93a3;font-size:12px}}
 table{{border-collapse:collapse;width:100%;margin:6px 0}}
 th,td{{text-align:left;padding:7px 10px;border-bottom:1px solid #232838;font-size:14px}}
 th{{color:#8b93a3;font-weight:600}}
 .mut{{color:#8b93a3}} .arr{{color:#8b93a3}}
 .ok{{color:#4ade80}} .warn{{color:#fbbf24}} .bad{{color:#f87171}}
 .grid{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}
 .gbox{{background:#161a22;border:1px solid #232838;border-radius:10px;padding:12px 16px}}
 .gbox h3{{margin:0 0 8px;font-size:14px}} ol{{margin:0;padding-left:20px}} li{{padding:2px 0}}
 .chg{{color:#fbbf24;font-weight:600}}
 .none{{color:#8b93a3;font-style:italic}}
</style></head><body><div class=wrap>
<h1>Cambiamenti dati torneo</h1>
<p class=sub>Generato da <code>tools/report_changes.py</code> &middot; build: {e(meta_a.get('generatedAt','?'))}</p>
<div class=cards>
 <div class=card><div class=n>{played_b} &rarr; {played_a}</div><div class=l>partite giocate</div></div>
 <div class=card><div class=n>{len(results)}</div><div class=l>risultati nuovi/modif.</div></div>
 <div class=card><div class=n>{len(schedule)}</div><div class=l>orari modificati</div></div>
 <div class=card><div class=n>{len(added)}/{len(removed)}</div><div class=l>partite agg./rim.</div></div>
 <div class=card><div class=n>{len(standings)}</div><div class=l>gironi cambiati</div></div>
</div>""")

    # campo unico
    if overlaps:
        parts.append('<h2>Check campo unico <span class=bad>&#9888; SOVRAPPOSIZIONI</span></h2><table>'
                     '<tr><th>Slot</th><th>Partite</th></tr>')
        for iso in sorted(overlaps):
            ms = overlaps[iso]
            lbl = (ms[0]["when"] or {}).get("label")
            games = " &middot; ".join(f"{e(m['team1'])} vs {e(m['team2'])}" for m in ms)
            parts.append(f"<tr><td>{e(lbl)}</td><td class=bad>{games}</td></tr>")
        parts.append("</table>")
    else:
        parts.append('<h2>Check campo unico <span class=ok>&#10003; nessuna sovrapposizione</span></h2>'
                     '<p class=none>Ogni slot orario ha una sola partita.</p>')

    # risultati
    parts.append("<h2>Risultati nuovi / modificati</h2>")
    if results:
        parts.append("<table><tr><th>Girone/Fase</th><th>Partita</th><th>Prima</th><th></th><th>Dopo</th></tr>")
        for r in results:
            parts.append(f"<tr><td>{e(r['label'])}</td><td>{e(r['t1'])} vs {e(r['t2'])}</td>"
                         f"<td class=mut>{e(r['before'])}</td><td class=arr>&rarr;</td>"
                         f"<td><b>{e(r['after'])}</b></td></tr>")
        parts.append("</table>")
    else:
        parts.append('<p class=none>Nessun risultato cambiato.</p>')

    # calendario
    parts.append("<h2>Calendario (orari)</h2>")
    if schedule:
        parts.append("<table><tr><th>Girone/Fase</th><th>Partita</th><th>Prima</th><th></th><th>Dopo</th></tr>")
        for r in schedule:
            parts.append(f"<tr><td>{e(r['label'])}</td><td>{e(r['t1'])} vs {e(r['t2'])}</td>"
                         f"<td class=mut>{e(r['before'])}</td><td class=arr>&rarr;</td>"
                         f"<td><b>{e(r['after'])}</b></td></tr>")
        parts.append("</table>")
    else:
        parts.append('<p class=none>Nessuna modifica di orario.</p>')

    if added or removed:
        parts.append("<h2>Partite aggiunte / rimosse</h2><table>")
        for m in added:
            parts.append(f"<tr><td class=ok>+ aggiunta</td><td>{e(m['phaseLabel'])}</td>"
                         f"<td>{e(m['team1'])} vs {e(m['team2'])}</td></tr>")
        for m in removed:
            parts.append(f"<tr><td class=bad>- rimossa</td><td>{e(m['phaseLabel'])}</td>"
                         f"<td>{e(m['team1'])} vs {e(m['team2'])}</td></tr>")
        parts.append("</table>")

    # classifiche
    parts.append("<h2>Classifiche cambiate</h2>")
    if standings:
        parts.append("<div class=grid>")
        for letter in sorted(standings):
            d = standings[letter]
            tag = '<span class=chg>ordine cambiato</span>' if d["order_changed"] else '<span class=mut>numeri aggiornati</span>'
            before_html = "".join(f"<li>{fmt_row(r)}</li>" for r in d["before"]) or "<li class=none>n/d</li>"
            after_html = "".join(f"<li>{fmt_row(r)}</li>" for r in d["after"])
            parts.append(f"""<div class=gbox><h3>Girone {e(letter)} &middot; {tag}</h3>
              <div class=mut style="font-size:12px;margin-bottom:4px">prima</div><ol>{before_html}</ol>
              <div class=mut style="font-size:12px;margin:8px 0 4px">dopo</div><ol>{after_html}</ol></div>""")
        parts.append("</div>")
    else:
        parts.append('<p class=none>Nessuna classifica cambiata.</p>')

    parts.append("</div></body></html>")
    return "\n".join(parts)


# --- riepilogo testuale -----------------------------------------------------

def print_summary(before, after, added, removed, results, schedule, standings, overlaps):
    mb = (before or {}).get("meta", {})
    print(f"Partite giocate: {mb.get('playedMatches','?')} -> {after['meta'].get('playedMatches','?')}")
    print(f"Risultati nuovi/modificati: {len(results)} | Orari modificati: {len(schedule)} | "
          f"Aggiunte/Rimosse: {len(added)}/{len(removed)} | Gironi cambiati: {len(standings)}")
    if results:
        print("\nRisultati:")
        for r in results:
            was = r["before"] or "-"
            print(f"  [{r['label']}] {r['t1']} vs {r['t2']}: {was} -> {r['after']}")
    if schedule:
        print("\nCalendario:")
        for r in schedule:
            print(f"  [{r['label']}] {r['t1']} vs {r['t2']}: {r['before']} -> {r['after']}")
    if standings:
        print("\nClassifiche cambiate:", ", ".join(sorted(standings)))
    print("\nCampo unico:",
          "SOVRAPPOSIZIONI!" if overlaps else "nessuna sovrapposizione")


def main():
    ap = argparse.ArgumentParser(description="Report cambiamenti dati torneo")
    ap.add_argument("--before", help="file JSON 'prima' (sovrascrive git)")
    ap.add_argument("--before-ref", default="HEAD", help="ref git per lo stato 'prima' (default: HEAD)")
    ap.add_argument("--after", default=str(AFTER_DEFAULT), help="file JSON 'dopo'")
    args = ap.parse_args()

    after = load_after(args.after)
    before = load_before(args)

    if before is None:
        added = removed = results = schedule = []
        standings = {}
    else:
        added, removed, results, schedule = diff_matches(before, after)
        standings = diff_standings(before, after)
    overlaps = find_overlaps(after)

    OUT_HTML.write_text(
        build_html(before, after, added, removed, results, schedule, standings, overlaps),
        encoding="utf-8")

    print_summary(before, after, added, removed, results, schedule, standings, overlaps)
    print(f"\nReport HTML: {OUT_HTML}")
    if overlaps:
        sys.exit(0)  # non e' un errore di esecuzione: il check va letto nel report


if __name__ == "__main__":
    main()
