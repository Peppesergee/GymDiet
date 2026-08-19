// Vista "Progressi": peso, misure, storico allenamenti, record.
import { h, sezione, toast, conferma, num } from '../ui.js';
import { oggiISO, dataItaliana } from '../store.js';
import { ESERCIZI_BY_ID } from '../exercises.js';

export function render(ctx) {
  const { stato, aggiorna } = ctx;
  const radice = h('div');
  const pesi = stato.log.pesi.slice().sort((a, b) => a.data.localeCompare(b.data));

  // ------------------------------------------------ peso
  const variazione = pesi.length > 1 ? pesi[pesi.length - 1].valore - pesi[0].valore : 0;
  radice.appendChild(sezione('Andamento del peso', [
    pesi.length >= 2
      ? grafico(pesi.map(p => ({ x: p.data, y: p.valore })))
      : h('div', { class: 'info-box' }, 'Registra il peso per almeno due giorni per vedere il grafico.'),
    h('div', { class: 'griglia-stat', style: 'margin-top:10px' }, [
      stat(pesi.length ? pesi[pesi.length - 1].valore + ' kg' : '—', 'attuale'),
      stat((variazione > 0 ? '+' : '') + variazione.toFixed(1) + ' kg', 'dal primo dato'),
      stat(mediaSettimana(pesi), 'media 7 giorni')
    ])
  ]));

  // ------------------------------------------------ misure
  const campiMisure = [
    ['vita', 'Vita'], ['torace', 'Torace'], ['braccio', 'Braccio'], ['coscia', 'Coscia'], ['fianchi', 'Fianchi']
  ];
  const ultima = stato.log.misure[stato.log.misure.length - 1];
  const inputs = {};
  const grigliaMisure = h('div', { class: 'campi-3' });
  campiMisure.forEach(([id, nome]) => {
    inputs[id] = h('input', { type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'cm', value: ultima && ultima[id] ? ultima[id] : '' });
    grigliaMisure.appendChild(h('div', {}, [h('label', { testo: nome }), inputs[id]]));
  });
  radice.appendChild(sezione('Misure (cm)', [
    grigliaMisure,
    h('button', {
      class: 'btn secondario', style: 'margin-top:10px', testo: 'Salva misure di oggi',
      onclick: () => {
        const voce = { data: oggiISO() };
        let almenoUna = false;
        for (const [id] of campiMisure) {
          const v = Number(inputs[id].value);
          if (v > 0) { voce[id] = v; almenoUna = true; }
        }
        if (!almenoUna) return toast('Inserisci almeno una misura');
        aggiorna(s => {
          const idx = s.log.misure.findIndex(m => m.data === voce.data);
          if (idx >= 0) s.log.misure[idx] = voce; else s.log.misure.push(voce);
          s.log.misure.sort((a, b) => a.data.localeCompare(b.data));
        });
        toast('Misure salvate');
      }
    }),
    stato.log.misure.length > 1 ? storicoMisure(stato.log.misure, campiMisure) : null
  ]));

  // ------------------------------------------------ record
  const record = calcolaRecord(stato.log.sessioni);
  if (record.length) {
    radice.appendChild(sezione('Record personali (massimale stimato)', [
      h('ul', { class: 'elenco' }, record.slice(0, 12).map(r => h('li', {}, [
        h('div', { style: 'flex:1' }, [
          h('div', { class: 'titolo', testo: r.nome }),
          h('div', { class: 'meta', testo: `${r.peso} kg × ${r.rip} · ${dataItaliana(r.data)}` })
        ]),
        h('span', { class: 'badge verde', testo: r.stimato + ' kg' })
      ])))
    ]));
  }

  // ------------------------------------------------ volume settimanale
  const settimane = volumeSettimanale(stato.log.sessioni);
  if (settimane.length >= 2) {
    radice.appendChild(sezione('Volume di allenamento (tonnellate sollevate)', [
      istogramma(settimane.map(s => ({ etichetta: s.etichetta, valore: s.volume / 1000 })))
    ]));
  }

  // ------------------------------------------------ storico
  const sessioni = stato.log.sessioni.slice().reverse();
  radice.appendChild(sezione('Storico allenamenti', [
    sessioni.length
      ? h('ul', { class: 'elenco' }, sessioni.slice(0, 25).map(s => h('li', {}, [
          h('div', { style: 'flex:1' }, [
            h('div', { class: 'titolo', testo: s.nome }),
            h('div', { class: 'meta', testo: `${dataItaliana(s.data)} · ${s.durataMin} min · ${s.esercizi.length} esercizi${s.note ? ' · ' + s.note : ''}` })
          ]),
          h('button', {
            class: 'cambia', testo: '×', title: 'Elimina',
            onclick: async () => {
              if (!await conferma('Eliminare questa seduta dallo storico?')) return;
              aggiorna(st => { st.log.sessioni = st.log.sessioni.filter(x => x.id !== s.id); });
            }
          })
        ])))
      : h('div', { class: 'info-box' }, 'Nessun allenamento registrato: completa una seduta dalla scheda.')
  ]));

  return radice;
}

function stat(valore, etichetta) {
  return h('div', { class: 'stat' }, [h('div', { class: 'v', testo: String(valore) }), h('div', { class: 'e', testo: etichetta })]);
}

