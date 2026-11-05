// Generatore dei programmi di allenamento (isomorfo: browser e server).
// Deriva dal generatore di GymDiet, ma senza stato a livello di modulo: su un
// server condiviso da piu' trainer una cache globale mescolerebbe gli esercizi
// personali di account diversi. Gli esercizi personali del trainer arrivano
// sempre come parametro (`personali`: mappa id -> esercizio).
import { ESERCIZI, ESERCIZI_BY_ID } from './exercises.js';

// -------------------------------------------------------------- split
const SESSIONI = {
  fullA: {
    nome: 'Full Body A', tipo: 'full',
    slot: ['squat', 'spinta-orizzontale', 'trazione-orizzontale', 'hinge', 'spinta-verticale', 'core', 'isolamento-bicipiti', 'isolamento-tricipiti', 'isolamento-polpacci']
  },
  fullB: {
    nome: 'Full Body B', tipo: 'full',
    slot: ['hinge', 'trazione-verticale', 'spinta-verticale', 'affondo', 'spinta-orizzontale', 'core', 'isolamento-spalle-post', 'isolamento-femorali', 'isolamento-bicipiti']
  },
  fullC: {
    nome: 'Full Body C', tipo: 'full',
    slot: ['squat', 'spinta-orizzontale', 'trazione-verticale', 'hinge', 'isolamento-spalle', 'core', 'isolamento-tricipiti', 'isolamento-quad', 'isolamento-polpacci']
  },
  push: {
    nome: 'Push (petto, spalle, tricipiti)', tipo: 'push',
    slot: ['spinta-orizzontale', 'spinta-verticale', 'spinta-orizzontale', 'isolamento-spalle', 'isolamento-tricipiti', 'isolamento-petto', 'isolamento-tricipiti', 'isolamento-spalle', 'core']
  },
  pull: {
    nome: 'Pull (dorso e bicipiti)', tipo: 'pull',
    slot: ['trazione-verticale', 'trazione-orizzontale', 'trazione-orizzontale', 'isolamento-spalle-post', 'isolamento-bicipiti', 'isolamento-dorso', 'isolamento-bicipiti', 'core', 'isolamento-spalle-post']
  },
  legs: {
    nome: 'Gambe', tipo: 'legs',
    slot: ['squat', 'hinge', 'affondo', 'isolamento-quad', 'isolamento-femorali', 'isolamento-polpacci', 'core', 'isolamento-quad', 'core']
  },
  upper: {
    nome: 'Upper (parte alta)', tipo: 'upper',
    slot: ['spinta-orizzontale', 'trazione-verticale', 'spinta-verticale', 'trazione-orizzontale', 'isolamento-bicipiti', 'isolamento-tricipiti', 'isolamento-spalle-post', 'isolamento-spalle', 'core']
  },
  lower: {
    nome: 'Lower (parte bassa)', tipo: 'lower',
    slot: ['squat', 'hinge', 'affondo', 'isolamento-femorali', 'isolamento-quad', 'isolamento-polpacci', 'core', 'isolamento-quad', 'core']
  }
};

const SPLIT = {
  2: { nome: 'Full Body 2x', sessioni: ['fullA', 'fullB'], giorni: [0, 3] },
  3: { nome: 'Full Body 3x', sessioni: ['fullA', 'fullB', 'fullC'], giorni: [0, 2, 4] },
  3.5: { nome: 'Push / Pull / Legs', sessioni: ['push', 'pull', 'legs'], giorni: [0, 2, 4] },
  4: { nome: 'Upper / Lower', sessioni: ['upper', 'lower', 'upper', 'lower'], giorni: [0, 1, 3, 4] },
  5: { nome: 'Push / Pull / Legs + Upper / Lower', sessioni: ['push', 'pull', 'legs', 'upper', 'lower'], giorni: [0, 1, 2, 4, 5] },
  6: { nome: 'Push / Pull / Legs x2', sessioni: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], giorni: [0, 1, 2, 3, 4, 5] }
};

