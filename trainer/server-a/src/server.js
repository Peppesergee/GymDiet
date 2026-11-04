// Architettura A: un solo processo Node che serve l'API REST e i file delle
// interfacce (trainer e atleta). Nessun framework e nessuna dipendenza
// esterna: node:http + node:sqlite + node:crypto.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { apriDb, Conflitto } from './db.js';
import {
  hashPassword, verificaPassword, nuovoAccesso, leggiCookie, hashToken,
  cookieAccesso, cookieUscita, limitatore, COOKIE, COOKIE_ATLETA
} from './auth.js';
import {
  normalizzaAtleta, validaScheda, validaSeduta, validaEsercizioPersonale, validaCredenziali,
  ErroreValidazione, STATI_PROGRAMMA, normalizzaCodice, formattaCodice, codiceDaByte, GIORNI_VALIDITA_INVITO
} from '../../shared/modello.js';

const RADICE = fileURLToPath(new URL('../../', import.meta.url));
const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json'
};

class ErroreHttp extends Error {
  constructor(stato, messaggio) { super(messaggio); this.stato = stato; }
}
const nonTrovato = () => new ErroreHttp(404, 'Non trovato');

function leggiCorpo(req, limite = 1_000_000) {
  return new Promise((risolvi, rifiuta) => {
    let dati = '';
    req.setEncoding('utf8');
    req.on('data', c => {
      dati += c;
      if (dati.length > limite) { rifiuta(new ErroreHttp(413, 'Richiesta troppo grande')); req.destroy(); }
    });
    req.on('end', () => {
      if (!dati) return risolvi({});
      try { risolvi(JSON.parse(dati)); } catch { rifiuta(new ErroreHttp(400, 'JSON non valido')); }
    });
    req.on('error', rifiuta);
  });
}

function invia(res, stato, corpo, intestazioni = {}) {
  const testo = corpo === undefined ? '' : JSON.stringify(corpo);
  res.writeHead(stato, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...intestazioni });
  res.end(testo);
}

/** Esercizi personali usati nella scheda, per mostrare all'atleta "come si fa". */
function eserciziUsati(scheda, personali) {
  const ids = new Set((scheda?.sessioni || []).flatMap(s => s.esercizi.map(e => e.esercizioId)));
  return personali.filter(e => ids.has(e.id));
}

