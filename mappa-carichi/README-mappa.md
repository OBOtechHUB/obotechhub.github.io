# Mappa Carichi Tecnico – Ufficio Tecnico OBO Italia

Web app interna per vedere chi lavora su cosa, quanto è carico e dove c'è spazio per darsi una mano.
È un solo file (`index.html`) pubblicato con **GitHub Pages**; i dati stanno in **Supabase** (database in cloud).

```
index.html              l'app (con i segnaposto __SUPABASE_URL__ e __SUPABASE_ANON_KEY__)
manifest.webmanifest    permette di installarla come app (PC, Android, iPhone/iPad)
sw.js, install.js       service worker minimo e pulsante "Installa app"
icon-192.png, icon-512.png, apple-touch-icon.png   icona dell'omino OBO
database/1-database.sql tabelle e funzioni di Supabase (si può rieseguire senza perdere dati)
.github/workflows/deploy.yml      pubblica il sito a ogni modifica
.github/workflows/keepalive.yml   evita la pausa di Supabase gratuito
```

I segnaposto di Supabase **non vanno scritti nei file**: li inserisce GitHub al momento della pubblicazione, leggendoli dai *secrets*.

---

## 1. Supabase (il database)

Se usi già il progetto Supabase di prima (quello collegato a Lovable) **non devi spostare nessun dato**: cambia solo il posto in cui è ospitato il sito. Salta al punto 1.3.

### 1.1 Crea il progetto (solo se ne serve uno nuovo)
1. https://supabase.com → *New project*. Scegli una regione europea (es. Frankfurt) e una password forte per il database (conservala nel gestore password).
2. Non serve configurare Authentication: l'app non usa gli utenti di Supabase, ma una sua tabella di persone e sessioni.

### 1.2 Crea tabelle e funzioni
1. Supabase → **SQL Editor** → *New query*.
2. Incolla tutto `database/1-database.sql` ed esegui (*Run*). Lo script si può rieseguire quando vuoi: non cancella progetti, persone o password.
3. Solo la **prima volta**, carica le offerte: esegui nello stesso modo il file `2-offerte.sql` (te lo passo a parte, **non va su GitHub**: contiene dati reali). Svuota e ricarica solo la tabella delle offerte.

### 1.3 Copia i due valori che servono a GitHub
Supabase → **Project Settings → API** (o *Data API / API Keys*):
- **Project URL** → es. `https://abcdxyz.supabase.co` → sarà il secret `SUPABASE_URL`
- **anon public key** (la chiave lunga che inizia con `eyJ...`) → sarà il secret `SUPABASE_ANON_KEY`

> Non usare mai la chiave `service_role`. L'anon key è pubblica per natura (finisce nel sito): i dati sono protetti perché le tabelle sono bloccate e si accede solo tramite le funzioni dello script.

### 1.4 Impostazioni da controllare
- **Project Settings → API → Exposed schemas**: deve esserci `public` (è il default).
- **Authentication → URL Configuration**: nessuna modifica necessaria (non si usa il login di Supabase). Il CORS è già aperto di default, quindi non devi aggiungere l'indirizzo di GitHub.
- **Piano gratuito**: il progetto va in pausa dopo ~7 giorni senza richieste. Il file `keepalive.yml` lo evita; se si ferma comunque, in Supabase premi *Restore project*.
- **Backup**: sul piano gratuito non ci sono backup automatici scaricabili. Ogni tanto esporta le tabelle (*Table Editor → Export*) oppure passa al piano Pro per i backup giornalieri.

---

## 2. GitHub (il sito)

### 2.1 Crea il repository
1. https://github.com → **New repository**. Nome, per esempio: `mappa-carichi` (comparirà nell'indirizzo del sito).
2. Visibilità:
   - **Private** (consigliato): il codice non è visibile. Per pubblicare con Pages da un repository privato serve un piano a pagamento di GitHub (Pro, Team o Enterprise).
   - **Public**: gratuito, il codice è visibile a tutti. Va bene perché dentro non ci sono password né dati (le chiavi stanno nei secrets e i dati in Supabase), ma **non caricare mai `2-offerte.sql`**: è già escluso da `.gitignore`.
3. Non spuntare "Add README": il repository deve essere vuoto.

### 2.2 Carica i file
**Da browser (più semplice):** nel repository vuoto clicca *uploading an existing file*, trascina **tutto il contenuto** della cartella `repo` (compresa la cartella `.github` e i file che iniziano con il punto: se non li vedi, attiva "mostra file nascosti") e premi *Commit changes*.

