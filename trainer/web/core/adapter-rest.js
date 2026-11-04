// Architettura A: API REST del server Node, autenticazione con cookie httpOnly
// (il browser lo allega da solo, il codice JS non lo vede mai).

export class ErroreApi extends Error {
  constructor(messaggio, stato, campo) { super(messaggio); this.stato = stato; this.campo = campo; }
}

function client(base) {
  return async function chiama(metodo, percorso, corpo) {
    let r;
    try {
      r = await fetch(base + percorso, {
        method: metodo,
        credentials: 'same-origin',
        headers: corpo !== undefined ? { 'content-type': 'application/json' } : {},
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined
      });
    } catch {
      throw new ErroreApi('Server non raggiungibile. Controlla la connessione.', 0);
    }
    if (r.status === 204) return null;
    const dati = await r.json().catch(() => null);
    if (!r.ok) throw new ErroreApi((dati && dati.errore) || `Errore ${r.status}`, r.status, dati && dati.campo);
    return dati;
  };
}
const e = encodeURIComponent;

export function creaAdattatoreRest({ base = '' } = {}) {
  const chiama = client(base);

  return {
    tipo: 'rest',
    descrizione: 'Architettura A · server Node + SQLite',
    async sessione() {
      try { return (await chiama('GET', '/api/auth/io')).trainer; } catch (x) { if (x.stato === 401) return null; throw x; }
    },
    accedi: async (email, password) => (await chiama('POST', '/api/auth/accesso', { email, password })).trainer,
    registra: async (nome, email, password) => (await chiama('POST', '/api/auth/registrazione', { nome, email, password })).trainer,
    esci: () => chiama('POST', '/api/auth/uscita', {}),

    elencoAtleti: () => chiama('GET', '/api/atleti'),
    leggiAtleta: id => chiama('GET', `/api/atleti/${e(id)}`),
    creaAtleta: dati => chiama('POST', '/api/atleti', dati),
    aggiornaAtleta: (id, modifiche) => chiama('PATCH', `/api/atleti/${e(id)}`, modifiche),
    eliminaAtleta: id => chiama('DELETE', `/api/atleti/${e(id)}`),
    creaInvito: id => chiama('POST', `/api/atleti/${e(id)}/invito`, {}),

    programmi: atletaId => chiama('GET', `/api/atleti/${e(atletaId)}/programmi`),
    creaProgramma: (atletaId, p) => chiama('POST', `/api/atleti/${e(atletaId)}/programmi`, p),
    aggiornaProgramma: (id, p) => chiama('PUT', `/api/programmi/${e(id)}`, p),
    eliminaProgramma: id => chiama('DELETE', `/api/programmi/${e(id)}`),

    sedute: atletaId => chiama('GET', `/api/atleti/${e(atletaId)}/sedute`),
    registraSeduta: (atletaId, s) => chiama('POST', `/api/atleti/${e(atletaId)}/sedute`, s),

    eserciziPersonali: () => chiama('GET', '/api/esercizi-personali'),
    creaEsercizio: es => chiama('POST', '/api/esercizi-personali', es)
  };
}

// App atleta: rotte /api/atleta/*, cookie separato da quello del trainer.
export function creaAdattatoreRestAtleta({ base = '' } = {}) {
  const chiama = client(base);
  return {
    tipo: 'rest',
    descrizione: 'Architettura A · server Node + SQLite',
    async sessione() {
      try { return (await chiama('GET', '/api/atleta/io')).atleta; } catch (x) { if (x.stato === 401) return null; throw x; }
    },
    accedi: async (email, password) => (await chiama('POST', '/api/atleta/accesso', { email, password })).atleta,
    attiva: async (codice, email, password) => (await chiama('POST', '/api/atleta/attiva', { codice, email, password })).atleta,
    esci: () => chiama('POST', '/api/atleta/uscita', {}),
    programma: () => chiama('GET', '/api/atleta/programma'),
    sedute: () => chiama('GET', '/api/atleta/sedute'),
    registraSeduta: s => chiama('POST', '/api/atleta/sedute', s)
  };
}
