// Test dell'API dell'architettura A con il test runner di Node.
// Server vero su porta casuale, database in memoria.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { creaApp } from '../src/server.js';
import { apriDb } from '../src/db.js';
import { generaScheda } from '../../shared/programmi.js';

let server, base;

before(async () => {
  server = createServer(creaApp({ db: apriDb(':memory:') }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

/** Piccolo client con cookie, come un browser. */
function utente() {
  const cookie = new Map();
  return async function api(metodo, percorso, corpo, extra = {}) {
    const r = await fetch(base + percorso, {
      method: metodo,
      headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(cookie.size ? { cookie: [...cookie.values()].join('; ') } : {}), ...extra },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    const sc = r.headers.get('set-cookie');
    if (sc) { const coppia = sc.split(';')[0]; cookie.set(coppia.split('=')[0], coppia); }
    const testo = await r.text();
    return { stato: r.status, dati: testo ? JSON.parse(testo) : null, cookie: sc };
  };
}

const anna = utente();     // trainer
const bruno = utente();    // altro trainer
const marco = utente();    // atleta di Anna
const luca = utente();     // altro atleta di Anna
let idMarco, idLuca, idScheda, codiceMarco;

// ---------------------------------------------------------------- trainer
test('registrazione trainer e cookie httpOnly', async () => {
  const r = await anna('POST', '/api/auth/registrazione', { nome: 'Anna PT', email: 'anna@esempio.it', password: 'password-sicura' });
  assert.equal(r.stato, 201);
  assert.match(r.cookie, /^gc_accesso=.*HttpOnly.*SameSite=Lax/);
  assert.equal((await bruno('POST', '/api/auth/registrazione', { nome: 'Bruno', email: 'bruno@esempio.it', password: 'altra-password' })).stato, 201);
});

test('email duplicata e password corta rifiutate', async () => {
  const c = utente();
  assert.equal((await c('POST', '/api/auth/registrazione', { nome: 'X', email: 'ANNA@esempio.it', password: 'password-sicura' })).stato, 409);
  assert.equal((await c('POST', '/api/auth/registrazione', { nome: 'X', email: 'x@esempio.it', password: 'corta' })).stato, 400);
});

test('senza accesso: 401', async () => {
  assert.equal((await utente()('GET', '/api/atleti')).stato, 401);
});

test('crea atleti con validazione', async () => {
  assert.equal((await anna('POST', '/api/atleti', { nome: '' })).stato, 400);
  assert.equal((await anna('POST', '/api/atleti', { nome: 'Marco', giorniSettimana: [1] })).stato, 400);
  const r = await anna('POST', '/api/atleti', { nome: 'Marco Rossi', obiettivo: 'massa', esperienza: 'intermedio', giorniSettimana: [0, 1, 3, 4] });
  assert.equal(r.stato, 201);
  assert.equal(r.dati.durataSessione, 60, 'i campi mancanti prendono il predefinito');
  assert.equal(r.dati.accountAtleta, false);
  idMarco = r.dati.id;
  idLuca = (await anna('POST', '/api/atleti', { nome: 'Luca Ferri' })).dati.id;
});

test('isolamento: Bruno non vede ne\' modifica gli atleti di Anna', async () => {
  assert.deepEqual((await bruno('GET', '/api/atleti')).dati, []);
  assert.equal((await bruno('GET', `/api/atleti/${idMarco}`)).stato, 404);
  assert.equal((await bruno('PATCH', `/api/atleti/${idMarco}`, { nome: 'Rubato' })).stato, 404);
  assert.equal((await bruno('DELETE', `/api/atleti/${idMarco}`)).stato, 404);
  assert.equal((await bruno('POST', `/api/atleti/${idMarco}/programmi`, { nome: 'X', scheda: { sessioni: [] } })).stato, 404);
  assert.equal((await bruno('POST', `/api/atleti/${idMarco}/invito`, {})).stato, 404);
});

test('schede: una sola attiva per atleta', async () => {
  const at = (await anna('GET', `/api/atleti/${idMarco}`)).dati;
  const scheda = generaScheda(at, { seed: 't1' });
  const p1 = await anna('POST', `/api/atleti/${idMarco}/programmi`, { nome: 'Blocco 1', stato: 'attivo', scheda });
  const p2 = await anna('POST', `/api/atleti/${idMarco}/programmi`, { nome: 'Blocco 2', stato: 'attivo', scheda });
  assert.equal(p2.stato, 201);
  const lista = (await anna('GET', `/api/atleti/${idMarco}/programmi`)).dati;
  assert.deepEqual(lista.map(p => [p.nome, p.stato]).sort(), [['Blocco 1', 'archiviato'], ['Blocco 2', 'attivo']]);
  idScheda = p2.dati.id;
  await anna('POST', `/api/atleti/${idMarco}/programmi`, { nome: 'Bozza futura', stato: 'bozza', scheda });
  assert.equal((await anna('POST', `/api/atleti/${idMarco}/programmi`, { nome: 'X', scheda: { niente: 1 } })).stato, 400);
  assert.equal((await bruno('PUT', `/api/programmi/${p1.dati.id}`, { nome: 'X', stato: 'bozza', scheda })).stato, 404);
});

test('esercizio personale creato a mano, validato e isolato', async () => {
  assert.equal((await anna('POST', '/api/esercizi-personali', { nome: 'Hack squat', gruppo: 'inventato', esecuzione: 'x' })).stato, 400);
  const r = await anna('POST', '/api/esercizi-personali', { nome: 'Hack squat', gruppo: 'quadricipiti', tipo: 'multi', anim: 'squat', esecuzione: 'Schiena contro lo schienale\nScendi controllando' });
  assert.equal(r.stato, 201);
  assert.match(r.dati.id, /^pt-/);
  assert.deepEqual(r.dati.esecuzione, ['Schiena contro lo schienale', 'Scendi controllando']);
  assert.equal((await bruno('GET', '/api/esercizi-personali')).dati.length, 0);
});

// ---------------------------------------------------------------- atleta
test('invito: codice formato XXXX-XXXX, stato visibile al trainer', async () => {
  const r = await anna('POST', `/api/atleti/${idMarco}/invito`, {});
  assert.equal(r.stato, 201);
  assert.match(r.dati.codice, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  codiceMarco = r.dati.codice;
  const at = (await anna('GET', `/api/atleti/${idMarco}`)).dati;
  assert.ok(at.invitoScade, 'invito in sospeso');
  assert.equal(at.accountAtleta, false);
});

test('un nuovo codice annulla il precedente', async () => {
  const vecchio = (await anna('POST', `/api/atleti/${idLuca}/invito`, {})).dati.codice;
  const nuovo = (await anna('POST', `/api/atleti/${idLuca}/invito`, {})).dati.codice;
  const r = await luca('POST', '/api/atleta/attiva', { codice: vecchio, email: 'luca@esempio.it', password: 'password-luca' });
  assert.equal(r.stato, 400);
  assert.equal((await luca('POST', '/api/atleta/attiva', { codice: nuovo.toLowerCase().replace('-', ' '), email: 'luca@esempio.it', password: 'password-luca' })).stato, 201,
    'il codice si puo\' scrivere minuscolo e senza trattino');
});

test('attivazione atleta: codice monouso, cookie separato', async () => {
  const r = await marco('POST', '/api/atleta/attiva', { codice: codiceMarco, email: 'marco@esempio.it', password: 'password-marco' });
  assert.equal(r.stato, 201);
  assert.match(r.cookie, /^gc_atleta=.*HttpOnly/);
  assert.equal(r.dati.atleta.nome, 'Marco Rossi');
  assert.equal(r.dati.atleta.trainerNome, 'Anna PT');
  const di_nuovo = await utente()('POST', '/api/atleta/attiva', { codice: codiceMarco, email: 'altro@esempio.it', password: 'password-altro' });
  assert.equal(di_nuovo.stato, 400, 'il codice gia\' usato non funziona piu\'');
  assert.equal((await anna('GET', `/api/atleti/${idMarco}`)).dati.accountAtleta, true);
});

test('email di un altro atleta rifiutata', async () => {
  const c = (await anna('POST', `/api/atleti/${idMarco}/invito`, {})).dati.codice;
  assert.equal((await utente()('POST', '/api/atleta/attiva', { codice: c, email: 'luca@esempio.it', password: 'password-xxx' })).stato, 409);
});

test('l\'atleta vede solo la propria scheda attiva', async () => {
  const r = await marco('GET', '/api/atleta/programma');
  assert.equal(r.stato, 200);
  assert.equal(r.dati.programma.id, idScheda);
  assert.equal(r.dati.programma.stato, 'attivo', 'bozze e archiviate restano del trainer');
  const vuoto = await luca('GET', '/api/atleta/programma');
  assert.equal(vuoto.dati.programma, null, 'Luca non ha ancora una scheda: non vede quella di Marco');
});

test('l\'atleta registra la seduta, il trainer la vede con origine atleta', async () => {
  const r = await marco('POST', '/api/atleta/sedute', {
    data: '2026-11-04', programmaId: idScheda, nomeSessione: 'Upper',
    esercizi: [{ esercizioId: 'panca-piana-bilanciere', nome: 'Panca', serie: [{ peso: 80, rip: 8 }] }]
  });
  assert.equal(r.stato, 201);
  assert.equal(r.dati.origine, 'atleta');
  const viste = (await anna('GET', `/api/atleti/${idMarco}/sedute`)).dati;
  assert.equal(viste.length, 1);
  assert.equal(viste[0].origine, 'atleta');
  assert.equal((await marco('GET', '/api/atleta/sedute')).dati.length, 1);
  assert.equal((await luca('GET', '/api/atleta/sedute')).dati.length, 0);
  // una scheda non sua non viene collegata
  const altra = await luca('POST', '/api/atleta/sedute', { data: '2026-11-04', programmaId: idScheda, esercizi: [] });
  assert.equal(altra.dati.programmaId, null);
});

test('cookie atleta non apre le API del trainer, e viceversa', async () => {
  assert.equal((await marco('GET', '/api/atleti')).stato, 401);
  assert.equal((await marco('GET', `/api/atleti/${idMarco}/sedute`)).stato, 401);
  assert.equal((await anna('GET', '/api/atleta/programma')).stato, 401);
});

test('accesso atleta con password e uscita', async () => {
  const c = utente();
  assert.equal((await c('POST', '/api/atleta/accesso', { email: 'marco@esempio.it', password: 'sbagliata' })).stato, 401);
  assert.equal((await c('POST', '/api/atleta/accesso', { email: 'MARCO@esempio.it', password: 'password-marco' })).stato, 200);
  assert.equal((await c('GET', '/api/atleta/io')).dati.atleta.nome, 'Marco Rossi');
  await c('POST', '/api/atleta/uscita', {});
  assert.equal((await c('GET', '/api/atleta/io')).stato, 401);
});

test('nuovo codice = nuova password (reimpostazione dal trainer)', async () => {
  const c = (await anna('POST', `/api/atleti/${idMarco}/invito`, {})).dati.codice;
  assert.equal((await utente()('POST', '/api/atleta/attiva', { codice: c, email: 'marco@esempio.it', password: 'nuova-password' })).stato, 201);
  assert.equal((await utente()('POST', '/api/atleta/accesso', { email: 'marco@esempio.it', password: 'password-marco' })).stato, 401);
  assert.equal((await marco('GET', '/api/atleta/io')).stato, 401, 'le vecchie sessioni dell\'atleta sono chiuse');
});

// ---------------------------------------------------------------- generali
test('CSRF: scrittura da altra origine o non JSON rifiutata', async () => {
  assert.equal((await anna('POST', '/api/atleti', { nome: 'X' }, { origin: 'https://sito-malevolo.example' })).stato, 403);
  const r = await fetch(base + '/api/atleta/accesso', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a' });
  assert.equal(r.status, 415);
});

test('file statici: app trainer e atleta, config REST, niente path traversal', async () => {
  assert.match(await (await fetch(base + '/core/config.js')).text(), /backend: 'rest'/);
  assert.equal((await fetch(base + '/atleta/')).status, 200);
  assert.equal((await fetch(base + '/shared/programmi.js')).status, 200);
  assert.equal((await fetch(base + '/shared/..%2f..%2fserver-a%2fgymcoach.db')).status, 404);
  assert.equal((await fetch(base + '/..%2fserver-a%2fschema.sql')).status, 404);
});

test('eliminazione atleta a cascata, anche dell\'account', async () => {
  assert.equal((await anna('DELETE', `/api/atleti/${idLuca}`)).stato, 204);
  assert.equal((await luca('GET', '/api/atleta/io')).stato, 401);
});
