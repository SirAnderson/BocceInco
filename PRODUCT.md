# Product

## Register

product

## Users

I **partecipanti** al torneo di bocce della Zibello Arena (32 squadre, ~100+ giocatori) e i loro accompagnatori. Lo consultano soprattutto **da telefono, la sera**, prima o dopo la propria partita (le gare si giocano dalle 20:30 alle 23:00, tra giugno e luglio). Vogliono una risposta in pochi secondi a tre domande: *quando e dove gioco io? com'è finita? chi sta vincendo il mio girone?*

Pubblico secondario: gli organizzatori dell'associazione **Zibèl D'Incò**, che aggiornano i risultati e ricondividono il link.

## Product Purpose

Un sito statico (GitHub Pages) che mostra **calendario, risultati, classifiche e tabellone della fase finale** del torneo. Sostituisce il giro di foto del foglio Excel e del PDF su WhatsApp con un'unica pagina sempre aggiornata e leggibile.

I dati nascono dal foglio Excel ufficiale: uno script (`tools/build_data.py`) li estrae e **ricalcola le classifiche dai risultati** (Vinte/Giocate e Differenza non vengono copiate ma verificate). Successo = un partecipante trova la propria prossima partita in meno di 10 secondi, e i conti mostrati coincidono sempre con quelli ufficiali.

## Brand Personality

Caloroso, sportivo, di paese. Tre parole: **brace, serale, schietto**. È un torneo estivo attorno a un falò (l'emblema di Zibèl D'Incò), non un evento corporate: il tono è amichevole e diretto, mai gergale o pubblicitario. La grafica deve dare l'idea di una serata d'estate al campo — cielo scuro, luci, fuoco — restando però nitida e immediata sui numeri.

## Anti-references

- Dashboard SaaS generica (grigi, card tutte uguali, hero-metric con gradiente).
- Siti di scommesse sportive: affollati, aggressivi, pieni di banner.
- Il look "editoriale AI" su fondo crema/avorio con serif corsivo: fuori registro per un torneo di bocce.
- Gradienti decorativi, glassmorphism, testo in gradiente: niente di tutto questo.

## Design Principles

1. **Il partecipante prima di tutto.** La prima schermata risponde subito a "quando gioco" e "chi vince". Mobile-first, leggibile al buio del campo.
2. **Fedeltà assoluta al dato.** I numeri sono ricalcolati dai risultati e devono coincidere col foglio ufficiale. Mai inventare punteggi, punti o ordini di classifica.
3. **Il colore è appartenenza.** Ogni girone ha il suo colore preso dal foglio: è la bussola più rapida per orientarsi tra 32 squadre e 64 partite.
4. **Calore senza decorazione.** L'atmosfera da serata/falò la portano colore e tipografia (navy notturno, brace rossa, Sailors), non orpelli grafici.
5. **Leggero e ri-generabile.** Sito statico, zero build, si aggiorna ri-eseguendo uno script e ricaricando. Deve aprirsi in un istante anche con la rete del campo.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Testo corpo ≥ 4.5:1 sul fondo navy. I colori dei gironi (alcuni molto saturi, es. verde e bianco) non sono mai l'unico veicolo d'informazione: sempre affiancati dalla lettera del girone e dal nome. Navigazione da tastiera completa, focus visibile, target touch ≥ 44px. Rispetto di `prefers-reduced-motion`. Utenza adulta e anziana: dimensioni testo generose, niente interazioni nascoste.
