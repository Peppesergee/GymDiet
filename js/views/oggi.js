// Vista "Oggi": riepilogo della giornata.
import { h, sezione, macroRiga, toast, num } from '../ui.js';
import { indiceGiorno, oggiISO, dataDelGiorno } from '../store.js';
import { apriSessione } from './sessione.js';
import { GIORNI } from '../dieta.js';
import { rigeneraTutto } from '../genera.js';

export function render(ctx) {
  const { stato, aggiorna, vaiA } = ctx;
  const radice = h('div');
  const oggi = indiceGiorno();
  const dataISO = oggiISO();

  if (!stato.scheda || !stato.dieta) {
    radice.appendChild(sezione('Benvenuto', [
      h('p', { testo: 'Genera scheda e piano alimentare per iniziare.' }),
      h('button', { class: 'btn', testo: 'Genera tutto', onclick: () => { aggiorna(s => rigeneraTutto(s)); toast('Fatto!'); } })
    ]));
    return radice;
  }

  // ------------------------------------------------ allenamento di oggi
  const sessioniOggi = stato.scheda.sessioni.filter(s => s.giornoSuggerito === oggi);
  const giaFatto = stato.log.sessioni.some(s => s.data === dataISO);

  if (sessioniOggi.length) {
    const sessione = sessioniOggi[0];
    radice.appendChild(sezione(null, [
      h('div', { class: 'riga-sp', style: 'margin-bottom:8px' }, [
        h('div', {}, [
          h('small', { testo: 'ALLENAMENTO DI OGGI', style: 'letter-spacing:.06em;font-weight:700' }),
          h('h2', { class: 'mb0', testo: sessione.nome })
        ]),
        giaFatto ? h('span', { class: 'badge verde', testo: 'Completato' }) : h('span', { class: 'badge arancio', testo: '~' + sessione.durataStimata + ' min' })
      ]),
      h('div', { class: 'par', style: 'font-size:.85rem;color:var(--testo-2);margin-bottom:10px', testo: sessione.esercizi.map(e => e.nome).join(' · ') }),
      h('button', { class: 'btn', testo: giaFatto ? 'Allenati di nuovo' : 'Inizia allenamento', onclick: () => apriSessione(sessione, ctx) })
    ]));
  } else {
    const prossima = prossimaSessione(stato.scheda, oggi);
    radice.appendChild(sezione(null, [
      h('div', { class: 'riga-sp' }, [
        h('div', {}, [
          h('small', { testo: 'OGGI', style: 'letter-spacing:.06em;font-weight:700' }),
          h('h2', { class: 'mb0', testo: 'Giorno di riposo' }),
          h('small', { testo: prossima ? `Prossima seduta: ${prossima.nome} (${GIORNI[prossima.giornoSuggerito]})` : '' })
        ]),
        h('span', { class: 'badge blu', testo: 'Recupero' })
      ]),
      h('div', { class: 'info-box', style: 'margin-top:10px' },
        'Il muscolo cresce nel recupero: dormi 7-9 ore, cammina e rispetta il piano alimentare.'),
      h('button', {
        class: 'btn secondario', style: 'margin-top:10px', testo: 'Allenati comunque',
        onclick: () => vaiA('scheda')
      })
    ]));
  }

  // ------------------------------------------------ dieta di oggi
  const giorno = stato.dieta.giorni[oggi];
  const consumati = giorno.pasti.filter(p => stato.log.pasti[`${dataISO}.${p.id}`]);
  const assunti = consumati.reduce((a, p) => ({
    kcal: a.kcal + p.totali.kcal, proteine: a.proteine + p.totali.proteine,
    carboidrati: a.carboidrati + p.totali.carboidrati, grassi: a.grassi + p.totali.grassi
  }), { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 });
  const perc = Math.min(100, Math.round(assunti.kcal / Math.max(1, giorno.totali.kcal) * 100));

  const listaPasti = h('div');
  giorno.pasti.forEach(p => {
    const chiave = `${dataISO}.${p.id}`;
    const fatto = !!stato.log.pasti[chiave];
    listaPasti.appendChild(h('div', { class: 'pasto-voce' }, [
      h('button', {
        class: 'spunta' + (fatto ? ' fatto' : ''), testo: '✓',
        onclick: () => aggiorna(s => {
          if (s.log.pasti[chiave]) delete s.log.pasti[chiave]; else s.log.pasti[chiave] = true;
        })
      }),
      h('div', { class: 'nome' }, [
        p.nome,
        h('small', { testo: p.voci.map(v => `${v.nome} ${v.grammi}${v.unita}`).join(' · ') })
      ]),
      h('div', { class: 'qta', testo: num(p.totali.kcal) })
    ]));
  });

  radice.appendChild(sezione('Alimentazione di oggi', [
    macroRiga(assunti),
    h('div', { class: 'progresso' }, [h('i', { style: `width:${perc}%` })]),
    h('small', { style: 'display:block;margin:6px 0 10px', testo: `${num(assunti.kcal)} di ${num(giorno.totali.kcal)} kcal · restano ${num(Math.max(0, giorno.totali.kcal - assunti.kcal))} kcal` }),
    listaPasti,
    h('button', { class: 'btn secondario', style: 'margin-top:10px', testo: 'Vedi il piano completo', onclick: () => vaiA('dieta') })
  ]));

  // ------------------------------------------------ peso rapido
  const pesoOggi = stato.log.pesi.find(p => p.data === dataISO);
  const inputPeso = h('input', { type: 'number', step: '0.1', inputmode: 'decimal', placeholder: 'kg', value: pesoOggi ? pesoOggi.valore : '' });
  radice.appendChild(sezione('Peso di oggi', [
    h('div', { class: 'riga' }, [
      inputPeso,
      h('button', {
        class: 'btn piccolo', testo: 'Salva',
        onclick: () => {
          const valore = Number(inputPeso.value);
          if (!valore || valore < 25 || valore > 300) return toast('Inserisci un peso valido');
          aggiorna(s => {
            const esistente = s.log.pesi.find(p => p.data === dataISO);
            if (esistente) esistente.valore = valore;
            else s.log.pesi.push({ data: dataISO, valore });
            s.log.pesi.sort((a, b) => a.data.localeCompare(b.data));
            s.profilo.peso = valore;
          });
          toast('Peso registrato');
        }
      })
    ]),
    h('small', { style: 'display:block;margin-top:6px', testo: 'Pesati la mattina a digiuno: conta la media settimanale, non il singolo giorno.' })
  ]));

  // ------------------------------------------------ settimana
  const inizioSettimana = dataDelGiorno(0);
  const fatteSettimana = stato.log.sessioni.filter(s => s.data >= inizioSettimana).length;
  radice.appendChild(sezione('Questa settimana', [
    h('div', { class: 'griglia-stat' }, [
      stat(`${fatteSettimana}/${stato.profilo.giorniAllenamento}`, 'allenamenti'),
      stat(String(stato.log.sessioni.length), 'sedute totali'),
      stat(num(stato.macro ? stato.macro.kcal : giorno.totali.kcal), 'kcal obiettivo')
    ])
  ]));

  return radice;
}

function stat(valore, etichetta) {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'v', testo: valore }),
    h('div', { class: 'e', testo: etichetta })
  ]);
}

function prossimaSessione(scheda, oggi) {
  const ordinate = scheda.sessioni.slice().sort((a, b) => a.giornoSuggerito - b.giornoSuggerito);
  return ordinate.find(s => s.giornoSuggerito > oggi) || ordinate[0] || null;
}
