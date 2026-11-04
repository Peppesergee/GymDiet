// Pezzi di interfaccia sugli esercizi riusati dalle tre UI: scheda tecnica
// ("come si fa"), selettore con ricerca e creazione di esercizi personalizzati.
import { h, svuota, finestra, avviso } from './dom.js';
import { creaAnimazione, miniatura } from '../../shared/anim.js';
import { catalogo, cerca, GRUPPI, messaggioErrore } from './servizi.js';
import { TIPI_ESERCIZIO, FIGURE, validaEsercizioPersonale } from '../../shared/modello.js';

function elenco(titolo, voci) {
  if (!voci || !voci.length) return null;
  return h('section', { class: 'gc-tecnica-blocco' }, [h('h3', { testo: titolo }), h('ul', {}, voci.map(v => h('li', { testo: v })))]);
}

/** Contenuto della scheda tecnica; restituisce { nodo, distruggi }. */
export function schedaTecnica(es) {
  const box = h('div', { class: 'anim-box gc-tecnica-anim' });
  const anim = creaAnimazione(box, es.anim, { durata: 2800 });
  const muscoli = [...(es.muscoli?.primari || []), ...(es.muscoli?.secondari || []).map(m => m + ' (secondario)')];
  const nodo = h('div', { class: 'gc-tecnica' }, [
    box,
    h('div', { class: 'gc-tecnica-testo' }, [
      h('p', { class: 'gc-tenue', testo: [GRUPPI[es.gruppo]?.nome, es.tipo === 'multi' ? 'multiarticolare' : es.tipo, es.tempo && `tempo ${es.tempo}`].filter(Boolean).join(' · ') }),
      muscoli.length ? h('p', { testo: muscoli.join(', ') }) : null,
      elenco('Posizione di partenza', es.setup),
      elenco('Esecuzione', es.esecuzione),
      elenco('Errori da evitare', es.errori),
      es.respiro ? h('p', {}, [h('strong', { testo: 'Respirazione: ' }), es.respiro]) : null,
      es.nota ? h('p', { class: 'gc-tenue', testo: es.nota }) : null
    ])
  ]);
  return { nodo, distruggi: () => anim.destroy() };
}

export function apriSchedaTecnica(es) {
  const { nodo, distruggi } = schedaTecnica(es);
  finestra(es.nome, nodo, { alChiudere: distruggi });
}

export function rigaEsercizio(es, { azione, etichetta = 'Scegli', extra } = {}) {
  return h('div', { class: 'gc-riga-es' }, [
    h('span', { class: 'gc-riga-es-mini', html: miniatura(es.anim) }),
    h('div', { class: 'gc-riga-es-testo' }, [
      h('strong', { testo: es.nome }),
      h('span', { class: 'gc-tenue', testo: (GRUPPI[es.gruppo]?.nome || es.gruppo) + (es.personalizzato ? ' · personale' : '') })
    ]),
    extra || null,
    azione ? h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: etichetta, onclick: () => azione(es) }) : null
  ]);
}

/**
 * Selettore: suggeriti (stesso schema motorio), ricerca libera, esercizio nuovo.
 * Ritorna una Promise con l'esercizio scelto o null.
 */
export function scegliEsercizio(ctx, { titolo = 'Scegli esercizio', suggeriti = [] } = {}) {
  return new Promise(risolvi => {
    let scelto = null;
    const risultati = h('div', { class: 'gc-lista-es' });
    const input = h('input', { class: 'gc-input', id: 'sel-cerca', type: 'search', placeholder: 'Cerca: panca, curl, squat…', autocomplete: 'off' });
    const chiudi = finestra(titolo, c => {
      const scegli = es => { scelto = es; c(); };
      const mostra = () => {
        const q = input.value.trim();
        const lista = q.length >= 2 ? cerca(q, ctx.personali) : (suggeriti.length ? suggeriti : catalogo(ctx.personali).slice(0, 12));
        svuota(risultati,
          h('p', { class: 'gc-tenue gc-piccolo', testo: q.length >= 2 ? `${lista.length} risultati` : (suggeriti.length ? 'Stesso schema motorio' : 'Dal catalogo') }),
          lista.map(es => rigaEsercizio(es, { azione: scegli })),
          h('div', { class: 'gc-nuovo-es' }, [
            h('span', { class: 'gc-tenue', testo: 'Non lo trovi nel catalogo?' }),
            h('button', { class: 'gc-btn', type: 'button', testo: q.length >= 2 ? `Crea "${q}"` : 'Crea esercizio', onclick: async () => { const es = await creaEsercizio(ctx, q); if (es) scegli(es); } })
          ])
        );
      };
      let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(mostra, 150); });
      mostra();
      setTimeout(() => input.focus(), 50);
      return h('div', { class: 'gc-selettore' }, [input, risultati]);
    }, { alChiudere: () => risolvi(scelto) });
  });
}

