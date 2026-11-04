// Test dell'API dell'architettura A con il test runner di Node.
// Server vero su porta casuale, database in memoria, Claude simulato.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { creaApp } from '../src/server.js';
import { apriDb } from '../src/db.js';
import { creaGeneratore } from '../src/ai.js';
import { generaScheda } from '../../shared/programmi.js';

let server, base, chiamateClaude = [];

const finto = {
  beta: {
    messages: {
      async create(params) {
        chiamateClaude.push(params);
        return {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: JSON.stringify({
            nome: 'Hack squat', gruppo: 'quadricipiti', pattern: 'squat', tipo: 'multi', livello: 2,
            attrezzatura: ['palestra'], anim_simile: 'squat', muscoli_primari: ['Quadricipiti'],
            muscoli_secondari: ['Glutei'], setup: ['Schiena contro lo schienale.'], esecuzione: ['Scendi controllando.'],
            errori: ['Talloni che si staccano.'], respiro: 'Inspira scendendo.', tempo: '2-0-1-0'
          }) }]
        };
      }
    }
  }
};

before(async () => {
  const app = creaApp({ db: apriDb(':memory:'), generatore: creaGeneratore({ client: finto }) });
  server = createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

/** Piccolo client con cookie, come un browser. */
function cliente() {
  let cookie = '';
  return async function api(metodo, percorso, corpo, extra = {}) {
    const r = await fetch(base + percorso, {
      method: metodo,
      headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...extra },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const testo = await r.text();
    return { stato: r.status, dati: testo ? JSON.parse(testo) : null, cookie: sc };
  };
}

const anna = cliente();
const bruno = cliente();
let idCliente, idProgramma;

test('registrazione e cookie httpOnly', async () => {
  const r = await anna('POST', '/api/auth/registrazione', { nome: 'Anna PT', email: 'anna@esempio.it', password: 'password-sicura' });
  assert.equal(r.stato, 201);
  assert.match(r.cookie, /HttpOnly/);
  assert.match(r.cookie, /SameSite=Lax/);
  assert.equal(r.dati.trainer.email, 'anna@esempio.it');
  assert.equal((await bruno('POST', '/api/auth/registrazione', { nome: 'Bruno', email: 'bruno@esempio.it', password: 'altra-password' })).stato, 201);
});

test('email duplicata e password corta rifiutate', async () => {
  const c = cliente();
  assert.equal((await c('POST', '/api/auth/registrazione', { nome: 'X', email: 'ANNA@esempio.it', password: 'password-sicura' })).stato, 409);
  assert.equal((await c('POST', '/api/auth/registrazione', { nome: 'X', email: 'x@esempio.it', password: 'corta' })).stato, 400);
});

test('senza accesso: 401', async () => {
  assert.equal((await cliente()('GET', '/api/clienti')).stato, 401);
});

test('password sbagliata: 401, giusta: 200', async () => {
  const c = cliente();
  assert.equal((await c('POST', '/api/auth/accesso', { email: 'anna@esempio.it', password: 'nope-nope' })).stato, 401);
  const ok = await c('POST', '/api/auth/accesso', { email: 'anna@esempio.it', password: 'password-sicura' });
  assert.equal(ok.stato, 200);
  assert.equal((await c('GET', '/api/auth/io')).dati.trainer.nome, 'Anna PT');
});

test('crea cliente con validazione', async () => {
  assert.equal((await anna('POST', '/api/clienti', { nome: '' })).stato, 400);
  assert.equal((await anna('POST', '/api/clienti', { nome: 'Marco', giorniSettimana: [1] })).stato, 400);
  const r = await anna('POST', '/api/clienti', { nome: 'Marco Rossi', obiettivo: 'massa', esperienza: 'intermedio', giorniSettimana: [0, 1, 3, 4] });
  assert.equal(r.stato, 201);
  assert.equal(r.dati.obiettivo, 'massa');
  assert.equal(r.dati.durataSessione, 60, 'i campi mancanti prendono il predefinito');
  idCliente = r.dati.id;
});

test('isolamento: Bruno non vede ne\' modifica i clienti di Anna', async () => {
  assert.deepEqual((await bruno('GET', '/api/clienti')).dati, []);
  assert.equal((await bruno('GET', `/api/clienti/${idCliente}`)).stato, 404);
  assert.equal((await bruno('PATCH', `/api/clienti/${idCliente}`, { nome: 'Rubato' })).stato, 404);
  assert.equal((await bruno('DELETE', `/api/clienti/${idCliente}`)).stato, 404);
  assert.equal((await bruno('POST', `/api/clienti/${idCliente}/programmi`, { nome: 'X', scheda: { sessioni: [] } })).stato, 404);
  assert.equal((await bruno('POST', `/api/clienti/${idCliente}/sedute`, { data: '2026-11-01', esercizi: [] })).stato, 404);
  assert.equal((await anna('GET', `/api/clienti/${idCliente}`)).dati.nome, 'Marco Rossi');
});

test('programma: un solo attivo per cliente', async () => {
  const cl = (await anna('GET', `/api/clienti/${idCliente}`)).dati;
  const scheda = generaScheda(cl, { seed: 't1' });
  const p1 = await anna('POST', `/api/clienti/${idCliente}/programmi`, { nome: 'Blocco 1', stato: 'attivo', scheda });
  assert.equal(p1.stato, 201);
  const p2 = await anna('POST', `/api/clienti/${idCliente}/programmi`, { nome: 'Blocco 2', stato: 'attivo', scheda });
  assert.equal(p2.stato, 201);
  const lista = (await anna('GET', `/api/clienti/${idCliente}/programmi`)).dati;
  assert.deepEqual(lista.map(p => [p.nome, p.stato]).sort(), [['Blocco 1', 'archiviato'], ['Blocco 2', 'attivo']]);
  idProgramma = p2.dati.id;
  assert.equal((await anna('GET', '/api/clienti')).dati[0].programmaAttivo.nome, 'Blocco 2');
  // riattivare il primo archivia il secondo
  await anna('PUT', `/api/programmi/${p1.dati.id}`, { nome: 'Blocco 1', stato: 'attivo', scheda });
  const dopo = (await anna('GET', `/api/clienti/${idCliente}/programmi`)).dati;
  assert.equal(dopo.filter(p => p.stato === 'attivo').length, 1);
  assert.equal(dopo.find(p => p.stato === 'attivo').nome, 'Blocco 1');
  assert.equal((await bruno('PUT', `/api/programmi/${p1.dati.id}`, { nome: 'X', stato: 'bozza', scheda })).stato, 404);
});

test('programma non valido rifiutato', async () => {
  assert.equal((await anna('POST', `/api/clienti/${idCliente}/programmi`, { nome: 'X', scheda: { niente: 1 } })).stato, 400);
});

test('sedute: registrazione e ultima seduta nel riepilogo', async () => {
  const r = await anna('POST', `/api/clienti/${idCliente}/sedute`, {
    data: '2026-11-02', programmaId: idProgramma, nomeSessione: 'Upper',
    esercizi: [{ esercizioId: 'panca-piana-bilanciere', nome: 'Panca', serie: [{ peso: 80, rip: 8 }, { peso: 80, rip: 7 }] }]
  });
  assert.equal(r.stato, 201);
  const sedute = (await anna('GET', `/api/clienti/${idCliente}/sedute`)).dati;
  assert.equal(sedute.length, 1);
  assert.equal(sedute[0].esercizi[0].serie[0].peso, 80);
  assert.equal((await anna('GET', '/api/clienti')).dati[0].ultimaSeduta, '2026-11-02');
  assert.equal((await anna('POST', `/api/clienti/${idCliente}/sedute`, { data: 'ieri' })).stato, 400);
});

test('esercizio generato con Claude: chiave sul server, salvato solo per chi lo chiede', async () => {
  const r = await anna('POST', '/api/esercizi/genera', { nome: 'hack squat' });
  assert.equal(r.stato, 201);
  assert.equal(r.dati.nome, 'Hack squat');
  assert.match(r.dati.id, /^pt-/);
  const p = chiamateClaude.at(-1);
  assert.equal(p.model, 'claude-opus-5-5');
  assert.equal(p.output_config.format.type, 'json_schema');
  assert.equal(p.output_config.effort, 'low');
  assert.equal((await anna('GET', '/api/esercizi-personali')).dati.length, 1);
  assert.equal((await bruno('GET', '/api/esercizi-personali')).dati.length, 0);
});

test('senza chiave sul server: 503 chiaro', async () => {
  const app = creaApp({ db: apriDb(':memory:'), generatore: creaGeneratore({ apiKey: '' }) });
  const s = createServer(app);
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const b = `http://127.0.0.1:${s.address().port}`;
  const reg = await fetch(b + '/api/auth/registrazione', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nome: 'Z', email: 'z@z.it', password: '12345678' }) });
  const cookie = reg.headers.get('set-cookie').split(';')[0];
  const r = await fetch(b + '/api/esercizi/genera', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{"nome":"hack squat"}' });
  assert.equal(r.status, 503);
  assert.match((await r.json()).errore, /ANTHROPIC_API_KEY/);
  s.close();
});

test('CSRF: scrittura da altra origine o non JSON rifiutata', async () => {
  assert.equal((await anna('POST', '/api/clienti', { nome: 'X' }, { origin: 'https://sito-malevolo.example' })).stato, 403);
  const r = await fetch(base + '/api/auth/accesso', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a' });
  assert.equal(r.status, 415);
});

test('uscita invalida il token', async () => {
  const c = cliente();
  await c('POST', '/api/auth/accesso', { email: 'bruno@esempio.it', password: 'altra-password' });
  assert.equal((await c('GET', '/api/clienti')).stato, 200);
  await c('POST', '/api/auth/uscita', {});
  assert.equal((await c('GET', '/api/clienti')).stato, 401);
});

test('file statici: interfacce, codice condiviso, config REST, niente path traversal', async () => {
  const cfg = await (await fetch(base + '/core/config.js')).text();
  assert.match(cfg, /backend: 'rest'/);
  const sh = await fetch(base + '/shared/programmi.js');
  assert.equal(sh.status, 200);
  assert.match(sh.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(base + '/shared/..%2f..%2fserver-a%2fgymcoach.db')).status, 404);
  assert.equal((await fetch(base + '/..%2fserver-a%2fschema.sql')).status, 404);
});

test('eliminazione cliente a cascata', async () => {
  assert.equal((await anna('DELETE', `/api/clienti/${idCliente}`)).stato, 204);
  assert.equal((await anna('GET', `/api/clienti/${idCliente}`)).stato, 404);
});
