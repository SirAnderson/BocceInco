#!/usr/bin/env python3
"""
Test della logica di tools/build_data.py.

  python tools/test_build_data.py            # esecuzione normale
  python tools/test_build_data.py -v         # output verboso
  python -m unittest -v tools.test_build_data # (anche con pytest: pytest tools/test_build_data.py)

Da lanciare ogni volta che si modifica build_data.py, per assicurarsi di non
rompere la logica. NON dipende dai risultati correnti del torneo: usa dati
sintetici per le regole e, dove tocca il file Excel reale, verifica solo
invarianti strutturali (non un ordine specifico, che cambia a ogni partita).
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data as bd  # noqa: E402

import openpyxl  # noqa: E402


# --- helper per costruire input sintetici -----------------------------------

def group(letter, teams):
    return {"letter": letter, "name": f"Girone {letter}",
            "color": "#000000", "teams": list(teams)}


def played(letter, t1, t2, s1, s2):
    """Partita di girone GIOCATA, con winner coerente coi punteggi."""
    return {"id": 0, "phase": "girone", "phaseLabel": f"Girone {letter}",
            "group": letter, "when": None,
            "team1": t1, "team2": t2, "score1": s1, "score2": s2,
            "played": True,
            "winner": 1 if s1 > s2 else (2 if s2 > s1 else 0)}


def unplayed(letter, t1, t2):
    return {"id": 0, "phase": "girone", "phaseLabel": f"Girone {letter}",
            "group": letter, "when": None,
            "team1": t1, "team2": t2, "score1": None, "score2": None,
            "played": False, "winner": None}


def order(standings, letter):
    return [r["team"] for r in standings[letter]]


# --- parse_when --------------------------------------------------------------

class TestParseWhen(unittest.TestCase):

    def test_data_e_ora_complete(self):
        w = bd.parse_when("martedì 16/06 20:30")
        self.assertEqual(w["label"], "martedì 16/06 20:30")
        self.assertEqual(w["weekday"], "martedì")
        self.assertEqual(w["day"], 16)
        self.assertEqual(w["month"], 6)
        self.assertEqual(w["monthName"], "giugno")
        self.assertEqual(w["time"], "20:30")
        self.assertEqual(w["iso"], "2026-06-16T20:30:00")
        self.assertEqual(w["dateLabel"], "16 giugno")

    def test_ora_a_una_cifra_viene_normalizzata(self):
        # 9:05 -> "09:05" e iso con zero-padding
        w = bd.parse_when("lunedì 1/07 9:05")
        self.assertEqual(w["time"], "09:05")
        self.assertEqual(w["iso"], "2026-07-01T09:05:00")
        self.assertEqual(w["day"], 1)
        self.assertEqual(w["month"], 7)

    def test_solo_data_senza_ora(self):
        w = bd.parse_when("lunedì 22/06")
        self.assertEqual(w["day"], 22)
        self.assertEqual(w["month"], 6)
        self.assertIsNone(w["time"])
        self.assertIsNone(w["iso"])
        self.assertEqual(w["dateLabel"], "22 giugno")

    def test_none_ed_vuoto(self):
        self.assertIsNone(bd.parse_when(None))
        self.assertIsNone(bd.parse_when(""))
        self.assertIsNone(bd.parse_when("   "))

    def test_testo_senza_data(self):
        w = bd.parse_when("da definire")
        self.assertEqual(w["label"], "da definire")
        self.assertIsNone(w["day"])
        self.assertIsNone(w["month"])
        self.assertIsNone(w["iso"])
        self.assertIsNone(w["time"])


# --- compute_standings: regole di ordinamento --------------------------------

class TestStandingsRules(unittest.TestCase):

    def test_aggregazione_base(self):
        """pf/pa/diff/won/played calcolati dai risultati, pos 1-based."""
        g = [group("X", ["A", "B"])]
        s = bd.compute_standings(g, [played("X", "A", "B", 9, 4)])
        a = next(r for r in s["X"] if r["team"] == "A")
        b = next(r for r in s["X"] if r["team"] == "B")
        self.assertEqual((a["played"], a["won"], a["lost"], a["pf"], a["pa"], a["diff"], a["pos"]),
                         (1, 1, 0, 9, 4, 5, 1))
        self.assertEqual((b["played"], b["won"], b["lost"], b["pf"], b["pa"], b["diff"], b["pos"]),
                         (1, 0, 1, 4, 9, -5, 2))

    def test_vittorie_prima_di_tutto(self):
        """Piu' vittorie = posizione migliore, a prescindere dalla differenza."""
        g = [group("X", ["A", "B", "C"])]
        matches = [
            played("X", "A", "B", 6, 5),   # A 1 vittoria, diff +1
            played("X", "C", "A", 10, 0),  # C 1 vittoria, diff +10; A ora 1V
            played("X", "C", "B", 10, 0),  # C 2 vittorie
        ]
        # C ha 2 vittorie -> 1a, pur non avendo la differenza piu' alta in assoluto
        self.assertEqual(order(bd.compute_standings(g, matches), "X")[0], "C")

    def test_scontro_diretto_batte_la_differenza(self):
        """A vittorie pari, conta lo scontro diretto anche se B ha diff migliore."""
        g = [group("X", ["A", "B", "C"])]
        matches = [
            played("X", "A", "B", 6, 5),    # A batte B di 1 (h2h ad A)
            played("X", "B", "C", 10, 0),   # B batte C di 10
        ]
        # A e B: 1 vittoria ciascuna. diff: A=+1, B=+9 (migliore).
        # Regola -> vince lo scontro diretto: A davanti a B.
        self.assertEqual(order(bd.compute_standings(g, matches), "X"), ["A", "B", "C"])

    def test_differenza_quando_non_si_sono_affrontate(self):
        """A vittorie pari e senza scontro diretto, decide la differenza."""
        g = [group("X", ["A", "B", "C", "D"])]
        matches = [
            played("X", "A", "C", 10, 2),   # A 1V diff +8
            played("X", "B", "D", 10, 8),   # B 1V diff +2
        ]
        s = bd.compute_standings(g, matches)
        # A e B 1 vittoria, non si sono affrontate -> A (+8) davanti a B (+2)
        self.assertEqual(order(s, "X")[:2], ["A", "B"])
        # C e D 0 vittorie, no h2h -> D (-2) davanti a C (-8)
        self.assertEqual(order(s, "X")[2:], ["D", "C"])

    def test_punti_fatti_come_ulteriore_spareggio(self):
        """Vittorie pari, no h2h, diff pari -> decide chi ha fatto piu' punti."""
        g = [group("X", ["A", "B"])]
        matches = [
            played("X", "A", "Z", 8, 3),   # A diff +5, pf 8
            played("X", "B", "Y", 7, 2),   # B diff +5, pf 7
        ]
        # A e B: 1V, nessuno scontro diretto, diff identica (+5) -> pf: A(8) > B(7)
        self.assertEqual(order(bd.compute_standings(g, matches), "X")[:2], ["A", "B"])

    def test_alfabetico_come_ultima_spiaggia(self):
        """Tutto identico (0 partite) -> ordine alfabetico, sort deterministico."""
        g = [group("X", ["Zeta", "Alfa"])]
        self.assertEqual(order(bd.compute_standings(g, []), "X"), ["Alfa", "Zeta"])


