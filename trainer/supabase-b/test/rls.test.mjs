// Verifica delle policy RLS su un Postgres vero (PGlite, in memoria).
// Simula quel tanto di Supabase che serve: lo schema auth, auth.uid() letto
// dal JWT della richiesta e i ruoli "authenticated" e "anon".
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ANNA = '11111111-1111-4111-8111-111111111111';   // trainer
const BRUNO = '22222222-2222-4222-8222-222222222222';  // trainer
const MARCO = '33333333-3333-4333-8333-333333333333';  // utente atleta
const LUCA = '44444444-4444-4444-8444-444444444444';   // utente atleta
let db;

const STUB_SUPABASE = `
  create role authenticated nologin;
  create role anon nologin;
  create schema auth;
  grant usage on schema auth to authenticated, anon;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to authenticated, anon;
  grant usage on schema public to authenticated, anon;
  -- come in Supabase: privilegi di default ampi, che la migrazione deve restringere
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

/** Esegue `fn` come l'utente indicato, in una transazione. */
async function come(utente, fn) {
  await db.exec('begin');
  try {
    await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${utente}', true);`);
    const r = await fn();
    await db.exec('commit');
    return r;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
const righe = async (sql, p) => (await db.query(sql, p)).rows;
const q1 = (utente, sql, p) => come(utente, () => righe(sql, p));

