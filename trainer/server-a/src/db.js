// Accesso ai dati. Ogni funzione che legge o scrive dati di un trainer
// riceve trainerId come primo argomento e lo mette nella WHERE: non esiste
// una funzione che legga i clienti "di tutti".
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const SCHEMA = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

const json = t => (t ? JSON.parse(t) : null);
const ora = () => new Date().toISOString();

function clienteDaRiga(r) {
  if (!r) return null;
  const { profilo, trainer_id, creato_il, ultima_seduta, prog_id, prog_nome, ...base } = r;
  return {
    ...base,
    ...json(profilo),
    creatoIl: creato_il,
    ultimaSeduta: ultima_seduta || null,
    programmaAttivo: prog_id ? { id: prog_id, nome: prog_nome } : null
  };
}

function programmaDaRiga(r) {
  if (!r) return null;
  return {
    id: r.id, clienteId: r.cliente_id, nome: r.nome, stato: r.stato,
    scheda: json(r.scheda), creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il
  };
}

function sedutaDaRiga(r) {
  return {
    id: r.id, clienteId: r.cliente_id, programmaId: r.programma_id, data: r.data,
    sessioneRef: r.sessione_ref, nomeSessione: r.nome_sessione, durataMin: r.durata_min,
    note: r.note, esercizi: json(r.esercizi)
  };
}

const CAMPI_BASE = ['nome', 'email', 'telefono', 'note'];
function separa(cliente) {
  const base = {}, profilo = {};
  for (const [k, v] of Object.entries(cliente)) (CAMPI_BASE.includes(k) ? base : profilo)[k] = v;
  return { base, profilo };
}

