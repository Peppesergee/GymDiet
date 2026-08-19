// Generatore del piano alimentare settimanale.
import { alimentiDisponibili, macroDi, ALIMENTI_BY_ID } from './alimenti.js';
import { ripartizionePasti } from './nutrizione.js';

export const GIORNI = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'];

// ---------------------------------------------------------------- utilita'
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function arrotonda(valore, step, min, max) {
  let v = Math.round(valore / step) * step;
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

// Struttura dei pasti: quali "ruoli" compongono ogni tipo di pasto
const STRUTTURA = {
  colazione:  [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'carbo', tipo: 'solve' }, { ruolo: 'frutta', tipo: 'fisso' }, { ruolo: 'grassi', tipo: 'solve' }],
  spuntino:   [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'frutta', tipo: 'fisso' }, { ruolo: 'grassi', tipo: 'solve' }],
  spuntino1:  [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'frutta', tipo: 'fisso' }, { ruolo: 'grassi', tipo: 'solve' }],
  spuntino2:  [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'carbo', tipo: 'solve' }, { ruolo: 'grassi', tipo: 'solve' }],
  spuntino3:  [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'frutta', tipo: 'fisso' }],
  pranzo:     [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'carbo', tipo: 'solve' }, { ruolo: 'verdura', tipo: 'fisso' }, { ruolo: 'grassi', tipo: 'solve' }],
  cena:       [{ ruolo: 'proteine', tipo: 'solve' }, { ruolo: 'carbo', tipo: 'solve' }, { ruolo: 'verdura', tipo: 'fisso' }, { ruolo: 'grassi', tipo: 'solve' }]
};

const QUANTITA_FISSE = { verdura: 200, frutta: 120 };

function tipoPasto(id) {
  if (id.startsWith('spuntino')) return id;
  return id;
}

function candidati(pool, ruolo, pastoId) {
  const chiavePasto = pastoId.startsWith('spuntino') ? 'spuntino' : pastoId;
  let lista = pool.filter(a => a.ruolo === ruolo && a.pasti.includes(chiavePasto));
  if (ruolo === 'grassi' && (pastoId === 'pranzo' || pastoId === 'cena')) {
    // a pranzo/cena il condimento e' quasi sempre olio
    const olio = lista.filter(a => a.id === 'olio-oliva');
    if (olio.length) lista = olio;
  }
  return lista.sort((a, b) => a.id.localeCompare(b.id));
}

function scegli(lista, seed, offset, giorno, usati) {
  if (!lista.length) return null;
  const base = hash(seed) + giorno * 3 + (offset || 0);
  for (let i = 0; i < lista.length; i++) {
    const cand = lista[(base + i) % lista.length];
    if (!usati || !usati.has(cand.id)) return cand;
  }
  return lista[base % lista.length];
}

function sommaMacro(voci) {
  return voci.reduce((acc, v) => ({
    kcal: acc.kcal + v.macro.kcal,
    proteine: acc.proteine + v.macro.proteine,
    carboidrati: acc.carboidrati + v.macro.carboidrati,
    grassi: acc.grassi + v.macro.grassi,
    fibre: acc.fibre + v.macro.fibre
  }), { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0 });
}

