// Operazioni "di dominio" usate da tutte le interfacce, sopra al contratto API.
import { ESERCIZI, GRUPPI } from '../../shared/exercises.js';
import { generaScheda, risolviEsercizio, cercaEsercizi } from '../../shared/programmi.js';
import { giorniDa, sedutaDelGiorno, aderenza } from '../../shared/progressi.js';
import { OBIETTIVI } from '../../shared/modello.js';

export { GRUPPI, OBIETTIVI };

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** Mappa id -> esercizio personale, per passarla al generatore. */
export const mappaPersonali = lista => Object.fromEntries((lista || []).map(e => [e.id, e]));

export function catalogo(personali = []) {
  return [...ESERCIZI, ...personali].sort((a, b) => a.nome.localeCompare(b.nome));
}
export const trova = (id, personali = []) => risolviEsercizio(id, mappaPersonali(personali));
export const cerca = (testo, personali = []) => cercaEsercizi(testo, mappaPersonali(personali), 30);

/** Bozza di programma dal profilo dell’atleta, con il motore di GymDiet. */
export function bozzaProgramma(atleta, personali = [], seme = Date.now().toString(36)) {
  const scheda = generaScheda(atleta, { seed: seme, personali: mappaPersonali(personali) });
  const d = new Date();
  return { nome: `${scheda.split} · ${MESI[d.getMonth()]} ${d.getFullYear()}`, stato: 'attivo', scheda };
}

export const programmaAttivo = programmi => programmi.find(p => p.stato === 'attivo') || null;

/** Stato dell’atleta a colpo d'occhio, per pill e ordinamenti. */
export function statoAtleta(atleta, oggi = new Date()) {
  if (!atleta.programmaAttivo) return { chiave: 'senza', etichetta: 'Senza scheda', livello: 'neutro' };
  const g = giorniDa(atleta.ultimaSeduta, oggi);
  if (g === null) return { chiave: 'nuovo', etichetta: 'Da iniziare', livello: 'neutro' };
  if (g > 9) return { chiave: 'fermo', etichetta: `Fermo da ${g} giorni`, livello: 'attenzione' };
  return { chiave: 'ok', etichetta: 'In regola', livello: 'ok' };
}

/** Atleti con una seduta prevista oggi (serve il programma completo). */
export async function agendaDiOggi(api, atleti, oggi = new Date()) {
  const conProgramma = atleti.filter(c => c.programmaAttivo);
  const programmi = await Promise.all(conProgramma.map(c => api.programmi(c.id)));
  return conProgramma
    .map((c, i) => {
      const prog = programmaAttivo(programmi[i]);
      return { atleta: c, programma: prog, seduta: sedutaDelGiorno(prog, oggi) };
    })
    .filter(x => x.seduta);
}

export { aderenza };

export function messaggioErrore(e) {
  return (e && e.message) || 'Qualcosa non ha funzionato';
}
