// Accesso ai dati. Le funzioni per il trainer ricevono trainerId e lo
// mettono nella WHERE; quelle per l'atleta ricevono atletaId, ricavato dal
// suo accesso e mai dalla richiesta. Non esiste una funzione che legga "tutto".
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const SCHEMA = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

const json = t => (t ? JSON.parse(t) : null);
const ora = () => new Date().toISOString();

export class Conflitto extends Error {}

function atletaDaRiga(r) {
  if (!r) return null;
  const { profilo, trainer_id, creato_il, ultima_seduta, prog_id, prog_nome, account_attivo, invito_scade, ...base } = r;
  return {
    ...base,
    ...json(profilo),
    creatoIl: creato_il,
    ultimaSeduta: ultima_seduta || null,
    programmaAttivo: prog_id ? { id: prog_id, nome: prog_nome } : null,
    accountAtleta: !!account_attivo,
    invitoScade: invito_scade || null
  };
}

function programmaDaRiga(r) {
  if (!r) return null;
  return {
    id: r.id, atletaId: r.atleta_id, nome: r.nome, stato: r.stato,
    scheda: json(r.scheda), creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il
  };
}

function sedutaDaRiga(r) {
  return {
    id: r.id, atletaId: r.atleta_id, programmaId: r.programma_id, data: r.data,
    sessioneRef: r.sessione_ref, nomeSessione: r.nome_sessione, durataMin: r.durata_min,
    note: r.note, esercizi: json(r.esercizi), origine: r.origine
  };
}

const CAMPI_BASE = ['nome', 'email', 'telefono', 'note'];
function separa(atleta) {
  const base = {}, profilo = {};
  for (const [k, v] of Object.entries(atleta)) (CAMPI_BASE.includes(k) ? base : profilo)[k] = v;
  return { base, profilo };
}

