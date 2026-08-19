// Vista "Profilo": dati personali, preferenze, calcoli e backup.
import { h, sezione, campo, select, chips, toast, conferma, macroRiga, num, foglio } from '../ui.js';
import { LIVELLI_ATTIVITA, OBIETTIVI, ESPERIENZA, calcolaMacro, calcolaBMI, stimaBodyFat } from '../nutrizione.js';
import { PREFERENZE, ALIMENTI_BY_ID } from '../alimenti.js';
import { GRUPPI_FOCUS } from '../allenamento.js';
import { rigeneraTutto } from '../genera.js';
import { esporta, importa, azzera } from '../store.js';

const LIMITAZIONI = [
  { id: 'ginocchia', nome: 'Ginocchia' },
  { id: 'spalle', nome: 'Spalle' },
  { id: 'schiena', nome: 'Schiena' }
];

const ATTREZZATURA = [
  { id: 'palestra', nome: 'Palestra attrezzata' },
  { id: 'casa', nome: 'Casa (manubri/elastici)' },
  { id: 'libero', nome: 'Solo corpo libero' }
];

const CARDIO = [
  { id: 'auto', nome: 'Se serve all\'obiettivo' },
  { id: 'sempre', nome: 'Sempre' },
  { id: 'mai', nome: 'Mai' }
];

const DURATE = [30, 45, 60, 75, 90].map(d => ({ id: d, nome: d + ' min' }));
const GIORNI_OPZ = [2, 3, 4, 5, 6].map(d => ({ id: d, nome: d + 'x' }));
const PASTI_OPZ = [3, 4, 5, 6].map(d => ({ id: d, nome: d + ' pasti' }));

/** Blocchi di campi riutilizzati da wizard e profilo. */
export function blocchi(bozza, aggiornaCampo) {
  const set = (k, v) => { bozza[k] = v; aggiornaCampo(); };

  const anagrafica = [
    campo('Nome (facoltativo)', h('input', { type: 'text', value: bozza.nome || '', oninput: e => { bozza.nome = e.target.value; } })),
    h('div', { class: 'campo' }, [h('label', { testo: 'Sesso biologico' }),
      chips(bozza.sesso, [{ id: 'uomo', nome: 'Uomo' }, { id: 'donna', nome: 'Donna' }], v => set('sesso', v))]),
    h('div', { class: 'campi-3' }, [
      campo('Eta', h('input', { type: 'number', inputmode: 'numeric', value: bozza.eta, oninput: e => set('eta', Number(e.target.value)) })),
      campo('Peso (kg)', h('input', { type: 'number', step: '0.1', inputmode: 'decimal', value: bozza.peso, oninput: e => set('peso', Number(e.target.value)) })),
      campo('Altezza (cm)', h('input', { type: 'number', inputmode: 'numeric', value: bozza.altezza, oninput: e => set('altezza', Number(e.target.value)) }))
    ]),
    campo('% massa grassa (se la conosci)', h('input', {
      type: 'number', step: '0.5', inputmode: 'decimal', value: bozza.bodyFat ?? '',
      placeholder: 'stimata: ' + stimaBodyFat(bozza) + '%',
      oninput: e => set('bodyFat', e.target.value === '' ? null : Number(e.target.value))
    }), 'Se la inserisci, il calcolo del fabbisogno diventa piu preciso.'),
    campo('Attivita fuori dalla palestra', select(bozza.attivita, Object.entries(LIVELLI_ATTIVITA).map(([id, v]) => ({ id, nome: v.nome })), v => set('attivita', v)))
  ];

  const obiettivo = [
    campo('Obiettivo', select(bozza.obiettivo, Object.entries(OBIETTIVI).map(([id, v]) => ({ id, nome: v.nome })), v => set('obiettivo', v))),
    h('div', { class: 'info-box', style: 'margin-bottom:13px' }, (OBIETTIVI[bozza.obiettivo] || OBIETTIVI.mantenimento).descr),
    campo('Esperienza con i pesi', select(bozza.esperienza, Object.entries(ESPERIENZA).map(([id, v]) => ({ id, nome: v.nome })), v => set('esperienza', v)))
  ];

  const allenamento = [
    h('div', { class: 'campo' }, [h('label', { testo: 'Allenamenti a settimana' }), chips(bozza.giorniAllenamento, GIORNI_OPZ, v => set('giorniAllenamento', Number(v)))]),
    h('div', { class: 'campo' }, [h('label', { testo: 'Durata di una seduta' }), chips(bozza.durataSessione, DURATE, v => set('durataSessione', Number(v)))]),
    campo('Attrezzatura disponibile', select(bozza.attrezzatura, ATTREZZATURA, v => set('attrezzatura', v))),
    h('div', { class: 'campo' }, [h('label', { testo: 'Zone da proteggere (dolori o infortuni)' }), chips(bozza.limitazioni, LIMITAZIONI, v => set('limitazioni', v), true)]),
    campo('Gruppo da privilegiare', select(bozza.focus, GRUPPI_FOCUS, v => set('focus', v))),
    campo('Cardio in scheda', select(bozza.cardio, CARDIO, v => set('cardio', v)))
  ];

  const alimentazione = [
    h('div', { class: 'campo' }, [h('label', { testo: 'Pasti al giorno' }), chips(bozza.numPasti, PASTI_OPZ, v => set('numPasti', Number(v)))]),
    h('div', { class: 'campo' }, [h('label', { testo: 'Preferenze e intolleranze' }), chips(bozza.preferenze, PREFERENZE, v => set('preferenze', v), true)]),
    h('div', { class: 'campo' }, [h('label', { testo: 'Carboidrati ciclizzati' }),
      chips(bozza.ciclizza ? 'si' : 'no', [{ id: 'si', nome: 'Si, piu carbo nei giorni di allenamento' }, { id: 'no', nome: 'No, uguale ogni giorno' }], v => set('ciclizza', v === 'si'))])
  ];

  return { anagrafica, obiettivo, allenamento, alimentazione };
}

