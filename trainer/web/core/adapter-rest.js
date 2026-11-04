// Architettura A: API REST del server Node, autenticazione con cookie httpOnly
// (il browser lo allega da solo, il codice JS non lo vede mai).

export class ErroreApi extends Error {
  constructor(messaggio, stato, campo) { super(messaggio); this.stato = stato; this.campo = campo; }
}

export function creaAdattatoreRest({ base = '' } = {}) {
  async function chiama(metodo, percorso, corpo) {
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
  }
  const e = encodeURIComponent;

  return {
    tipo: 'rest',
    descrizione: 'Architettura A · server Node + SQLite',
    async sessione() {
      try { return (await chiama('GET', '/api/auth/io')).trainer; } catch (x) { if (x.stato === 401) return null; throw x; }
    },
    accedi: async (email, password) => (await chiama('POST', '/api/auth/accesso', { email, password })).trainer,
    registra: async (nome, email, password) => (await chiama('POST', '/api/auth/registrazione', { nome, email, password })).trainer,
    esci: () => chiama('POST', '/api/auth/uscita', {}),

    elencoClienti: () => chiama('GET', '/api/clienti'),
    leggiCliente: id => chiama('GET', `/api/clienti/${e(id)}`),
    creaCliente: dati => chiama('POST', '/api/clienti', dati),
    aggiornaCliente: (id, modifiche) => chiama('PATCH', `/api/clienti/${e(id)}`, modifiche),
    eliminaCliente: id => chiama('DELETE', `/api/clienti/${e(id)}`),

    programmi: clienteId => chiama('GET', `/api/clienti/${e(clienteId)}/programmi`),
    creaProgramma: (clienteId, p) => chiama('POST', `/api/clienti/${e(clienteId)}/programmi`, p),
    aggiornaProgramma: (id, p) => chiama('PUT', `/api/programmi/${e(id)}`, p),
    eliminaProgramma: id => chiama('DELETE', `/api/programmi/${e(id)}`),

    sedute: clienteId => chiama('GET', `/api/clienti/${e(clienteId)}/sedute`),
    registraSeduta: (clienteId, s) => chiama('POST', `/api/clienti/${e(clienteId)}/sedute`, s),

    eserciziPersonali: () => chiama('GET', '/api/esercizi-personali'),
    creaEsercizio: es => chiama('POST', '/api/esercizi-personali', es),
    generaEsercizio: nome => chiama('POST', '/api/esercizi/genera', { nome })
  };
}