**Da terminale** (nella cartella `repo`, sostituisci `TUO-UTENTE`):
```bash
git init -b main
git add .
git commit -m "Prima versione"
git remote add origin https://github.com/TUO-UTENTE/mappa-carichi.git
git push -u origin main
```

### 2.3 Inserisci i due secrets
Repository → **Settings → Secrets and variables → Actions → New repository secret**, due volte:

| Nome | Valore |
|---|---|
| `SUPABASE_URL` | il *Project URL* del punto 1.3 |
| `SUPABASE_ANON_KEY` | la *anon public key* del punto 1.3 |

(I nomi devono essere esattamente questi, maiuscoli.)

### 2.4 Attiva GitHub Pages
Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 2.5 Pubblica
Repository → **Actions** → scegli *Pubblica il sito (GitHub Pages)* → **Run workflow**. Dopo circa un minuto compare il segno verde e l'indirizzo:

`https://TUO-UTENTE.github.io/mappa-carichi/`

Da quel momento ogni modifica a `index.html` sul ramo `main` ripubblica il sito da sola.
Se l'Action fallisce con "Mancano i secrets", controlla i nomi al punto 2.3.

### 2.6 Impostazioni consigliate
- **Settings → Actions → General → Workflow permissions**: *Read repository contents* è sufficiente.
- **Settings → Branches → Add rule** su `main`: richiedi una *pull request* prima di unire, se vuoi che le modifiche siano riviste.
- **Settings → Pages**: se hai un dominio aziendale (es. `mappa.tuodominio.it`) inseriscilo in *Custom domain* e crea il record DNS `CNAME` verso `TUO-UTENTE.github.io`; poi spunta *Enforce HTTPS*.
- **Settings → Security → Code security**: attiva *Secret scanning* se disponibile.

---

## 3. Dopo la pubblicazione

1. **Cambia subito le tre password** in Admin → Password (quelle iniziali sono `admin`, `guest` e `visitatore`, facili da indovinare). Prima di condividere il link.
2. **Accesso Visitatore**: dal login Guest scegli *Altro nome…*, scrivi `visitatore` e la password che hai impostato.
3. **Link da aggiornare** dove era usato quello di Lovable: la pagina SharePoint (se incorporata, sostituisci l'indirizzo nell'*Embed*), i segnalibri e la mail al GM.
4. **App installata**: chi aveva installato la versione di Lovable deve reinstallarla dal nuovo indirizzo (cambia il sito, quindi è un'app diversa). Su iPhone/iPad: Condividi → *Aggiungi alla schermata Home*. Su PC (Chrome/Edge): icona di installazione nella barra dell'indirizzo, oppure il pulsante "Installa app". Dovranno anche rifare il login (la sessione è salvata per sito).
5. **SharePoint**: GitHub Pages permette di incorporare la pagina in un riquadro (iframe). L'installazione come app funziona solo aprendo il link direttamente, non dentro SharePoint.

## 4. Come si aggiorna in futuro
- **Modifica all'app**: sostituisci `index.html` nel repository (mantieni i due segnaposto `__SUPABASE_URL__` e `__SUPABASE_ANON_KEY__`) e fai commit su `main`: il sito si ripubblica.
- **Modifica al database**: incolla il nuovo script nel SQL Editor di Supabase. Prima l'SQL, poi l'`index.html`.
- **Aggiornare le offerte**: esegui il nuovo file delle offerte nel SQL Editor (svuota e ricarica solo quella tabella).
- Dopo ogni aggiornamento chiedi un ricarico forzato (Ctrl+F5, su iPhone chiudi e riapri).

## 5. Se qualcosa non va
| Sintomo | Cosa controllare |
|---|---|
| Pagina bianca o "Failed to fetch" | I due secrets sono giusti? Rilancia l'Action. Supabase è in pausa? (*Restore project*) |
| L'Action si ferma con "Mancano i secrets" | Nome dei secrets (punto 2.3) |
| Admin bloccato dopo troppi tentativi | Aspetta 10 minuti, oppure nel SQL Editor: `delete from public.app_attempts;` |
| Non ricordi la password Admin | SQL Editor: `update public.app_settings set value = 'nuova-password' where key = 'admin_pw';` poi cambiala da Admin |
| I nomi non compaiono nel login Guest | Hai eseguito `1-database.sql`? Le persone vanno aggiunte da Admin → Persone |
| Il pulsante "Installa app" non compare | Apri il link direttamente (non in SharePoint) e usa HTTPS; su iPhone usa *Aggiungi alla schermata Home* |
