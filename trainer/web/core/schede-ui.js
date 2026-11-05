// Creazione di una nuova scheda per un atleta (Studio). Il trainer sceglie da dove partire e se attivarla subito
// (l'atleta la vede) o tenerla come bozza da preparare con calma.
import { h, finestra, avviso, dataBreve } from './dom.js';
import { bozzaProgramma, programmaAttivo, messaggioErrore } from './servizi.js';
import { schedaVuota, copiaScheda } from '../../shared/programmi.js';
import { GIORNI } from '../../shared/modello.js';

export const STATI = { attivo: 'Attiva', bozza: 'Bozza', archiviato: 'Archiviata' };
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** Ordine di presentazione: attiva, bozze, archiviate (piu' recenti prima). */
export function ordinaSchede(programmi) {
  const peso = { attivo: 0, bozza: 1, archiviato: 2 };
  return [...programmi].sort((a, b) => peso[a.stato] - peso[b.stato] || b.creatoIl.localeCompare(a.creatoIl));
}

export function descriviScheda(p) {
  const n = p.scheda.sessioni.length;
  return `${STATI[p.stato]} · ${n} ${n === 1 ? 'giorno' : 'giorni'} · creata il ${dataBreve(p.creatoIl)}`;
}

/**
 * Apre il pannello "Nuova scheda". Ritorna una Promise con la scheda creata
 * (gia' salvata) oppure null se il trainer chiude.
 */
export function apriNuovaScheda(ctx, atleta, programmi = []) {
  return new Promise(risolvi => {
    let creata = null;
    const attiva = programmaAttivo(programmi);
    const d = new Date();
    const nome = h('input', { id: 'ns-nome', value: `Scheda ${MESI[d.getMonth()]} ${d.getFullYear()}`, autocomplete: 'off' });
    const giorniProfilo = (atleta.giorniSettimana || []).map(g => GIORNI[g]).join(', ');

    const opzione = (gruppo, valore, titolo, testo, scelta) => h('label', { class: 'gc-opzione' }, [
      h('input', { type: 'radio', name: gruppo, value: valore, checked: scelta }),
      h('span', {}, [h('strong', { testo: titolo }), h('small', { testo })])
    ]);
    const partenze = h('fieldset', { class: 'gc-opzioni' }, [
      h('legend', { testo: 'Da dove parti' }),
      opzione('ns-partenza', 'profilo', 'Proposta dal profilo', `Esercizi, serie e recuperi scelti in base a obiettivo ed esperienza, sui giorni ${giorniProfilo}. Poi la modifichi come vuoi.`, true),
      attiva ? opzione('ns-partenza', 'copia', 'Copia della scheda attiva', `Riparti da "${attiva.nome}" e cambia solo quello che serve.`, false) : null,
      opzione('ns-partenza', 'vuota', 'Scheda vuota', `Solo i giorni (${giorniProfilo}): gli esercizi li aggiungi tu.`, false)
    ]);
    const quando = h('fieldset', { class: 'gc-opzioni' }, [
      h('legend', { testo: 'Quando la vede l’atleta' }),
      opzione('ns-stato', 'bozza', 'Salva come bozza', 'La prepari con calma; la attivi quando e’ pronta.', !!attiva),
      opzione('ns-stato', 'attivo', 'Attivala subito', attiva ? `Sostituisce "${attiva.nome}", che resta nello storico.` : 'L’atleta la trova subito nella sua app.', !attiva)
    ]);
    const errore = h('p', { class: 'gc-errore', role: 'alert' });

    finestra(`Nuova scheda per ${atleta.nome.split(' ')[0]}`, chiudi => {
      const form = h('form', { class: 'gc-form-cliente', novalidate: true }, [
        h('label', { class: 'gc-campo', for: 'ns-nome' }, ['Nome della scheda', nome]),
        partenze, quando, errore,
        h('div', { class: 'gc-azioni' }, [
          h('button', { class: 'gc-btn', type: 'button', testo: 'Annulla', onclick: chiudi }),
          h('button', { class: 'gc-btn gc-btn-primario', type: 'submit', testo: 'Crea scheda' })
        ])
      ]);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const partenza = form.querySelector('[name=ns-partenza]:checked').value;
        const stato = form.querySelector('[name=ns-stato]:checked').value;
        const scheda = partenza === 'copia' ? copiaScheda(attiva.scheda)
          : partenza === 'vuota' ? schedaVuota(atleta.giorniSettimana)
          : bozzaProgramma(atleta, ctx.personali).scheda;
        const btn = form.querySelector('[type=submit]');
        btn.disabled = true;
        try {
          creata = await ctx.api.creaProgramma(atleta.id, { nome: nome.value.trim() || 'Scheda', stato, scheda });
          avviso(stato === 'attivo' ? 'Scheda creata e attiva: l’atleta la vede subito' : 'Bozza creata: l’atleta non la vede finche’ non la attivi');
          chiudi();
        } catch (x) { errore.textContent = messaggioErrore(x); btn.disabled = false; }
      });
      return form;
    }, { alChiudere: () => risolvi(creata) });
  });
}
