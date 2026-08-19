// Foglio di dettaglio di un esercizio, con animazione e spiegazione.
import { h, foglio, sezione } from '../ui.js';
import { creaAnimazione } from '../anim.js';
import { dettaglioEsercizio, alternativeEsercizio } from '../allenamento.js';
import { GRUPPI } from '../exercises.js';

export function apriEsercizio(voce, contesto = {}) {
  const es = dettaglioEsercizio(voce.esercizioId);
  if (!es) return;

  const boxAnim = h('div', { class: 'anim-box', style: 'width:100%;aspect-ratio:1/1;max-width:320px;margin:0 auto 12px' });
  const etichetta = h('div', { class: 'anim-fase' });
  const contenitore = h('div', { style: 'position:relative;max-width:320px;margin:0 auto' }, [boxAnim, etichetta]);

  const elenco = (titolo, voci) => voci && voci.length
    ? h('div', { style: 'margin-bottom:12px' }, [
        h('h4', { testo: titolo, style: 'font-size:.9rem;color:var(--testo-2);margin-bottom:4px' }),
        h('ul', { style: 'margin:0;padding-left:18px;font-size:.9rem' }, voci.map(t => h('li', { testo: t, style: 'margin-bottom:4px' })))
      ])
    : null;

  const gruppo = GRUPPI[es.gruppo];
  const parametri = voce.serie
    ? h('div', { class: 'macro-riga', style: 'margin-bottom:12px' }, [
        cella(voce.serie, 'serie'),
        cella(voce.ripetizioni, voce.durata ? 'durata' : 'ripetizioni'),
        cella(voce.recupero ? voce.recupero + 's' : '-', 'recupero'),
        cella(voce.rir || '-', 'RIR')
      ])
    : null;

  const azioni = h('div', { class: 'colonna', style: 'margin-top:14px' });
  if (contesto.onCambia) {
    const alternativi = alternativeEsercizio(voce.pattern, contesto.profilo || {}, contesto.esclusi || [])
      .filter(a => a.id !== es.id);
    if (alternativi.length) {
      azioni.appendChild(h('button', {
        class: 'btn secondario', testo: `Cambia esercizio (${alternativi.length} alternative)`,
        onclick: () => { chiudi(); contesto.onCambia(voce); }
      }));
    }
  }

  const contenuto = h('div', {}, [
    h('div', { class: 'riga', style: 'gap:8px;margin-bottom:10px;flex-wrap:wrap' }, [
      h('span', { class: 'badge verde', testo: gruppo ? gruppo.nome : es.gruppo }),
      h('span', { class: 'badge', testo: es.tipo === 'multi' ? 'Multiarticolare' : es.tipo === 'isometrico' ? 'Isometrico' : es.tipo === 'cardio' ? 'Cardio' : 'Isolamento' }),
      h('span', { class: 'badge blu', testo: 'Livello ' + es.livello })
    ]),
    contenitore,
    parametri,
    h('div', { class: 'info-box', style: 'margin-bottom:12px' }, [
      h('div', {}, [h('strong', { testo: 'Muscoli principali: ' }), es.muscoli.primari.join(', ')]),
      es.muscoli.secondari.length ? h('div', { style: 'margin-top:3px' }, [h('strong', { testo: 'Secondari: ' }), es.muscoli.secondari.join(', ')]) : null
    ]),
    elenco('Preparazione', es.setup),
    elenco('Esecuzione', es.esecuzione),
    elenco('Errori da evitare', es.errori),
    h('div', { class: 'info-box' }, [
      h('div', {}, [h('strong', { testo: 'Respirazione: ' }), es.respiro]),
      es.tempo ? h('div', { style: 'margin-top:3px' }, [h('strong', { testo: 'Tempo di esecuzione: ' }), es.tempo, es.tempo.includes('-') ? ' (discesa-pausa-salita-pausa, in secondi)' : '']) : null
    ]),
    es.varianti ? h('div', { class: 'avviso', style: 'margin-top:10px' }, es.varianti) : null,
    azioni
  ]);

  let anim = null;
  const chiudi = foglio(contenuto, {
    titolo: es.nome,
    allaChiusura: () => { if (anim) anim.destroy(); }
  });
  anim = creaAnimazione(boxAnim, es.anim, { etichetta });
  return chiudi;

  function cella(valore, etichetta) {
    return h('div', { class: 'macro-cella' }, [
      h('div', { class: 'valore', style: 'font-size:.95rem', testo: String(valore) }),
      h('div', { class: 'etichetta', testo: etichetta })
    ]);
  }
}

/** Riga compatta di un esercizio, con miniatura animata. */
export function rigaEsercizio(voce, onApri, extra) {
  const box = h('div', { class: 'anim-box' });
  const riga = h('button', { class: 'esercizio', type: 'button', onclick: () => onApri(voce) }, [
    box,
    h('div', { class: 'info' }, [
      h('div', { class: 'nome', testo: voce.nome }),
      h('div', { class: 'par', testo: extra || descrizioneParametri(voce) })
    ]),
    h('div', { class: 'freccia', html: '&rsaquo;' })
  ]);
  // animazione leggera solo quando visibile
  const anim = creaAnimazione(box, voce.anim, { durata: 3000 });
  riga._anim = anim;
  return riga;
}

export function descrizioneParametri(voce) {
  if (voce.tipo === 'cardio') return `${voce.ripetizioni} · ${voce.gruppo}`;
  const rec = voce.recupero ? ` · recupero ${voce.recupero}s` : '';
  return `${voce.serie} serie × ${voce.ripetizioni}${rec}`;
}
