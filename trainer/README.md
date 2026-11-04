# GymCoach · prototipo per personal trainer

Versione multi-trainer di GymDiet: **solo allenamento** (dieta, macro e pasti
rimossi), pensata per essere ospitata online e usata da più personal trainer,
ognuno con i propri clienti.

Il prototipo contiene **2 architetture** backend e **3 interfacce**. Le
interfacce sono le stesse per entrambe le architetture: parlano con un unico
contratto API (`web/core/api.js`) che ha tre implementazioni.

```
trainer/
  shared/        codice comune a browser e server
                 (catalogo 53 esercizi, animazioni, generatore programmi,
                  validazione, calcoli sui progressi, prompt per Claude)
  web/
    core/        contratto API + adattatori (demo, REST, Supabase), componenti comuni
    studio/      interfaccia 1: gestionale da scrivania
    campo/       interfaccia 2: telefono in sala
    builder/     interfaccia 3: editor di schede
  server-a/      architettura A: monolite Node + SQLite
  supabase-b/    architettura B: Supabase (Postgres + Auth + RLS + Edge Function)
```

## Modello dati

| Entità | Contenuto |
|---|---|
| Trainer | account (email, password), un tenant |
| Cliente | anagrafica + profilo di allenamento (obiettivo, esperienza, giorni, durata, zone da proteggere, note) |
| Programma | scheda in JSON (sedute → esercizi con serie, ripetizioni, recupero, note); stato `bozza` / `attivo` / `archiviato`, **uno solo attivo per cliente** |
| Seduta | storico: data, programma, esercizi con serie (kg × ripetizioni) |
| Esercizio personale | esercizi creati dal trainer (anche con Claude), visibili solo a lui |

Il catalogo dei 53 esercizi resta nel codice (`shared/exercises.js`): è
versionato con l'app e uguale per tutti.

## Architettura A · monolite Node + SQLite

```
browser ──HTTPS──▶ server Node (un processo)
                    ├─ file statici delle interfacce
                    ├─ API REST /api/*  (cookie httpOnly)
                    ├─ SQLite (un file)  ── ogni query filtra per trainer_id
                    └─ SDK Anthropic ──▶ Claude (chiave della piattaforma)
```

- Zero framework: `node:http` + `node:sqlite`. Una sola dipendenza (`@anthropic-ai/sdk`).
- Password con scrypt, sessione in cookie `HttpOnly; SameSite=Lax`, nel database solo l'hash del token.
- Protezione CSRF (solo JSON, controllo dell'origine), limite tentativi di accesso, limite orario di generazioni AI per trainer.
- Isolamento tra trainer nel codice: ogni funzione del database riceve `trainerId`.

Avvio in locale:

```bash
cd trainer/server-a
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start      # http://localhost:8080
npm test                                    # 15 test dell'API
```

In produzione: `docker build -f server-a/Dockerfile -t gymcoach-a .` dalla
cartella `trainer/`, un volume per `/data`, HTTPS davanti (Caddy, o la piattaforma
di hosting). Backup continuo del file SQLite con Litestream.

## Architettura B · Supabase

```
browser ──HTTPS──▶ Supabase
                    ├─ Auth (registrazione, login, reset password, Google…)
                    ├─ Postgres + RLS ── le policy decidono cosa vede ogni trainer
                    └─ Edge Function genera-esercizio ──▶ Claude (secret del progetto)
interfacce: hosting statico (GitHub Pages, Netlify, Cloudflare Pages)
```

- Nessun server da gestire: il browser legge e scrive direttamente nel database.
- La sicurezza è nelle policy RLS (`supabase/migrations/…_schema.sql`): `trainer_id = auth.uid()`
  e, per programmi e sedute, il cliente collegato deve essere dello stesso trainer.
- Un trigger archivia il programma attivo precedente; una vista `clienti_riepilogo`
  (con `security_invoker`) dà l'elenco con ultima seduta e programma attivo in una query.

Attivazione:

```bash
cd trainer/supabase-b
npm install && npm test                     # 9 test delle policy RLS su Postgres (PGlite)
npm run sincronizza                         # copia i moduli condivisi per la Edge Function
supabase link --project-ref <progetto>
supabase db push
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy genera-esercizio
```

Poi in `web/core/config.js`: `backend: 'supabase'` con `url` e `anonKey` del
progetto (la anon key è pubblica per design).

## Confronto

| | A · Node + SQLite | B · Supabase |
|---|---|---|
| Codice backend da mantenere | ~500 righe, tutte nostre | solo SQL (schema + policy) e una funzione |
| Dove sta la sicurezza | nel codice del server | nelle policy del database |
| Login | email + password fatti in casa | Supabase Auth: reset password, magic link, Google, Apple |
| Costi iniziali | una VPS da ~5 €/mese | piano gratuito, poi 25 $/mese |
| Scalabilità | una macchina (migliaia di trainer bastano); oltre serve Postgres | gestita |
| Backup | da configurare (Litestream) | inclusi nel piano a pagamento |
| Dipendenza da fornitori | nessuna | Supabase (ma è Postgres standard: si può migrare) |
| Logica complessa futura (pagamenti, notifiche, report) | naturale nel server | Edge Function o webhook |
| Dati in UE (GDPR) | dove metti il server | regione Francoforte |

## Le tre interfacce

| | Per chi / quando | Punti di forza |
|---|---|---|
| **Studio** | trainer alla scrivania, gestione | tabella clienti con stato (in regola / da sentire / senza programma), programma modificabile in linea, storico con grafici dei carichi |
| **Campo** | trainer in sala con il telefono | agenda del giorno, un esercizio alla volta, carichi con +/−, suggerimento di progressione, timer di recupero |
| **Builder** | costruzione delle schede | libreria con ricerca, trascina e riordina, anteprima di ciò che vede il cliente |

Tutte e tre: animazioni degli esercizi, scheda tecnica "come si fa",
sostituzione esercizi, generazione di nuovi esercizi con Claude (lato server).

## Raccomandazione

- **Architettura: B (Supabase) per partire.** Login completo (reset password,
  Google), backup e scalabilità senza gestire server: per un prodotto venduto a
  più trainer è la strada con meno lavoro operativo. A resta valida se si vuole
  pieno controllo o installazioni dedicate (es. una catena di palestre).
- **Interfacce: non sono alternative esclusive.** Studio e Campo coprono due
  momenti diversi della giornata del trainer; il Builder è il miglior editor di
  schede e può diventare la scheda "Programma" di Studio.

## Prima della produzione

- App o link per il **cliente** (vedere la scheda, segnare le serie): oggi i dati sono pronti, manca la vista.
- **GDPR**: le "zone da proteggere" e le note sono dati relativi alla salute (art. 9): servono consenso esplicito, informativa e nomina a responsabile del trattamento tra piattaforma e trainer.
- Abbonamenti dei trainer (Stripe), email transazionali, reset password (in A).
- Studi con più trainer (team che condividono clienti): oggi il tenant è il singolo trainer.
- Test end-to-end dell'adattatore Supabase su un progetto reale (le policy sono testate su Postgres, l'adattatore no).
