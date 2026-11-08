# OBO Hub

Schermata iniziale con tutte le app dell'ufficio tecnico. Indirizzo: `https://loveteremarco1981-coder.github.io/obo-hub/`

| App | Dove | Accesso |
|---|---|---|
| Progettazione LPS | repository `Lighting` → `/Lighting/` | login unico (password + Microsoft Authenticator) |
| Mappa carichi ufficio tecnico | cartella `mappa-carichi/` di questo repository → `/obo-hub/mappa-carichi/` | dopo OBO Hub, con le sue password interne (admin / guest / visitatore) |
| Amministrazione | `/Lighting/admin` | solo amministratori |

## Come funziona l'accesso
- OBO Hub usa lo stesso database Supabase di Progettazione LPS e sta sullo stesso sito (`github.io`): chi entra in una app è già dentro anche nell'altra.
- *Accedi* porta alla pagina di accesso di Progettazione LPS (password, prima password personale, Authenticator) e poi torna qui.
- L'amministratore sceglie le app di ogni persona in **Admin → Utenti → Cambia sezioni**: le sezioni di Progettazione LPS abilitano quella app, **"OBO Hub · Mappa carichi ufficio tecnico"** abilita la Mappa. "Tutte le sezioni" abilita tutto.

## Configurazione (una volta)
1. **Settings → Pages → Source: GitHub Actions.**
2. La Mappa usa lo **stesso database Supabase** di Progettazione LPS: nel SQL Editor esegui `mappa-carichi/database/1-database.sql` (tabelle `app_*`, nessun conflitto) e, a parte, il file delle offerte.
   Solo se un giorno vorrai un database separato: secrets `MAPPA_SUPABASE_URL` e `MAPPA_SUPABASE_ANON_KEY`.
3. **Actions → Pubblica OBO Hub → Run workflow.**

Il database della Mappa si aggiorna come descritto in `mappa-carichi/README-mappa.md` (script `mappa-carichi/database/1-database.sql`). Il file con le offerte reali (`2-offerte.sql`) **non va mai caricato qui**: si esegue solo nel SQL Editor di Supabase.

## Aggiungere una nuova app
Aggiungi un elemento all'elenco `APP` in `config.js` (nome, descrizione, icona, indirizzo, regola di abilitazione).