export function apriDb(percorso = ':memory:') {
  const db = new DatabaseSync(percorso);
  db.exec(SCHEMA);

  const q = {
    trainerPerEmail: db.prepare('SELECT * FROM trainer WHERE email = ?'),
    trainerPerId: db.prepare('SELECT id, nome, email FROM trainer WHERE id = ?'),
    creaTrainer: db.prepare('INSERT INTO trainer (id, nome, email, password_hash) VALUES (?, ?, ?, ?)'),
    creaAccesso: db.prepare('INSERT INTO accessi (token_hash, trainer_id, scade_il) VALUES (?, ?, ?)'),
    leggiAccesso: db.prepare('SELECT trainer_id FROM accessi WHERE token_hash = ? AND scade_il > ?'),
    eliminaAccesso: db.prepare('DELETE FROM accessi WHERE token_hash = ?'),
    pulisciAccessi: db.prepare('DELETE FROM accessi WHERE scade_il <= ?'),

    elencoClienti: db.prepare(`
      SELECT c.*,
        (SELECT MAX(s.data) FROM sedute s WHERE s.cliente_id = c.id) AS ultima_seduta,
        p.id AS prog_id, p.nome AS prog_nome
      FROM clienti c
      LEFT JOIN programmi p ON p.cliente_id = c.id AND p.stato = 'attivo'
      WHERE c.trainer_id = ?
      ORDER BY c.nome COLLATE NOCASE`),
    leggiCliente: db.prepare(`
      SELECT c.*,
        (SELECT MAX(s.data) FROM sedute s WHERE s.cliente_id = c.id) AS ultima_seduta,
        p.id AS prog_id, p.nome AS prog_nome
      FROM clienti c
      LEFT JOIN programmi p ON p.cliente_id = c.id AND p.stato = 'attivo'
      WHERE c.trainer_id = ? AND c.id = ?`),
    creaCliente: db.prepare('INSERT INTO clienti (id, trainer_id, nome, email, telefono, note, profilo) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    aggiornaCliente: db.prepare('UPDATE clienti SET nome = ?, email = ?, telefono = ?, note = ?, profilo = ? WHERE trainer_id = ? AND id = ?'),
    eliminaCliente: db.prepare('DELETE FROM clienti WHERE trainer_id = ? AND id = ?'),

    programmiCliente: db.prepare('SELECT * FROM programmi WHERE trainer_id = ? AND cliente_id = ? ORDER BY creato_il DESC'),
    leggiProgramma: db.prepare('SELECT * FROM programmi WHERE trainer_id = ? AND id = ?'),
    creaProgramma: db.prepare('INSERT INTO programmi (id, trainer_id, cliente_id, nome, stato, scheda) VALUES (?, ?, ?, ?, ?, ?)'),
    aggiornaProgramma: db.prepare('UPDATE programmi SET nome = ?, stato = ?, scheda = ?, aggiornato_il = ? WHERE trainer_id = ? AND id = ?'),
    eliminaProgramma: db.prepare('DELETE FROM programmi WHERE trainer_id = ? AND id = ?'),

    seduteCliente: db.prepare('SELECT * FROM sedute WHERE trainer_id = ? AND cliente_id = ? ORDER BY data, creato_il'),
    creaSeduta: db.prepare(`INSERT INTO sedute (id, trainer_id, cliente_id, programma_id, data, sessione_ref, nome_sessione, durata_min, note, esercizi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),

    eserciziPersonali: db.prepare('SELECT dati FROM esercizi_personali WHERE trainer_id = ? ORDER BY nome'),
    creaEsercizio: db.prepare('INSERT INTO esercizi_personali (id, trainer_id, nome, dati) VALUES (?, ?, ?, ?)')
  };

  const transazione = fn => {
    db.exec('BEGIN');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  };

  return {
    chiudi: () => db.close(),

    // ---------------------------------------------------------- trainer
    trainerPerEmail: email => q.trainerPerEmail.get(email),
    trainerPerId: id => q.trainerPerId.get(id) || null,
    creaTrainer({ nome, email, passwordHash }) {
      const id = randomUUID();
      q.creaTrainer.run(id, nome, email, passwordHash);
      return { id, nome, email };
    },
    creaAccesso: (tokenHash, trainerId, scade) => q.creaAccesso.run(tokenHash, trainerId, scade),
    trainerDaAccesso(tokenHash) {
      const r = q.leggiAccesso.get(tokenHash, ora());
      return r ? r.trainer_id : null;
    },
    eliminaAccesso: tokenHash => q.eliminaAccesso.run(tokenHash),
    pulisciAccessi: () => q.pulisciAccessi.run(ora()),

    // ---------------------------------------------------------- clienti
    elencoClienti: tid => q.elencoClienti.all(tid).map(clienteDaRiga),
    leggiCliente: (tid, id) => clienteDaRiga(q.leggiCliente.get(tid, id)),
    creaCliente(tid, cliente) {
      const id = randomUUID();
      const { base, profilo } = separa(cliente);
      q.creaCliente.run(id, tid, base.nome, base.email || '', base.telefono || '', base.note || '', JSON.stringify(profilo));
      return this.leggiCliente(tid, id);
    },
    aggiornaCliente(tid, id, modifiche) {
      const attuale = this.leggiCliente(tid, id);
      if (!attuale) return null;
      const { id: _i, creatoIl, ultimaSeduta, programmaAttivo, ...dati } = attuale;
      const { base, profilo } = separa({ ...dati, ...modifiche });
      q.aggiornaCliente.run(base.nome, base.email || '', base.telefono || '', base.note || '', JSON.stringify(profilo), tid, id);
      return this.leggiCliente(tid, id);
    },
    eliminaCliente: (tid, id) => q.eliminaCliente.run(tid, id).changes > 0,

    // ---------------------------------------------------------- programmi
    programmiCliente: (tid, clienteId) => q.programmiCliente.all(tid, clienteId).map(programmaDaRiga),
    leggiProgramma: (tid, id) => programmaDaRiga(q.leggiProgramma.get(tid, id)),
    creaProgramma(tid, clienteId, { nome, stato, scheda }) {
      const id = randomUUID();
      transazione(() => q.creaProgramma.run(id, tid, clienteId, nome, stato, JSON.stringify(scheda)));
      return this.leggiProgramma(tid, id);
    },
    aggiornaProgramma(tid, id, { nome, stato, scheda }) {
      const ok = transazione(() => q.aggiornaProgramma.run(nome, stato, JSON.stringify(scheda), ora(), tid, id).changes > 0);
      return ok ? this.leggiProgramma(tid, id) : null;
    },
    eliminaProgramma: (tid, id) => q.eliminaProgramma.run(tid, id).changes > 0,

    // ---------------------------------------------------------- sedute
    seduteCliente: (tid, clienteId) => q.seduteCliente.all(tid, clienteId).map(sedutaDaRiga),
    creaSeduta(tid, clienteId, s) {
      const id = randomUUID();
      q.creaSeduta.run(id, tid, clienteId, s.programmaId, s.data, s.sessioneRef, s.nomeSessione, s.durataMin, s.note, JSON.stringify(s.esercizi));
      return { id, clienteId, ...s };
    },

    // ---------------------------------------------------------- esercizi
    eserciziPersonali: tid => q.eserciziPersonali.all(tid).map(r => json(r.dati)),
    // l'id lo decide sempre il server: un id scelto dal client potrebbe
    // collidere con quello di un altro trainer
    creaEsercizio(tid, esercizio) {
      const e = { ...esercizio, id: 'pt-' + randomUUID(), personalizzato: true };
      q.creaEsercizio.run(e.id, tid, e.nome, JSON.stringify(e));
      return e;
    }
  };
}