/**
 * Esercizio personalizzato scritto dal trainer: nome, muscolo, figura
 * animata piu' simile e istruzioni. Lo vedono anche i suoi atleti.
 * Ritorna una Promise con l'esercizio salvato, o null.
 */
export function creaEsercizio(ctx, nomeIniziale = '') {
  return new Promise(risolvi => {
    let salvato = null;
    const opz = (m, sel) => Object.entries(m).map(([k, v]) => h('option', { value: k, selected: k === sel, testo: typeof v === 'string' ? v : v.nome }));
    const els = {
      nome: h('input', { id: 'ne-nome', value: nomeIniziale, required: true, autocomplete: 'off' }),
      gruppo: h('select', { id: 'ne-gruppo' }, opz(GRUPPI, 'petto')),
      tipo: h('select', { id: 'ne-tipo' }, opz(TIPI_ESERCIZIO, 'isolamento')),
      anim: h('select', { id: 'ne-anim' }, opz(FIGURE, 'panca')),
      setup: h('textarea', { id: 'ne-setup', rows: 2, placeholder: 'Una indicazione per riga' }),
      esecuzione: h('textarea', { id: 'ne-esecuzione', rows: 3, placeholder: 'Una indicazione per riga', required: true }),
      errori: h('textarea', { id: 'ne-errori', rows: 2, placeholder: 'Una indicazione per riga' })
    };
    const anteprima = h('div', { class: 'gc-ne-anteprima', html: miniatura('panca') });
    els.anim.onchange = () => { anteprima.innerHTML = miniatura(els.anim.value); };
    const errore = h('p', { class: 'gc-errore', role: 'alert' });
    const campo = (id, t, el) => h('label', { class: 'gc-campo', for: id }, [t, el]);
    finestra('Nuovo esercizio', chiudi => {
      const form = h('form', { class: 'gc-form-cliente', novalidate: true }, [
        campo('ne-nome', 'Nome', els.nome),
        h('div', { class: 'gc-griglia-campi' }, [campo('ne-gruppo', 'Muscolo principale', els.gruppo), campo('ne-tipo', 'Tipo', els.tipo)]),
        h('div', { class: 'gc-ne-figura' }, [campo('ne-anim', 'Figura animata piu\u2019 simile', els.anim), anteprima]),
        campo('ne-setup', 'Posizione di partenza', els.setup),
        campo('ne-esecuzione', 'Esecuzione', els.esecuzione),
        campo('ne-errori', 'Errori da evitare', els.errori),
        errore,
        h('div', { class: 'gc-azioni' }, [h('button', { class: 'gc-btn gc-btn-primario', type: 'submit', testo: 'Salva esercizio' })])
      ]);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        errore.textContent = '';
        const dati = Object.fromEntries(Object.entries(els).map(([k, el]) => [k, el.value]));
        const btn = form.querySelector('[type=submit]');
        try {
          validaEsercizioPersonale(dati);
          btn.disabled = true;
          salvato = await ctx.api.creaEsercizio(dati);
          await ctx.ricaricaPersonali();
          avviso(`${salvato.nome} aggiunto ai tuoi esercizi`);
          chiudi();
        } catch (x) { errore.textContent = messaggioErrore(x); btn.disabled = false; }
      });
      setTimeout(() => els.nome.focus(), 50);
      return form;
    }, { alChiudere: () => risolvi(salvato) });
  });
}
