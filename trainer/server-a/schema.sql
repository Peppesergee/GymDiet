-- Architettura A: schema SQLite. Ogni tabella di dati porta trainer_id e
-- ogni query del server filtra su quel campo: e' l'isolamento tra trainer.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS trainer (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- sessioni di accesso: il cookie contiene il token, qui solo il suo hash
CREATE TABLE IF NOT EXISTS accessi (
  token_hash TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  scade_il   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clienti (
  id         TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL DEFAULT '',
  telefono   TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  profilo    TEXT NOT NULL,            -- JSON: eta, peso, obiettivo, giorni...
  creato_il  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS clienti_trainer ON clienti(trainer_id, nome);

CREATE TABLE IF NOT EXISTS programmi (
  id            TEXT PRIMARY KEY,
  trainer_id    TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  cliente_id    TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  stato         TEXT NOT NULL CHECK (stato IN ('bozza', 'attivo', 'archiviato')),
  scheda        TEXT NOT NULL,         -- JSON: sedute ed esercizi
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS programmi_cliente ON programmi(trainer_id, cliente_id);
-- un solo programma attivo per cliente
CREATE UNIQUE INDEX IF NOT EXISTS programmi_un_attivo ON programmi(cliente_id) WHERE stato = 'attivo';

-- attivare un programma archivia quello attivo precedente
CREATE TRIGGER IF NOT EXISTS programmi_attiva_ins BEFORE INSERT ON programmi
WHEN NEW.stato = 'attivo'
BEGIN
  UPDATE programmi SET stato = 'archiviato' WHERE cliente_id = NEW.cliente_id AND stato = 'attivo';
END;
CREATE TRIGGER IF NOT EXISTS programmi_attiva_upd BEFORE UPDATE OF stato ON programmi
WHEN NEW.stato = 'attivo' AND OLD.stato <> 'attivo'
BEGIN
  UPDATE programmi SET stato = 'archiviato' WHERE cliente_id = NEW.cliente_id AND stato = 'attivo' AND id <> NEW.id;
END;

-- storico: una riga per seduta svolta, con serie e carichi in JSON
CREATE TABLE IF NOT EXISTS sedute (
  id            TEXT PRIMARY KEY,
  trainer_id    TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  cliente_id    TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  programma_id  TEXT REFERENCES programmi(id) ON DELETE SET NULL,
  data          TEXT NOT NULL,
  sessione_ref  TEXT NOT NULL DEFAULT '',
  nome_sessione TEXT NOT NULL DEFAULT '',
  durata_min    INTEGER NOT NULL DEFAULT 0,
  note          TEXT NOT NULL DEFAULT '',
  esercizi      TEXT NOT NULL,         -- JSON: [{ esercizioId, nome, serie: [{peso, rip}] }]
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS sedute_cliente ON sedute(trainer_id, cliente_id, data);

-- esercizi creati dal trainer (anche con Claude): visibili solo a lui
CREATE TABLE IF NOT EXISTS esercizi_personali (
  id         TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  dati       TEXT NOT NULL,            -- JSON nello stesso formato di shared/exercises.js
  creato_il  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS esercizi_trainer ON esercizi_personali(trainer_id);
