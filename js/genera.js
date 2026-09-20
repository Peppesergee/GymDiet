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
    esclusi: stato.esclusiEsercizi,
    override: (stato.override && stato.override.allenamento) || {}
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

/**
 * Sostituisce in modo permanente l'esercizio di uno slot della scheda con uno
 * scelto esplicitamente dall'utente (dal database curato, o creato al volo
 * con l'aiuto di Claude). A differenza del "cambia esercizio" algoritmico,
 * questa scelta resta fissa anche rigenerando la scheda in futuro.
 *
 * @param stato lo stato dell'app (mutato sul posto)
 * @param voce la voce della scheda da sostituire (serve voce.chiave e voce.esercizioId)
 * @param nuovoEsercizio l'esercizio scelto: { id, nome, ... }, gia' presente nel
 *   database curato oppure da salvare tra i personalizzati
 * @param opzioni.mantieniStorico se true, ogni seduta passata registrata sul
 *   vecchio esercizio viene "ereditata" dal nuovo: stesso id, stessa storia
 */
export function sostituisciEsercizioScheda(stato, voce, nuovoEsercizio, opzioni = {}) {
  const vecchioId = voce.esercizioId;
  const nuovoId = nuovoEsercizio.id;

  if (nuovoEsercizio.personalizzato) {
    stato.personalizzati[nuovoId] = nuovoEsercizio;
  }

  stato.override.allenamento[voce.chiave] = nuovoId;

  if (opzioni.mantieniStorico && vecchioId && vecchioId !== nuovoId) {
    for (const sessione of stato.log.sessioni) {
      for (const es of sessione.esercizi || []) {
        if (es.esercizioId === vecchioId) {
          es.esercizioId = nuovoId;
          es.nome = nuovoEsercizio.nome;
        }
      }
    }
  }

  rigeneraScheda(stato);
}

export function nuovoSeme() {
  return Math.random().toString(36).slice(2, 8);
}