export function render(ctx) {
  const { stato, aggiorna } = ctx;
  const radice = h('div');
  const bozza = structuredClone(stato.profilo);
  let contenitoreCalcoli = null;

  const aggiornaCampo = () => {
    if (contenitoreCalcoli) {
      const nuovo = riepilogoCalcoli(bozza);
      contenitoreCalcoli.replaceWith(nuovo);
      contenitoreCalcoli = nuovo;
    }
  };

  const b = blocchi(bozza, aggiornaCampo);
  radice.appendChild(sezione('I tuoi dati', b.anagrafica));
  radice.appendChild(sezione('Obiettivo', b.obiettivo));
  radice.appendChild(sezione('Allenamento', b.allenamento));
  radice.appendChild(sezione('Alimentazione', b.alimentazione));

  if (bozza.esclusiAlimenti && bozza.esclusiAlimenti.length) {
    radice.appendChild(sezione('Alimenti esclusi', [
      h('div', { class: 'chip-gruppo' }, bozza.esclusiAlimenti.map(id => h('button', {
        class: 'chip attivo', testo: (ALIMENTI_BY_ID[id] || { nome: id }).nome + ' ✕',
        onclick: e => {
          bozza.esclusiAlimenti = bozza.esclusiAlimenti.filter(x => x !== id);
          e.target.remove();
        }
      })))
    ]));
  }

  contenitoreCalcoli = riepilogoCalcoli(bozza);
  radice.appendChild(contenitoreCalcoli);

  radice.appendChild(h('button', {
    class: 'btn', style: 'margin-bottom:12px', testo: 'Salva e aggiorna scheda e dieta',
    onclick: () => {
      if (!validazione(bozza)) return;
      aggiorna(s => {
        s.profilo = bozza;
        s.configurato = true;
        rigeneraTutto(s);
      });
      toast('Profilo salvato: scheda e dieta aggiornate');
    }
  }));

  radice.appendChild(sezione('Backup dei dati', [
    h('p', { style: 'font-size:.86rem;color:var(--testo-2)' },
      'Tutto e salvato solo su questo dispositivo. Esporta un file di backup prima di cambiare telefono o svuotare i dati di Safari.'),
    h('div', { class: 'colonna' }, [
      h('button', { class: 'btn secondario', testo: '⬇︎ Esporta backup', onclick: scaricaBackup }),
      h('button', { class: 'btn secondario', testo: '⬆︎ Importa backup', onclick: () => importaBackup(ctx) }),
      h('button', {
        class: 'btn pericolo', testo: 'Cancella tutti i dati',
        onclick: async () => {
          if (!await conferma('Verranno cancellati profilo, scheda, dieta e tutto lo storico. Operazione irreversibile.')) return;
          azzera();
          toast('Dati azzerati');
        }
      })
    ])
  ]));

  radice.appendChild(h('div', { class: 'centro', style: 'color:var(--testo-3);font-size:.75rem;padding:10px 0 4px' },
    'GymDiet · i piani generati sono indicazioni generiche, non sostituiscono il parere di un medico o di un nutrizionista.'));

  return radice;
}