# --- compute_standings: filtri e robustezza ----------------------------------

class TestStandingsFilters(unittest.TestCase):

    def test_solo_le_partite_giocate_contano(self):
        g = [group("X", ["A", "B"])]
        matches = [unplayed("X", "A", "B")]
        s = bd.compute_standings(g, matches)
        self.assertTrue(all(r["played"] == 0 for r in s["X"]))

    def test_ignora_altri_gironi_e_la_fase_finale(self):
        g = [group("X", ["A", "B"])]
        ko = {"id": 1, "phase": "finale", "phaseLabel": "Finale", "group": None,
              "when": None, "team1": "A", "team2": "B", "score1": 9, "score2": 0,
              "played": True, "winner": 1}
        altro = played("Y", "A", "B", 9, 0)  # girone diverso
        s = bd.compute_standings(g, [ko, altro])
        # Nessuna delle due deve incidere sul girone X
        self.assertTrue(all(r["played"] == 0 for r in s["X"]))

    def test_squadra_non_in_elenco_viene_aggiunta(self):
        """Una squadra che compare solo nei risultati entra comunque in classifica."""
        g = [group("X", ["A"])]            # B non e' elencata
        s = bd.compute_standings(g, [played("X", "A", "B", 9, 4)])
        self.assertEqual(sorted(r["team"] for r in s["X"]), ["A", "B"])

    def test_posizioni_sequenziali(self):
        g = [group("X", ["A", "B", "C", "D"])]
        s = bd.compute_standings(g, [played("X", "A", "B", 9, 4)])
        self.assertEqual([r["pos"] for r in s["X"]], [1, 2, 3, 4])


# --- scenari reali (regressione sulla logica, non sui dati correnti) ----------

