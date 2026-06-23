---
name: aggiorna-torneo
description: Workflow per aggiornare i dati del torneo Bocce dopo modifiche al file Excel (calendario e/o risultati). Da usare quando l'utente dice di aver aggiornato/modificato il file Excel, il calendario o i risultati, oppure chiede di rilanciare build_data.py e rivedere i cambiamenti prima di committare. Esegue test, rigenera i dati, mostra un report HTML dei cambiamenti (calendario + classifiche) e committa solo dopo l'OK.
---

# Aggiorna dati torneo

Workflow consolidato per quando l'utente ha aggiornato `Resources/Calend Bocce 2026 (1).xlsx`.
Esegui i passi **in ordine**. I passi 2 e 6 sono dei **cancelli**: non procedere se falliscono / senza OK.

Tutti i comandi si lanciano dalla radice del progetto. Servono Python + `openpyxl`.
Risolvi le date relative usando la data odierna fornita nel contesto.

## 1. Check del file Excel
- Esegui `git status --short`.
- Verifica che `Resources/Calend Bocce 2026 (1).xlsx` risulti **modificato** (`M`). Se NON lo è,
  avvisa l'utente (forse non ha salvato/chiuso il file) e chiedi se procedere comunque.
- Verifica che `data/tournament.json` e `data/tournament.js` siano **puliti** rispetto a HEAD:
  il confronto "prima/dopo" del passo 4 usa `git HEAD` come stato precedente. Se hanno già
  modifiche non committate, segnalalo (il diff partirà comunque da HEAD).

## 2. Suite di test (CANCELLO)
- Esegui `python tools/test_build_data.py`.
- Se **fallisce**: FERMATI. Mostra l'errore e non rigenerare nulla — la logica è rotta e l'output
  non sarebbe affidabile. Aiuta a capire cosa si è rotto in `tools/build_data.py`.
- Se passa, prosegui.

## 3. Rigenera i dati
- Esegui `python tools/build_data.py`.
- Leggi l'ultima riga `VERIFICA ordine vs baseline atteso`:
  - `TUTTO COERENTE` → ok.
  - `DISCREPANZE PRESENTI` → nuovi risultati hanno cambiato l'ordine di un girone. È normale
    quando si inseriscono risultati; il baseline va aggiornato (vedi passo 5).

## 4. Report dei cambiamenti
- Esegui `python tools/report_changes.py` (confronta `git HEAD` con il working tree).
  Genera `_report_cambiamenti.html` (ignorato da git) e stampa un riepilogo testuale.
- Presenta all'utente **in chat**, in modo conciso (tabelle):
  - risultati nuovi/modificati,
  - modifiche di calendario (orari, partite spostate di giorno),
  - variazioni di classifica (gironi cambiati, prima → dopo),
  - esito del **check "campo unico"** (nessuna sovrapposizione di slot).
- Indica il percorso del file HTML da aprire per il dettaglio.
- Segnala eventuali effetti collaterali rilevanti: sovrapposizioni di slot, buchi creati in una
  serata, una squadra che gioca due volte lo stesso giorno. Per approfondire puoi leggere
  `data/tournament.json`.

## 5. Allineamento baseline (solo se il passo 3 ha detto DISCREPANZE)
- Spiega quale girone ha cambiato ordine.
- Proponi di aggiornare il dict `expected` in `tools/build_data.py` con le nuove classifiche,
  poi rilanciare passi 2 e 3 così la verifica torna verde.
- Fallo **solo dopo OK** dell'utente. La modifica a `build_data.py` va inclusa nel commit.

## 6. Commit (CANCELLO: solo su OK esplicito)
- Non committare mai in automatico. Chiedi conferma e mostra cosa verrà incluso.
- Su OK: `git add` di
  - `Resources/Calend Bocce 2026 (1).xlsx`
  - `data/tournament.json`, `data/tournament.js`
  - `index.html` (cache-busting aggiornato dal build)
  - `tools/build_data.py` **solo se** modificato al passo 5
- NON aggiungere `_report_cambiamenti.html` (è gitignored).
- Messaggio in italiano, stile del repo (`git log` per riferimento): oggetto breve `Dati: ...`,
  corpo con elenco di risultati/rinvii e l'esito del check campo unico. Chiudi con la riga
  `Co-Authored-By: Claude ...` come da regole dell'ambiente.
- Non fare `push` se non richiesto esplicitamente; ricorda quanti commit locali restano da pubblicare.

## Note
- Se l'esecuzione dei comandi è temporaneamente bloccata (classificatore non disponibile), riprova
  dopo qualche secondo; in alternativa usa Grep/Read sui JSON per il confronto.
- Strumenti coinvolti: `tools/build_data.py` (genera i dati), `tools/test_build_data.py` (test della
  logica), `tools/report_changes.py` (report HTML/testuale del diff).
