// Architettura B: il browser parla direttamente con Supabase (PostgREST +
// Auth). Non c'e' un server nostro: le policy RLS del database decidono cosa
// ogni utente puo' leggere e scrivere. La validazione dei campi la facciamo
// qui con lo stesso modulo del server A, prima di inviare.
import { normalizzaAtleta, validaScheda, validaSeduta, validaEsercizioPersonale, validaCredenziali } from '../../shared/modello.js';
import { ErroreApi } from './adapter-rest.js';

const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const CAMPI_BASE = ['nome', 'email', 'telefono', 'note'];

function atletaDaRiga(r) {
  return {
    id: r.id, nome: r.nome, email: r.email, telefono: r.telefono, note: r.note,
    ...(r.profilo || {}),
    creatoIl: r.creato_il,
    ultimaSeduta: r.ultima_seduta || null,
    programmaAttivo: r.programma_attivo_id ? { id: r.programma_attivo_id, nome: r.programma_attivo_nome } : null,
    accountAtleta: !!r.account_attivo,
    invitoScade: r.invito_scade || null
  };
}
const programmaDaRiga = r => r && ({
  id: r.id, atletaId: r.atleta_id, nome: r.nome, stato: r.stato, scheda: r.scheda,
  creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il
});
const sedutaDaRiga = r => ({
  id: r.id, atletaId: r.atleta_id, programmaId: r.programma_id, data: r.data,
  sessioneRef: r.sessione_ref, nomeSessione: r.nome_sessione, durataMin: r.durata_min,
  note: r.note, esercizi: r.esercizi, origine: r.origine
});
function rigaAtleta(c) {
  const riga = { profilo: {} };
  for (const [k, v] of Object.entries(c)) {
    if (CAMPI_BASE.includes(k)) riga[k] = v; else riga.profilo[k] = v;
  }
  return riga;
}
// trainer_id e origine li imposta il database (trigger), non il client
const rigaSeduta = (atletaId, v) => ({
  atleta_id: atletaId, programma_id: v.programmaId, data: v.data, sessione_ref: v.sessioneRef,
  nome_sessione: v.nomeSessione, durata_min: v.durataMin, note: v.note, esercizi: v.esercizi
});

async function connetti({ url, anonKey }) {
  if (!url || !anonKey) throw new ErroreApi('Configura url e anonKey di Supabase in core/config.js', 0);
  const { createClient } = await import(SDK);
  return createClient(url, anonKey);
}
const esito = ({ data, error }) => {
  if (error) throw new ErroreApi(error.message, error.status || 400);
  return data;
};
async function ruolo(sb, id) {
  const r = esito(await sb.from('profili').select('ruolo, nome').eq('id', id).maybeSingle());
  return r || { ruolo: null, nome: '' };
}

// ================================================================ TRAINER
export async function creaAdattatoreSupabase(config) {
  const sb = await connetti(config);
  const daUtente = async user => {
    const p = await ruolo(sb, user.id);
    if (p.ruolo !== 'trainer') {
      await sb.auth.signOut();
      throw new ErroreApi('Questo e\' un account atleta: entra dall\'app atleta', 403);
    }
    return { id: user.id, email: user.email, nome: p.nome || user.email };
  };

  return {
    tipo: 'supabase',
    descrizione: 'Architettura B · Supabase (Postgres + RLS)',
    async sessione() {
      const { data } = await sb.auth.getUser();
      return data.user ? daUtente(data.user).catch(() => null) : null;
    },
    async accedi(email, password) {
      return daUtente(esito(await sb.auth.signInWithPassword({ email, password })).user);
    },
    async registra(nome, email, password) {
      const cred = validaCredenziali(email, password);
      const { user } = esito(await sb.auth.signUp({ ...cred, options: { data: { nome, ruolo: 'trainer' } } }));
      return { id: user.id, email: user.email, nome };
    },
    esci: () => sb.auth.signOut(),

    async elencoAtleti() {
      return esito(await sb.from('atleti_riepilogo').select('*').order('nome')).map(atletaDaRiga);
    },
    async leggiAtleta(id) {
      const r = esito(await sb.from('atleti_riepilogo').select('*').eq('id', id).maybeSingle());
      if (!r) throw new ErroreApi('Non trovato', 404);
      return atletaDaRiga(r);
    },
    async creaAtleta(dati) {
      const r = esito(await sb.from('atleti').insert(rigaAtleta(normalizzaAtleta(dati))).select('id').single());
      return this.leggiAtleta(r.id);
    },
    async aggiornaAtleta(id, modifiche) {
      const attuale = await this.leggiAtleta(id);
      const { id: _i, creatoIl, ultimaSeduta, programmaAttivo, accountAtleta, invitoScade, ...dati } = attuale;
      const nuovo = { ...dati, ...normalizzaAtleta(modifiche, { parziale: true }) };
      esito(await sb.from('atleti').update(rigaAtleta(nuovo)).eq('id', id));
      return this.leggiAtleta(id);
    },
    async eliminaAtleta(id) { esito(await sb.from('atleti').delete().eq('id', id)); },
    async creaInvito(atletaId) {
      const codice = esito(await sb.rpc('crea_invito', { p_atleta: atletaId }));
      return { codice, scadeIl: new Date(Date.now() + 7 * 86400000).toISOString() };
    },

    async programmi(atletaId) {
      return esito(await sb.from('programmi').select('*').eq('atleta_id', atletaId).order('creato_il', { ascending: false })).map(programmaDaRiga);
    },
    async creaProgramma(atletaId, p) {
      validaScheda(p.scheda);
      return programmaDaRiga(esito(await sb.from('programmi')
        .insert({ atleta_id: atletaId, nome: p.nome, stato: p.stato, scheda: p.scheda }).select('*').single()));
    },
    async aggiornaProgramma(id, p) {
      validaScheda(p.scheda);
      return programmaDaRiga(esito(await sb.from('programmi')
        .update({ nome: p.nome, stato: p.stato, scheda: p.scheda }).eq('id', id).select('*').single()));
    },
    async eliminaProgramma(id) { esito(await sb.from('programmi').delete().eq('id', id)); },

    async sedute(atletaId) {
      return esito(await sb.from('sedute').select('*').eq('atleta_id', atletaId).order('data')).map(sedutaDaRiga);
    },
    async registraSeduta(atletaId, s) {
      return sedutaDaRiga(esito(await sb.from('sedute').insert(rigaSeduta(atletaId, validaSeduta(s))).select('*').single()));
    },

    async eserciziPersonali() {
      return esito(await sb.from('esercizi_personali').select('id, dati').order('nome')).map(r => ({ ...r.dati, id: r.id, personalizzato: true }));
    },
    async creaEsercizio(es) {
      const dati = validaEsercizioPersonale(es);
      const r = esito(await sb.from('esercizi_personali').insert({ nome: dati.nome, dati }).select('id').single());
      return { ...dati, id: r.id, personalizzato: true };
    }
  };
}

