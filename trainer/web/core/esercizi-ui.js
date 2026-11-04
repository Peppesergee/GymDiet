// Pezzi di interfaccia sugli esercizi riusati dalle tre UI: scheda tecnica
// ("come si fa") e selettore con ricerca e generazione tramite Claude.
import { h, svuota, finestra, avviso } from './dom.js';
import { creaAnimazione, miniatura } from '../../shared/anim.js';
import { catalogo, cerca, GRUPPI, messaggioErrore } from './servizi.js';

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
 * Selettore: suggeriti (stesso schema motorio), ricerca libera, Claude.
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
          q.length >= 2 ? bloccoClaude(ctx, q, scegli) : null
        );
      };
      let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(mostra, 150); });
      mostra();
      setTimeout(() => input.focus(), 50);
      return h('div', { class: 'gc-selettore' }, [input, risultati]);
    }, { alChiudere: () => risolvi(scelto) });
  });
}

function bloccoClaude(ctx, testo, scegli) {
  const stato = h('p', { class: 'gc-tenue gc-piccolo' });
  const btn = h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: `Crea "${testo}" con Claude` });
  btn.onclick = async () => {
    btn.disabled = true;
    stato.textContent = 'Claude sta scrivendo la scheda tecnica…';
    try {
      const es = await ctx.api.generaEsercizio(testo);
      await ctx.ricaricaPersonali();
      avviso(`${es.nome} aggiunto ai tuoi esercizi`);
      scegli(es);
    } catch (e) {
      stato.textContent = messaggioErrore(e);
      btn.disabled = false;
    }
  };
  return h('div', { class: 'gc-claude' }, [
    h('p', { testo: 'Non lo trovi? Claude compila la scheda tecnica e la salva tra i tuoi esercizi.' }), btn, stato
  ]);
}