const SELECT_ATLETA = `
  SELECT a.*,
    (SELECT MAX(s.data) FROM sedute s WHERE s.atleta_id = a.id) AS ultima_seduta,
    p.id AS prog_id, p.nome AS prog_nome,
    EXISTS (SELECT 1 FROM account_atleti x WHERE x.atleta_id = a.id) AS account_attivo,
    (SELECT MAX(i.scade_il) FROM inviti i WHERE i.atleta_id = a.id AND i.usato_il IS NULL AND i.scade_il > ?) AS invito_scade
  FROM atleti a
  LEFT JOIN programmi p ON p.atleta_id = a.id AND p.stato = 'attivo'`;

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
    pulisciAccessiAtleti: db.prepare('DELETE FROM accessi_atleti WHERE scade_il <= ?'),

    elencoAtleti: db.prepare(`${SELECT_ATLETA} WHERE a.trainer_id = ? ORDER BY a.nome COLLATE NOCASE`),
    leggiAtleta: db.prepare(`${SELECT_ATLETA} WHERE a.trainer_id = ? AND a.id = ?`),
    creaAtleta: db.prepare('INSERT INTO atleti (id, trainer_id, nome, email, telefono, note, profilo) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    aggiornaAtleta: db.prepare('UPDATE atleti SET nome = ?, email = ?, telefono = ?, note = ?, profilo = ? WHERE trainer_id = ? AND id = ?'),
    eliminaAtleta: db.prepare('DELETE FROM atleti WHERE trainer_id = ? AND id = ?'),

    programmiAtleta: db.prepare('SELECT * FROM programmi WHERE trainer_id = ? AND atleta_id = ? ORDER BY creato_il DESC'),
    leggiProgramma: db.prepare('SELECT * FROM programmi WHERE trainer_id = ? AND id = ?'),
    creaProgramma: db.prepare('INSERT INTO programmi (id, trainer_id, atleta_id, nome, stato, scheda) VALUES (?, ?, ?, ?, ?, ?)'),
    aggiornaProgramma: db.prepare('UPDATE programmi SET nome = ?, stato = ?, scheda = ?, aggiornato_il = ? WHERE trainer_id = ? AND id = ?'),
    eliminaProgramma: db.prepare('DELETE FROM programmi WHERE trainer_id = ? AND id = ?'),

    seduteAtleta: db.prepare('SELECT * FROM sedute WHERE trainer_id = ? AND atleta_id = ? ORDER BY data, creato_il'),
    creaSeduta: db.prepare(`INSERT INTO sedute (id, trainer_id, atleta_id, programma_id, data, sessione_ref, nome_sessione, durata_min, note, esercizi, origine)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),

    eserciziPersonali: db.prepare('SELECT dati FROM esercizi_personali WHERE trainer_id = ? ORDER BY nome'),
    creaEsercizio: db.prepare('INSERT INTO esercizi_personali (id, trainer_id, nome, dati) VALUES (?, ?, ?, ?)'),

    // inviti e account atleta
    annullaInviti: db.prepare('DELETE FROM inviti WHERE atleta_id = ? AND usato_il IS NULL'),
    creaInvito: db.prepare('INSERT INTO inviti (codice_hash, atleta_id, trainer_id, scade_il) VALUES (?, ?, ?, ?)'),
    leggiInvito: db.prepare('SELECT * FROM inviti WHERE codice_hash = ? AND usato_il IS NULL AND scade_il > ?'),
    usaInvito: db.prepare('UPDATE inviti SET usato_il = ? WHERE codice_hash = ?'),
    accountPerEmail: db.prepare('SELECT * FROM account_atleti WHERE email = ?'),
    eliminaAccountAtleta: db.prepare('DELETE FROM account_atleti WHERE atleta_id = ?'),
    creaAccountAtleta: db.prepare('INSERT INTO account_atleti (id, atleta_id, email, password_hash) VALUES (?, ?, ?, ?)'),
    creaAccessoAtleta: db.prepare('INSERT INTO accessi_atleti (token_hash, account_id, scade_il) VALUES (?, ?, ?)'),
    leggiAccessoAtleta: db.prepare(`SELECT a.atleta_id FROM accessi_atleti x JOIN account_atleti a ON a.id = x.account_id
      WHERE x.token_hash = ? AND x.scade_il > ?`),
    eliminaAccessoAtleta: db.prepare('DELETE FROM accessi_atleti WHERE token_hash = ?'),
    profiloAtleta: db.prepare(`SELECT a.id, a.nome, a.trainer_id, a.profilo, t.nome AS trainer_nome
      FROM atleti a JOIN trainer t ON t.id = a.trainer_id WHERE a.id = ?`),
    programmaAttivoAtleta: db.prepare(`SELECT * FROM programmi WHERE atleta_id = ? AND stato = 'attivo'`),
    seduteDellAtleta: db.prepare('SELECT * FROM sedute WHERE atleta_id = ? ORDER BY data, creato_il'),
    programmaDellAtleta: db.prepare('SELECT id FROM programmi WHERE id = ? AND atleta_id = ?')
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
    pulisciAccessi: () => { q.pulisciAccessi.run(ora()); q.pulisciAccessiAtleti.run(ora()); },

    // ---------------------------------------------------------- atleti
    elencoAtleti: tid => q.elencoAtleti.all(ora(), tid).map(atletaDaRiga),
    leggiAtleta: (tid, id) => atletaDaRiga(q.leggiAtleta.get(ora(), tid, id)),
    creaAtleta(tid, atleta) {
      const id = randomUUID();
      const { base, profilo } = separa(atleta);
      q.creaAtleta.run(id, tid, base.nome, base.email || '', base.telefono || '', base.note || '', JSON.stringify(profilo));
      return this.leggiAtleta(tid, id);
    },
    aggiornaAtleta(tid, id, modifiche) {
      const attuale = this.leggiAtleta(tid, id);
      if (!attuale) return null;
      const { id: _i, creatoIl, ultimaSeduta, programmaAttivo, accountAtleta, invitoScade, ...dati } = attuale;
      const { base, profilo } = separa({ ...dati, ...modifiche });
      q.aggiornaAtleta.run(base.nome, base.email || '', base.telefono || '', base.note || '', JSON.stringify(profilo), tid, id);
      return this.leggiAtleta(tid, id);
    },
    eliminaAtleta: (tid, id) => q.eliminaAtleta.run(tid, id).changes > 0,

    // ---------------------------------------------------------- programmi
    programmiAtleta: (tid, atletaId) => q.programmiAtleta.all(tid, atletaId).map(programmaDaRiga),
    leggiProgramma: (tid, id) => programmaDaRiga(q.leggiProgramma.get(tid, id)),
    creaProgramma(tid, atletaId, { nome, stato, scheda }) {
      const id = randomUUID();
      transazione(() => q.creaProgramma.run(id, tid, atletaId, nome, stato, JSON.stringify(scheda)));
      return this.leggiProgramma(tid, id);
    },
    aggiornaProgramma(tid, id, { nome, stato, scheda }) {
      const ok = transazione(() => q.aggiornaProgramma.run(nome, stato, JSON.stringify(scheda), ora(), tid, id).changes > 0);
      return ok ? this.leggiProgramma(tid, id) : null;
    },
    eliminaProgramma: (tid, id) => q.eliminaProgramma.run(tid, id).changes > 0,

    // ---------------------------------------------------------- sedute
    seduteAtleta: (tid, atletaId) => q.seduteAtleta.all(tid, atletaId).map(sedutaDaRiga),
    creaSeduta(tid, atletaId, s, origine = 'trainer') {
      const id = randomUUID();
      q.creaSeduta.run(id, tid, atletaId, s.programmaId, s.data, s.sessioneRef, s.nomeSessione, s.durataMin, s.note, JSON.stringify(s.esercizi), origine);
      return { id, atletaId, ...s, origine };
    },

    // ---------------------------------------------------------- esercizi
    eserciziPersonali: tid => q.eserciziPersonali.all(tid).map(r => json(r.dati)),
    // l'id lo decide sempre il server: uno scelto dal client potrebbe
    // collidere con quello di un altro trainer
    creaEsercizio(tid, esercizio) {
      const e = { ...esercizio, id: 'pt-' + randomUUID(), personalizzato: true };
      q.creaEsercizio.run(e.id, tid, e.nome, JSON.stringify(e));
      return e;
    },

    // ---------------------------------------------------------- inviti
    /** Un nuovo codice annulla quelli non ancora usati dello stesso atleta. */
    creaInvito(tid, atletaId, codiceHash, scade) {
      transazione(() => {
        q.annullaInviti.run(atletaId);
        q.creaInvito.run(codiceHash, atletaId, tid, scade);
      });
    },
    /**
     * Collega un account all'atleta dell'invito. Se l'atleta aveva gia' un
     * account viene sostituito (e' anche il modo per reimpostare la password).
     * Ritorna l'id dell'account, o null se il codice non e' valido.
     */
    riscattaInvito(codiceHash, email, passwordHash) {
      return transazione(() => {
        const invito = q.leggiInvito.get(codiceHash, ora());
        if (!invito) return null;
        const esistente = q.accountPerEmail.get(email);
        if (esistente && esistente.atleta_id !== invito.atleta_id) throw new Conflitto('Questa email e\' gia\' usata da un altro atleta');
        q.eliminaAccountAtleta.run(invito.atleta_id);
        const id = randomUUID();
        q.creaAccountAtleta.run(id, invito.atleta_id, email, passwordHash);
        q.usaInvito.run(ora(), codiceHash);
        return id;
      });
    },

    // ---------------------------------------------------------- lato atleta
    accountPerEmail: email => q.accountPerEmail.get(email) || null,
    creaAccessoAtleta: (tokenHash, accountId, scade) => q.creaAccessoAtleta.run(tokenHash, accountId, scade),
    atletaDaAccesso(tokenHash) {
      const r = q.leggiAccessoAtleta.get(tokenHash, ora());
      return r ? r.atleta_id : null;
    },
    eliminaAccessoAtleta: tokenHash => q.eliminaAccessoAtleta.run(tokenHash),
    profiloAtleta(atletaId) {
      const r = q.profiloAtleta.get(atletaId);
      if (!r) return null;
      const p = json(r.profilo);
      return { id: r.id, nome: r.nome, trainerId: r.trainer_id, trainerNome: r.trainer_nome, obiettivo: p.obiettivo, giorniSettimana: p.giorniSettimana };
    },
    /** Solo la scheda attiva: bozze e schede archiviate restano del trainer. */
    programmaPerAtleta: atletaId => programmaDaRiga(q.programmaAttivoAtleta.get(atletaId)),
    seduteDellAtleta: atletaId => q.seduteDellAtleta.all(atletaId).map(sedutaDaRiga),
    programmaAppartiene: (programmaId, atletaId) => !!q.programmaDellAtleta.get(programmaId, atletaId)
  };
}