export function creaApp({ db = apriDb(), sicuro = false } = {}) {
  const limiteAccessi = limitatore({ max: 10 });
  const rotte = [];
  // chi: 'pubblico' | 'trainer' | 'atleta'
  const rotta = (metodo, schema, gestore, chi = 'trainer') => {
    const nomi = [];
    const re = new RegExp('^' + schema.replace(/:(\w+)/g, (_, n) => { nomi.push(n); return '([^/]+)'; }) + '$');
    rotte.push({ metodo, re, nomi, gestore, chi });
  };
  const controllaTentativi = (req, tipo) => {
    if (!limiteAccessi.consenti(tipo + ':' + req.socket.remoteAddress)) throw new ErroreHttp(429, 'Troppi tentativi, riprova piu\' tardi');
  };

  rotta('GET', '/api/salute', ({ res }) => invia(res, 200, { ok: true }), 'pubblico');

  // ================================================================ TRAINER
  function apriAccesso(res, trainer, stato = 200) {
    const { token, scade } = nuovoAccesso((h, s) => db.creaAccesso(h, trainer.id, s));
    invia(res, stato, { trainer }, { 'set-cookie': cookieAccesso(token, scade, sicuro) });
  }

  rotta('POST', '/api/auth/registrazione', async ({ req, res, corpo }) => {
    controllaTentativi(req, 'reg');
    const nome = String(corpo.nome || '').trim().slice(0, 100);
    if (!nome) throw new ErroreValidazione('Inserisci il tuo nome', 'nome');
    const { email, password } = validaCredenziali(corpo.email, corpo.password);
    if (db.trainerPerEmail(email)) throw new ErroreHttp(409, 'Esiste gia\' un account con questa email');
    apriAccesso(res, db.creaTrainer({ nome, email, passwordHash: hashPassword(password) }), 201);
  }, 'pubblico');

  rotta('POST', '/api/auth/accesso', async ({ req, res, corpo }) => {
    controllaTentativi(req, 'acc');
    const riga = db.trainerPerEmail(String(corpo.email || '').trim().toLowerCase());
    if (!riga || !verificaPassword(String(corpo.password || ''), riga.password_hash)) throw new ErroreHttp(401, 'Email o password non corretti');
    apriAccesso(res, { id: riga.id, nome: riga.nome, email: riga.email });
  }, 'pubblico');

  rotta('POST', '/api/auth/uscita', ({ req, res }) => {
    const token = leggiCookie(req, COOKIE);
    if (token) db.eliminaAccesso(hashToken(token));
    invia(res, 200, { ok: true }, { 'set-cookie': cookieUscita(sicuro) });
  }, 'pubblico');

  rotta('GET', '/api/auth/io', ({ res, trainer }) => invia(res, 200, { trainer }));

  // atleti
  const atletaDi = (tid, id) => db.leggiAtleta(tid, id) || (() => { throw nonTrovato(); })();

  rotta('GET', '/api/atleti', ({ res, tid }) => invia(res, 200, db.elencoAtleti(tid)));
  rotta('POST', '/api/atleti', ({ res, tid, corpo }) => invia(res, 201, db.creaAtleta(tid, normalizzaAtleta(corpo))));
  rotta('GET', '/api/atleti/:id', ({ res, tid, p }) => invia(res, 200, atletaDi(tid, p.id)));
  rotta('PATCH', '/api/atleti/:id', ({ res, tid, p, corpo }) => {
    const a = db.aggiornaAtleta(tid, p.id, normalizzaAtleta(corpo, { parziale: true }));
    if (!a) throw nonTrovato();
    invia(res, 200, a);
  });
  rotta('DELETE', '/api/atleti/:id', ({ res, tid, p }) => {
    if (!db.eliminaAtleta(tid, p.id)) throw nonTrovato();
    invia(res, 204);
  });

  // codice invito per l'app atleta (mostrato una volta sola, salvato come hash)
  rotta('POST', '/api/atleti/:id/invito', ({ res, tid, p }) => {
    atletaDi(tid, p.id);
    const codice = codiceDaByte(randomBytes(8));
    const scade = new Date(Date.now() + GIORNI_VALIDITA_INVITO * 86400000).toISOString();
    db.creaInvito(tid, p.id, hashToken(codice), scade);
    invia(res, 201, { codice: formattaCodice(codice), scadeIl: scade });
  });

  // schede
  function datiProgramma(corpo) {
    const nome = String(corpo.nome || '').trim().slice(0, 120) || 'Scheda';
    const stato = STATI_PROGRAMMA.includes(corpo.stato) ? corpo.stato : 'bozza';
    return { nome, stato, scheda: validaScheda(corpo.scheda) };
  }
  rotta('GET', '/api/atleti/:id/programmi', ({ res, tid, p }) => {
    atletaDi(tid, p.id);
    invia(res, 200, db.programmiAtleta(tid, p.id));
  });
  rotta('POST', '/api/atleti/:id/programmi', ({ res, tid, p, corpo }) => {
    atletaDi(tid, p.id);   // l'atleta deve essere di questo trainer
    invia(res, 201, db.creaProgramma(tid, p.id, datiProgramma(corpo)));
  });
  rotta('PUT', '/api/programmi/:id', ({ res, tid, p, corpo }) => {
    const prog = db.aggiornaProgramma(tid, p.id, datiProgramma(corpo));
    if (!prog) throw nonTrovato();
    invia(res, 200, prog);
  });
  rotta('DELETE', '/api/programmi/:id', ({ res, tid, p }) => {
    if (!db.eliminaProgramma(tid, p.id)) throw nonTrovato();
    invia(res, 204);
  });

  // sedute registrate dal trainer
  rotta('GET', '/api/atleti/:id/sedute', ({ res, tid, p }) => {
    atletaDi(tid, p.id);
    invia(res, 200, db.seduteAtleta(tid, p.id));
  });
  rotta('POST', '/api/atleti/:id/sedute', ({ res, tid, p, corpo }) => {
    atletaDi(tid, p.id);
    const s = validaSeduta(corpo);
    if (s.programmaId && !db.leggiProgramma(tid, s.programmaId)) s.programmaId = null;
    invia(res, 201, db.creaSeduta(tid, p.id, s, 'trainer'));
  });

  // esercizi personali
  rotta('GET', '/api/esercizi-personali', ({ res, tid }) => invia(res, 200, db.eserciziPersonali(tid)));
  rotta('POST', '/api/esercizi-personali', ({ res, tid, corpo }) => invia(res, 201, db.creaEsercizio(tid, validaEsercizioPersonale(corpo))));

  // ================================================================ ATLETA
  function apriAccessoAtleta(res, accountId, atletaId, stato = 200) {
    const { token, scade } = nuovoAccesso((h, s) => db.creaAccessoAtleta(h, accountId, s));
    invia(res, stato, { atleta: db.profiloAtleta(atletaId) }, { 'set-cookie': cookieAccesso(token, scade, sicuro, COOKIE_ATLETA) });
  }

  // primo accesso: codice del trainer + email e password scelte dall'atleta
  rotta('POST', '/api/atleta/attiva', ({ req, res, corpo }) => {
    controllaTentativi(req, 'inv');
    const codice = normalizzaCodice(corpo.codice);
    if (codice.length !== 8) throw new ErroreValidazione('Il codice ha 8 caratteri, ad esempio K7QM-2XPA', 'codice');
    const { email, password } = validaCredenziali(corpo.email, corpo.password);
    let accountId;
    try { accountId = db.riscattaInvito(hashToken(codice), email, hashPassword(password)); } catch (e) {
      if (e instanceof Conflitto) throw new ErroreHttp(409, e.message);
      throw e;
    }
    if (!accountId) throw new ErroreHttp(400, 'Codice non valido o scaduto: chiedine uno nuovo al tuo trainer');
    const account = db.accountPerEmail(email);
    apriAccessoAtleta(res, accountId, account.atleta_id, 201);
  }, 'pubblico');

  rotta('POST', '/api/atleta/accesso', ({ req, res, corpo }) => {
    controllaTentativi(req, 'atl');
    const acc = db.accountPerEmail(String(corpo.email || '').trim().toLowerCase());
    if (!acc || !verificaPassword(String(corpo.password || ''), acc.password_hash)) throw new ErroreHttp(401, 'Email o password non corretti');
    apriAccessoAtleta(res, acc.id, acc.atleta_id);
  }, 'pubblico');

  rotta('POST', '/api/atleta/uscita', ({ req, res }) => {
    const token = leggiCookie(req, COOKIE_ATLETA);
    if (token) db.eliminaAccessoAtleta(hashToken(token));
    invia(res, 200, { ok: true }, { 'set-cookie': cookieUscita(sicuro, COOKIE_ATLETA) });
  }, 'pubblico');

  rotta('GET', '/api/atleta/io', ({ res, aid }) => invia(res, 200, { atleta: db.profiloAtleta(aid) }), 'atleta');

  rotta('GET', '/api/atleta/programma', ({ res, aid }) => {
    const programma = db.programmaPerAtleta(aid);
    const { trainerId } = db.profiloAtleta(aid);
    invia(res, 200, { programma, esercizi: programma ? eserciziUsati(programma.scheda, db.eserciziPersonali(trainerId)) : [] });
  }, 'atleta');

  rotta('GET', '/api/atleta/sedute', ({ res, aid }) => invia(res, 200, db.seduteDellAtleta(aid)), 'atleta');

  rotta('POST', '/api/atleta/sedute', ({ res, aid, corpo }) => {
    const s = validaSeduta(corpo);
    if (s.programmaId && !db.programmaAppartiene(s.programmaId, aid)) s.programmaId = null;
    const { trainerId } = db.profiloAtleta(aid);
    invia(res, 201, db.creaSeduta(trainerId, aid, s, 'atleta'));
  }, 'atleta');

  // ================================================================ file statici
  async function servi(res, percorso) {
    // le interfacce sono le stesse dei prototipi: qui scegliamo il backend REST
    if (percorso === '/core/config.js') {
      res.writeHead(200, { 'content-type': TIPI['.js'], 'cache-control': 'no-store' });
      return res.end("export const CONFIG = { backend: 'rest', base: '' };\n");
    }
    const base = percorso.startsWith('/shared/') ? join(RADICE, 'shared') : join(RADICE, 'web');
    const relativo = percorso.startsWith('/shared/') ? percorso.slice('/shared'.length) : percorso;
    let file = normalize(join(base, decodeURIComponent(relativo)));
    if (!file.startsWith(base + sep) && file !== base) throw nonTrovato();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const dati = await readFile(file);
      res.writeHead(200, { 'content-type': TIPI[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(dati);
    } catch {
      throw nonTrovato();
    }
  }

  // ================================================================ smistamento
  return async function gestisci(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErroreHttp(405, 'Metodo non consentito');
        return await servi(res, url.pathname);
      }
      // protezione CSRF: le scritture devono essere JSON e, se il browser
      // dichiara l'origine, arrivare dalla stessa origine del server
      if (req.method !== 'GET') {
        const tipo = req.headers['content-type'] || '';
        if (req.method !== 'DELETE' && !tipo.startsWith('application/json')) throw new ErroreHttp(415, 'Serve application/json');
        const origine = req.headers.origin;
        if (origine && new URL(origine).host !== req.headers.host) throw new ErroreHttp(403, 'Origine non consentita');
      }
      const r = rotte.find(x => x.metodo === req.method && x.re.test(url.pathname));
      if (!r) throw nonTrovato();
      const m = url.pathname.match(r.re);
      const p = Object.fromEntries(r.nomi.map((n, i) => [n, decodeURIComponent(m[i + 1])]));

      // ogni rotta guarda solo il cookie del proprio tipo di utente
      let trainer = null, aid = null;
      if (r.chi === 'trainer') {
        const token = leggiCookie(req, COOKIE);
        const tid = token && db.trainerDaAccesso(hashToken(token));
        if (tid) trainer = db.trainerPerId(tid);
        if (!trainer) throw new ErroreHttp(401, 'Accesso richiesto');
      } else if (r.chi === 'atleta') {
        const token = leggiCookie(req, COOKIE_ATLETA);
        aid = token && db.atletaDaAccesso(hashToken(token));
        if (!aid) throw new ErroreHttp(401, 'Accesso richiesto');
      }

      const corpo = req.method === 'GET' || req.method === 'DELETE' ? {} : await leggiCorpo(req);
      await r.gestore({ req, res, p, corpo, trainer, tid: trainer && trainer.id, aid });
    } catch (e) {
      if (e instanceof ErroreHttp) return invia(res, e.stato, { errore: e.message });
      if (e instanceof ErroreValidazione) return invia(res, 400, { errore: e.message, campo: e.campo });
      console.error(e);
      invia(res, 500, { errore: 'Errore interno' });
    }
  };
}

// avvio diretto: `node src/server.js`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const porta = Number(process.env.PORT) || 8080;
  const db = apriDb(process.env.DB_PATH || join(RADICE, 'server-a', 'gymcoach.db'));
  setInterval(() => db.pulisciAccessi(), 3600_000).unref();
  const app = creaApp({ db, sicuro: process.env.COOKIE_SECURE === '1' });
  createServer(app).listen(porta, () => {
    console.log(`GymCoach (architettura A) su http://localhost:${porta}`);
    console.log(`  trainer: http://localhost:${porta}/studio/   atleti: http://localhost:${porta}/atleta/`);
  });
}