function mediaSettimana(pesi) {
  const ultimi = pesi.slice(-7);
  if (!ultimi.length) return '—';
  return (ultimi.reduce((a, p) => a + p.valore, 0) / ultimi.length).toFixed(1) + ' kg';
}

// ---------------------------------------------------------------- grafici
function grafico(punti) {
  const L = 300, A = 150, m = { s: 30, d: 8, a: 12, b: 20 };
  const ys = punti.map(p => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = Math.max(0.6, max - min);
  const y0 = min - span * 0.15, y1 = max + span * 0.15;
  const px = i => m.s + (i / Math.max(1, punti.length - 1)) * (L - m.s - m.d);
  const py = v => m.a + (1 - (v - y0) / (y1 - y0)) * (A - m.a - m.b);

  const d = punti.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join('');
  const area = `${d}L${px(punti.length - 1).toFixed(1)} ${A - m.b}L${px(0).toFixed(1)} ${A - m.b}Z`;

  const parti = [
    `<path class="area" d="${area}"/>`,
    `<path class="linea" d="${d}"/>`,
    `<line class="assi" x1="${m.s}" y1="${A - m.b}" x2="${L - m.d}" y2="${A - m.b}"/>`,
    `<text x="2" y="${py(max) + 3}">${max.toFixed(1)}</text>`,
    `<text x="2" y="${py(min) + 3}">${min.toFixed(1)}</text>`,
    `<text x="${m.s}" y="${A - 6}">${dataItaliana(punti[0].x).slice(0, 5)}</text>`,
    `<text x="${L - m.d}" y="${A - 6}" text-anchor="end">${dataItaliana(punti[punti.length - 1].x).slice(0, 5)}</text>`
  ];
  punti.slice(-14).forEach((p, i, arr) => {
    const idx = punti.length - arr.length + i;
    parti.push(`<circle class="punto" cx="${px(idx).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="2.4"/>`);
  });
  return h('svg', { class: 'grafico', viewBox: `0 0 ${L} ${A}`, html: parti.join('') });
}

function istogramma(dati) {
  const L = 300, A = 130, base = A - 22, larghezza = (L - 10) / dati.length;
  const max = Math.max(...dati.map(d => d.valore), 0.1);
  const parti = dati.map((d, i) => {
    const alt = (d.valore / max) * (base - 14);
    const x = 5 + i * larghezza;
    return `<rect x="${x + larghezza * 0.15}" y="${base - alt}" width="${larghezza * 0.7}" height="${alt}" rx="3" fill="var(--acc)" opacity="${0.55 + 0.45 * (d.valore / max)}"/>` +
      `<text x="${x + larghezza / 2}" y="${base + 12}" text-anchor="middle">${d.etichetta}</text>` +
      `<text x="${x + larghezza / 2}" y="${base - alt - 4}" text-anchor="middle">${d.valore.toFixed(1)}</text>`;
  });
  return h('svg', { class: 'grafico', viewBox: `0 0 ${L} ${A}`, html: parti.join('') });
}

// ---------------------------------------------------------------- calcoli
function calcolaRecord(sessioni) {
  const migliori = {};
  for (const s of sessioni) {
    for (const e of s.esercizi || []) {
      for (const serie of e.serie || []) {
        const peso = Number(serie.peso) || 0, rip = Number(serie.rip) || 0;
        if (peso <= 0 || rip <= 0) continue;
        const stimato = Math.round(peso * (1 + rip / 30) * 10) / 10;
        if (!migliori[e.esercizioId] || stimato > migliori[e.esercizioId].stimato) {
          migliori[e.esercizioId] = {
            esercizioId: e.esercizioId,
            nome: (ESERCIZI_BY_ID[e.esercizioId] || {}).nome || e.nome,
            peso, rip, stimato, data: s.data
          };
        }
      }
    }
  }
  return Object.values(migliori).sort((a, b) => b.stimato - a.stimato);
}

function volumeSettimanale(sessioni) {
  const mappa = {};
  for (const s of sessioni) {
    const chiave = settimanaDi(s.data);
    let volume = 0;
    for (const e of s.esercizi || []) {
      for (const serie of e.serie || []) volume += (Number(serie.peso) || 0) * (Number(serie.rip) || 0);
    }
    mappa[chiave] = (mappa[chiave] || 0) + volume;
  }
  return Object.entries(mappa)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([k, v]) => ({ etichetta: k.slice(5), volume: v }));
}

function settimanaDi(iso) {
  const d = new Date(iso + 'T12:00:00');
  const giorno = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - giorno);
  return d.toISOString().slice(0, 10);
}

function storicoMisure(misure, campi) {
  const ultime = misure.slice(-6).reverse();
  return h('div', { style: 'margin-top:12px;overflow-x:auto' }, [
    h('table', { style: 'width:100%;border-collapse:collapse;font-size:.82rem' }, [
      h('thead', {}, [h('tr', {}, [h('th', { style: 'text-align:left;color:var(--testo-3)', testo: 'Data' })]
        .concat(campi.map(([, n]) => h('th', { style: 'color:var(--testo-3)', testo: n }))))]),
      h('tbody', {}, ultime.map(m => h('tr', {}, [h('td', { testo: dataItaliana(m.data) })]
        .concat(campi.map(([id]) => h('td', { style: 'text-align:center', testo: m[id] ? String(m[id]) : '—' }))))))
    ])
  ]);
}
