// Invito all'app atleta: il trainer genera un codice e lo passa all'atleta
// (a voce, WhatsApp, email). Il codice vale 7 giorni e una volta sola.
import { h, finestra, avviso, dataBreve } from './dom.js';
import { messaggioErrore } from './servizi.js';

/** Stato dell'accesso dell'atleta alla sua app, per una pill. */
export function statoApp(atleta) {
  if (atleta.accountAtleta) return { etichetta: 'App atleta attiva', livello: 'ok' };
  if (atleta.invitoScade) return { etichetta: 'Invito inviato', livello: 'neutro' };
  return { etichetta: 'App non attivata', livello: 'neutro' };
}

export function apriInvito(ctx, atleta, alTermine) {
  const corpo = h('div', { class: 'gc-invito' }, [h('p', { class: 'gc-tenue', testo: 'Creo il codice…' })]);
  finestra(`Invita ${atleta.nome.split(' ')[0]} all'app`, corpo, { alChiudere: alTermine });
  ctx.api.creaInvito(atleta.id).then(({ codice, scadeIl }) => {
    const link = new URL('../atleta/index.html', location.href).href;
    const messaggio = `Ciao ${atleta.nome.split(' ')[0]}, ecco la tua scheda su GymCoach. Apri ${link}, scegli "Primo accesso" e inserisci il codice ${codice}. Vale fino al ${dataBreve(scadeIl)}.`;
    const area = h('textarea', { class: 'gc-input', id: 'inv-messaggio', rows: 4, readonly: true }, messaggio);
    corpo.replaceChildren(...[
      atleta.accountAtleta ? h('p', { class: 'gc-avviso-in-linea', testo: `${atleta.nome.split(' ')[0]} ha gia’ l’app: con questo codice puo’ reimpostare email e password. Il vecchio accesso smette di funzionare.` }) : null,
      h('p', { testo: 'Codice di primo accesso' }),
      h('output', { class: 'gc-codice', id: 'inv-codice', testo: codice }),
      h('p', { class: 'gc-tenue gc-piccolo', testo: `Vale una sola volta, fino al ${dataBreve(scadeIl)}. Un nuovo codice annulla questo.` }),
      h('ol', { class: 'gc-passi' }, [
        h('li', {}, ['L’atleta apre ', h('a', { href: link, target: '_blank', rel: 'noopener', testo: 'l’app atleta' })]),
        h('li', { testo: 'Sceglie "Primo accesso" e scrive il codice' }),
        h('li', { testo: 'Crea email e password: da quel momento vede la scheda attiva e registra le sedute' })
      ]),
      h('label', { class: 'gc-campo', for: 'inv-messaggio' }, ['Messaggio pronto da inviare', area]),
      h('div', { class: 'gc-azioni' }, [h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Copia messaggio', onclick: async () => {
        try { await navigator.clipboard.writeText(messaggio); avviso('Messaggio copiato'); } catch { area.select(); avviso('Seleziona e copia il testo'); }
      } })])
    ].filter(Boolean));
  }).catch(e => corpo.replaceChildren(h('p', { class: 'gc-errore', testo: messaggioErrore(e) })));
}
