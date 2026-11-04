// Backend finto nel browser: stesse interfacce e stesse regole degli altri
// due (validazione, una sola scheda attiva, codici invito monouso), ma i dati
// restano in localStorage. App trainer e app atleta leggono lo stesso
// archivio: un invito creato nell'una si usa nell'altra, nello stesso browser.
import { normalizzaAtleta, validaScheda, validaSeduta, validaEsercizioPersonale, validaCredenziali,
  normalizzaCodice, formattaCodice, codiceDaByte, GIORNI_VALIDITA_INVITO } from '../../shared/modello.js';
import { ErroreApi } from './adapter-rest.js';
import { datiDemo } from './demo-dati.js';

const CHIAVE = 'gymcoach.demo.v2';
let memoria = null;   // se localStorage non e' disponibile

// si rilegge a ogni operazione: l'altra app puo' averlo cambiato
function leggi() {
  try {
    const t = localStorage.getItem(CHIAVE);
    if (t) return JSON.parse(t);
  } catch { /* storage non disponibile */ }
  if (!memoria) { memoria = datiDemo(); scrivi(memoria); }
  return memoria;
}
function scrivi(db) {
  memoria = db;
  try { localStorage.setItem(CHIAVE, JSON.stringify(db)); } catch { /* solo in memoria */ }
}
export function ripristinaDemo() { scrivi(datiDemo()); }

const copia = x => structuredClone(x);
const attesa = () => new Promise(r => setTimeout(r, 60));   // un minimo di latenza, come in rete
const ora = () => new Date().toISOString();

/** Esegue `fn(db)` e salva se ha modificato qualcosa. */
async function con(fn, { scrittura = false } = {}) {
  await attesa();
  const db = leggi();
  const r = fn(db);
  if (scrittura) scrivi(db);
  return r === undefined ? undefined : copia(r);
}

function riepilogo(db, a) {
  const ultime = db.sedute.filter(s => s.atletaId === a.id).map(s => s.data).sort();
  const p = db.programmi.find(x => x.atletaId === a.id && x.stato === 'attivo');
  const invito = db.inviti.filter(i => i.atletaId === a.id && !i.usatoIl && i.scadeIl > ora()).map(i => i.scadeIl).sort().at(-1);
  return {
    ...a, ultimaSeduta: ultime.at(-1) || null, programmaAttivo: p ? { id: p.id, nome: p.nome } : null,
    accountAtleta: db.accountAtleti.some(x => x.atletaId === a.id), invitoScade: invito || null
  };
}
const trovaAtleta = (db, id) => db.atleti.find(c => c.id === id) || (() => { throw new ErroreApi('Non trovato', 404); })();

// ================================================================ TRAINER
export function creaAdattatoreDemo() {
  leggi();
  const attiva = (db, atletaId, idTenere) => {
    for (const p of db.programmi) if (p.atletaId === atletaId && p.stato === 'attivo' && p.id !== idTenere) p.stato = 'archiviato';
  };
  const datiProgramma = p => {
    validaScheda(p.scheda);
    return { nome: String(p.nome || 'Scheda').slice(0, 120), stato: ['bozza', 'attivo', 'archiviato'].includes(p.stato) ? p.stato : 'bozza', scheda: copia(p.scheda) };
  };

  return {
    tipo: 'demo',
    descrizione: 'Demo nel browser · dati di esempio',
    ripristina: ripristinaDemo,

    sessione: () => con(db => db.trainer),
    accedi: () => con(db => db.trainer),
    registra: () => con(db => db.trainer),
    async esci() {},

    elencoAtleti: () => con(db => db.atleti.map(a => riepilogo(db, a)).sort((a, b) => a.nome.localeCompare(b.nome))),
    leggiAtleta: id => con(db => riepilogo(db, trovaAtleta(db, id))),
    creaAtleta: dati => con(db => {
      const a = { id: crypto.randomUUID(), ...normalizzaAtleta(dati), creatoIl: ora() };
      db.atleti.push(a);
      return riepilogo(db, a);
    }, { scrittura: true }),
    aggiornaAtleta: (id, modifiche) => con(db => {
      const a = trovaAtleta(db, id);
      Object.assign(a, normalizzaAtleta(modifiche, { parziale: true }));
      return riepilogo(db, a);
    }, { scrittura: true }),
    eliminaAtleta: id => con(db => {
      trovaAtleta(db, id);
      for (const k of ['programmi', 'sedute', 'accountAtleti', 'inviti']) db[k] = db[k].filter(x => x.atletaId !== id);
      db.atleti = db.atleti.filter(a => a.id !== id);
    }, { scrittura: true }),

    creaInvito: atletaId => con(db => {
      trovaAtleta(db, atletaId);
      const codice = codiceDaByte(crypto.getRandomValues(new Uint8Array(8)));
      const scadeIl = new Date(Date.now() + GIORNI_VALIDITA_INVITO * 86400000).toISOString();
      db.inviti = db.inviti.filter(i => !(i.atletaId === atletaId && !i.usatoIl));
      db.inviti.push({ codice, atletaId, scadeIl, usatoIl: null });
      return { codice: formattaCodice(codice), scadeIl };
    }, { scrittura: true }),

    programmi: atletaId => con(db => {
      trovaAtleta(db, atletaId);
      return db.programmi.filter(p => p.atletaId === atletaId).sort((a, b) => b.creatoIl.localeCompare(a.creatoIl));
    }),
    creaProgramma: (atletaId, p) => con(db => {
      trovaAtleta(db, atletaId);
      const prog = { id: crypto.randomUUID(), atletaId, ...datiProgramma(p), creatoIl: ora(), aggiornatoIl: ora() };
      if (prog.stato === 'attivo') attiva(db, atletaId, prog.id);
      db.programmi.push(prog);
      return prog;
    }, { scrittura: true }),
    aggiornaProgramma: (id, p) => con(db => {
      const prog = db.programmi.find(x => x.id === id);
      if (!prog) throw new ErroreApi('Non trovato', 404);
      Object.assign(prog, datiProgramma(p), { aggiornatoIl: ora() });
      if (prog.stato === 'attivo') attiva(db, prog.atletaId, prog.id);
      return prog;
    }, { scrittura: true }),
    eliminaProgramma: id => con(db => { db.programmi = db.programmi.filter(p => p.id !== id); }, { scrittura: true }),

    sedute: atletaId => con(db => db.sedute.filter(s => s.atletaId === atletaId).sort((a, b) => a.data.localeCompare(b.data))),
    registraSeduta: (atletaId, s) => con(db => {
      trovaAtleta(db, atletaId);
      const seduta = { id: crypto.randomUUID(), atletaId, ...validaSeduta(s), origine: 'trainer' };
      db.sedute.push(seduta);
      return seduta;
    }, { scrittura: true }),

    eserciziPersonali: () => con(db => db.esercizi),
    creaEsercizio: es => con(db => {
      const e = { ...validaEsercizioPersonale(es), id: 'pt-' + crypto.randomUUID(), personalizzato: true };
      db.esercizi.push(e);
      return e;
    }, { scrittura: true })
  };
}

