// Stato persistente dell'applicazione (localStorage).

const CHIAVE = 'gymdiet.stato.v1';
const VERSIONE = 1;

export const STATO_INIZIALE = {
  versione: VERSIONE,
  configurato: false,
  profilo: {
    nome: '',
    sesso: 'uomo',
    eta: 30,
    peso: 75,
    altezza: 175,
    bodyFat: null,
    attivita: 'leggero',
    obiettivo: 'ricomposizione',
    esperienza: 'principiante',
    giorniAllenamento: 3,
    durataSessione: 60,
    attrezzatura: 'palestra',
    limitazioni: [],
    focus: 'nessuno',
    cardio: 'auto',
    numPasti: 4,
    preferenze: [],
    esclusiAlimenti: [],
    ciclizza: true
  },
  scheda: null,
  dieta: null,
  semi: { allenamento: 'a1', dieta: 'd1' },
  offsets: { allenamento: {}, dieta: {} },
  override: { dieta: {} },
  esclusiEsercizi: [],
  log: {
    sessioni: [],      // { id, data, sessioneId, nome, esercizi: [{ esercizioId, serie: [{peso, rip}] }], durataMin }
    pesi: [],          // { data, valore }
    misure: [],        // { data, vita, torace, braccio, coscia, fianchi }
    pasti: {}          // { 'YYYY-MM-DD.colazione': true }
  },
  ui: { tab: 'oggi', giornoDieta: null }
};

let stato = carica();
const ascoltatori = new Set();

function fondi(base, salvato) {
  if (!salvato || typeof salvato !== 'object') return structuredClone(base);
  const out = Array.isArray(base) ? salvato : { ...base };
  for (const k in salvato) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof salvato[k] === 'object' && salvato[k] !== null && !Array.isArray(salvato[k])) {
      out[k] = fondi(base[k], salvato[k]);
    } else if (salvato[k] !== undefined) {
      out[k] = salvato[k];
    }
  }
  return out;
}

function carica() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return structuredClone(STATO_INIZIALE);
    const salvato = JSON.parse(grezzo);
    return fondi(STATO_INIZIALE, salvato);
  } catch (e) {
    console.warn('Stato non leggibile, riparto da zero', e);
    return structuredClone(STATO_INIZIALE);
  }
}

let timerSalvataggio = null;
function salvaDifferito() {
  if (timerSalvataggio) clearTimeout(timerSalvataggio);
  timerSalvataggio = setTimeout(salvaOra, 150);
}

export function salvaOra() {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(stato));
  } catch (e) {
    console.error('Salvataggio fallito', e);
  }
}

export function getStato() { return stato; }

/** Applica una modifica allo stato e notifica la UI. */
export function aggiorna(modifica, opzioni = {}) {
  if (typeof modifica === 'function') modifica(stato);
  else Object.assign(stato, modifica);
  salvaDifferito();
  if (!opzioni.silenzioso) notifica();
}

export function notifica() {
  for (const fn of ascoltatori) {
    try { fn(stato); } catch (e) { console.error(e); }
  }
}

export function ascolta(fn) {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

export function esporta() {
  return JSON.stringify({ ...stato, esportatoIl: new Date().toISOString() }, null, 2);
}

export function importa(testo) {
  const dati = JSON.parse(testo);
  if (!dati || typeof dati !== 'object') throw new Error('File non valido');
  stato = fondi(STATO_INIZIALE, dati);
  salvaOra();
  notifica();
}

export function azzera() {
  stato = structuredClone(STATO_INIZIALE);
  salvaOra();
  notifica();
}

// ------------------------------------------------------------- utilita' data
export function oggiISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

/** 0 = lunedi ... 6 = domenica */
export function indiceGiorno(d = new Date()) {
  return (d.getDay() + 6) % 7;
}

/** Data ISO del giorno `indice` (0=lunedi) della settimana corrente. */
export function dataDelGiorno(indice, riferimento = new Date()) {
  const d = new Date(riferimento);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - indiceGiorno(riferimento) + indice);
  return oggiISO(d);
}

export function dataItaliana(iso) {
  const [a, m, g] = iso.split('-');
  return `${g}/${m}/${a}`;
}
