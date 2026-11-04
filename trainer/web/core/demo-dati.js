// Dati di esempio per la modalita' demo: cinque atleti inventati con
// programmi generati dal motore vero e qualche settimana di storico.
import { generaScheda } from '../../shared/programmi.js';
import { isoData, indiceGiorno } from '../../shared/progressi.js';

const ATLETI = [
  { nome: 'Marco Rossi', email: 'marco.rossi@esempio.it', telefono: '333 120 4471', sesso: 'uomo', eta: 34, peso: 82, altezza: 180,
    obiettivo: 'massa', esperienza: 'intermedio', attrezzatura: 'palestra', giorniSettimana: [0, 1, 3, 4], durataSessione: 60,
    limitazioni: [], note: 'Vuole migliorare la panca. Turni in ufficio, preferisce la sera.', forza: 1.2, settimane: 6, salta: 0.1 },
  { nome: 'Giulia Bianchi', email: 'giulia.b@esempio.it', telefono: '347 882 1903', sesso: 'donna', eta: 28, peso: 64, altezza: 166,
    obiettivo: 'dimagrimento', esperienza: 'principiante', attrezzatura: 'palestra', giorniSettimana: [0, 2, 4], durataSessione: 50,
    limitazioni: [], note: 'Prima esperienza in sala pesi.', forza: 0.55, settimane: 5, salta: 0.15 },
  { nome: 'Luca Ferri', email: 'luca.ferri@esempio.it', telefono: '339 455 0128', sesso: 'uomo', eta: 45, peso: 91, altezza: 176,
    obiettivo: 'ricomposizione', esperienza: 'principiante', attrezzatura: 'palestra', giorniSettimana: [1, 3], durataSessione: 60,
    limitazioni: ['schiena'], note: 'Lombalgia in passato: niente stacchi da terra.', forza: 0.8, settimane: 4, salta: 0.2, fermoDa: 12 },
  { nome: 'Sara Conti', email: 'sara.conti@esempio.it', telefono: '320 771 3390', sesso: 'donna', eta: 31, peso: 60, altezza: 170,
    obiettivo: 'forza', esperienza: 'avanzato', attrezzatura: 'palestra', giorniSettimana: [0, 1, 2, 4, 5], durataSessione: 75,
    limitazioni: [], note: 'Prepara una gara di powerlifting a marzo.', forza: 1.0, settimane: 6, salta: 0.05 },
  { nome: 'Paolo Greco', email: 'paolo.greco@esempio.it', telefono: '348 610 2257', sesso: 'uomo', eta: 52, peso: 78, altezza: 172,
    obiettivo: 'mantenimento', esperienza: 'principiante', attrezzatura: 'casa', giorniSettimana: [1, 4], durataSessione: 45,
    limitazioni: ['ginocchia'], note: 'Nuovo atleta: primo incontro giovedi\'.', settimane: 0 }
];

const CARICO_BASE = {
  squat: 60, hinge: 70, affondo: 16, 'spinta-orizzontale': 50, 'spinta-verticale': 30,
  'trazione-orizzontale': 45, 'trazione-verticale': 45
};

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
const arrotonda = kg => Math.max(2, Math.round(kg / 2.5) * 2.5);

function altoRange(testo) {
  const m = String(testo).match(/(\d+)\s*-\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [8, 10];
}

export function datiDemo(oggi = new Date()) {
  const id = () => crypto.randomUUID();
  const trainer = { id: 'demo-trainer', nome: 'Elena Marchi', email: 'demo@gymcoach.app' };
  const atleti = [], programmi = [], sedute = [];

  ATLETI.forEach((def, ic) => {
    const { forza, settimane, salta, fermoDa, ...dati } = def;
    const inizio = new Date(oggi); inizio.setDate(inizio.getDate() - settimane * 7 - 3);
    const atleta = { id: id(), ...dati, focus: 'nessuno', cardio: 'auto', creatoIl: inizio.toISOString() };
    atleti.push(atleta);
    if (!settimane) return;

    const scheda = generaScheda(atleta, { seed: 'demo' + ic });
    const prog = {
      id: id(), atletaId: atleta.id, nome: `${scheda.split} · blocco 1`, stato: 'attivo', scheda,
      creatoIl: inizio.toISOString(), aggiornatoIl: inizio.toISOString()
    };
    programmi.push(prog);

    const limite = new Date(oggi); limite.setDate(limite.getDate() - (fermoDa || 0));
    for (let d = new Date(inizio); d < limite; d.setDate(d.getDate() + 1)) {
      if (isoData(d) >= isoData(oggi)) break;
      const sess = scheda.sessioni.find(s => s.giornoSuggerito === indiceGiorno(d));
      if (!sess) continue;
      const giorno = isoData(d);
      if (hash(atleta.nome + giorno) < salta) continue;
      const settimana = Math.floor((d - inizio) / (7 * 86400000));
      sedute.push({
        id: id(), atletaId: atleta.id, programmaId: prog.id, data: giorno,
        sessioneRef: sess.id, nomeSessione: sess.nome, durataMin: sess.durataStimata + Math.round(hash(giorno) * 10) - 4,
        note: '',
        // Marco usa gia' l'app atleta: le sedute di giovedi' e venerdi' le registra lui
        origine: ic === 0 && sess.giornoSuggerito >= 3 ? 'atleta' : 'trainer',
        esercizi: sess.esercizi.filter(v => v.tipo !== 'cardio').map(v => {
          const base = (CARICO_BASE[v.pattern] ?? (v.pattern.startsWith('core') ? 0 : 12)) * forza;
          const peso = base ? arrotonda(base + Math.floor(settimana / 2) * (base > 30 ? 2.5 : 1)) : 0;
          const [basso, alto] = altoRange(v.ripetizioni);
          return {
            esercizioId: v.esercizioId, nome: v.nome,
            serie: Array.from({ length: Number(v.serie) || 3 }, (_, i) => ({
              peso,
              rip: v.tipo === 'isometrico' ? 40 : Math.max(basso, alto - i - Math.floor(hash(giorno + v.esercizioId + i) * 2))
            }))
          };
        })
      });
    }
  });

  // account di esempio per l'app atleta (solo demo: password in chiaro nel browser)
  const accountAtleti = [{ id: id(), atletaId: atleti[0].id, email: 'marco.rossi@esempio.it', password: 'atleta123' }];
  return { versione: 2, trainer, atleti, programmi, sedute, esercizi: [], accountAtleti, inviti: [], accessoAtleta: null };
}