/** Costruisce un singolo pasto risolvendo le quantita' per centrare i macro target. */
function componiPasto(pastoId, nomePasto, target, pool, seed, offsets, giorno, override, usatiGiorno) {
  const struttura = STRUTTURA[tipoPasto(pastoId)] || STRUTTURA.spuntino;
  const voci = [];

  for (const slot of struttura) {
    const lista = candidati(pool, slot.ruolo, pastoId);
    const chiaveOffset = `${pastoId}.${slot.ruolo}`;
    const off = (offsets && offsets[`${giorno}.${chiaveOffset}`]) || 0;
    const forzatoId = override && override[`${giorno}.${chiaveOffset}`];
    const forzato = forzatoId ? pool.find(a => a.id === forzatoId) : null;
    const alimento = forzato || scegli(lista, `${seed}|${pastoId}|${slot.ruolo}`, off, giorno, usatiGiorno);
    if (!alimento) continue;
    if (usatiGiorno && slot.ruolo !== 'grassi') usatiGiorno.add(alimento.id);
    const grammi = slot.tipo === 'fisso'
      ? arrotonda(QUANTITA_FISSE[slot.ruolo] || alimento.min, alimento.step, alimento.min, alimento.max)
      : alimento.min;
    voci.push({ ruolo: slot.ruolo, tipo: slot.tipo, alimentoId: alimento.id, alimento, grammi, macro: macroDi(alimento, grammi), chiaveOffset });
  }

  // risoluzione iterativa: proteine -> carboidrati -> grassi
  const ordine = ['proteine', 'carbo', 'grassi'];
  for (let iter = 0; iter < 4; iter++) {
    for (const ruolo of ordine) {
      const voce = voci.find(v => v.ruolo === ruolo && v.tipo === 'solve');
      if (!voce) continue;
      const altri = sommaMacro(voci.filter(v => v !== voce));
      const a = voce.alimento;
      let grammi = voce.grammi;
      if (ruolo === 'proteine' && a.p > 0) {
        grammi = (target.proteine - altri.proteine) / (a.p / 100);
      } else if (ruolo === 'carbo' && a.c > 0) {
        grammi = (target.carboidrati - altri.carboidrati) / (a.c / 100);
      } else if (ruolo === 'grassi' && a.g > 0) {
        grammi = (target.grassi - altri.grassi) / (a.g / 100);
      }
      voce.grammi = arrotonda(Math.max(0, grammi), a.step, a.min, a.max);
      voce.macro = macroDi(a, voce.grammi);
    }
  }

  return { id: pastoId, nome: nomePasto, voci, target };
}

/**
 * Ottimizza le quantita' di tutti gli alimenti della giornata per avvicinarsi
 * il piu' possibile ai macro target (discesa a coordinate su errore quadratico
 * relativo, con vincoli di porzione minima/massima e arrotondamento allo step).
 */
const PESI = { proteine: 3.0, carboidrati: 1.0, grassi: 1.5, kcal: 2.0 };

function totaliDa(voci) { return sommaMacro(voci); }

function errore(tot, target) {
  let e = 0;
  for (const k of ['proteine', 'carboidrati', 'grassi', 'kcal']) {
    const t = Math.max(1, target[k]);
    const d = (tot[k] - t) / t;
    e += PESI[k] * d * d;
  }
  return e;
}

// penalita' applicata all'eliminazione di un alimento: alta per la fonte
// proteica principale del pasto, bassa per condimenti e contorni
function penalitaZero(voce) {
  if (voce.extra) return 0.002;
  if (voce.ruolo === 'proteine') return 0.05;
  if (voce.ruolo === 'carbo') return 0.02;
  return 0.004;
}

// Le voci strutturali del pasto (proteine, carboidrati, verdura, frutta) non
// possono sparire: al massimo scendono alla porzione minima. Condimenti e
// aggiunte extra invece si possono togliere.
function limiti(voce) {
  const a = voce.alimento;
  if (voce.extra || voce.ruolo === 'grassi') return [0, a.max];
  if (voce.ruolo === 'verdura') return [Math.min(100, a.min), a.max];
  return [a.min, a.max];
}

function ottimizzaGiorno(pasti, target, pool) {
  let voci = pasti.flatMap(p => p.voci);
  if (!voci.length) return;

  const passo = () => {
    for (const v of voci) {
      const a = v.alimento;
      const [lo, hi] = limiti(v);
      const altri = totaliDa(voci.filter(x => x !== v));
      // coefficienti per grammo
      const coef = { proteine: a.p / 100, carboidrati: a.c / 100, grassi: a.g / 100, kcal: a.kcal / 100 };
      let num = 0, den = 0;
      for (const k of ['proteine', 'carboidrati', 'grassi', 'kcal']) {
        const t = Math.max(1, target[k]);
        const w = PESI[k] / (t * t);
        num += w * coef[k] * (target[k] - altri[k]);
        den += w * coef[k] * coef[k];
      }
      if (den <= 0) continue;
      const ideale = num / den;
      // candidati: step inferiore, step superiore, zero, minimo di porzione
      const cand = new Set([0, a.min, a.max,
        Math.floor(ideale / a.step) * a.step,
        Math.ceil(ideale / a.step) * a.step]);
      let migliore = v.grammi, errMin = Infinity;
      for (let g of cand) {
        g = g <= 0 ? 0 : Math.round(g / a.step) * a.step;
        if (g > 0 && g < a.min) g = a.min;
        if (g < lo) g = lo;
        if (g > hi) g = hi;
        const tot = {
          proteine: altri.proteine + coef.proteine * g,
          carboidrati: altri.carboidrati + coef.carboidrati * g,
          grassi: altri.grassi + coef.grassi * g,
          kcal: altri.kcal + coef.kcal * g
        };
        const centro = (a.min + a.max) / 2;
        const ampiezza = Math.max(1, a.max - a.min);
        const regolarita = 0.02 * Math.pow((g - centro) / ampiezza, 2);
        const e = errore(tot, target) + (g === 0 ? penalitaZero(v) : regolarita);
        if (e < errMin - 1e-9) { errMin = e; migliore = g; }
      }
      if (migliore !== v.grammi) {
        v.grammi = migliore;
        v.macro = macroDi(a, migliore);
      }
    }
  };

  for (let i = 0; i < 6; i++) passo();
  correggiCarenze(pasti, target, pool);
  voci = pasti.flatMap(p => p.voci);
  for (let i = 0; i < 5; i++) passo();

  // rimuove gli alimenti azzerati, garantendo almeno una voce per pasto
  for (const p of pasti) {
    const restanti = p.voci.filter(v => v.grammi > 0);
    if (restanti.length) p.voci = restanti;
    else {
      const primo = p.voci[0];
      primo.grammi = primo.alimento.min;
      primo.macro = macroDi(primo.alimento, primo.grammi);
      p.voci = [primo];
    }
  }
}