// ================================================================ ATLETA
export async function creaAdattatoreSupabaseAtleta(config) {
  const sb = await connetti(config);
  async function profilo() {
    const a = esito(await sb.from('atleti').select('id, nome, trainer_id, profilo').maybeSingle());
    if (!a) return null;
    const t = esito(await sb.from('profili').select('nome').eq('id', a.trainer_id).maybeSingle());
    return { id: a.id, nome: a.nome, trainerNome: t?.nome || '', obiettivo: a.profilo?.obiettivo, giorniSettimana: a.profilo?.giorniSettimana };
  }
  async function richiedi() {
    const p = await profilo();
    if (!p) throw new ErroreApi('Accesso richiesto', 401);
    return p;
  }

  return {
    tipo: 'supabase',
    descrizione: 'Architettura B · Supabase (Postgres + RLS)',
    async sessione() {
      const { data } = await sb.auth.getUser();
      return data.user ? profilo() : null;
    },
    async accedi(email, password) {
      esito(await sb.auth.signInWithPassword({ email, password }));
      const p = await profilo();
      if (!p) { await sb.auth.signOut(); throw new ErroreApi('Account non collegato a nessun atleta: usa il codice del tuo trainer', 403); }
      return p;
    },
    // primo accesso: account con ruolo atleta (o accesso se esiste gia'), poi il codice
    async attiva(codice, email, password) {
      const cred = validaCredenziali(email, password);
      const reg = await sb.auth.signUp({ ...cred, options: { data: { ruolo: 'atleta' } } });
      if (reg.error) esito(await sb.auth.signInWithPassword(cred));
      esito(await sb.rpc('riscatta_invito', { p_codice: codice }));
      return profilo();
    },
    esci: () => sb.auth.signOut(),

    async programma() {
      const a = await richiedi();
      const programma = programmaDaRiga(esito(await sb.from('programmi').select('*').eq('atleta_id', a.id).eq('stato', 'attivo').maybeSingle()));
      const ids = [...new Set((programma?.scheda.sessioni || []).flatMap(s => s.esercizi.map(e => e.esercizioId)))].filter(i => i.startsWith('pt-'));
      const esercizi = ids.length
        ? esito(await sb.from('esercizi_personali').select('id, dati').in('id', ids)).map(r => ({ ...r.dati, id: r.id, personalizzato: true }))
        : [];
      return { programma, esercizi };
    },
    async sedute() {
      const a = await richiedi();
      return esito(await sb.from('sedute').select('*').eq('atleta_id', a.id).order('data')).map(sedutaDaRiga);
    },
    async registraSeduta(s) {
      const a = await richiedi();
      return sedutaDaRiga(esito(await sb.from('sedute').insert(rigaSeduta(a.id, validaSeduta(s))).select('*').single()));
    }
  };
}
