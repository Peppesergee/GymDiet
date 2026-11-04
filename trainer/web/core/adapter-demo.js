// Backend finto nel browser: stessa interfaccia e stesse regole degli altri
// due (validazione, un solo programma attivo, id decisi dal "server"), ma i
// dati restano in localStorage. Serve a provare le interfacce senza server.
import { normalizzaCliente, validaScheda, validaSeduta } from '../../shared/modello.js';
import { ErroreApi } from './adapter-rest.js';
import { datiDemo } from './demo-dati.js';

const CHIAVE = 'gymcoach.demo.v1';

function carica() {
  try {
    const t = localStorage.getItem(CHIAVE);
    if (t) return JSON.parse(t);
  } catch { /* storage non disponibile: si riparte dai dati di esempio */ }
  return datiDemo();
}

export function creaAdattatoreDemo() {
  let db = carica();
  const salva = () => { try { localStorage.setItem(CHIAVE, JSON.stringify(db)); } catch { /* solo in memoria */ } };
  salva();
  const copia = x => structuredClone(x);
  const attesa = () => new Promise(r => setTimeout(r, 60));   // un minimo di latenza, come in rete
  const trovaCliente = id => db.clienti.find(c => c.id === id) || (() => { throw new ErroreApi('Non trovato', 404); })();

  function riepilogo(c) {
    const ultime = db.sedute.filter(s => s.clienteId === c.id).map(s => s.data).sort();
    const p = db.programmi.find(x => x.clienteId === c.id && x.stato === 'attivo');
    return { ...c, ultimaSeduta: ultime.at(-1) || null, programmaAttivo: p ? { id: p.id, nome: p.nome } : null };
  }
  function attiva(clienteId, idTenere) {
    for (const p of db.programmi) if (p.clienteId === clienteId && p.stato === 'attivo' && p.id !== idTenere) p.stato = 'archiviato';
  }
  function datiProgramma(p) {
    validaScheda(p.scheda);
    return { nome: String(p.nome || 'Programma').slice(0, 120), stato: ['bozza', 'attivo', 'archiviato'].includes(p.stato) ? p.stato : 'bozza', scheda: copia(p.scheda) };
  }

  return {
    tipo: 'demo',
    descrizione: 'Demo nel browser · dati di esempio',
    ripristina() { db = datiDemo(); salva(); },

    async sessione() { return copia(db.trainer); },
    async accedi() { return copia(db.trainer); },
    async registra() { return copia(db.trainer); },
    async esci() {},

    async elencoClienti() {
      await attesa();
      return copia(db.clienti.map(riepilogo).sort((a, b) => a.nome.localeCompare(b.nome)));
    },
    async leggiCliente(id) { await attesa(); return copia(riepilogo(trovaCliente(id))); },
    async creaCliente(dati) {
      await attesa();
      const c = { id: crypto.randomUUID(), ...normalizzaCliente(dati), creatoIl: new Date().toISOString() };
      db.clienti.push(c); salva();
      return copia(riepilogo(c));
    },
    async aggiornaCliente(id, modifiche) {
      await attesa();
      const c = trovaCliente(id);
      Object.assign(c, normalizzaCliente(modifiche, { parziale: true })); salva();
      return copia(riepilogo(c));
    },
    async eliminaCliente(id) {
      await attesa();
      trovaCliente(id);
      db.clienti = db.clienti.filter(c => c.id !== id);
      db.programmi = db.programmi.filter(p => p.clienteId !== id);
      db.sedute = db.sedute.filter(s => s.clienteId !== id);
      salva();
    },

    async programmi(clienteId) {
      await attesa();
      trovaCliente(clienteId);
      return copia(db.programmi.filter(p => p.clienteId === clienteId).sort((a, b) => b.creatoIl.localeCompare(a.creatoIl)));
    },
    async creaProgramma(clienteId, p) {
      await attesa();
      trovaCliente(clienteId);
      const ora = new Date().toISOString();
      const prog = { id: crypto.randomUUID(), clienteId, ...datiProgramma(p), creatoIl: ora, aggiornatoIl: ora };
      if (prog.stato === 'attivo') attiva(clienteId, prog.id);
      db.programmi.push(prog); salva();
      return copia(prog);
    },
    async aggiornaProgramma(id, p) {
      await attesa();
      const prog = db.programmi.find(x => x.id === id);
      if (!prog) throw new ErroreApi('Non trovato', 404);
      Object.assign(prog, datiProgramma(p), { aggiornatoIl: new Date().toISOString() });
      if (prog.stato === 'attivo') attiva(prog.clienteId, prog.id);
      salva();
      return copia(prog);
    },
    async eliminaProgramma(id) {
      await attesa();
      db.programmi = db.programmi.filter(p => p.id !== id); salva();
    },

    async sedute(clienteId) {
      await attesa();
      return copia(db.sedute.filter(s => s.clienteId === clienteId).sort((a, b) => a.data.localeCompare(b.data)));
    },
    async registraSeduta(clienteId, s) {
      await attesa();
      trovaCliente(clienteId);
      const seduta = { id: crypto.randomUUID(), clienteId, ...validaSeduta(s) };
      db.sedute.push(seduta); salva();
      return copia(seduta);
    },

    async eserciziPersonali() { return copia(db.esercizi); },
    async creaEsercizio(es) {
      const e = { ...es, id: 'pt-' + crypto.randomUUID(), personalizzato: true };
      db.esercizi.push(e); salva();
      return copia(e);
    },
    async generaEsercizio() {
      throw new ErroreApi('Nella demo Claude non e\' collegato: con l\'architettura A o B la generazione passa dal server, con la chiave della piattaforma.', 503);
    }
  };
}