class TestScenariReali(unittest.TestCase):

    def test_girone_E_tre_squadre_a_una_vittoria(self):
        """Tre squadre a 1 vittoria: ordine via scontri diretti (caso Girone E)."""
        g = [group("E", ["Bad Boys", "Gnammestrazzi", "Le Cognate", "Ricci di Mare"])]
        matches = [
            played("E", "Gnammestrazzi", "Le Cognate", 9, 4),
            played("E", "Gnammestrazzi", "Bad Boys", 3, 10),
            played("E", "Le Cognate", "Ricci di Mare", 6, 5),
        ]
        self.assertEqual(
            order(bd.compute_standings(g, matches), "E"),
            ["Bad Boys", "Gnammestrazzi", "Le Cognate", "Ricci di Mare"])

    def test_girone_F_scontro_diretto_tra_le_prime(self):
        """Due squadre a 2 vittorie: davanti chi ha vinto lo scontro diretto (Girone F)."""
        g = [group("F", ["Zaccaria", "A&M", "I Cavalli", "T alla seconda"])]
        matches = [
            played("F", "Zaccaria", "T alla seconda", 9, 6),
            played("F", "I Cavalli", "A&M", 4, 8),
            played("F", "Zaccaria", "A&M", 7, 4),
            played("F", "A&M", "T alla seconda", 8, 6),
        ]
        self.assertEqual(
            order(bd.compute_standings(g, matches), "F"),
            ["Zaccaria", "A&M", "I Cavalli", "T alla seconda"])

    def test_pareggio_a_tre_usa_differenza_totale(self):
        """Triangolo (3 a pari vittorie, 1-1-1 negli scontri diretti): a parità
        di vittorie interne decide la DIFFERENZA GENERALE, non quella interna.
        A,B,C battono ciascuna la successiva (ciclo) e tutte D.
        Diff interna: B(+8) > A(-1) > C(-7).  Diff totale: A(+19) > B(+9) > C(-2).
        La regola usa la totale -> ordine A, B, C, D."""
        g = [group("X", ["A", "B", "C", "D"])]
        matches = [
            played("X", "A", "B", 8, 7),    # ciclo
            played("X", "B", "C", 11, 2),
            played("X", "C", "A", 9, 7),
            played("X", "A", "D", 23, 3),   # margini diversi contro D -> diff totale
            played("X", "B", "D", 6, 5),
            played("X", "C", "D", 9, 4),
        ]
        self.assertEqual(order(bd.compute_standings(g, matches), "X"),
                         ["A", "B", "C", "D"])

    def test_girone_H_triangolo_differenza_totale(self):
        """Caso reale Girone H: Atletico, Ghirarda, Team Rocket a 2 vittorie in
        triangolo. Per differenza generale (TR +11, Ghi +9, Atl -3) il 1° è
        Team Rocket, non Atletico (che lo scontro a coppie metterebbe 1°)."""
        g = [group("H", ["Atletico Cavalclown 2.0", "Ghirarda",
                          "Team Rocket", "Le Sbocciate"])]
        matches = [
            played("H", "Ghirarda", "Team Rocket", 9, 6),
            played("H", "Atletico Cavalclown 2.0", "Le Sbocciate", 6, 4),
            played("H", "Atletico Cavalclown 2.0", "Team Rocket", 3, 9),
            played("H", "Atletico Cavalclown 2.0", "Ghirarda", 7, 6),
            played("H", "Le Sbocciate", "Team Rocket", 1, 9),
            played("H", "Ghirarda", "Le Sbocciate", 10, 3),
        ]
        self.assertEqual(
            order(bd.compute_standings(g, matches), "H"),
            ["Team Rocket", "Ghirarda", "Atletico Cavalclown 2.0", "Le Sbocciate"])


# --- smoke test sul file Excel reale (invarianti strutturali) ----------------

@unittest.skipUnless(bd.XLSX.exists(), f"File Excel non trovato: {bd.XLSX}")
class TestFileReale(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        wb = openpyxl.load_workbook(bd.XLSX, data_only=True)
        cls.groups = bd.load_groups(wb)
        cls.matches = bd.load_matches(wb)
        cls.standings = bd.compute_standings(cls.groups, cls.matches)

    def test_otto_gironi_trentadue_squadre(self):
        self.assertEqual(len(self.groups), 8)
        self.assertEqual(sum(len(g["teams"]) for g in self.groups), 32)

    def test_partite_girone_ben_formate(self):
        for m in self.matches:
            if m["phase"] != "girone":
                continue
            self.assertIsNotNone(m["team1"])
            self.assertIsNotNone(m["team2"])
            if m["played"]:
                self.assertIsInstance(m["score1"], int)
                self.assertIsInstance(m["score2"], int)
                atteso = 1 if m["score1"] > m["score2"] else (2 if m["score2"] > m["score1"] else 0)
                self.assertEqual(m["winner"], atteso)

    def test_classifiche_coerenti(self):
        for letter, rows in self.standings.items():
            # posizioni sequenziali
            self.assertEqual([r["pos"] for r in rows], list(range(1, len(rows) + 1)))
            for r in rows:
                # ogni partita giocata e' o vinta o persa, e diff = pf - pa
                self.assertEqual(r["won"] + r["lost"], r["played"])
                self.assertEqual(r["diff"], r["pf"] - r["pa"])

    def test_ordine_rispetta_le_vittorie(self):
        # invariante della regola: la classifica non e' mai in ordine crescente di vittorie
        for rows in self.standings.values():
            wins = [r["won"] for r in rows]
            self.assertEqual(wins, sorted(wins, reverse=True))


if __name__ == "__main__":
    unittest.main(verbosity=2)
