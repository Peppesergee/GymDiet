// Rigenerazione di scheda e dieta a partire dallo stato.
import { generaScheda } from './allenamento.js';
import { generaSettimana } from './dieta.js';
import { calcolaMacro } from './nutrizione.js';

export function giorniAllenamento(stato) {
  if (!stato.scheda) return [];
  return stato.scheda.sessioni.map(s => s.giornoSuggerito).filter(g => g !== undefined);
}

export function rigeneraScheda(stato) {
  stato.scheda = generaScheda(stato.profilo, {
    seed: stato.semi.allenamento,
    offsets: stato.offsets.allenamento,
    esclusi: stato.esclusiEsercizi
  });
  return stato.scheda;
}

export function rigeneraDieta(stato) {
  const macro = calcolaMacro(stato.profilo);
  stato.macro = macro;
  stato.dieta = generaSettimana(macro, {
    numPasti: stato.profilo.numPasti,
    preferenze: stato.profilo.preferenze,
    esclusi: stato.profilo.esclusiAlimenti,
    seed: stato.semi.dieta,
    offsets: stato.offsets.dieta,
    override: (stato.override && stato.override.dieta) || {},
    giorniAllenamento: giorniAllenamento(stato),
    ciclizza: stato.profilo.ciclizza
  });
  return stato.dieta;
}

export function rigeneraTutto(stato) {
  rigeneraScheda(stato);
  rigeneraDieta(stato);
}

export function nuovoSeme() {
  return Math.random().toString(36).slice(2, 8);
}
