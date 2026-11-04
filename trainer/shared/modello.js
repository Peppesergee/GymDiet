// Modello dati condiviso tra interfacce e backend: stessi campi, stessa
// validazione. Il server lo usa per rifiutare input non validi, le
// interfacce per mostrare l'errore prima ancora di inviare.
import { GRUPPI } from './exercises.js';
import { ANIMAZIONI } from './poses.js';

export const OBIETTIVI = {
  massa: 'Massa muscolare',
  forza: 'Forza',
  dimagrimento: 'Dimagrimento',
  ricomposizione: 'Ricomposizione',
  mantenimento: 'Mantenimento'
};
export const ESPERIENZE = { principiante: 'Principiante', intermedio: 'Intermedio', avanzato: 'Avanzato' };
export const ATTREZZATURE = { palestra: 'Sala pesi', casa: 'Casa (manubri)', libero: 'Corpo libero' };
export const LIMITAZIONI = { spalle: 'Spalle', schiena: 'Schiena', ginocchia: 'Ginocchia', polsi: 'Polsi' };
export const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const STATI_PROGRAMMA = ['bozza', 'attivo', 'archiviato'];

export const PROFILO_PREDEFINITO = {
  sesso: 'uomo', eta: 30, peso: 75, altezza: 175,
  obiettivo: 'ricomposizione', esperienza: 'principiante', attrezzatura: 'palestra',
  giorniSettimana: [0, 2, 4], durataSessione: 60, limitazioni: [], focus: 'nessuno', cardio: 'auto'
};

export class ErroreValidazione extends Error {
  constructor(messaggio, campo) { super(messaggio); this.campo = campo; }
}

const testo = (v, max) => String(v ?? '').trim().slice(0, max);
function numero(v, min, max, campo, etichetta) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ErroreValidazione(`${etichetta}: valore tra ${min} e ${max}`, campo);
  return n;
}
function scelta(v, ammessi, campo) {
  if (!Object.prototype.hasOwnProperty.call(ammessi, v)) throw new ErroreValidazione(`Valore non valido per ${campo}`, campo);
  return v;
}

/**
 * Normalizza i dati di un atleta. Con `parziale` valida solo i campi
 * presenti (per gli aggiornamenti), altrimenti completa con i predefiniti.
 */