/**
 * Se il fabbisogno proteico non e' raggiungibile con le porzioni scelte
 * (tipico con pochi pasti o diete vegane) aggiunge una porzione extra.
 */
function correggiCarenze(pasti, target, pool) {
  for (let giro = 0; giro < 3; giro++) {
    const tutte = pasti.flatMap(p => p.voci);
    const totali = sommaMacro(tutte);
    const mancante = target.proteine - totali.proteine;
    if (mancante < 8) return;
    const ordinati = pasti.slice().sort((a, b) => b.target.proteine - a.target.proteine);
    let aggiunto = false;
    for (const pasto of ordinati) {
      if (pasto.voci.filter(v => v.ruolo === 'proteine').length > 1) continue;
      const usati = new Set(pasto.voci.map(v => v.alimentoId));
      const lista = candidati(pool || [], 'proteine', pasto.id)
        .filter(a => !usati.has(a.id))
        .sort((a, b) => (b.p / Math.max(b.kcal, 1)) - (a.p / Math.max(a.kcal, 1)));
      const scelto = lista[0];
      if (!scelto) continue;
      pasto.voci.push({
        ruolo: 'proteine', tipo: 'solve', extra: true, alimentoId: scelto.id, alimento: scelto,
        grammi: scelto.min, macro: macroDi(scelto, scelto.min), chiaveOffset: `${pasto.id}.proteine-extra`
      });
      aggiunto = true;
      break;
    }
    if (!aggiunto) return;
  }
}

function serializzaPasto(p) {
  const totali = sommaMacro(p.voci);
  return {
    id: p.id,
    nome: p.nome,
    voci: p.voci.map(v => ({
      ruolo: v.ruolo, tipo: v.tipo, alimentoId: v.alimentoId, nome: v.alimento.nome,
      nota: v.alimento.nota, grammi: Math.round(v.grammi), extra: !!v.extra,
      unita: v.alimento.ruolo === 'latticini' ? 'ml' : 'g',
      macro: arrotondaMacro(v.macro), chiaveOffset: v.chiaveOffset
    })),
    target: arrotondaMacro(p.target),
    totali: arrotondaMacro(totali)
  };
}

function arrotondaMacro(m) {
  return {
    kcal: Math.round(m.kcal),
    proteine: Math.round(m.proteine),
    carboidrati: Math.round(m.carboidrati),
    grassi: Math.round(m.grassi),
    fibre: Math.round(m.fibre * 10) / 10
  };
}

/**
 * Genera il piano alimentare settimanale.
 * @param macro risultato di calcolaMacro()
 * @param opzioni { numPasti, preferenze, esclusi, seed, offsets, giorniAllenamento, ciclizza }
 */
