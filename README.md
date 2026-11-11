# OBO Hub

## Come è organizzato questo repository
| Cartella | Cosa contiene |
|---|---|
| `hub/` | OBO Hub: pagina iniziale con l'accesso e l'elenco delle app (`config.js` = elenco app) · `hub/icone/` le icone |
| `mappa-carichi/` | app Mappa carichi (gli script SQL in `database/`: il 4 attiva i visitatori di tutto OBO Hub, link `/?visitatore`) ufficio tecnico · `database/` gli script SQL · `icone/` |
| `comune/` | file usati da tutte le app: barra "Aggiorna app", pagina 404, rimando dei vecchi link `/lps/` |
| `.github/workflows/` | pubblicazione automatica del sito |

Progettazione LPS sta nel suo repository (`appOBOtechHUB`, prima `lps`). Gli indirizzi pubblicati non cambiano con le cartelle.

Schermata iniziale con tutte le app dell'ufficio tecnico. Indirizzo: `https://obotechhub.github.io/`

| App | Dove | Accesso |
|---|---|---|
| Progettazione LPS | repository `appOBOtechHUB` → `/appOBOtechHUB/` (i vecchi link `/lps/` rimandano qui) | login unico (password + Microsoft Authenticator) |
| Mappa carichi ufficio tecnico | cartella `mappa-carichi/` di questo repository → `/mappa-carichi/` | solo con l'accesso di OBO Hub; ruolo (Admin/Guest/Visitatore) e persona li sceglie l'amministratore |
| Amministrazione | `/appOBOtechHUB/admin` | solo amministratori |

## Come funziona l'accesso
- OBO Hub usa lo stesso database Supabase di Progettazione LPS e sta sullo stesso sito (`github.io`): chi entra in una app è già dentro anche nell'altra.
- *Accedi* porta alla pagina di accesso di Progettazione LPS (password, prima password personale, Authenticator) e poi torna qui.
- L'amministratore sceglie le app di ogni persona in **Admin → Utenti → Cambia sezioni**: le sezioni di Progettazione LPS abilitano quella app, **"OBO Hub · Mappa carichi ufficio tecnico"** abilita la Mappa. "Tutte le sezioni" abilita tutto.

## Configurazione (una volta)
1. **Settings → Pages → Source: GitHub Actions.**
2. La Mappa usa lo **stesso database Supabase** di Progettazione LPS: nel SQL Editor esegui `mappa-carichi/database/1-database.sql` (tabelle `app_*`, nessun conflitto), poi `mappa-carichi/database/3-accesso-obo-hub.sql` (accesso solo da OBO Hub) e `4-visitatori.sql` (visitatori in sola lettura, link `mappa-carichi/?visitatore`) e, a parte, il file delle offerte.
   Solo se un giorno vorrai un database separato: secrets `MAPPA_SUPABASE_URL` e `MAPPA_SUPABASE_ANON_KEY`.
3. **Actions → Pubblica OBO Hub → Run workflow.**

Il database della Mappa si aggiorna come descritto in `mappa-carichi/README-mappa.md` (script `mappa-carichi/database/1-database.sql`). Il file con le offerte reali (`2-offerte.sql`) **non va mai caricato qui**: si esegue solo nel SQL Editor di Supabase.

## Aggiungere una nuova app
Aggiungi un elemento all'elenco `APP` in `config.js` (nome, descrizione, icona, indirizzo, regola di abilitazione).