export function normalizzaAtleta(input, { parziale = false } = {}) {
  const d = input || {};
  const out = {};
  const ha = k => Object.prototype.hasOwnProperty.call(d, k);
  const base = parziale ? {} : PROFILO_PREDEFINITO;

  if (!parziale || ha('nome')) {
    out.nome = testo(d.nome, 100);
    if (!out.nome) throw new ErroreValidazione('Il nome dell’atleta e\' obbligatorio', 'nome');
  }
  if (ha('email')) out.email = testo(d.email, 160);
  if (ha('telefono')) out.telefono = testo(d.telefono, 40);
  if (ha('note')) out.note = testo(d.note, 2000);

  const v = (k) => (ha(k) ? d[k] : base[k]);
  const chiede = k => !parziale || ha(k);
  if (chiede('sesso')) out.sesso = v('sesso') === 'donna' ? 'donna' : 'uomo';
  if (chiede('eta')) out.eta = Math.round(numero(v('eta'), 12, 95, 'eta', 'Eta\''));
  if (chiede('peso')) out.peso = numero(v('peso'), 30, 250, 'peso', 'Peso');
  if (chiede('altezza')) out.altezza = Math.round(numero(v('altezza'), 120, 230, 'altezza', 'Altezza'));
  if (chiede('obiettivo')) out.obiettivo = scelta(v('obiettivo'), OBIETTIVI, 'obiettivo');
  if (chiede('esperienza')) out.esperienza = scelta(v('esperienza'), ESPERIENZE, 'esperienza');
  if (chiede('attrezzatura')) out.attrezzatura = scelta(v('attrezzatura'), ATTREZZATURE, 'attrezzatura');
  if (chiede('durataSessione')) out.durataSessione = Math.round(numero(v('durataSessione'), 20, 150, 'durataSessione', 'Durata'));
  if (chiede('giorniSettimana')) {
    const g = [...new Set((v('giorniSettimana') || []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
    if (g.length < 2 || g.length > 6) throw new ErroreValidazione('Scegli da 2 a 6 giorni di allenamento', 'giorniSettimana');
    out.giorniSettimana = g;
  }
  if (chiede('limitazioni')) out.limitazioni = (v('limitazioni') || []).filter(l => LIMITAZIONI[l]);
  if (chiede('focus')) out.focus = testo(v('focus'), 20) || 'nessuno';
  if (chiede('cardio')) out.cardio = ['auto', 'sempre', 'mai'].includes(v('cardio')) ? v('cardio') : 'auto';
  return out;
}

/** Controllo leggero della struttura di un programma (contenuto JSON). */
export function validaScheda(scheda) {
  if (!scheda || !Array.isArray(scheda.sessioni) || scheda.sessioni.length > 7) {
    throw new ErroreValidazione('Programma non valido', 'scheda');
  }
  for (const s of scheda.sessioni) {
    if (!Array.isArray(s.esercizi) || s.esercizi.length > 30) throw new ErroreValidazione('Seduta non valida', 'scheda');
  }
  if (JSON.stringify(scheda).length > 200_000) throw new ErroreValidazione('Programma troppo grande', 'scheda');
  return scheda;
}

export function validaSeduta(d) {
  const data = String(d.data || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroreValidazione('Data della seduta non valida', 'data');
  const esercizi = (Array.isArray(d.esercizi) ? d.esercizi : []).slice(0, 40).map(e => ({
    esercizioId: testo(e.esercizioId, 120),
    nome: testo(e.nome, 120),
    serie: (Array.isArray(e.serie) ? e.serie : []).slice(0, 20).map(s => ({
      peso: Math.max(0, Math.min(1000, Number(s.peso) || 0)),
      rip: Math.max(0, Math.min(1000, Math.round(Number(s.rip) || 0)))
    }))
  }));
  return {
    data,
    programmaId: d.programmaId || null,
    sessioneRef: testo(d.sessioneRef, 60),
    nomeSessione: testo(d.nomeSessione, 120),
    durataMin: Math.max(0, Math.min(600, Math.round(Number(d.durataMin) || 0))),
    note: testo(d.note, 2000),
    esercizi
  };
}

// ------------------------------------------------------------ esercizi personali
export const TIPI_ESERCIZIO = { multi: 'Multiarticolare', isolamento: 'Isolamento', isometrico: 'Isometrico (tenuta)', cardio: 'Cardio' };

// figure animate disponibili, con un nome comprensibile per il trainer
export const FIGURE = {
  squat: 'Squat', panca: 'Distensioni su panca', croci: 'Croci', pushup: 'Piegamenti', dip: 'Dip',
  trazioni: 'Trazioni', lat: 'Lat machine', rematore: 'Rematore', pulley: 'Pulley', facepull: 'Face pull',
  militare: 'Spinta sopra la testa', alzate: 'Alzate laterali', curl: 'Curl', scott: 'Panca Scott',
  french: 'French press', pushdown: 'Push-down', stacco: 'Stacco', hipthrust: 'Hip thrust', affondo: 'Affondo',
  pressa: 'Pressa', legext: 'Leg extension', legcurl: 'Leg curl', calf: 'Polpacci', plank: 'Plank',
  crunch: 'Crunch', legraise: 'Leg raise', twist: 'Torsioni', mountain: 'Mountain climber',
  camminata: 'Camminata / corsa', jack: 'Jumping jack', burpee: 'Burpee'
};

// schema motorio usato per proporre alternative simili
const PATTERN_DA_GRUPPO = {
  petto: 'isolamento-petto', dorso: 'isolamento-dorso', spalle: 'isolamento-spalle',
  bicipiti: 'isolamento-bicipiti', tricipiti: 'isolamento-tricipiti', quadricipiti: 'isolamento-quad',
  femorali: 'isolamento-femorali', glutei: 'hinge', polpacci: 'isolamento-polpacci',
  core: 'core-flessione', cardio: 'cardio-liss'
};

const righe = (v, max = 8) => (Array.isArray(v) ? v : String(v || '').split('\n'))
  .map(x => testo(x, 300)).filter(Boolean).slice(0, max);

/** Esercizio creato a mano dal trainer, nello stesso formato del catalogo. */
export function validaEsercizioPersonale(d = {}) {
  const nome = testo(d.nome, 80);
  if (nome.length < 2) throw new ErroreValidazione('Dai un nome all\'esercizio', 'nome');
  const gruppo = Object.prototype.hasOwnProperty.call(GRUPPI, d.gruppo) ? d.gruppo : null;
  if (!gruppo) throw new ErroreValidazione('Scegli il gruppo muscolare', 'gruppo');
  const tipo = Object.prototype.hasOwnProperty.call(TIPI_ESERCIZIO, d.tipo) ? d.tipo : 'isolamento';
  const anim = Object.prototype.hasOwnProperty.call(ANIMAZIONI, d.anim) ? d.anim : 'squat';
  const esecuzione = righe(d.esecuzione);
  if (!esecuzione.length) throw new ErroreValidazione('Scrivi almeno un passaggio dell\'esecuzione', 'esecuzione');
  return {
    nome, gruppo, tipo, anim,
    pattern: PATTERN_DA_GRUPPO[gruppo], livello: 2,
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: righe(d.muscoli?.primari ?? d.muscoli, 4), secondari: [] },
    setup: righe(d.setup), esecuzione, errori: righe(d.errori),
    respiro: testo(d.respiro, 200), tempo: testo(d.tempo, 20), varianti: '',
    durata: tipo === 'isometrico' || tipo === 'cardio'
  };
}

// ------------------------------------------------------------ inviti atleta
// Codice di 8 caratteri senza simboli ambigui (niente 0/O, 1/I), mostrato come XXXX-XXXX.
export const ALFABETO_CODICE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const GIORNI_VALIDITA_INVITO = 7;

export function normalizzaCodice(codice) {
  return String(codice || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
export function formattaCodice(codice) {
  const c = normalizzaCodice(codice);
  return c.slice(0, 4) + '-' + c.slice(4);
}
/** byte casuali -> codice (la sorgente dei byte la sceglie chi chiama). */
export function codiceDaByte(byte) {
  return Array.from(byte.slice(0, 8), b => ALFABETO_CODICE[b % 32]).join('');
}

export function validaCredenziali(email, password) {
  const e = String(email || '').trim().toLowerCase().slice(0, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new ErroreValidazione('Email non valida', 'email');
  if (String(password || '').length < 8) throw new ErroreValidazione('La password deve avere almeno 8 caratteri', 'password');
  return { email: e, password: String(password) };
}
