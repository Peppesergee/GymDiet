// Generazione esercizi con Claude, lato server: la chiave API e' della
// piattaforma (variabile ANTHROPIC_API_KEY) e non arriva mai nel browser.
import Anthropic from '@anthropic-ai/sdk';
import { richiesta, daRisposta, validaNome } from '../../shared/ai-esercizio.js';

export class ErroreAi extends Error {
  constructor(messaggio, stato) { super(messaggio); this.stato = stato; }
}

/** `client` permette di passare un finto SDK nei test. */
export function creaGeneratore({ apiKey = process.env.ANTHROPIC_API_KEY, client } = {}) {
  const anthropic = client || (apiKey ? new Anthropic({ apiKey }) : null);
  return {
    disponibile: !!anthropic,
    async genera(nome) {
      if (!anthropic) throw new ErroreAi('Generazione con Claude non configurata sul server (manca ANTHROPIC_API_KEY).', 503);
      const testo = validaNome(nome);
      if (!testo) throw new ErroreAi('Scrivi il nome dell\'esercizio (2-80 caratteri).', 400);
      let risposta;
      try {
        risposta = await anthropic.beta.messages.create(richiesta(testo));
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) throw new ErroreAi('Troppe richieste a Claude: riprova tra poco.', 429);
        if (e instanceof Anthropic.AuthenticationError) throw new ErroreAi('Chiave API del server non valida.', 502);
        if (e instanceof Anthropic.APIError) throw new ErroreAi(`Errore di Claude (${e.status ?? 'rete'}).`, 502);
        throw e;
      }
      const esercizio = daRisposta(risposta);
      if (!esercizio) throw new ErroreAi('Claude non ha prodotto una scheda utilizzabile per questo nome.', 422);
      return esercizio;
    }
  };
}
