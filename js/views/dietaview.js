// Vista "Dieta": piano settimanale, pasti, lista della spesa.
import { h, sezione, macroRiga, barraMacro, foglio, toast, conferma, num } from '../ui.js';
import { GIORNI, listaSpesa, alternative } from '../dieta.js';
import { rigeneraDieta, nuovoSeme } from '../genera.js';
import { indiceGiorno, dataDelGiorno, dataItaliana } from '../store.js';

const SIGLE = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function render(ctx) {
  const { stato, aggiorna } = ctx;
  const radice = h('div');

  if (!stato.dieta) {
    radice.appendChild(sezione('Nessun piano alimentare', [
      h('p', { testo: 'Genera il piano settimanale in base al tuo profilo e ai tuoi obiettivi.' }),
      h('button', { class: 'btn', testo: 'Genera dieta', onclick: () => aggiorna(s => rigeneraDieta(s)) })
    ]));
    return radice;
  }

  const giornoSel = stato.ui.giornoDieta === null || stato.ui.giornoDieta === undefined
    ? indiceGiorno() : stato.ui.giornoDieta;
  const giorno = stato.dieta.giorni[giornoSel];
  const dataISO = dataDelGiorno(giornoSel);

  // ------------------------------------------------ selettore giorni
  const selettore = h('div', { class: 'selettore-giorni' });
  stato.dieta.giorni.forEach((g, i) => {
    selettore.appendChild(h('button', {
      class: i === giornoSel ? 'attivo' : '',
      onclick: () => aggiorna(s => { s.ui.giornoDieta = i; })
    }, [
      h('span', { class: 'g', testo: SIGLE[i] }),
      h('span', { testo: g.allenamento ? '💪' : '·' })
    ]));
  });
  radice.appendChild(selettore);

  // ------------------------------------------------ riepilogo giornata
  const scarto = giorno.target.kcal ? Math.round((giorno.totali.kcal - giorno.target.kcal) / giorno.target.kcal * 100) : 0;
  radice.appendChild(sezione(null, [
    h('div', { class: 'riga-sp', style: 'margin-bottom:9px' }, [
      h('div', {}, [
        h('h2', { class: 'mb0', testo: GIORNI[giornoSel] }),
        h('small', { testo: `${dataItaliana(dataISO)} · ${giorno.allenamento ? 'giorno di allenamento' : 'giorno di riposo'}` })
      ]),
      h('span', { class: 'badge ' + (giorno.allenamento ? 'verde' : 'blu'), testo: giorno.allenamento ? 'CARB +' : 'CARB -' })
    ]),
    macroRiga(giorno.totali),
    h('div', { style: 'margin-top:9px' }, [barraMacro(giorno.totali)]),
    h('small', { style: 'display:block;margin-top:7px', testo: `Obiettivo del giorno: ${num(giorno.target.kcal)} kcal · ${giorno.target.proteine} P · ${giorno.target.carboidrati} C · ${giorno.target.grassi} G · fibre ${giorno.totali.fibre} g` }),
    Math.abs(scarto) > 8 ? h('div', { class: 'avviso', style: 'margin-top:9px' },
      `Il piano di oggi si discosta del ${scarto > 0 ? '+' : ''}${scarto}% dalle calorie obiettivo: con questi vincoli le porzioni non scendono oltre. Prova ad aumentare il numero di pasti nel profilo.`) : null
  ]));

  // ------------------------------------------------ pasti
  giorno.pasti.forEach(pasto => {
    const chiaveFatto = `${dataISO}.${pasto.id}`;
    const fatto = !!stato.log.pasti[chiaveFatto];

    const box = h('div', { class: 'scheda-box' });
    box.appendChild(h('div', { class: 'riga-sp', style: 'margin-bottom:4px' }, [
      h('div', { class: 'riga' }, [
        h('button', {
          class: 'spunta' + (fatto ? ' fatto' : ''), testo: '✓', title: 'Segna come consumato',
          onclick: () => aggiorna(s => {
            if (s.log.pasti[chiaveFatto]) delete s.log.pasti[chiaveFatto];
            else s.log.pasti[chiaveFatto] = true;
          })
        }),
        h('h3', { class: 'mb0', testo: pasto.nome })
      ]),
      h('span', { class: 'badge', testo: num(pasto.totali.kcal) + ' kcal' })
    ]));

    pasto.voci.forEach(voce => {
      box.appendChild(h('div', { class: 'pasto-voce' }, [
        h('div', { class: 'qta', testo: `${voce.grammi} ${voce.unita}` }),
        h('div', { class: 'nome' }, [
          voce.nome,
          h('small', { testo: `${num(voce.macro.kcal)} kcal · P ${voce.macro.proteine} · C ${voce.macro.carboidrati} · G ${voce.macro.grassi}${voce.nota ? ' · ' + voce.nota : ''}` })
        ]),
        h('button', {
          class: 'cambia', testo: '⇄', title: 'Cambia alimento',
          onclick: () => apriSostituzione(ctx, giornoSel, pasto, voce)
        })
      ]));
    });

    box.appendChild(h('small', {
      style: 'display:block;margin-top:6px;color:var(--testo-3)',
      testo: `Totale pasto: P ${pasto.totali.proteine} g · C ${pasto.totali.carboidrati} g · G ${pasto.totali.grassi} g`
    }));
    radice.appendChild(box);
  });

  // ------------------------------------------------ azioni
  radice.appendChild(sezione('Strumenti', [
    h('div', { class: 'colonna' }, [
      h('button', { class: 'btn secondario', testo: '🛒 Lista della spesa della settimana', onclick: () => apriSpesa(stato) }),
      h('button', {
        class: 'btn secondario', testo: '🔄 Rigenera piano alimentare',
        onclick: async () => {
          if (!await conferma('Generare un nuovo piano settimanale? Le sostituzioni manuali verranno azzerate.')) return;
          aggiorna(s => {
            s.semi.dieta = nuovoSeme();
            s.offsets.dieta = {};
            s.override.dieta = {};
            rigeneraDieta(s);
          });
          toast('Piano rigenerato');
        }
      })
    ]),
    h('div', { class: 'info-box', style: 'margin-top:10px' },
      'I pesi si riferiscono all\'alimento crudo e al netto degli scarti, salvo diversa indicazione. Bevi circa ' +
      (stato.macro ? stato.macro.acqua : 2.5) + ' litri d\'acqua al giorno.')
  ]));

  return radice;
}

