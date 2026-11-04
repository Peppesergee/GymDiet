// Modello dati condiviso tra interfacce e backend: stessi campi, stessa
// validazione. Il server lo usa per rifiutare input non validi, le
// interfacce per mostrare l'errore prima ancora di inviare.

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
 * Normalizza i dati di un cliente. Con `parziale` valida solo i campi
 * presenti (per gli aggiornamenti), altrimenti completa con i predefiniti.
 */
export function normalizzaCliente(input, { parziale = false } = {}) {
  const d = input || {};
  const out = {};
  const ha = k => Object.prototype.hasOwnProperty.call(d, k);
  const base = parziale ? {} : PROFILO_PREDEFINITO;

  if (!parziale || ha('nome')) {
    out.nome = testo(d.nome, 100);
    if (!out.nome) throw new ErroreValidazione('Il nome del cliente e\' obbligatorio', 'nome');
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
