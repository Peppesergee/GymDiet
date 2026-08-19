// Calcoli energetici e macronutrienti.

export const LIVELLI_ATTIVITA = {
  sedentario:   { nome: 'Sedentario (ufficio, poco movimento)', fattore: 1.25 },
  leggero:      { nome: 'Leggermente attivo (cammino un po\')', fattore: 1.375 },
  moderato:     { nome: 'Moderatamente attivo (in piedi/cammino molto)', fattore: 1.5 },
  attivo:       { nome: 'Molto attivo (lavoro fisico)', fattore: 1.65 }
};

export const OBIETTIVI = {
  dimagrimento:   { nome: 'Dimagrimento', deltaKcal: -0.20, proteine: 2.0, grassi: 0.8, descr: 'Deficit calorico del 20% con proteine alte per preservare la massa magra.' },
  ricomposizione: { nome: 'Ricomposizione corporea', deltaKcal: -0.08, proteine: 2.1, grassi: 0.9, descr: 'Leggero deficit: perdi grasso mantenendo (o costruendo) muscolo.' },
  mantenimento:   { nome: 'Mantenimento', deltaKcal: 0, proteine: 1.8, grassi: 1.0, descr: 'Calorie di mantenimento, focus su performance e salute.' },
  massa:          { nome: 'Aumento massa muscolare', deltaKcal: 0.12, proteine: 1.9, grassi: 1.0, descr: 'Surplus calorico moderato per crescere limitando il grasso.' },
  forza:          { nome: 'Forza', deltaKcal: 0.08, proteine: 1.9, grassi: 1.0, descr: 'Leggero surplus a supporto di alzate pesanti.' }
};

export const ESPERIENZA = {
  principiante: { nome: 'Principiante (< 6 mesi)', serieSettimana: 12, rirBase: 3 },
  intermedio:   { nome: 'Intermedio (6 mesi - 2 anni)', serieSettimana: 16, rirBase: 2 },
  avanzato:     { nome: 'Avanzato (> 2 anni)', serieSettimana: 20, rirBase: 1 }
};

/** Metabolismo basale — Mifflin-St Jeor, o Katch-McArdle se e' nota la % di grasso. */
export function calcolaBMR(p) {
  const { peso, altezza, eta, sesso, bodyFat } = p;
  if (bodyFat && bodyFat > 3 && bodyFat < 60) {
    const massaMagra = peso * (1 - bodyFat / 100);
    return Math.round(370 + 21.6 * massaMagra);
  }
  const base = 10 * peso + 6.25 * altezza - 5 * eta;
  return Math.round(sesso === 'donna' ? base - 161 : base + 5);
}

/** Dispendio energetico giornaliero, incluso l'allenamento distribuito sulla settimana. */
export function calcolaTDEE(p) {
  const bmr = calcolaBMR(p);
  const fattore = (LIVELLI_ATTIVITA[p.attivita] || LIVELLI_ATTIVITA.sedentario).fattore;
  const giorni = Number(p.giorniAllenamento) || 3;
  const durata = Number(p.durataSessione) || 60;
  // ~0.0875 kcal/min per kg di peso (allenamento coi pesi, MET ~5)
  const kcalSessione = Math.round(durata * 0.0875 * (Number(p.peso) || 75));
  const extraGiornaliero = Math.round((kcalSessione * giorni) / 7);
  return { bmr, neat: Math.round(bmr * fattore), allenamento: extraGiornaliero, tdee: Math.round(bmr * fattore) + extraGiornaliero };
}