// ---------------------------------------------------------------- sostituzione
function apriSostituzione(ctx, giornoIdx, pasto, voce) {
  const { stato, aggiorna } = ctx;
  const lista = alternative(voce.ruolo, pasto.id, stato.profilo.preferenze, stato.profilo.esclusiAlimenti)
    .filter(a => a.id !== voce.alimentoId);

  const elenco = h('div', { style: 'max-height:46vh;overflow-y:auto' });
  lista.forEach(a => {
    elenco.appendChild(h('button', {
      class: 'esercizio', style: 'padding:11px 0',
      onclick: () => {
        chiudi();
        aggiorna(s => {
          s.override.dieta[`${giornoIdx}.${voce.chiaveOffset}`] = a.id;
          rigeneraDieta(s);
        });
        toast('Alimento sostituito');
      }
    }, [
      h('div', { class: 'info' }, [
        h('div', { class: 'nome', testo: a.nome }),
        h('div', { class: 'par', testo: `per 100 g: ${a.kcal} kcal · P ${a.p} · C ${a.c} · G ${a.g}` })
      ]),
      h('div', { class: 'freccia', html: '&rsaquo;' })
    ]));
  });

  const contenuto = h('div', {}, [
    h('div', { class: 'info-box', style: 'margin-bottom:10px' },
      `Sostituisci "${voce.nome}" in ${pasto.nome.toLowerCase()} di ${GIORNI[giornoIdx]}. Le quantita' vengono ricalcolate per mantenere gli stessi macro.`),
    elenco,
    h('div', { class: 'colonna', style: 'margin-top:12px' }, [
      h('button', {
        class: 'btn pericolo', testo: 'Non mi piace: escludilo da tutto il piano',
        onclick: () => {
          chiudi();
          aggiorna(s => {
            if (!s.profilo.esclusiAlimenti.includes(voce.alimentoId)) s.profilo.esclusiAlimenti.push(voce.alimentoId);
            rigeneraDieta(s);
          });
          toast('Alimento escluso dal piano');
        }
      })
    ])
  ]);
  const chiudi = foglio(contenuto, { titolo: 'Cambia alimento' });
}

// ---------------------------------------------------------------- lista spesa
function apriSpesa(stato) {
  const gruppi = listaSpesa(stato.dieta);
  const contenuto = h('div');
  contenuto.appendChild(h('div', { class: 'info-box', style: 'margin-bottom:12px' },
    'Quantita totali per 7 giorni. Aggiungi un margine per gli scarti (bucce, ossa, ecc.).'));
  for (const categoria of Object.keys(gruppi).sort()) {
    contenuto.appendChild(h('h4', { testo: categoria, style: 'margin:14px 0 4px;font-size:.92rem;color:var(--acc)' }));
    contenuto.appendChild(h('ul', { class: 'elenco lista-spesa' },
      gruppi[categoria].map(v => h('li', {}, [
        h('span', { testo: v.nome }),
        h('span', { class: 'q', testo: v.etichetta })
      ]))));
  }
  foglio(contenuto, { titolo: 'Lista della spesa' });
}