// -------------------------------------------------------------- parametri
const PARAMETRI = {
  forza: {
    multi: { serie: 5, rip: '3-5', recupero: 180, rir: '1-2' },
    isolamento: { serie: 3, rip: '8-10', recupero: 90, rir: '1-2' },
    isometrico: { serie: 3, rip: '30-45 sec', recupero: 60, rir: '-' },
    nota: 'Focus sul carico: aumenta il peso quando completi tutte le serie al limite alto delle ripetizioni.'
  },
  massa: {
    multi: { serie: 4, rip: '6-10', recupero: 120, rir: '1-2' },
    isolamento: { serie: 3, rip: '10-15', recupero: 75, rir: '0-1' },
    isometrico: { serie: 3, rip: '40-60 sec', recupero: 60, rir: '-' },
    nota: 'Volume e sovraccarico progressivo: cerca di aggiungere ripetizioni o carico ogni settimana.'
  },
  dimagrimento: {
    multi: { serie: 3, rip: '10-12', recupero: 75, rir: '2' },
    isolamento: { serie: 3, rip: '12-15', recupero: 45, rir: '1' },
    isometrico: { serie: 3, rip: '40-60 sec', recupero: 45, rir: '-' },
    nota: 'Recuperi brevi per tenere alta la densita di lavoro. I pesi restano importanti: servono a mantenere il muscolo.'
  },
  ricomposizione: {
    multi: { serie: 4, rip: '8-12', recupero: 90, rir: '1-2' },
    isolamento: { serie: 3, rip: '12-15', recupero: 60, rir: '0-1' },
    isometrico: { serie: 3, rip: '40-60 sec', recupero: 45, rir: '-' },
    nota: 'Mix di forza e volume: tieni traccia dei carichi, devono salire anche in deficit leggero.'
  },
  mantenimento: {
    multi: { serie: 3, rip: '8-12', recupero: 90, rir: '2' },
    isolamento: { serie: 3, rip: '10-15', recupero: 60, rir: '1-2' },
    isometrico: { serie: 3, rip: '40-60 sec', recupero: 45, rir: '-' },
    nota: 'Mantieni la qualita tecnica e la costanza: bastano piccoli progressi nel tempo.'
  }
};

const RISCALDAMENTO = {
  full: ['5 min di cardio leggero (cyclette, tapis roulant o corsa sul posto)', 'Mobilita anche e spalle: 10 rotazioni per lato', '2 serie leggere del primo esercizio (50% e 70% del carico di lavoro)'],
  push: ['5 min di cardio leggero', 'Circonduzioni delle braccia e mobilita scapolare: 10 per verso', 'Rotazioni esterne con elastico: 2x15', '2 serie di avvicinamento sul primo esercizio'],
  pull: ['5 min di cardio leggero', 'Scapular pull-up o retrazioni scapolari: 2x10', 'Face pull leggeri con elastico: 2x15', '2 serie di avvicinamento sul primo esercizio'],
  legs: ['5 min di cardio leggero', 'Mobilita anca: affondo con rotazione 8 per lato', 'Squat a corpo libero: 2x10', '2-3 serie di avvicinamento sul primo esercizio'],
  upper: ['5 min di cardio leggero', 'Mobilita scapolare e circonduzioni: 10 per verso', '2 serie di avvicinamento sul primo esercizio'],
  lower: ['5 min di cardio leggero', 'Mobilita anca e caviglia: 8 ripetizioni per lato', 'Squat a corpo libero: 2x10', '2-3 serie di avvicinamento sul primo esercizio']
};

