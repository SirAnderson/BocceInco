# Design

Sistema visivo del sito **Zibello Arena Bocce**. Direzione: *notturna / arena* — una serata d'estate al campo, cielo navy, brace rossa, numeri nitidi in bianco.

## Theme

Tema **scuro committed**: il navy del brand riempie la pagina (strategia "drenched" sul fondo, accento rosso ≤ 15%). Non è un dashboard chiaro con accenti: il buio È il brand (le partite si giocano di sera). Un solo tema, nessun toggle chiaro/scuro. 

## Color

Tre colori d'identità (dal PDF classifiche, esatti): rosso `#ff3131`, navy `#021f53`, bianco `#ffffff`. La rampa notturna è derivata in OKLCH attorno al navy.

```
/* Ancore brand (esatte) */
--white:      #ffffff;
--red:        #ff3131;   /* brace / accento, stati live e "prossima" */
--navy:       #021f53;   /* navy del brand = superficie principale */

/* Rampa notturna (derivata, OKLCH) */
--bg:         oklch(0.18 0.07 264);   /* pagina: piu' profondo del navy brand */
--surface:    #021f53;                /* card e pannelli (navy brand) */
--surface-2:  oklch(0.30 0.10 264);   /* superfici sollevate, righe alterne */
--line:       color-mix(in oklab, var(--white) 14%, transparent);
--line-soft:  color-mix(in oklab, var(--white) 8%, transparent);

/* Testo */
--ink:        #ffffff;                /* titoli, dati principali */
--ink-soft:   oklch(0.86 0.03 264);   /* testo secondario */
--ink-mute:   oklch(0.72 0.04 264);   /* label, metadati (>=4.5:1 su --bg) */

/* Accento brace, sfumature */
--red-bright: oklch(0.66 0.22 25);    /* hover/glow del rosso */
--red-soft:   color-mix(in oklab, var(--red) 16%, transparent);
```

**Glow del falò:** un alone radiale caldo (rosso/arancio molto tenue) dietro l'hero e l'emblema, reso con `radial-gradient` a bassa opacità — luce, non decorazione piatta.

### Colori dei gironi (dal foglio, identità di squadra)

Ogni girone porta il suo colore-cella originale. Usato come chip/etichetta accanto a lettera e nome (mai unico veicolo). Il primo piano è calcolato per contrasto.

| Girone | Colore | Testo su chip |
|---|---|---|
| A | `#9900FF` viola | bianco |
| B | `#00FF00` verde | navy scuro |
| C | `#4A86E8` azzurro | bianco |
| D | `#FFFFFF` bianco | navy scuro |
| E | `#FF9900` arancio | navy scuro |
| F | `#000000` nero | bianco (con bordo) |
| G | `#E06666` corallo | navy scuro |
| H | `#B7B7B7` grigio | navy scuro |

### Stati risultato (senza introdurre verde/rosso semantici, per non confondere coi gironi)

- **Vincente**: nome in bianco pieno + peso 700, punteggio in Sailors grande, pallino brace.
- **Perdente**: testo a `--ink-mute`, punteggio normale.
- **Da giocare**: punteggio sostituito da orario; bordo `--line`.
- **Prossima / in serata**: bordo e label brace `--red`.

## Typography

Coppia del brand (dal PDF), entrambi self-hosted in woff2 (zero richieste esterne).

- **Display — "Sailors Condensed"** (`assets/fonts/sailors-condensed.woff2`). Condensato, bold, terminali morbidi. Solo per: titoli pagina/sezione, numeri-punteggio. Mai per testo corrente o label piccole. Nota: manca il glifo `°` → gli ordinali (3°/1°) si compongono in Montserrat.
- **Logo Zibello Arena** (`assets/img/zibello-arena.svg`): wordmark ufficiale ZIBELLO (rosso) / ARENA (bianco), estratto vettorialmente dal PDF in `Resources/` (testo convertito in tracciati, sfondo rimosso). Usato in header, hero e footer ovunque compaia il nome "Zibello Arena". È la variante larga del font "Sailors", diversa dalla Sailors Condensed dei titoli.
- **Testo/UI/dati — "Montserrat"** (400/500/600/700, self-hosted). Tutto il resto: corpo, label, tabelle, navigazione, orari.

Scala (rem fissa, registro product):
```
--fs-300: .8125rem;  /* label, metadati */
--fs-400: .9375rem;  /* corpo, celle tabella */
--fs-500: 1.125rem;  /* sottotitoli */
--fs-600: 1.5rem;    /* titoli sezione (Sailors) */
--fs-700: clamp(2rem, 6vw, 3.25rem);   /* titoli pagina (Sailors) */
--fs-hero: clamp(2.75rem, 11vw, 5.5rem);/* hero (Sailors) */
--fs-score: clamp(1.75rem, 7vw, 2.75rem);/* punteggi (Sailors) */
```
Sailors va in `letter-spacing` leggermente positivo in maiuscolo per i titoli; testo chiaro su scuro → `line-height` 1.5–1.65 per il corpo.

## Layout

- Mobile-first. Contenuto in container `max-width: 1100px`, padding fluido `clamp(1rem, 4vw, 2rem)`.
- Header sticky: emblema falò + wordmark "ZIBELLO ARENA" a sinistra, nav a destra. Su mobile la nav diventa una barra di tab scrollabile sticky.
- Navigazione a **viste** con hash routing (`#calendario`, `#classifiche`, `#tabellone`, `#info`) + home: deep-link e back del browser funzionanti, una sola pagina su GitHub Pages.
- **Calendario**: raggruppato per data; ogni partita è una riga/card con girone (chip colorato), squadre, punteggio o orario. Filtri sticky per girone e per squadra.
- **Classifiche**: 8 tabelle, una per girone, intestate dal colore del girone; colonne POS · Squadra · V/G · Diff.
- **Tabellone**: colonne per turno (Ottavi → Quarti → Semifinali → Finali) con scorrimento orizzontale su mobile; slot "Da definire" finché le qualificate non sono note.
- Niente card annidate. Tabelle vere per i dati densi; `flex-wrap` e grid auto-fit dove serve.

## Components

Vocabolario unico, stati completi (default/hover/focus/active/disabled) su tutto ciò che è interattivo.

- **Chip girone**: pill piccola, fondo = colore girone, testo per contrasto, lettera + (opz.) nome.
- **Match row**: griglia [chip] [squadra1 — squadra2] [punteggio/orario]; vincente evidenziato.
- **Tabella classifica**: header brace-on-navy con accento del girone, righe alterne `--surface-2`, posizione 1 evidenziata (qualificazione).
- **Tab nav**: sottolineatura brace per la vista attiva, focus ring visibile.
- **Filtri**: select native stilizzate / chip toggle; stato attivo in brace.
- **Empty/teaching state**: per gironi senza partite giocate ("Ancora nessun risultato — prima palla il …").

## Motion

Registro product: 150–220 ms, `ease-out`. Il movimento comunica stato, non decora.

- Cambio vista: crossfade + leggero translateY del contenuto.
- Hover righe/tab: transizioni colore/fondo brevi.
- Hero: un solo ingresso d'apertura discreto (emblema che "prende luce", titolo che sale). Glow del falò con respiro lentissimo e fermo se `prefers-reduced-motion`.
- `@media (prefers-reduced-motion: reduce)`: tutto a crossfade/immediato, nessun translate.

## Z-index scale

```
--z-base:0; --z-sticky:100; --z-nav:200; --z-overlay:800; --z-toast:900;
```