export function generaSettimana(macro, opzioni = {}) {
  const numPasti = opzioni.numPasti || 4;
  const pool = alimentiDisponibili(opzioni.preferenze || [], opzioni.esclusi || []);
  const seed = opzioni.seed || 'gymdiet';
  const offsets = opzioni.offsets || {};
  const schema = ripartizionePasti(numPasti);
  const giorniAllenamento = opzioni.giorniAllenamento || [];
  const ciclizza = opzioni.ciclizza !== false;

  const giorni = GIORNI.map((nomeGiorno, i) => {
    // Ciclizzazione: nei giorni di allenamento piu' carboidrati, nei giorni di riposo meno
    let kcalGiorno = macro.kcal;
    let carbo = macro.carboidrati;
    let grassi = macro.grassi;
    const allenamento = giorniAllenamento.includes(i);
    if (ciclizza && giorniAllenamento.length > 0 && giorniAllenamento.length < 7) {
      const nRiposo = 7 - giorniAllenamento.length;
      const spostamento = Math.round(macro.carboidrati * 0.15);
      if (allenamento) {
        carbo = macro.carboidrati + Math.round(spostamento * nRiposo / giorniAllenamento.length);
        grassi = macro.grassi - Math.round(macro.grassi * 0.05);
      } else {
        carbo = macro.carboidrati - spostamento;
        grassi = macro.grassi + Math.round(macro.grassi * 0.08);
      }
      kcalGiorno = macro.proteine * 4 + carbo * 4 + grassi * 9;
    }
    const targetGiorno = { kcal: kcalGiorno, proteine: macro.proteine, carboidrati: carbo, grassi, fibre: macro.fibre };

    const usatiGiorno = new Set();
    const pastiRaw = schema.map(s => componiPasto(
      s.id, s.nome,
      {
        kcal: targetGiorno.kcal * s.quota,
        proteine: targetGiorno.proteine * s.quota,
        carboidrati: targetGiorno.carboidrati * s.quota,
        grassi: targetGiorno.grassi * s.quota
      },
      pool, seed, offsets, i, opzioni.override, usatiGiorno
    ));

    ottimizzaGiorno(pastiRaw, targetGiorno, pool);
    const pasti = pastiRaw.map(serializzaPasto);

    const totali = pasti.reduce((acc, p) => ({
      kcal: acc.kcal + p.totali.kcal,
      proteine: acc.proteine + p.totali.proteine,
      carboidrati: acc.carboidrati + p.totali.carboidrati,
      grassi: acc.grassi + p.totali.grassi,
      fibre: acc.fibre + p.totali.fibre
    }), { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0 });

    return {
      indice: i, nome: nomeGiorno, allenamento,
      target: arrotondaMacro(targetGiorno),
      totali: arrotondaMacro(totali),
      pasti
    };
  });

  return { giorni, numPasti, generatoIl: new Date().toISOString() };
}

/** Lista della spesa aggregata per categoria. */
export function listaSpesa(settimana) {
  const somma = {};
  for (const g of settimana.giorni) {
    for (const p of g.pasti) {
      for (const v of p.voci) {
        if (!somma[v.alimentoId]) somma[v.alimentoId] = { nome: v.nome, grammi: 0, unita: v.unita, ruolo: ALIMENTI_BY_ID[v.alimentoId]?.ruolo || 'libero' };
        somma[v.alimentoId].grammi += v.grammi;
      }
    }
  }
  const categorie = {
    proteine: 'Proteine (carne, pesce, uova, legumi)',
    latticini: 'Latte e derivati',
    carbo: 'Cereali e derivati',
    verdura: 'Verdura',
    frutta: 'Frutta',
    grassi: 'Grassi e condimenti',
    libero: 'Altro'
  };
  const gruppi = {};
  for (const id in somma) {
    const item = somma[id];
    const cat = categorie[item.ruolo] || 'Altro';
    (gruppi[cat] = gruppi[cat] || []).push({
      id, nome: item.nome, unita: item.unita,
      grammi: item.grammi,
      etichetta: item.grammi >= 1000
        ? `${(item.grammi / 1000).toFixed(1).replace('.', ',')} kg`
        : `${item.grammi} ${item.unita}`
    });
  }
  for (const k in gruppi) gruppi[k].sort((a, b) => a.nome.localeCompare(b.nome));
  return gruppi;
}

/** Alternative disponibili per una voce (per il tasto "cambia alimento"). */
export function alternative(ruolo, pastoId, preferenze, esclusi) {
  const pool = alimentiDisponibili(preferenze || [], esclusi || []);
  return candidati(pool, ruolo, pastoId);
}
