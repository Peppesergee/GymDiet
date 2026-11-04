// Verifica delle policy RLS su un Postgres vero (PGlite, in memoria).
// Simula quel tanto di Supabase che serve: lo schema auth, auth.uid() letto
// dal JWT della richiesta e il ruolo "authenticated".
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ANNA = '11111111-1111-4111-8111-111111111111';
const BRUNO = '22222222-2222-4222-8222-222222222222';
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
`;

/** Esegue `fn` come l'utente indicato, dentro una transazione annullata alla fine se `annulla`. */
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

before(async () => {
  db = new PGlite();
  await db.exec(STUB_SUPABASE);
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(f, dir), 'utf8'));
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values
    ('${ANNA}', '{"nome":"Anna PT"}'), ('${BRUNO}', '{"nome":"Bruno"}')`);
});

let idCliente, idProg1;

test('alla registrazione nasce il profilo del trainer', async () => {
  const r = await righe('select nome from public.profili_trainer order by nome');
  assert.deepEqual(r.map(x => x.nome), ['Anna PT', 'Bruno']);
});

test('trainer_id preso dal JWT', async () => {
  const [c] = await come(ANNA, () => righe(`insert into public.clienti (nome, profilo) values ('Marco', '{"obiettivo":"massa"}') returning id, trainer_id`));
  assert.equal(c.trainer_id, ANNA);
  idCliente = c.id;
});

test('Bruno non vede ne\' modifica i clienti di Anna', async () => {
  assert.equal((await come(BRUNO, () => righe('select * from public.clienti'))).length, 0);
  assert.equal((await come(BRUNO, () => righe('select * from public.clienti_riepilogo'))).length, 0, 'la vista rispetta le policy');
  const agg = await come(BRUNO, () => db.query(`update public.clienti set nome = 'Rubato' where id = $1`, [idCliente]));
  assert.equal(agg.affectedRows, 0);
  const del = await come(BRUNO, () => db.query('delete from public.clienti where id = $1', [idCliente]));
  assert.equal(del.affectedRows, 0);
  assert.equal((await come(ANNA, () => righe('select nome from public.clienti')))[0].nome, 'Marco');
});

test('Bruno non puo\' creare righe a nome di Anna', async () => {
  await assert.rejects(come(BRUNO, () => db.query(`insert into public.clienti (nome, trainer_id) values ('X', $1)`, [ANNA])), /row-level security/);
});

test('Bruno non puo\' agganciare programmi o sedute al cliente di Anna', async () => {
  await assert.rejects(come(BRUNO, () => db.query(
    `insert into public.programmi (cliente_id, nome, stato, scheda) values ($1, 'X', 'bozza', '{}')`, [idCliente])), /row-level security/);
  await assert.rejects(come(BRUNO, () => db.query(
    `insert into public.sedute (cliente_id, data) values ($1, '2026-11-01')`, [idCliente])), /row-level security/);
});

test('un solo programma attivo per cliente (trigger)', async () => {
  const [p1] = await come(ANNA, () => righe(`insert into public.programmi (cliente_id, nome, stato, scheda) values ($1, 'Blocco 1', 'attivo', '{"sessioni":[]}') returning id`, [idCliente]));
  idProg1 = p1.id;
  await come(ANNA, () => righe(`insert into public.programmi (cliente_id, nome, stato, scheda) values ($1, 'Blocco 2', 'attivo', '{"sessioni":[]}')`, [idCliente]));
  let r = await come(ANNA, () => righe('select nome, stato from public.programmi order by nome'));
  assert.deepEqual(r.map(x => `${x.nome}:${x.stato}`), ['Blocco 1:archiviato', 'Blocco 2:attivo']);
  await come(ANNA, () => db.query(`update public.programmi set stato = 'attivo' where id = $1`, [idProg1]));
  r = await come(ANNA, () => righe('select nome, stato from public.programmi order by nome'));
  assert.deepEqual(r.map(x => `${x.nome}:${x.stato}`), ['Blocco 1:attivo', 'Blocco 2:archiviato']);
});

test('riepilogo con ultima seduta e programma attivo', async () => {
  await come(ANNA, () => db.query(`insert into public.sedute (cliente_id, programma_id, data, esercizi) values ($1, $2, '2026-11-02', '[]')`, [idCliente, idProg1]));
  const [r] = await come(ANNA, () => righe('select ultima_seduta::text as u, programma_attivo_nome from public.clienti_riepilogo'));
  assert.equal(r.u, '2026-11-02');
  assert.equal(r.programma_attivo_nome, 'Blocco 1');
});

test('esercizi personali isolati, id generato dal database', async () => {
  const [e] = await come(ANNA, () => righe(`insert into public.esercizi_personali (nome, dati) values ('Hack squat', '{}') returning id`));
  assert.match(e.id, /^pt-/);
  assert.equal((await come(BRUNO, () => righe('select * from public.esercizi_personali'))).length, 0);
});

test('senza accesso (anon) non si legge nulla', async () => {
  await db.exec('begin; set local role anon;');
  await assert.rejects(db.query('select * from public.clienti'), /permission denied/);
  await db.exec('rollback');
});
