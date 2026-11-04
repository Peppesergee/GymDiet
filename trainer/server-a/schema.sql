-- Architettura A: schema SQLite. Ogni tabella di dati porta trainer_id e
-- ogni query del server filtra su quel campo: e' l'isolamento tra trainer.
-- Gli atleti entrano da un'app separata con un proprio account, collegato
-- a un solo atleta tramite un codice invito creato dal trainer.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS trainer (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- accessi dei trainer: il cookie contiene il token, qui solo il suo hash
CREATE TABLE IF NOT EXISTS accessi (
  token_hash TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  scade_il   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atleti (
  id         TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL DEFAULT '',
  telefono   TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  profilo    TEXT NOT NULL,            -- JSON: eta, peso, obiettivo, giorni...
  creato_il  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS atleti_trainer ON atleti(trainer_id, nome);

CREATE TABLE IF NOT EXISTS programmi (
  id            TEXT PRIMARY KEY,
  trainer_id    TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  atleta_id     TEXT NOT NULL REFERENCES atleti(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  stato         TEXT NOT NULL CHECK (stato IN ('bozza', 'attivo', 'archiviato')),
  scheda        TEXT NOT NULL,         -- JSON: sedute ed esercizi
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS programmi_atleta ON programmi(trainer_id, atleta_id);
-- una sola scheda attiva per atleta: e' quella che l'atleta vede
CREATE UNIQUE INDEX IF NOT EXISTS programmi_un_attivo ON programmi(atleta_id) WHERE stato = 'attivo';

-- attivare una scheda archivia quella attiva precedente
CREATE TRIGGER IF NOT EXISTS programmi_attiva_ins BEFORE INSERT ON programmi
WHEN NEW.stato = 'attivo'
BEGIN
  UPDATE programmi SET stato = 'archiviato' WHERE atleta_id = NEW.atleta_id AND stato = 'attivo';
END;
CREATE TRIGGER IF NOT EXISTS programmi_attiva_upd BEFORE UPDATE OF stato ON programmi
WHEN NEW.stato = 'attivo' AND OLD.stato <> 'attivo'
BEGIN
  UPDATE programmi SET stato = 'archiviato' WHERE atleta_id = NEW.atleta_id AND stato = 'attivo' AND id <> NEW.id;
END;

-- storico: una riga per seduta svolta, registrata dal trainer o dall'atleta
CREATE TABLE IF NOT EXISTS sedute (
  id            TEXT PRIMARY KEY,
  trainer_id    TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  atleta_id     TEXT NOT NULL REFERENCES atleti(id) ON DELETE CASCADE,
  programma_id  TEXT REFERENCES programmi(id) ON DELETE SET NULL,
  data          TEXT NOT NULL,
  sessione_ref  TEXT NOT NULL DEFAULT '',
  nome_sessione TEXT NOT NULL DEFAULT '',
  durata_min    INTEGER NOT NULL DEFAULT 0,
  note          TEXT NOT NULL DEFAULT '',
  esercizi      TEXT NOT NULL,         -- JSON: [{ esercizioId, nome, serie: [{peso, rip}] }]
  origine       TEXT NOT NULL DEFAULT 'trainer' CHECK (origine IN ('trainer', 'atleta')),
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS sedute_atleta ON sedute(trainer_id, atleta_id, data);

-- esercizi creati dal trainer: li vedono lui e i suoi atleti
CREATE TABLE IF NOT EXISTS esercizi_personali (
  id         TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  dati       TEXT NOT NULL,            -- JSON nello stesso formato di shared/exercises.js
  creato_il  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS esercizi_trainer ON esercizi_personali(trainer_id);

-- ------------------------------------------------------------ app atleta
-- un account per atleta; email separate da quelle dei trainer
CREATE TABLE IF NOT EXISTS account_atleti (
  id            TEXT PRIMARY KEY,
  atleta_id     TEXT NOT NULL UNIQUE REFERENCES atleti(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  creato_il     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS accessi_atleti (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES account_atleti(id) ON DELETE CASCADE,
  scade_il   TEXT NOT NULL
);

-- codici invito: monouso, a scadenza; qui solo l'hash del codice
CREATE TABLE IF NOT EXISTS inviti (
  codice_hash TEXT PRIMARY KEY,
  atleta_id   TEXT NOT NULL REFERENCES atleti(id) ON DELETE CASCADE,
  trainer_id  TEXT NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  scade_il    TEXT NOT NULL,
  usato_il    TEXT
);
CREATE INDEX IF NOT EXISTS inviti_atleta ON inviti(atleta_id);
