# GymDiet

Applicazione web personale (PWA) che genera **una scheda di allenamento** e **una dieta settimanale**
su misura a partire da peso, altezza, età, obiettivo, giorni e durata degli allenamenti.

Funziona interamente nel browser: nessun account, nessun server, nessun dato che esce dal telefono.
Si installa sulla schermata Home dell'iPhone e funziona anche **offline**.

---

## Installazione sull'iPhone

1. Pubblica il sito (vedi *Pubblicazione* qui sotto) e apri l'indirizzo con **Safari**.
2. Tocca il pulsante **Condividi** (il quadrato con la freccia).
3. Scegli **"Aggiungi a Home"** e conferma.
4. Da quel momento l'app si apre a schermo intero, con la sua icona, e funziona anche senza rete.

In *Profilo → Applicazione* trovi la versione installata e il tasto **Aggiorna app**, che svuota la
cache e ricarica l'ultima versione pubblicata senza toccare i tuoi dati.

> I dati (profilo, progressi, allenamenti registrati, pasti spuntati) restano solo su quel telefono,
> nell'archivio locale di Safari. Dalla scheda **Profilo → Backup dei dati** puoi esportare un file
> JSON e reimportarlo su un altro dispositivo.

## Pubblicazione

Il progetto è un sito statico: nessuna build, nessuna dipendenza.

**Opzione A — GitHub Pages.** Una volta sola, in *Settings → Pages → Build and deployment → Source*
scegli **GitHub Actions**: da lì in poi il workflow `.github/workflows/deploy-pages.yml` pubblica a
ogni push. In alternativa scegli **Deploy from a branch**, indica il branch e la cartella `/ (root)`:
in questo caso il workflow non serve. L'indirizzo sarà `https://<utente>.github.io/GymDiet/`.

> Due dettagli scoperti sul campo: il token dei workflow non può creare il sito Pages
> (`Create Pages site failed: Resource not accessible by integration`), quindi il passaggio dai
> Settings va fatto a mano una volta; e l'ambiente `github-pages` creato da GitHub accetta deploy
> **solo dal branch predefinito**, per questo il workflow parte da `main`.

**Opzione B — in locale.** Serve un server HTTP qualsiasi (i moduli ES non funzionano da `file://`):

```bash
npx http-server -p 8080 .      # poi apri http://localhost:8080
```

---

## Cosa fa

### Oggi
Riassunto della giornata: la seduta prevista (con avvio dell'allenamento), i pasti del giorno da
spuntare, le calorie già assunte, la registrazione rapida del peso e il conteggio settimanale.

### Scheda
- Sceglie automaticamente lo **split** in base ai giorni disponibili e all'esperienza:
  Full Body (2-3x), Push/Pull/Legs (3x e 6x), Upper/Lower (4x), PPL + Upper/Lower (5x).
- Numero di esercizi calibrato sulla **durata della seduta**; serie, ripetizioni, recupero e RIR
  in base all'**obiettivo** (forza, massa, dimagrimento, ricomposizione, mantenimento).
- Esclude gli esercizi a rischio per le articolazioni indicate come problematiche (ginocchia,
  spalle, schiena) e filtra per attrezzatura (palestra, casa, corpo libero).
- Ogni esercizio ha una **spiegazione visiva**: una figura animata in SVG che mostra il movimento,
  più preparazione, esecuzione passo-passo, errori tipici, respirazione, muscoli coinvolti e varianti.
- Sedute dello stesso tipo nella settimana usano esercizi diversi, per varietà.
- Modalità allenamento: registri carico e ripetizioni serie per serie, con **timer di recupero**
  (con segnale acustico) e suggerimento di progressione basato sulla seduta precedente.

### Dieta
- Calcola metabolismo basale (Mifflin-St Jeor, oppure Katch-McArdle se indichi la massa grassa),
  fabbisogno giornaliero (attività + allenamenti) e i **macronutrienti** in base all'obiettivo.
- Genera **7 giorni** di menù completi con alimenti reali e **grammature precise**, distribuiti sul
  numero di pasti che preferisci (3-6).
- Le quantità sono calcolate da un ottimizzatore che minimizza lo scarto dai macro giornalieri
  rispettando porzioni minime/massime realistiche: lo scostamento medio è attorno all'1% sulle calorie.
- **Ciclizzazione dei carboidrati**: più carboidrati nei giorni di allenamento, meno nei giorni di riposo.
- Rispetta preferenze e intolleranze (vegetariano, vegano, senza glutine, senza lattosio, niente
  pesce/maiale/uova/frutta secca) e permette di escludere singoli alimenti.
- Ogni alimento è sostituibile con un tocco: le grammature vengono ricalcolate per mantenere i macro.
- **Lista della spesa** settimanale aggregata per categoria.

### Progressi
Grafico del peso con media a 7 giorni, misure corporee, record personali (massimale stimato con la
formula di Epley), volume settimanale sollevato e storico completo delle sedute.

### Profilo
Tutti i dati modificabili, riepilogo del fabbisogno calorico ed export/import dei dati.

---

## Struttura del progetto

```
index.html              pagina unica
manifest.webmanifest    metadati PWA (icona, nome, standalone)
sw.js                   service worker: funzionamento offline
css/app.css             tema chiaro/scuro automatico
js/
  app.js                navigazione e rendering
  store.js              stato persistente su localStorage
  genera.js             rigenerazione di scheda e dieta
  nutrizione.js         BMR, TDEE, macro, ripartizione pasti
  alimenti.js           database alimenti (valori per 100 g)
  dieta.js              generatore del piano settimanale + ottimizzatore
  exercises.js          database esercizi con spiegazioni
  allenamento.js        split, selezione esercizi, serie e ripetizioni
  poses.js              pose chiave delle animazioni
  anim.js               renderer SVG animato
  ui.js                 componenti dell'interfaccia
  views/                le cinque schermate + fogli modali
```

---

## Nota

I piani generati sono indicazioni generiche costruite su formule standard di uso comune.
Non sostituiscono il parere di un medico, di un nutrizionista o di un preparatore, soprattutto in
presenza di patologie, terapie in corso, gravidanza o disturbi alimentari.
