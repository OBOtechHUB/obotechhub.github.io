# OBO Hub – istruzioni per Claude (leggere prima di ogni modifica)

Repository delle app di OBO Hub senza compilazione (pagina iniziale, Mappa carichi, Prodotti, Torrette, Zavorra WRR, Progetti) pubblicate su GitHub Pages. Proprietario: Marco Lo Vetere (OBO Italia). Rispondere sempre in **italiano**, in modo semplice. Vedi anche `AGENTS.md`.

## Regole che non si discutono (Marco)
- **Non cancellare mai nulla**: né dati, né accessi, né registri, né storici. Si integra, non si toglie. Negli SQL niente `delete`, `drop`, `truncate` su dati degli utenti; "annullare" = flag (`annullata`, `attiva=false`) + storico.
- L'admin non modifica né cancella i progetti degli utenti. I vecchi dati Lovable non si cancellano mai.
- **Mai chiavi segrete** (`sb_secret…`) né password nel repository o nell'app. La password visitatori sta solo nel database. Si usa solo la chiave pubblica `sb_publishable_…`.
- **Mai nel repository**: PDF/DWG OBO, PDF delle norme (stanno solo nel progetto claude.ai), `2-offerte.sql`, export CRM con nomi dei clienti, prezzi di listino nei file esportati. Non copiare testo o figure delle norme (solo valori e riferimenti). Il certificato TNE NG/NSG non si riproduce. Niente video o foto di terzi. I disegni 2D OBO si possono copiare.
- Rispettare `robots.txt` di obo.it (mai le pagine `/search/`). Nominatim non va usato per l'autocompletamento.
- Per modifiche a progetti Lovable: dare comandi pronti da incollare in Lovable.

## Come si pubblica
- Si lavora su `main` (sempre `git pull --rebase` prima del push). Il push fa partire `.github/workflows/pubblica.yml`, che **copia un elenco preciso di file** in `site/`: `hub/` e `comune/` nella radice, ogni app nella sua cartella.
- **Ogni file nuovo di un'app va aggiunto all'elenco in `pubblica.yml`**, altrimenti online dà 404 (successo con `mappa-carichi/crm-import.js` il 25/11/2026).
- Prima di pubblicare il workflow esegue `strumenti/controllo/prima-di-pubblicare.mjs`: sintassi JS/JSON, file richiamati dalle pagine che mancano, pagine aperte in Chromium senza errori. Se fallisce, online resta la versione precedente. Si può provare in locale: preparare `site/` con i comandi di `pubblica.yml`, poi `node strumenti/controllo/prima-di-pubblicare.mjs site` (serve `playwright`; `site/` è in .gitignore).
- Di notte `controllo.yml` prova il sito pubblicato e apre una issue se qualcosa non va.
- Verifica dal vivo: il sito pubblicato si vede solo dal browser di Marco (Claude in Chrome); dalla sandbox github.io non si raggiunge. Dopo la pubblicazione il service worker può servire la versione vecchia: ricaricare con `?v=<ora>`.

## Database (Supabase, progetto `qzfosidvjsyivaibnadf`)
- Le modifiche al database sono file SQL numerati (`mappa-carichi/database/N-….sql`, LPS `supabase/…`) che **Marco esegue a mano** nel SQL Editor: mandargli sempre il file, idempotente (`if not exists`, `create or replace`), con controllo finale in fondo.
- Provare ogni SQL su Postgres locale (`pg_ctlcluster 16 main start`) **con `set role authenticated`** e l'utente simulato, non da superutente (il 25/11 una policy funzionava da superutente ma bloccava gli utenti).
- Le funzioni RPC ricevono un solo parametro jsonb `p` con `token`; ruoli admin / utente / visitatore (sola lettura).
- Il vecchio `2-offerte.sql` svuota la tabella: non rieseguirlo mai.

## Novità e recap
- Nuova voce in cima a `comune/novita.json` solo per modifiche che gli utenti notano nelle app condivise (hub, mappa, prodotti, torrette). **Niente novità per modifiche solo grafiche** (vanno, se proprio, in `grafica_non_mostrata`) né per Amministrazione, visitatori o sezioni solo admin. Le novità LPS stanno nel repo appOBOtechHUB (`public/novita.json`).
- Dopo ogni modifica aggiornare il recap `claude/recap-obo-hub.md` nel progetto claude.ai "OBOtechHUB".
- "Integra sempre su app": ogni calcolo o foglio fatto a parte va messo anche nell'app.

## Codice
- Pagine singole HTML con JavaScript ES5 (niente build): `mappa-carichi/index.html` contiene tutto, con `rpc(fn, p)`, `showPage(id)`, array `PAGES`, `TITLES`. File comuni in `comune/` (`registro.js` carica stili ed effetti comuni, `nomi.js` per i nomi: cognome maiuscolo, nome con iniziale maiuscola).
- Torrette: il configuratore UFS è React; il sorgente sta in `torrette/sorgente/` (file di Marco `configuratore-ufs.jsx`, ritoccato solo per il carrello del progetto) e si compila con `bash strumenti/torrette/compila.sh` in `torrette/ufs.js` (generato, non modificare a mano). La pagina `torrette/ufs-app.js` fa accesso, progetto e CSV; la versione precedente resta in `torrette/precedente.html` (+ `app.js`, `dati.js`).
- Controllare la sintassi dopo ogni modifica: estrarre lo `<script>` principale e `node --check`.
- Le pagine devono funzionare a 390 px senza scorrimento laterale e in tema chiaro/scuro.
