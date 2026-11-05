# GymCoach · prototipo per personal trainer e atleti

Versione multi-trainer di GymDiet, **solo allenamento** (dieta e macro tolte).
Due app sullo stesso backend:

- **Versione personal trainer**: il trainer gestisce i suoi atleti, crea e
  modifica le loro schede, li invita all'app, vede i progressi.
  Tre interfacce alternative: Studio, Campo, Builder.
- **Versione atleta** (indirizzo separato, `/atleta/`): l'atleta entra con il
  codice ricevuto dal trainer, vede la scheda assegnata e registra gli
  allenamenti con carichi e ripetizioni.

E due architetture backend alternative (A e B). Le interfacce sono le stesse
per entrambe: parlano con un unico contratto API (`web/core/api.js`) con tre
implementazioni (demo nel browser, REST, Supabase).

```
trainer/
  shared/        codice comune a browser e server
                 (catalogo 53 esercizi, animazioni, generatore schede,
                  validazione, codici invito, calcoli sui progressi)
  web/
    core/        contratto API, adattatori, componenti comuni
                 (modalita' allenamento, invito, esercizi)
    studio/      trainer, interfaccia 1: gestionale da scrivania
    campo/       trainer, interfaccia 2: telefono in sala
    builder/     trainer, interfaccia 3: editor di schede
    atleta/      app atleta
  server-a/      architettura A: monolite Node + SQLite, zero dipendenze
  supabase-b/    architettura B: Supabase (Postgres + Auth + RLS)
```

## Come il trainer crea una scheda

Dalla pagina dell'atleta (Studio, sezione **Schede**) c'e' l'elenco di tutte
le sue schede (attiva, bozze, archiviate) e il pulsante **+ Nuova scheda**:

1. **Da dove parti**: proposta dal profilo (esercizi, serie e recuperi scelti
   in base a obiettivo, esperienza e giorni), copia della scheda attiva,
   oppure scheda vuota con i soli giorni.
2. **Quando la vede l'atleta**: come bozza (la prepari con calma) oppure
   attiva subito (sostituisce quella attuale, che resta nello storico).
