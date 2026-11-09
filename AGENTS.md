# OBO Hub – istruzioni per chi modifica il repository

- Il sito pubblicato si costruisce da `.github/workflows/pubblica.yml`: `hub/` va nella radice, `comune/` nella radice, `mappa-carichi/` e `torrette/` nelle loro cartelle.
- **Registro degli aggiornamenti**: ogni modifica che gli utenti notano va aggiunta in cima a `comune/novita.json` (id `AAAA-MM-GG-app-N`, data, app = hub | mappa | torrette | tutte, titolo, voci, titolo_en, voci_en), in italiano semplice. Le novità compaiono nella barra "Aggiorna app" (`comune/aggiorna.js`, con `data-app`), nel riquadro "Novità" mostrato una volta dopo l'aggiornamento e nella pagina `novita.html`, che prepara il testo da inviare agli utenti. Le novità di Progettazione LPS stanno in `public/novita.json` del repository appOBOtechHUB. Le modifiche solo interne non vanno nel registro.
- Mai chiavi segrete, password o documenti OBO/norme nel repository.
