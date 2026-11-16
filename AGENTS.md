# OBO Hub – istruzioni per chi modifica il repository

- Il sito pubblicato si costruisce da `.github/workflows/pubblica.yml`: `hub/` va nella radice, `comune/` nella radice, `mappa-carichi/` nella sua cartella.
- Mai chiavi segrete, password o documenti OBO/norme nel repository.
- Dopo ogni modifica va aggiornato anche il recap `claude/recap-obo-hub.md` nel progetto claude.ai "OBOtechHUB" (cosa fanno le app, cosa è cambiato, cosa resta da fare).
- Ogni app (anche quelle nuove) carica l'animazione di apertura comune `benvenuto.js` (`<script src="/benvenuto.js" data-app="Nome app"></script>`) e all'accesso salva il nome di battesimo in localStorage `obo-nome` (e lo toglie all'uscita), così il saluto è sempre col nome.