function validazione(b) {
  if (!(b.eta >= 14 && b.eta <= 90)) { toast('Inserisci un\'eta tra 14 e 90 anni'); return false; }
  if (!(b.peso >= 30 && b.peso <= 250)) { toast('Inserisci un peso tra 30 e 250 kg'); return false; }
  if (!(b.altezza >= 130 && b.altezza <= 220)) { toast('Inserisci un\'altezza tra 130 e 220 cm'); return false; }
  return true;
}

export function riepilogoCalcoli(profilo) {
  let macro;
  try { macro = calcolaMacro(profilo); } catch (e) { return h('div'); }
  const bmi = calcolaBMI(profilo);
  return sezione('Il tuo fabbisogno', [
    macroRiga(macro),
    h('div', { class: 'griglia-stat', style: 'margin-top:10px' }, [
      stat(num(macro.bmr), 'metabolismo basale'),
      stat(num(macro.tdee), 'fabbisogno totale'),
      stat(bmi.valore + '', 'BMI (' + bmi.categoria + ')'),
      stat(macro.fibre + ' g', 'fibre'),
      stat(macro.acqua + ' L', 'acqua'),
      stat(macro.percentuali.proteine + '/' + macro.percentuali.carboidrati + '/' + macro.percentuali.grassi, '% P/C/G')
    ]),
    h('div', { class: 'info-box', style: 'margin-top:10px' },
      `Il fabbisogno include ${macro.allenamento} kcal al giorno spalmate per gli allenamenti. ` +
      `${macro.obiettivo.nome}: ${macro.kcal >= macro.tdee ? 'surplus' : 'deficit'} di ${Math.abs(macro.kcal - macro.tdee)} kcal.`)
  ]);
}

function stat(valore, etichetta) {
  return h('div', { class: 'stat' }, [h('div', { class: 'v', style: 'font-size:1.05rem', testo: String(valore) }), h('div', { class: 'e', testo: etichetta })]);
}

// ---------------------------------------------------------------- backup
function scaricaBackup() {
  const dati = esporta();
  const blob = new Blob([dati], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymdiet-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup esportato');
}

function importaBackup(ctx) {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: 'margin-bottom:12px' });
  const area = h('textarea', { rows: 5, placeholder: 'oppure incolla qui il contenuto del backup' });
  const contenuto = h('div', {}, [
    input, area,
    h('button', {
      class: 'btn', style: 'margin-top:10px', testo: 'Importa',
      onclick: async () => {
        try {
          let testo = area.value.trim();
          if (!testo && input.files && input.files[0]) testo = await input.files[0].text();
          if (!testo) return toast('Scegli un file o incolla i dati');
          importa(testo);
          chiudi();
          toast('Backup importato');
        } catch (e) {
          toast('File non valido');
        }
      }
    })
  ]);
  const chiudi = foglio(contenuto, { titolo: 'Importa backup' });
}
