// Vista "Scheda": split, sessioni ed esercizi.
import { h, sezione, toast, conferma } from '../ui.js';
import { apriEsercizio, rigaEsercizio, descrizioneParametri } from './esercizio.js';
import { apriSessione } from './sessione.js';
import { rigeneraScheda, rigeneraDieta, nuovoSeme } from '../genera.js';
import { GIORNI } from '../dieta.js';

const animazioniAttive = [];

export function pulisci() {
  while (animazioniAttive.length) animazioniAttive.pop().destroy();
}

export function render(ctx) {
  const { stato, aggiorna } = ctx;
  pulisci();
  const radice = h('div');

  if (!stato.scheda) {
    radice.appendChild(sezione('Nessuna scheda', [
      h('p', { testo: 'Genera la tua scheda personalizzata in base al profilo.' }),
      h('button', { class: 'btn', testo: 'Genera scheda', onclick: () => { aggiorna(s => rigeneraScheda(s)); } })
    ]));
    return radice;
  }

  const scheda = stato.scheda;
  const p = stato.profilo;

  radice.appendChild(sezione(null, [
    h('div', { class: 'riga-sp' }, [
      h('div', {}, [
        h('h2', { class: 'mb0', testo: scheda.split }),
        h('small', { testo: `${p.giorniAllenamento} sedute a settimana · ${p.durataSessione} minuti · ${etichettaAttrezzatura(p.attrezzatura)}` })
      ])
    ]),
    h('div', { class: 'info-box', style: 'margin-top:10px' }, scheda.nota)
  ]));

  scheda.sessioni.forEach((sessione, idx) => {
    const box = h('div', { class: 'scheda-box' });
    box.appendChild(h('div', { class: 'riga-sp', style: 'margin-bottom:6px' }, [
      h('div', {}, [
        h('h3', { class: 'mb0', testo: sessione.nome }),
        h('small', { testo: `${GIORNI[sessione.giornoSuggerito] || 'Giorno ' + (idx + 1)} · ~${sessione.durataStimata} min · ${sessione.esercizi.length} esercizi` })
      ]),
      h('span', { class: 'badge verde', testo: 'Seduta ' + (idx + 1) })
    ]));

    const lista = h('div');
    sessione.esercizi.forEach(voce => {
      const riga = rigaEsercizio(voce, v => apriEsercizio(v, {
        profilo: p,
        esclusi: stato.esclusiEsercizi,
        onCambia: v2 => cambiaEsercizio(ctx, v2)
      }), descrizioneParametri(voce));
      animazioniAttive.push(riga._anim);
      lista.appendChild(riga);
    });
    box.appendChild(lista);

    box.appendChild(h('details', { style: 'margin-top:6px' }, [
      h('summary', { testo: 'Riscaldamento e defaticamento' }),
      h('ul', { style: 'font-size:.86rem;color:var(--testo-2);padding-left:18px' },
        sessione.riscaldamento.concat(sessione.defaticamento).map(t => h('li', { testo: t })))
    ]));

    box.appendChild(h('button', {
      class: 'btn', style: 'margin-top:10px', testo: 'Allena ora',
      onclick: () => apriSessione(sessione, ctx)
    }));
    radice.appendChild(box);
  });

  radice.appendChild(sezione('Come progredire', [
    h('ul', { style: 'font-size:.88rem;padding-left:18px;color:var(--testo-2)' },
      scheda.progressione.map(t => h('li', { testo: t, style: 'margin-bottom:6px' })))
  ]));

  radice.appendChild(sezione('Rigenera', [
    h('p', { class: 'mb0', style: 'font-size:.86rem;color:var(--testo-2)' },
      'Crea una nuova combinazione di esercizi mantenendo lo stesso schema.'),
    h('button', {
      class: 'btn secondario', style: 'margin-top:10px', testo: 'Nuova scheda',
      onclick: async () => {
        if (!await conferma('Generare una nuova scheda? Lo storico degli allenamenti resta salvato.')) return;
        aggiorna(s => {
          s.semi.allenamento = nuovoSeme();
          s.offsets.allenamento = {};
          rigeneraScheda(s);
          rigeneraDieta(s);
        });
        toast('Scheda rigenerata');
      }
    })
  ]));

  return radice;
}

function cambiaEsercizio(ctx, voce) {
  ctx.aggiorna(s => {
    s.offsets.allenamento[voce.chiave] = (s.offsets.allenamento[voce.chiave] || 0) + 1;
    rigeneraScheda(s);
  });
  toast('Esercizio sostituito');
}

function etichettaAttrezzatura(a) {
  return { palestra: 'palestra attrezzata', casa: 'attrezzatura in casa', libero: 'corpo libero' }[a] || a;
}
