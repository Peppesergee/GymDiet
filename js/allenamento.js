// Generatore della scheda di allenamento.
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

/**
 * Genera la scheda.
 * @param profilo { giorniAllenamento, durataSessione, obiettivo, esperienza, attrezzatura, limitazioni, focus, cardio }
 * @param opzioni { seed, offsets, esclusi }
 */
export function generaScheda(profilo, opzioni = {}) {
  const giorni = Math.max(2, Math.min(6, Number(profilo.giorniAllenamento) || 3));
  const esperienza = profilo.esperienza || 'principiante';
  const obiettivo = profilo.obiettivo || 'mantenimento';
  const seed = opzioni.seed || 'gymdiet';
  const offsets = opzioni.offsets || {};
  const esclusi = opzioni.esclusi || [];

  let chiaveSplit = giorni;
  if (giorni === 3 && esperienza !== 'principiante') chiaveSplit = 3.5;
  const split = SPLIT[chiaveSplit] || SPLIT[3];
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
      const lista = candidatiPer(pattern, { ...profilo, esclusi });
      if (!lista.length) continue;
      const chiave = `${chiaveSess}${idx}.${pattern}.${esercizi.length}`;
      const off = offsets[chiave] || 0;
      let scelto = null;
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
      giornoSuggerito: split.giorni[idx],
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

export function dettaglioEsercizio(id) {
  return ESERCIZI_BY_ID[id] || null;
}