const DEFATICAMENTO = [
  'Stretching statico dei gruppi allenati: 30 secondi per posizione.',
  '3-5 minuti di camminata o respirazione lenta per abbassare la frequenza cardiaca.'
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Trova un esercizio nel catalogo o tra quelli personali del trainer. */
export function risolviEsercizio(id, personali = {}) {
  return ESERCIZI_BY_ID[id] || personali[id] || null;
}

function livelloMax(esperienza) {
  return esperienza === 'avanzato' ? 3 : esperienza === 'intermedio' ? 3 : 2;
}

/** Esercizi compatibili con attrezzatura, livello e limitazioni. */
export function candidatiPer(pattern, opzioni) {
  const { attrezzatura = 'palestra', esperienza = 'principiante', limitazioni = [], esclusi = [] } = opzioni;
  const maxLiv = livelloMax(esperienza);
  return ESERCIZI.filter(e =>
    e.pattern === pattern &&
    e.attrezzatura.includes(attrezzatura) &&
    e.livello <= maxLiv &&
    !esclusi.includes(e.id) &&
    !(e.rischio || []).some(r => limitazioni.includes(r))
  ).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Cerca per nome in tutto il database (curato + personalizzati), senza i
 * filtri di attrezzatura/livello: usata dalla ricerca libera nel selettore
 * di sostituzione, dove l'utente sta scegliendo deliberatamente.
 */
export function cercaEsercizi(testo, personali = {}, limite = 20) {
  const q = String(testo || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const normalizza = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const qn = normalizza(q);
  const tutti = [...ESERCIZI, ...Object.values(personali)];
  return tutti
    .filter(e => normalizza(e.nome).includes(qn))
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .slice(0, limite);
}

function numeroEsercizi(durata) {
  return Math.max(3, Math.min(9, Math.round((Number(durata) - 8) / 9)));
}

function parametriPer(esercizio, obiettivo) {
  const p = PARAMETRI[obiettivo] || PARAMETRI.mantenimento;
  if (esercizio.tipo === 'isometrico') return { ...p.isometrico };
  if (esercizio.tipo === 'cardio') return { serie: 1, rip: '10-20 min', recupero: 0, rir: '-' };
  return esercizio.tipo === 'multi' ? { ...p.multi } : { ...p.isolamento };
}

function durataStimata(esercizi) {
  let sec = 0;
  for (const e of esercizi) {
    const serie = Number(e.serie) || 3;
    const tempoSerie = e.tipo === 'isometrico' ? 50 : 40;
    sec += serie * (tempoSerie + (Number(e.recupero) || 60));
  }
  return Math.round(sec / 60) + 8; // + riscaldamento
}

/** Normalizza l'elenco di giorni scelti: interi 0-6, senza doppioni, in ordine. */
function giorniValidi(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.filter(g => Number.isInteger(g) && g >= 0 && g <= 6))].sort((a, b) => a - b);
}

/**
 * Genera la scheda.
 * @param profilo { giorniAllenamento, giorniSettimana, durataSessione, obiettivo, esperienza, attrezzatura, limitazioni, focus, cardio }
 * @param opzioni { seed, offsets, esclusi }
 */
export function generaScheda(profilo, opzioni = {}) {
  // i giorni specifici scelti dall'utente hanno la priorita'; il numero di
  // sedute e' il loro conteggio. Se mancano o sono fuori range si ricade
  // sulla spaziatura predefinita dello split in base al solo conteggio.
  const scelti = giorniValidi(profilo.giorniSettimana);
  const giorni = scelti.length >= 2 && scelti.length <= 6
    ? scelti.length
    : Math.max(2, Math.min(6, Number(profilo.giorniAllenamento) || 3));
  const esperienza = profilo.esperienza || 'principiante';
  const obiettivo = profilo.obiettivo || 'mantenimento';
  const seed = opzioni.seed || 'gymcoach';
  const offsets = opzioni.offsets || {};
  const esclusi = opzioni.esclusi || [];
  const override = opzioni.override || {};
  const personali = opzioni.personali || {};

  let chiaveSplit = giorni;
  if (giorni === 3 && esperienza !== 'principiante') chiaveSplit = 3.5;
  const split = SPLIT[chiaveSplit] || SPLIT[3];
  const giorniSessione = scelti.length === giorni ? scelti : split.giorni;
  const nEx = numeroEsercizi(profilo.durataSessione || 60);

  const conteggi = {};
  const usatiPerTipo = {};   // esercizi usati nell'occorrenza precedente dello stesso tipo di seduta
  const sessioni = split.sessioni.map((chiaveSess, idx) => {
    const modello = SESSIONI[chiaveSess];
    // seconda (o terza) volta che ricorre lo stesso tipo di seduta: ruota le scelte
    const occorrenza = conteggi[chiaveSess] = (conteggi[chiaveSess] || 0) + 1;
    let slot = modello.slot.slice();

    // priorita' al gruppo scelto dall'utente
    if (profilo.focus && profilo.focus !== 'nessuno') {
      const patternFocus = PATTERN_PER_GRUPPO[profilo.focus] || [];
      const presenti = slot.filter(s => patternFocus.includes(s));
      if (presenti.length) {
        const primo = presenti[0];
        slot = [primo, ...slot.filter((s, i) => !(s === primo && slot.indexOf(s) === i))];
        const extra = patternFocus.find(p => !slot.slice(0, nEx).includes(p));
        if (extra) slot.splice(Math.min(nEx - 1, slot.length), 0, extra);
      }
    }

    const usati = new Set();
    const precedenti = usatiPerTipo[chiaveSess] || new Set();
    const esercizi = [];
    for (const pattern of slot) {
      if (esercizi.length >= nEx) break;
      const chiave = `${chiaveSess}${idx}.${pattern}.${esercizi.length}`;
      const off = offsets[chiave] || 0;
      // una sostituzione scelta esplicitamente dall'utente vince sempre sulla
      // selezione algoritmica, anche se l'esercizio non passerebbe i filtri
      // del profilo (attrezzatura/livello): l'ha scelto lui apposta
      let scelto = override[chiave] ? risolviEsercizio(override[chiave], personali) : null;
      if (scelto && usati.has(scelto.id)) scelto = null;
      if (!scelto) {
        const lista = candidatiPer(pattern, { ...profilo, esclusi });
        if (!lista.length) continue;
        // prima scelta: esercizio non usato oggi ne' nella stessa seduta della settimana scorsa
        for (const evitaRipetizioni of [true, false]) {
          for (let i = 0; i < lista.length; i++) {
            const cand = lista[(hash(seed + chiave) + off + (occorrenza - 1) + i) % lista.length];
            if (usati.has(cand.id)) continue;
            if (evitaRipetizioni && precedenti.has(cand.id)) continue;
            scelto = cand; break;
          }
          if (scelto) break;
        }
      }
      if (!scelto) continue;
      usati.add(scelto.id);
      const par = parametriPer(scelto, obiettivo);
      esercizi.push({
        chiave, esercizioId: scelto.id, nome: scelto.nome, gruppo: scelto.gruppo,
        pattern, tipo: scelto.tipo, anim: scelto.anim,
        serie: par.serie, ripetizioni: par.rip, recupero: par.recupero, rir: par.rir,
        durata: !!scelto.durata
      });
    }

    // se le limitazioni hanno svuotato alcuni slot, completa con altri esercizi utili
    let progresso = true;
    while (esercizi.length < nEx && progresso) {
      progresso = false;
      for (const pattern of slot) {
        if (esercizi.length >= nEx) break;
        const lista = candidatiPer(pattern, { ...profilo, esclusi }).filter(x => !usati.has(x.id));
        if (!lista.length) continue;
        const chiave = `${chiaveSess}${idx}.${pattern}.extra${esercizi.length}`;
        const scelto = lista[(hash(seed + chiave) + (offsets[chiave] || 0) + (occorrenza - 1)) % lista.length];
        usati.add(scelto.id);
        const par = parametriPer(scelto, obiettivo);
        esercizi.push({
          chiave, esercizioId: scelto.id, nome: scelto.nome, gruppo: scelto.gruppo,
          pattern, tipo: scelto.tipo, anim: scelto.anim,
          serie: par.serie, ripetizioni: par.rip, recupero: par.recupero, rir: par.rir,
          durata: !!scelto.durata
        });
        progresso = true;
      }
    }

    // cardio finale
    const vuoleCardio = profilo.cardio === 'sempre' || (profilo.cardio !== 'mai' && obiettivo === 'dimagrimento');
    if (vuoleCardio) {
      const listaCardio = candidatiPer('cardio-liss', { ...profilo, esclusi })
        .concat(candidatiPer('cardio-hiit', { ...profilo, esclusi }));
      if (listaCardio.length) {
        const c = listaCardio[hash(seed + 'cardio' + idx) % listaCardio.length];
        esercizi.push({
          chiave: `${chiaveSess}.cardio`, esercizioId: c.id, nome: c.nome, gruppo: 'cardio',
          pattern: c.pattern, tipo: 'cardio', anim: c.anim,
          serie: 1, ripetizioni: obiettivo === 'dimagrimento' ? '15-20 min' : '10 min',
          recupero: 0, rir: '-', durata: true, finale: true
        });
      }
    }

    usatiPerTipo[chiaveSess] = usati;

    return {
      id: `${chiaveSess}-${idx}`,
      chiave: chiaveSess,
      nome: modello.nome,
      tipo: modello.tipo,
      giornoSuggerito: giorniSessione[idx],
      riscaldamento: RISCALDAMENTO[modello.tipo] || RISCALDAMENTO.full,
      esercizi,
      defaticamento: DEFATICAMENTO,
      durataStimata: durataStimata(esercizi)
    };
  });

  return {
    split: split.nome,
    giorniSettimana: giorni,
    sessioni,
    nota: (PARAMETRI[obiettivo] || PARAMETRI.mantenimento).nota,
    progressione: progressioneTesto(obiettivo),
    generataIl: new Date().toISOString()
  };
}

const PATTERN_PER_GRUPPO = {
  petto: ['spinta-orizzontale', 'isolamento-petto'],
  dorso: ['trazione-verticale', 'trazione-orizzontale', 'isolamento-dorso'],
  spalle: ['spinta-verticale', 'isolamento-spalle'],
  braccia: ['isolamento-bicipiti', 'isolamento-tricipiti'],
  gambe: ['squat', 'affondo', 'isolamento-quad'],
  glutei: ['hinge', 'affondo'],
  core: ['core-antiestensione', 'core-flessione', 'core-rotazione']
};

export const GRUPPI_FOCUS = [
  { id: 'nessuno', nome: 'Nessuna priorita' },
  { id: 'petto', nome: 'Petto' },
  { id: 'dorso', nome: 'Dorso' },
  { id: 'spalle', nome: 'Spalle' },
  { id: 'braccia', nome: 'Braccia' },
  { id: 'gambe', nome: 'Gambe' },
  { id: 'glutei', nome: 'Glutei' },
  { id: 'core', nome: 'Addominali' }
];

function progressioneTesto(obiettivo) {
  const comune = [
    'Settimane 1-3: aggiungi 1 ripetizione per serie (entro il range) oppure 2,5 kg sulla parte alta e 5 kg sulla parte bassa quando raggiungi il limite alto del range in tutte le serie.',
    'Settimana 4: scarico. Mantieni gli stessi carichi ma togli 1 serie per esercizio; poi riparti dalla settimana 1 con carichi piu alti.',
    'Registra sempre carico e ripetizioni: la progressione e il vero motore dei risultati.'
  ];
  if (obiettivo === 'forza') {
    comune.unshift('Sui fondamentali usa la stessa serie di lavoro per 2 settimane prima di aumentare il carico.');
  }
  return comune;
}

/** Alternative per lo stesso pattern (tasto "cambia esercizio"). */
export function alternativeEsercizio(pattern, profilo, esclusi) {
  return candidatiPer(pattern, { ...profilo, esclusi: esclusi || [] });
}


// ---------------------------------------------------------------- modifica
// Il trainer parte dalla bozza generata e la ritocca a mano. Queste funzioni
// lavorano su una copia della scheda e la restituiscono: le interfacce
// salvano poi il risultato con una sola chiamata all'API.

/** Voce di programma per un esercizio, con i parametri tipici dell'obiettivo. */
export function voceDa(esercizio, obiettivo = 'mantenimento') {
  const par = parametriPer(esercizio, obiettivo);
  return {
    chiave: 'man-' + esercizio.id + '-' + Math.random().toString(36).slice(2, 7),
    esercizioId: esercizio.id, nome: esercizio.nome, gruppo: esercizio.gruppo,
    pattern: esercizio.pattern, tipo: esercizio.tipo, anim: esercizio.anim,
    serie: par.serie, ripetizioni: par.rip, recupero: par.recupero, rir: par.rir,
    durata: !!esercizio.durata, note: ''
  };
}

function ricalcola(sessione) {
  sessione.durataStimata = durataStimata(sessione.esercizi);
  return sessione;
}

export function aggiungiEsercizio(scheda, iSessione, esercizio, obiettivo, posizione) {
  const s = structuredClone(scheda);
  const lista = s.sessioni[iSessione].esercizi;
  const voce = voceDa(esercizio, obiettivo);
  lista.splice(posizione ?? lista.length, 0, voce);
  ricalcola(s.sessioni[iSessione]);
  return s;
}

/** Sostituisce l'esercizio mantenendo serie, ripetizioni e recupero scelti dal trainer. */
export function sostituisciEsercizio(scheda, iSessione, iEsercizio, esercizio) {
  const s = structuredClone(scheda);
  const vecchia = s.sessioni[iSessione].esercizi[iEsercizio];
  s.sessioni[iSessione].esercizi[iEsercizio] = {
    ...vecchia,
    esercizioId: esercizio.id, nome: esercizio.nome, gruppo: esercizio.gruppo,
    pattern: esercizio.pattern, tipo: esercizio.tipo, anim: esercizio.anim, durata: !!esercizio.durata
  };
  return s;
}

export function rimuoviEsercizio(scheda, iSessione, iEsercizio) {
  const s = structuredClone(scheda);
  s.sessioni[iSessione].esercizi.splice(iEsercizio, 1);
  ricalcola(s.sessioni[iSessione]);
  return s;
}

export function spostaEsercizio(scheda, iSessione, da, a) {
  const s = structuredClone(scheda);
  const lista = s.sessioni[iSessione].esercizi;
  if (a < 0 || a >= lista.length) return s;
  const [voce] = lista.splice(da, 1);
  lista.splice(a, 0, voce);
  return s;
}

export function modificaVoce(scheda, iSessione, iEsercizio, campi) {
  const s = structuredClone(scheda);
  Object.assign(s.sessioni[iSessione].esercizi[iEsercizio], campi);
  ricalcola(s.sessioni[iSessione]);
  return s;
}

/** Programma vuoto con N sedute, per chi preferisce costruire da zero. */
export function schedaVuota(giorni = [0, 2, 4]) {
  return {
    split: 'Personalizzato',
    giorniSettimana: giorni.length,
    sessioni: giorni.map((g, i) => ({
      id: 'giorno-' + (i + 1), chiave: 'manuale', nome: 'Giorno ' + String.fromCharCode(65 + i),
      tipo: 'full', giornoSuggerito: g, riscaldamento: RISCALDAMENTO.full,
      esercizi: [], defaticamento: DEFATICAMENTO, durataStimata: 8
    })),
    nota: '', progressione: [], generataIl: new Date().toISOString()
  };
}

// ---------------------------------------------------------------- giorni
/** Aggiunge un giorno vuoto, sul primo giorno della settimana libero. */
export function aggiungiGiorno(scheda) {
  const s = structuredClone(scheda);
  if (s.sessioni.length >= 7) return s;
  const usati = new Set(s.sessioni.map(x => x.giornoSuggerito));
  const libero = [0, 1, 2, 3, 4, 5, 6].find(g => !usati.has(g)) ?? 0;
  s.sessioni.push({
    ...schedaVuota([libero]).sessioni[0],
    id: 'giorno-' + Date.now().toString(36) + s.sessioni.length,
    nome: 'Giorno ' + String.fromCharCode(65 + s.sessioni.length)
  });
  s.giorniSettimana = s.sessioni.length;
  return s;
}

export function rimuoviGiorno(scheda, iSessione) {
  const s = structuredClone(scheda);
  s.sessioni.splice(iSessione, 1);
  s.giorniSettimana = s.sessioni.length;
  return s;
}

/** campi: { nome, giornoSuggerito } */
export function modificaGiorno(scheda, iSessione, campi) {
  const s = structuredClone(scheda);
  Object.assign(s.sessioni[iSessione], campi);
  return s;
}

/** Copia di una scheda come punto di partenza per la successiva. */
export function copiaScheda(scheda) {
  return { ...structuredClone(scheda), generataIl: new Date().toISOString() };
}