/** Calorie e macro target giornalieri. */
export function calcolaMacro(p) {
  const { tdee, bmr, neat, allenamento } = calcolaTDEE(p);
  const ob = OBIETTIVI[p.obiettivo] || OBIETTIVI.mantenimento;
  let kcal = Math.round(tdee * (1 + ob.deltaKcal));
  // mai sotto il metabolismo basale
  kcal = Math.max(kcal, Math.round(bmr * 1.1));

  const pesoRif = pesoRiferimento(p);
  let proteine = Math.round(pesoRif * ob.proteine);
  proteine = Math.min(proteine, Math.round(kcal * 0.35 / 4));
  let grassi = Math.round(pesoRif * ob.grassi);
  let kcalRimanenti = kcal - proteine * 4 - grassi * 9;
  // se i carboidrati risultassero troppo bassi, riduco leggermente i grassi
  if (kcalRimanenti < kcal * 0.15) {
    grassi = Math.max(Math.round(pesoRif * 0.6), Math.round((kcal * 0.20) / 9));
    kcalRimanenti = kcal - proteine * 4 - grassi * 9;
  }
  const carboidrati = Math.max(30, Math.round(kcalRimanenti / 4));
  const fibre = Math.round(kcal / 1000 * 14);
  const acqua = Math.round((Number(p.peso) || 75) * 0.035 * 10) / 10;

  return {
    bmr, neat, allenamento, tdee, kcal,
    proteine, carboidrati, grassi, fibre, acqua,
    percentuali: {
      proteine: Math.round(proteine * 4 / kcal * 100),
      carboidrati: Math.round(carboidrati * 4 / kcal * 100),
      grassi: Math.round(grassi * 9 / kcal * 100)
    },
    obiettivo: ob
  };
}

/** Stima della percentuale di grasso corporeo (Deurenberg) quando non e' nota. */
export function stimaBodyFat(p) {
  const h = (Number(p.altezza) || 175) / 100;
  const bmi = (Number(p.peso) || 75) / (h * h);
  const eta = Number(p.eta) || 30;
  const sesso = p.sesso === 'donna' ? 0 : 1;
  return Math.max(5, Math.round((1.2 * bmi + 0.23 * eta - 10.8 * sesso - 5.4) * 10) / 10);
}

/** Con BF alto si usa un peso "corretto" per non gonfiare i target proteici. */
function pesoRiferimento(p) {
  const peso = Number(p.peso) || 75;
  const bf = Number(p.bodyFat) || stimaBodyFat(p);
  const soglia = p.sesso === 'donna' ? 30 : 22;
  if (bf > soglia) {
    const magra = peso * (1 - bf / 100);
    return Math.round((magra * 1.25) * 10) / 10;
  }
  return peso;
}

export function calcolaBMI(p) {
  const h = (Number(p.altezza) || 175) / 100;
  const bmi = (Number(p.peso) || 75) / (h * h);
  let categoria = 'Normopeso';
  if (bmi < 18.5) categoria = 'Sottopeso';
  else if (bmi >= 25 && bmi < 30) categoria = 'Sovrappeso';
  else if (bmi >= 30) categoria = 'Obesita';
  return { valore: Math.round(bmi * 10) / 10, categoria };
}

/** Numero di pasti consigliato/impostato e ripartizione percentuale delle calorie. */
export function ripartizionePasti(numPasti, allenamentoAlMattino) {
  const schemi = {
    3: [
      { id: 'colazione', nome: 'Colazione', quota: 0.30 },
      { id: 'pranzo', nome: 'Pranzo', quota: 0.40 },
      { id: 'cena', nome: 'Cena', quota: 0.30 }
    ],
    4: [
      { id: 'colazione', nome: 'Colazione', quota: 0.25 },
      { id: 'pranzo', nome: 'Pranzo', quota: 0.35 },
      { id: 'spuntino', nome: 'Spuntino', quota: 0.12 },
      { id: 'cena', nome: 'Cena', quota: 0.28 }
    ],
    5: [
      { id: 'colazione', nome: 'Colazione', quota: 0.22 },
      { id: 'spuntino1', nome: 'Spuntino mattina', quota: 0.10 },
      { id: 'pranzo', nome: 'Pranzo', quota: 0.32 },
      { id: 'spuntino2', nome: 'Spuntino pomeriggio', quota: 0.11 },
      { id: 'cena', nome: 'Cena', quota: 0.25 }
    ],
    6: [
      { id: 'colazione', nome: 'Colazione', quota: 0.20 },
      { id: 'spuntino1', nome: 'Spuntino mattina', quota: 0.10 },
      { id: 'pranzo', nome: 'Pranzo', quota: 0.28 },
      { id: 'spuntino2', nome: 'Spuntino pomeriggio', quota: 0.12 },
      { id: 'cena', nome: 'Cena', quota: 0.22 },
      { id: 'spuntino3', nome: 'Spuntino serale', quota: 0.08 }
    ]
  };
  const s = schemi[numPasti] || schemi[4];
  return s.map(x => ({ ...x }));
}