// ================================================================ ATLETA
export function creaAdattatoreDemoAtleta() {
  leggi();
  const atletaCorrente = db => {
    const acc = db.accountAtleti.find(a => a.id === db.accessoAtleta);
    return acc ? db.atleti.find(a => a.id === acc.atletaId) || null : null;
  };
  const richiedi = db => atletaCorrente(db) || (() => { throw new ErroreApi('Accesso richiesto', 401); })();
  const profilo = (db, a) => ({ id: a.id, nome: a.nome, trainerNome: db.trainer.nome, obiettivo: a.obiettivo, giorniSettimana: a.giorniSettimana });

  return {
    tipo: 'demo',
    descrizione: 'Demo nel browser · dati di esempio',
    ripristina: ripristinaDemo,
    esempio: { email: 'marco.rossi@esempio.it', password: 'atleta123' },

    sessione: () => con(db => { const a = atletaCorrente(db); return a ? profilo(db, a) : null; }),
    accedi: (email, password) => con(db => {
      const acc = db.accountAtleti.find(a => a.email === String(email).trim().toLowerCase() && a.password === password);
      if (!acc) throw new ErroreApi('Email o password non corretti', 401);
      db.accessoAtleta = acc.id;
      return profilo(db, atletaCorrente(db));
    }, { scrittura: true }),
    attiva: (codice, email, password) => con(db => {
      const c = normalizzaCodice(codice);
      const cred = validaCredenziali(email, password);
      const invito = db.inviti.find(i => i.codice === c && !i.usatoIl && i.scadeIl > ora());
      if (!invito) throw new ErroreApi('Codice non valido o scaduto: chiedine uno nuovo al tuo trainer', 400);
      const altro = db.accountAtleti.find(a => a.email === cred.email && a.atletaId !== invito.atletaId);
      if (altro) throw new ErroreApi('Questa email e\' gia\' usata da un altro atleta', 409);
      db.accountAtleti = db.accountAtleti.filter(a => a.atletaId !== invito.atletaId);
      const acc = { id: crypto.randomUUID(), atletaId: invito.atletaId, email: cred.email, password: cred.password };
      db.accountAtleti.push(acc);
      invito.usatoIl = ora();
      db.accessoAtleta = acc.id;
      return profilo(db, atletaCorrente(db));
    }, { scrittura: true }),
    esci: () => con(db => { db.accessoAtleta = null; }, { scrittura: true }),

    programma: () => con(db => {
      const a = richiedi(db);
      const programma = db.programmi.find(p => p.atletaId === a.id && p.stato === 'attivo') || null;
      const ids = new Set((programma?.scheda.sessioni || []).flatMap(s => s.esercizi.map(e => e.esercizioId)));
      return { programma, esercizi: db.esercizi.filter(e => ids.has(e.id)) };
    }),
    sedute: () => con(db => {
      const a = richiedi(db);
      return db.sedute.filter(s => s.atletaId === a.id).sort((x, y) => x.data.localeCompare(y.data));
    }),
    registraSeduta: s => con(db => {
      const a = richiedi(db);
      const v = validaSeduta(s);
      if (v.programmaId && !db.programmi.some(p => p.id === v.programmaId && p.atletaId === a.id)) v.programmaId = null;
      const seduta = { id: crypto.randomUUID(), atletaId: a.id, ...v, origine: 'atleta' };
      db.sedute.push(seduta);
      return seduta;
    }, { scrittura: true })
  };
}
