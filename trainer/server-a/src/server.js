// Architettura A: un solo processo Node che serve sia l'API REST sia i file
// delle interfacce. Nessun framework: node:http + node:sqlite bastano per un
// prototipo e tengono le dipendenze a una sola (l'SDK di Claude).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apriDb } from './db.js';
import { creaGeneratore, ErroreAi } from './ai.js';
import {
  hashPassword, verificaPassword, nuovoAccesso, leggiCookie, hashToken,
  cookieAccesso, cookieUscita, limitatore, COOKIE
} from './auth.js';
import { normalizzaCliente, validaScheda, validaSeduta, ErroreValidazione, STATI_PROGRAMMA } from '../../shared/modello.js';

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

export function creaApp({ db = apriDb(), generatore = creaGeneratore(), sicuro = false } = {}) {
  const limiteAccessi = limitatore({ max: 10 });
  const limiteAi = limitatore({ max: 30, finestraMs: 60 * 60000 });
  const rotte = [];
  const rotta = (metodo, schema, gestore, { pubblica = false } = {}) => {
    const nomi = [];
    const re = new RegExp('^' + schema.replace(/:(\w+)/g, (_, n) => { nomi.push(n); return '([^/]+)'; }) + '$');
    rotte.push({ metodo, re, nomi, gestore, pubblica });
  };

  // ---------------------------------------------------------------- accesso
  function apriAccesso(res, trainer, stato = 200) {
    const { token, scade } = nuovoAccesso(db, trainer.id);
    invia(res, stato, { trainer }, { 'set-cookie': cookieAccesso(token, scade, sicuro) });
  }

  rotta('GET', '/api/salute', ({ res }) => invia(res, 200, { ok: true, ai: generatore.disponibile }), { pubblica: true });

  rotta('POST', '/api/auth/registrazione', async ({ req, res, corpo }) => {
    if (!limiteAccessi.consenti('reg:' + req.socket.remoteAddress)) throw new ErroreHttp(429, 'Troppi tentativi, riprova piu\' tardi');
    const nome = String(corpo.nome || '').trim().slice(0, 100);
    const email = String(corpo.email || '').trim().toLowerCase().slice(0, 160);
    const password = String(corpo.password || '');
    if (!nome) throw new ErroreValidazione('Inserisci il tuo nome', 'nome');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErroreValidazione('Email non valida', 'email');
    if (password.length < 8) throw new ErroreValidazione('La password deve avere almeno 8 caratteri', 'password');
    if (db.trainerPerEmail(email)) throw new ErroreHttp(409, 'Esiste gia\' un account con questa email');
    apriAccesso(res, db.creaTrainer({ nome, email, passwordHash: hashPassword(password) }), 201);
  }, { pubblica: true });

  rotta('POST', '/api/auth/accesso', async ({ req, res, corpo }) => {
    if (!limiteAccessi.consenti('acc:' + req.socket.remoteAddress)) throw new ErroreHttp(429, 'Troppi tentativi, riprova piu\' tardi');
    const riga = db.trainerPerEmail(String(corpo.email || '').trim().toLowerCase());
    if (!riga || !verificaPassword(String(corpo.password || ''), riga.password_hash)) throw new ErroreHttp(401, 'Email o password non corretti');
    apriAccesso(res, { id: riga.id, nome: riga.nome, email: riga.email });
  }, { pubblica: true });

  rotta('POST', '/api/auth/uscita', ({ req, res }) => {
    const token = leggiCookie(req, COOKIE);
    if (token) db.eliminaAccesso(hashToken(token));
    invia(res, 200, { ok: true }, { 'set-cookie': cookieUscita(sicuro) });
  }, { pubblica: true });

  rotta('GET', '/api/auth/io', ({ res, trainer }) => invia(res, 200, { trainer }));

  // ---------------------------------------------------------------- clienti
  const clienteDi = (tid, id) => db.leggiCliente(tid, id) || (() => { throw nonTrovato(); })();

  rotta('GET', '/api/clienti', ({ res, tid }) => invia(res, 200, db.elencoClienti(tid)));
  rotta('POST', '/api/clienti', ({ res, tid, corpo }) => invia(res, 201, db.creaCliente(tid, normalizzaCliente(corpo))));
  rotta('GET', '/api/clienti/:id', ({ res, tid, p }) => invia(res, 200, clienteDi(tid, p.id)));
  rotta('PATCH', '/api/clienti/:id', ({ res, tid, p, corpo }) => {
    const c = db.aggiornaCliente(tid, p.id, normalizzaCliente(corpo, { parziale: true }));
    if (!c) throw nonTrovato();
    invia(res, 200, c);
  });
  rotta('DELETE', '/api/clienti/:id', ({ res, tid, p }) => {
    if (!db.eliminaCliente(tid, p.id)) throw nonTrovato();
    invia(res, 204);
  });

  // ---------------------------------------------------------------- programmi
  function datiProgramma(corpo) {
    const nome = String(corpo.nome || '').trim().slice(0, 120) || 'Programma';
    const stato = STATI_PROGRAMMA.includes(corpo.stato) ? corpo.stato : 'bozza';
    return { nome, stato, scheda: validaScheda(corpo.scheda) };
  }
  rotta('GET', '/api/clienti/:id/programmi', ({ res, tid, p }) => {
    clienteDi(tid, p.id);
    invia(res, 200, db.programmiCliente(tid, p.id));
  });
  rotta('POST', '/api/clienti/:id/programmi', ({ res, tid, p, corpo }) => {
    clienteDi(tid, p.id);   // il cliente deve essere di questo trainer
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

  // ---------------------------------------------------------------- sedute
  rotta('GET', '/api/clienti/:id/sedute', ({ res, tid, p }) => {
    clienteDi(tid, p.id);
    invia(res, 200, db.seduteCliente(tid, p.id));
  });
  rotta('POST', '/api/clienti/:id/sedute', ({ res, tid, p, corpo }) => {
    clienteDi(tid, p.id);
    const s = validaSeduta(corpo);
    if (s.programmaId && !db.leggiProgramma(tid, s.programmaId)) s.programmaId = null;
    invia(res, 201, db.creaSeduta(tid, p.id, s));
  });

  // ---------------------------------------------------------------- esercizi
  rotta('GET', '/api/esercizi-personali', ({ res, tid }) => invia(res, 200, db.eserciziPersonali(tid)));
  rotta('POST', '/api/esercizi-personali', ({ res, tid, corpo }) => {
    if (!corpo || !String(corpo.nome || '').trim()) throw new ErroreValidazione('Nome esercizio mancante', 'nome');
    invia(res, 201, db.creaEsercizio(tid, corpo));
  });
  rotta('POST', '/api/esercizi/genera', async ({ res, tid, corpo }) => {
    if (!limiteAi.consenti(tid)) throw new ErroreHttp(429, 'Hai raggiunto il limite orario di generazioni');
    const esercizio = await generatore.genera(corpo.nome);
    invia(res, 201, db.creaEsercizio(tid, esercizio));
  });

  // ---------------------------------------------------------------- file statici
  async function servi(req, res, percorso) {
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

  // ---------------------------------------------------------------- smistamento
  return async function gestisci(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErroreHttp(405, 'Metodo non consentito');
        return await servi(req, res, url.pathname);
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

      let trainer = null;
      const token = leggiCookie(req, COOKIE);
      if (token) {
        const tid = db.trainerDaAccesso(hashToken(token));
        if (tid) trainer = db.trainerPerId(tid);
      }
      if (!r.pubblica && !trainer) throw new ErroreHttp(401, 'Accesso richiesto');

      const corpo = req.method === 'GET' || req.method === 'DELETE' ? {} : await leggiCorpo(req);
      await r.gestore({ req, res, p, corpo, trainer, tid: trainer && trainer.id });
    } catch (e) {
      if (e instanceof ErroreHttp) return invia(res, e.stato, { errore: e.message });
      if (e instanceof ErroreValidazione) return invia(res, 400, { errore: e.message, campo: e.campo });
      if (e instanceof ErroreAi) return invia(res, e.stato, { errore: e.message });
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
  createServer(app).listen(porta, () => console.log(`GymCoach (architettura A) su http://localhost:${porta}`));
}
