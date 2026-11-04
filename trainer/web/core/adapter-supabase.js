// Architettura B: il browser parla direttamente con Supabase (PostgREST +
// Auth). Non c'e' un server nostro: le policy RLS del database decidono cosa
// ogni trainer puo' leggere e scrivere. La validazione dei campi la facciamo
// qui con lo stesso modulo del server A, prima di inviare.
import { normalizzaCliente, validaScheda, validaSeduta } from '../../shared/modello.js';
import { ErroreApi } from './adapter-rest.js';

const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const CAMPI_BASE = ['nome', 'email', 'telefono', 'note'];

function clienteDaRiga(r) {
  return {
    id: r.id, nome: r.nome, email: r.email, telefono: r.telefono, note: r.note,
    ...(r.profilo || {}),
    creatoIl: r.creato_il,
    ultimaSeduta: r.ultima_seduta || null,
    programmaAttivo: r.programma_attivo_id ? { id: r.programma_attivo_id, nome: r.programma_attivo_nome } : null
  };
}
const programmaDaRiga = r => ({
  id: r.id, clienteId: r.cliente_id, nome: r.nome, stato: r.stato, scheda: r.scheda,
  creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il
});
const sedutaDaRiga = r => ({
  id: r.id, clienteId: r.cliente_id, programmaId: r.programma_id, data: r.data,
  sessioneRef: r.sessione_ref, nomeSessione: r.nome_sessione, durataMin: r.durata_min,
  note: r.note, esercizi: r.esercizi
});
function rigaCliente(c) {
  const riga = { profilo: {} };
  for (const [k, v] of Object.entries(c)) {
    if (CAMPI_BASE.includes(k)) riga[k] = v; else riga.profilo[k] = v;
  }
  return riga;
}

export async function creaAdattatoreSupabase({ url, anonKey }) {
  if (!url || !anonKey) throw new ErroreApi('Configura url e anonKey di Supabase in core/config.js', 0);
  const { createClient } = await import(SDK);
  const sb = createClient(url, anonKey);

  const esito = ({ data, error }) => {
    if (error) throw new ErroreApi(error.message, error.status || 400);
    return data;
  };

  return {
    tipo: 'supabase',
    descrizione: 'Architettura B · Supabase (Postgres + RLS)',
    async sessione() {
      const { data } = await sb.auth.getUser();
      if (!data.user) return null;
      return { id: data.user.id, email: data.user.email, nome: data.user.user_metadata?.nome || data.user.email };
    },
    async accedi(email, password) {
      const { user } = esito(await sb.auth.signInWithPassword({ email, password }));
      return { id: user.id, email: user.email, nome: user.user_metadata?.nome || user.email };
    },
    async registra(nome, email, password) {
      const { user } = esito(await sb.auth.signUp({ email, password, options: { data: { nome } } }));
      return { id: user.id, email: user.email, nome };
    },
    esci: () => sb.auth.signOut(),

    async elencoClienti() {
      return esito(await sb.from('clienti_riepilogo').select('*').order('nome')).map(clienteDaRiga);
    },
    async leggiCliente(id) {
      const r = esito(await sb.from('clienti_riepilogo').select('*').eq('id', id).maybeSingle());
      if (!r) throw new ErroreApi('Non trovato', 404);
      return clienteDaRiga(r);
    },
    async creaCliente(dati) {
      const r = esito(await sb.from('clienti').insert(rigaCliente(normalizzaCliente(dati))).select('id').single());
      return this.leggiCliente(r.id);
    },
    async aggiornaCliente(id, modifiche) {
      const attuale = await this.leggiCliente(id);
      const { id: _i, creatoIl, ultimaSeduta, programmaAttivo, ...dati } = attuale;
      const nuovo = { ...dati, ...normalizzaCliente(modifiche, { parziale: true }) };
      esito(await sb.from('clienti').update(rigaCliente(nuovo)).eq('id', id));
      return this.leggiCliente(id);
    },
    async eliminaCliente(id) { esito(await sb.from('clienti').delete().eq('id', id)); },

    async programmi(clienteId) {
      return esito(await sb.from('programmi').select('*').eq('cliente_id', clienteId).order('creato_il', { ascending: false })).map(programmaDaRiga);
    },
    async creaProgramma(clienteId, p) {
      validaScheda(p.scheda);
      return programmaDaRiga(esito(await sb.from('programmi')
        .insert({ cliente_id: clienteId, nome: p.nome, stato: p.stato, scheda: p.scheda }).select('*').single()));
    },
    async aggiornaProgramma(id, p) {
      validaScheda(p.scheda);
      return programmaDaRiga(esito(await sb.from('programmi')
        .update({ nome: p.nome, stato: p.stato, scheda: p.scheda }).eq('id', id).select('*').single()));
    },
    async eliminaProgramma(id) { esito(await sb.from('programmi').delete().eq('id', id)); },

    async sedute(clienteId) {
      return esito(await sb.from('sedute').select('*').eq('cliente_id', clienteId).order('data')).map(sedutaDaRiga);
    },
    async registraSeduta(clienteId, s) {
      const v = validaSeduta(s);
      return sedutaDaRiga(esito(await sb.from('sedute').insert({
        cliente_id: clienteId, programma_id: v.programmaId, data: v.data, sessione_ref: v.sessioneRef,
        nome_sessione: v.nomeSessione, durata_min: v.durataMin, note: v.note, esercizi: v.esercizi
      }).select('*').single()));
    },

    async eserciziPersonali() {
      return esito(await sb.from('esercizi_personali').select('id, dati').order('nome')).map(r => ({ ...r.dati, id: r.id, personalizzato: true }));
    },
    async creaEsercizio(es) {
      const { id: _x, ...dati } = es;
      const r = esito(await sb.from('esercizi_personali').insert({ nome: dati.nome, dati }).select('id').single());
      return { ...dati, id: r.id, personalizzato: true };
    },
    async generaEsercizio(nome) {
      const { data, error } = await sb.functions.invoke('genera-esercizio', { body: { nome } });
      if (error) {
        const corpo = await error.context?.json?.().catch(() => null);
        throw new ErroreApi(corpo?.errore || 'Generazione non riuscita', error.context?.status || 500);
      }
      return data;
    }
  };
}
