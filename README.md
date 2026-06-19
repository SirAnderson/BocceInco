# Zibello Arena Bocce 2026

Sito del **Torneo di Bocce 2026** della Zibello Arena, organizzato dall'associazione **Zibèl D'Incò**.
Mostra calendario, risultati, classifiche e tabellone della fase finale ai partecipanti.

Sito **statico** (nessun build, nessun server): si pubblica così com'è su GitHub Pages.

## Come aggiornare i risultati

I dati del sito nascono dal foglio Excel ufficiale in `Resources/`. Dopo aver inserito nuovi
risultati nel foglio (nel tab **Calendario26**, colonne *Pt. Sq. 1* / *Pt. Sq. 2*):

```bash
python tools/build_data.py
```

Lo script rilegge i 2 fogli 2026 (`Calendario26` + `Gironi26`), **ricalcola le classifiche dai
risultati** e riscrive `data/tournament.js` (usato dal sito) e `data/tournament.json`.
A fine esecuzione stampa una verifica dell'ordine delle classifiche.

Regola di classifica: **Vittorie → Scontro diretto → Differenza punti**. Vinte/Giocate e
Differenza non vengono copiate dal PDF ma ricalcolate dai punteggi.

Poi basta fare commit e push: GitHub Pages si aggiorna da solo.

```bash
git add data/ Resources/ && git commit -m "Aggiorna risultati" && git push
```

Serve Python 3 con `openpyxl` (`pip install openpyxl`).

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub e fai push di questa cartella.
2. Nel repository: **Settings → Pages → Build and deployment**.
3. *Source*: **Deploy from a branch**; *Branch*: `main` (o `master`), cartella `/ (root)`.
4. Dopo qualche minuto il sito è online su `https://<utente>.github.io/<repo>/`.

Tutti i percorsi sono relativi, quindi funziona sia in root che in sottocartella. Il file
`.nojekyll` disattiva l'elaborazione Jekyll (non necessaria per un sito statico).

## Anteprima locale

```bash
python -m http.server 8777
# poi apri http://localhost:8777
```

## Struttura

```
index.html              pagina unica (viste: home, calendario, classifiche, tabellone, info)
assets/
  css/styles.css        design system "notturna / arena"
  js/app.js             rendering dati, routing, filtri
  fonts/                Sailors (display) + Montserrat (testo), self-hosted woff2
  img/                  emblema falò, logotipo, favicon
data/
  tournament.js         dati generati (caricati dal sito)
  tournament.json       stessi dati, leggibili
tools/build_data.py     genera i dati dal foglio Excel
Resources/              sorgenti: foglio Excel, PDF, loghi, font
PRODUCT.md / DESIGN.md  scelte di prodotto e di design
```

## Note

- **Font Sailors**: incluso in `assets/fonts/` come webfont. Verifica che la licenza del font
  consenta l'incorporamento web (web embedding), dato che su GitHub Pages il file viene servito
  pubblicamente.
- I colori dei gironi (A viola, B verde, C azzurro, D bianco, E arancione, F nero, G corallo,
  H grigio) sono quelli delle celle del foglio Excel.