3. La scheda si apre nell'editor: nome, giorni (aggiungi, rinomina, sposta
   sulla settimana, togli), esercizi (aggiungi, sostituisci, riordina, serie,
   ripetizioni, recupero, nota per l'atleta). **Salva**; per una bozza,
   **Attiva scheda** quando e' pronta.

Lo stesso pannello "+ Nuova scheda" c'e' in Campo e nel Builder; dal Builder
si puo' scegliere quale scheda modificare e una nuova scheda non sovrascrive
mai quella aperta.

## Come entra l'atleta

1. Il trainer apre l'atleta e preme **Invita all'app**: riceve un codice di 8
   caratteri (es. `K7QM-2XPA`) e un messaggio pronto da inviare.
2. L'atleta apre l'app atleta, sceglie **Primo accesso**, scrive il codice e
   sceglie email e password.
3. Da quel momento entra con email e password: vede solo la **scheda attiva**
   (non le bozze, non le schede vecchie, non altri atleti) e registra le sedute.
4. Il trainer vede le sedute nello storico, segnate come "registrate
   dall'atleta", con le eventuali note.

Il codice vale 7 giorni e una sola volta; un nuovo codice annulla il
precedente. Se l'atleta perde la password, il trainer genera un nuovo codice:
l'atleta lo usa per reimpostare email e password e il vecchio accesso smette
di funzionare.

## Modello dati

| Entità | Contenuto |
|---|---|
| Trainer | account (email, password), un tenant |
| Atleta | anagrafica + profilo (obiettivo, esperienza, giorni, durata, zone da proteggere, note) |
| Scheda | sedute → esercizi con serie, ripetizioni, recupero, note per l'atleta; `bozza` / `attiva` / `archiviata`, **una sola attiva per atleta** |
| Seduta | data, scheda, esercizi con serie (kg × ripetizioni), note; registrata dal trainer o dall'atleta |
| Esercizio personale | creato a mano dal trainer (nome, muscolo, figura animata, istruzioni); lo vedono lui e i suoi atleti |
| Account atleta + invito | un account per atleta; codici invito salvati solo come hash |

## Architettura A · monolite Node + SQLite

```
trainer ──┐                       ┌─ API /api/*         (cookie gc_accesso)
          ├─HTTPS──▶ server Node ─┼─ API /api/atleta/*  (cookie gc_atleta)
atleta  ──┘                       ├─ file delle due app
                                  └─ SQLite (un file): ogni query filtra per trainer o per atleta
```

- Zero dipendenze: `node:http` + `node:sqlite` + `node:crypto`.
- Password con scrypt; accessi con token in cookie `HttpOnly; SameSite=Lax`,
  nel database solo l'hash. Cookie diversi per trainer e atleta: un atleta non
  può chiamare le API del trainer.
- Protezione CSRF, limite tentativi di accesso e di attivazione codice.

```bash
cd trainer/server-a
npm start          # trainer: http://localhost:8080/studio/   atleti: http://localhost:8080/atleta/
npm test           # 19 test dell'API
```

In produzione: `docker build -f server-a/Dockerfile -t gymcoach-a .` dalla
cartella `trainer/`, un volume per `/data`, HTTPS davanti, backup del file
SQLite con Litestream.

## Architettura B · Supabase

```
trainer ──┐                 ┌─ Auth: utenti con ruolo trainer o atleta
          ├─HTTPS──▶ Supabase ┼─ Postgres + RLS: ogni riga visibile solo a chi deve
atleta  ──┘                 └─ funzioni crea_invito / riscatta_invito
interfacce: hosting statico (GitHub Pages, Netlify, Cloudflare Pages)
```

- Nessun server da gestire: il browser legge e scrive direttamente nel database.
- Le policy RLS (`supabase/migrations/…_schema.sql`) decidono tutto: il trainer
  vede i suoi atleti; l'atleta vede il proprio record, la scheda attiva e le
  proprie sedute; per le sedute trainer e "registrata da" li imposta il
  database, non il client; `trainer_id` e `utente_id` non sono scrivibili.

```bash
cd trainer/supabase-b
npm install && npm test        # 15 test delle policy su Postgres (PGlite)
supabase link --project-ref <progetto>
supabase db push
```

Poi in `web/core/config.js`: `backend: 'supabase'` con `url` e `anonKey` del
progetto (la anon key è pubblica per design).

## Confronto

| | A · Node + SQLite | B · Supabase |
|---|---|---|
| Codice backend da mantenere | ~600 righe JavaScript | solo SQL (schema, policy, due funzioni) |
| Dove sta la sicurezza | nel codice del server | nelle policy del database |
| Login | email + password fatti in casa | Supabase Auth: reset password, magic link, Google, Apple |
| Costi iniziali | una VPS da ~5 €/mese | piano gratuito, poi 25 $/mese |
| Scalabilità | una macchina; oltre serve Postgres | gestita |
| Backup | da configurare (Litestream) | inclusi nel piano a pagamento |
| Dipendenza da fornitori | nessuna | Supabase (Postgres standard: migrabile) |
| Pagamenti, notifiche, report | naturali nel server | funzioni e webhook |
| Dati in UE (GDPR) | dove si installa il server | regione Francoforte |

## Le interfacce

| | Per chi / quando | Punti di forza |
|---|---|---|
| **Studio** (trainer) | alla scrivania | atleti con stato (in regola / da sentire / senza scheda) e stato dell'app, tutte le schede dell'atleta con "+ Nuova scheda", bozze e attivazione, giorni ed esercizi modificabili, inviti, storico con grafici e sedute dell'atleta evidenziate |
| **Campo** (trainer) | in sala con il telefono | agenda del giorno, un esercizio alla volta, carichi digitati o con +/−, timer di recupero |
| **Builder** (trainer) | costruzione delle schede | libreria, trascina e riordina, note per l'atleta, anteprima di ciò che vede l'atleta |
| **App atleta** | l'atleta, dal suo telefono | settimana con allenamenti fatti, seduta di oggi, scheda con "come si fa", allenamento guidato con kg e ripetizioni da tastiera (o +/−), progressi e costanza |

## Prima della produzione

- **GDPR**: "zone da proteggere" e note sono dati relativi alla salute (art. 9):
  consenso esplicito dell'atleta, informativa, accordo sul trattamento tra
  piattaforma e trainer.
- Reset password in autonomia (in A) ed email automatiche.
- Abbonamenti dei trainer (Stripe).
- Notifiche all'atleta quando cambia la scheda.
- Studi con più trainer che condividono gli atleti.
- Test dell'adattatore Supabase su un progetto reale (le policy sono testate su
  Postgres, l'adattatore no).