before(async () => {
  db = new PGlite();
  await db.exec(STUB_SUPABASE);
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(f, dir), 'utf8'));
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values
    ('${ANNA}', '{"nome":"Anna PT"}'), ('${BRUNO}', '{"nome":"Bruno"}'),
    ('${MARCO}', '{"nome":"Marco","ruolo":"atleta"}'), ('${LUCA}', '{"nome":"Luca","ruolo":"atleta"}')`);
});

let idMarco, idLuca, idAttiva, idBozza;

// ---------------------------------------------------------------- trainer
test('profili creati alla registrazione con il ruolo giusto', async () => {
  const r = await righe('select nome, ruolo from public.profili order by nome');
  assert.deepEqual(r.map(x => `${x.nome}:${x.ruolo}`), ['Anna PT:trainer', 'Bruno:trainer', 'Luca:atleta', 'Marco:atleta']);
});

test('il trainer crea atleti; trainer_id preso dal JWT', async () => {
  const [a] = await q1(ANNA, `insert into public.atleti (nome, profilo) values ('Marco Rossi', '{"obiettivo":"massa"}') returning id, trainer_id`);
  assert.equal(a.trainer_id, ANNA);
  idMarco = a.id;
  idLuca = (await q1(ANNA, `insert into public.atleti (nome) values ('Luca Ferri') returning id`))[0].id;
});

test('nessun client puo\' impostare trainer_id o utente_id', async () => {
  await assert.rejects(q1(BRUNO, `insert into public.atleti (nome, trainer_id) values ('X', $1)`, [ANNA]), /permission denied/);
  await assert.rejects(q1(ANNA, `update public.atleti set utente_id = $1 where id = $2`, [MARCO, idMarco]), /permission denied/);
});

test('Bruno non vede ne\' modifica gli atleti di Anna', async () => {
  assert.equal((await q1(BRUNO, 'select * from public.atleti')).length, 0);
  assert.equal((await q1(BRUNO, 'select * from public.atleti_riepilogo')).length, 0, 'la vista rispetta le policy');
  assert.equal((await come(BRUNO, () => db.query(`update public.atleti set nome = 'Rubato' where id = $1`, [idMarco]))).affectedRows, 0);
  assert.equal((await come(BRUNO, () => db.query('delete from public.atleti where id = $1', [idMarco]))).affectedRows, 0);
  await assert.rejects(q1(BRUNO, `insert into public.programmi (atleta_id, nome, stato, scheda) values ($1, 'X', 'bozza', '{}')`, [idMarco]), /row-level security/);
  await assert.rejects(q1(BRUNO, `insert into public.sedute (atleta_id, data) values ($1, '2026-11-01')`, [idMarco]), /row-level security/);
  await assert.rejects(q1(BRUNO, 'select public.crea_invito($1)', [idMarco]), /row-level security/);
});

test('una sola scheda attiva per atleta (trigger)', async () => {
  const [p1] = await q1(ANNA, `insert into public.programmi (atleta_id, nome, stato, scheda) values ($1, 'Blocco 1', 'attivo', '{"sessioni":[]}') returning id`, [idMarco]);
  const [p2] = await q1(ANNA, `insert into public.programmi (atleta_id, nome, stato, scheda) values ($1, 'Blocco 2', 'attivo', '{"sessioni":[]}') returning id`, [idMarco]);
  const r = await q1(ANNA, 'select nome, stato from public.programmi order by nome');
  assert.deepEqual(r.map(x => `${x.nome}:${x.stato}`), ['Blocco 1:archiviato', 'Blocco 2:attivo']);
  idAttiva = p2.id;
  idBozza = (await q1(ANNA, `insert into public.programmi (atleta_id, nome, stato, scheda) values ($1, 'Bozza', 'bozza', '{"sessioni":[]}') returning id`, [idMarco]))[0].id;
  assert.ok(p1.id);
});

// ---------------------------------------------------------------- atleta
let codice;
test('il trainer crea il codice invito, il database ne tiene solo l\'hash', async () => {
  [{ crea_invito: codice }] = await q1(ANNA, 'select public.crea_invito($1)', [idMarco]);
  assert.match(codice, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  const inviti = await righe('select codice_hash from public.inviti');
  assert.equal(inviti.length, 1);
  assert.notEqual(inviti[0].codice_hash, codice);
  const [r] = await q1(ANNA, 'select account_attivo, invito_scade is not null as in_sospeso from public.atleti_riepilogo where id = $1', [idMarco]);
  assert.deepEqual(r, { account_attivo: false, in_sospeso: true });
});

test('un trainer non puo\' usare un codice: solo account atleta', async () => {
  await assert.rejects(q1(BRUNO, 'select public.riscatta_invito($1)', [codice]), /non e' un account atleta/);
});

test('l\'atleta riscatta il codice (anche minuscolo, senza trattino) e una volta sola', async () => {
  const [r] = await q1(MARCO, 'select public.riscatta_invito($1)', [codice.toLowerCase().replace('-', '')]);
  assert.equal(r.riscatta_invito, idMarco);
  await assert.rejects(q1(LUCA, 'select public.riscatta_invito($1)', [codice]), /non valido o scaduto/);
  const [x] = await q1(ANNA, 'select account_attivo from public.atleti_riepilogo where id = $1', [idMarco]);
  assert.equal(x.account_attivo, true);
});

test('codice scaduto rifiutato', async () => {
  const [{ crea_invito: c }] = await q1(ANNA, 'select public.crea_invito($1)', [idLuca]);
  await db.query(`update public.inviti set scade_il = now() - interval '1 minute' where atleta_id = $1`, [idLuca]);
  await assert.rejects(q1(LUCA, 'select public.riscatta_invito($1)', [c]), /non valido o scaduto/);
});

test('l\'atleta vede il proprio record, la scheda attiva e il nome del trainer', async () => {
  const atleti = await q1(MARCO, 'select id, nome from public.atleti');
  assert.deepEqual(atleti.map(a => a.nome), ['Marco Rossi']);
  const schede = await q1(MARCO, 'select id, stato from public.programmi');
  assert.deepEqual(schede, [{ id: idAttiva, stato: 'attivo' }], 'niente bozze ne\' archiviate');
  const prof = await q1(MARCO, 'select nome from public.profili order by nome');
  assert.deepEqual(prof.map(p => p.nome), ['Anna PT', 'Marco']);
  assert.equal((await q1(LUCA, 'select * from public.programmi')).length, 0, 'Luca non e\' collegato a nessun atleta');
});

test('l\'atleta registra una seduta: trainer e origine li decide il database', async () => {
  const [s] = await q1(MARCO, `insert into public.sedute (atleta_id, programma_id, data, esercizi, trainer_id, origine)
    values ($1, $2, '2026-11-04', '[]', $3, 'trainer') returning trainer_id, origine`, [idMarco, idAttiva, BRUNO]);
  assert.deepEqual(s, { trainer_id: ANNA, origine: 'atleta' });
  const [vista] = await q1(ANNA, 'select origine from public.sedute where atleta_id = $1', [idMarco]);
  assert.equal(vista.origine, 'atleta');
  assert.equal((await q1(MARCO, 'select * from public.sedute')).length, 1);
});

test('l\'atleta non scrive per altri, non modifica, non agisce da trainer', async () => {
  await assert.rejects(q1(MARCO, `insert into public.sedute (atleta_id, data) values ($1, '2026-11-04')`, [idLuca]), /row-level security/);
  await assert.rejects(q1(MARCO, `insert into public.sedute (atleta_id, programma_id, data) values ($1, $2, '2026-11-04')`, [idMarco, idBozza]), /row-level security/,
    'una scheda non visibile non si puo\' collegare');
  assert.equal((await come(MARCO, () => db.query(`update public.programmi set nome = 'mia' where id = $1`, [idAttiva]))).affectedRows, 0);
  assert.equal((await come(MARCO, () => db.query('delete from public.sedute'))).affectedRows, 0);
  await assert.rejects(q1(MARCO, `insert into public.atleti (nome) values ('Finto atleta')`), /row-level security/);
  await assert.rejects(q1(MARCO, `insert into public.esercizi_personali (nome, dati) values ('X', '{}')`), /row-level security/);
  await assert.rejects(q1(MARCO, 'select public.crea_invito($1)', [idMarco]), /row-level security/);
});

test('esercizi personali: del trainer, leggibili dai suoi atleti', async () => {
  const [e] = await q1(ANNA, `insert into public.esercizi_personali (nome, dati) values ('Hack squat', '{}') returning id`);
  assert.match(e.id, /^pt-/);
  assert.equal((await q1(MARCO, 'select * from public.esercizi_personali')).length, 1);
  assert.equal((await q1(BRUNO, 'select * from public.esercizi_personali')).length, 0);
  assert.equal((await q1(LUCA, 'select * from public.esercizi_personali')).length, 0);
});

test('un nuovo codice ricollega l\'atleta a un altro account (reimpostazione)', async () => {
  const [{ crea_invito: c }] = await q1(ANNA, 'select public.crea_invito($1)', [idMarco]);
  await q1(LUCA, 'select public.riscatta_invito($1)', [c]);
  assert.equal((await q1(MARCO, 'select * from public.atleti')).length, 0, 'il vecchio account perde l\'accesso');
  assert.equal((await q1(LUCA, 'select nome from public.atleti'))[0].nome, 'Marco Rossi');
});

test('senza accesso (anon) non si legge nulla', async () => {
  await db.exec('begin; set local role anon;');
  await assert.rejects(db.query('select * from public.atleti'), /permission denied/);
  await db.exec('rollback');
  await db.exec('begin; set local role anon;');
  await assert.rejects(db.query(`select public.crea_invito('${ANNA}')`), /permission denied/);
  await db.exec('rollback');
});
