// App atleta: endpoint separato da quello del trainer. L'atleta entra con il
// proprio account (creato con il codice del trainer), vede la scheda attiva
// e registra le sedute. Non vede bozze, schede archiviate ne' altri atleti.
import { creaApiAtleta } from '../core/api.js';
import { h, svuota, avviso, grafico, dataBreve, quanto, kg } from '../core/dom.js';
import { messaggioErrore, trova } from '../core/servizi.js';
import { apriSchedaTecnica } from '../core/esercizi-ui.js';
import { apriAllenamento } from '../core/allenamento-ui.js';
import { miniatura } from '../../shared/anim.js';
import { andamento, aderenza, giorniDa, isoData, indiceGiorno, sedutaDelGiorno } from '../../shared/progressi.js';
import { GIORNI, formattaCodice } from '../../shared/modello.js';

const GIORNI_LUNGHI = ['lunedi’', 'martedi’', 'mercoledi’', 'giovedi’', 'venerdi’', 'sabato', 'domenica'];
const ICONE = {
  oggi: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  scheda: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  progressi: '<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 15l4-5 3 3 5-7"/></svg>'
};
const radice = document.getElementById('app');
let instradaCorrente = null;   // un solo ascoltatore di hashchange anche dopo esci/entra
window.addEventListener('hashchange', () => instradaCorrente && instradaCorrente());

let api;
try { api = await creaApiAtleta(); } catch (e) { svuota(radice, h('p', { class: 'gc-errore', style: 'padding:24px', testo: messaggioErrore(e) })); }
if (api) {
  const atleta = await api.sessione().catch(() => null);
  atleta ? avviaApp(atleta) : mostraAccesso();
}

// ================================================================ accesso
function mostraAccesso() {
  let modo = 'accesso';
  const errore = h('p', { class: 'gc-errore', role: 'alert' });
  const email = h('input', { id: 'at-email', type: 'email', autocomplete: 'email', required: true });
  const pw = h('input', { id: 'at-pw', type: 'password', autocomplete: 'current-password', required: true });
  const codice = h('input', { id: 'at-codice', autocomplete: 'one-time-code', inputmode: 'text', maxlength: '9', placeholder: 'XXXX-XXXX' });
  codice.addEventListener('input', () => {
    const pulito = codice.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    codice.value = pulito.length > 4 ? formattaCodice(pulito) : pulito;
  });
  const campoCodice = h('label', { class: 'gc-campo', for: 'at-codice' }, ['Codice del tuo trainer', codice]);
  const invio = h('button', { class: 'gc-btn gc-btn-primario', type: 'submit' });
  const spiegazione = h('p', { class: 'gc-tenue' });
  const schede = h('div', { class: 'at-schede-accesso', role: 'tablist' });

  const aggiorna = () => {
    campoCodice.hidden = modo === 'accesso';
    codice.required = modo !== 'accesso';
    invio.textContent = modo === 'accesso' ? 'Entra' : 'Attiva il mio accesso';
    pw.autocomplete = modo === 'accesso' ? 'current-password' : 'new-password';
    pw.placeholder = modo === 'accesso' ? '' : 'Almeno 8 caratteri';
    spiegazione.textContent = modo === 'accesso'
      ? 'Entra per vedere la tua scheda e registrare gli allenamenti.'
      : 'Il tuo trainer ti ha dato un codice di 8 caratteri: inseriscilo e scegli email e password.';
    errore.textContent = '';
    svuota(schede, [['accesso', 'Entra'], ['primo', 'Primo accesso']].map(([k, t]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(modo === k), testo: t, onclick: () => { modo = k; aggiorna(); } })));
  };

  const form = h('form', {}, [
    campoCodice,
    h('label', { class: 'gc-campo', for: 'at-email' }, ['Email', email]),
    h('label', { class: 'gc-campo', for: 'at-pw' }, ['Password', pw]),
    errore, invio
  ]);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errore.textContent = '';
    invio.disabled = true;
    try {
      const a = modo === 'accesso' ? await api.accedi(email.value, pw.value) : await api.attiva(codice.value, email.value, pw.value);
      if (modo !== 'accesso') avviso('Accesso attivato');
      avviaApp(a);
    } catch (x) { errore.textContent = messaggioErrore(x); }
    invio.disabled = false;
  });
  aggiorna();

  svuota(radice, h('main', { class: 'at-accesso' }, [
    h('span', { class: 'at-marchio', testo: 'GymCoach' }),
    h('h1', { testo: 'La tua scheda di allenamento' }),
    spiegazione, schede, form,
    api.esempio ? h('div', { class: 'at-demo' }, [
      h('p', {}, [h('strong', { testo: 'Demo. ' }), 'Atleta di esempio: ', h('code', { testo: api.esempio.email }), ' / ', h('code', { testo: api.esempio.password })]),
      h('button', { class: 'gc-btn', type: 'button', testo: 'Entra come atleta di esempio', onclick: () => {
        modo = 'accesso'; aggiorna(); email.value = api.esempio.email; pw.value = api.esempio.password; form.requestSubmit();
      } }),
      h('p', { class: 'gc-tenue gc-piccolo', testo: 'Per provare il primo accesso: nell’app del trainer apri un atleta e premi "Invita all’app".' }),
      h('a', { class: 'gc-link gc-piccolo', href: '../index.html', testo: 'Torna all’elenco delle interfacce' })
    ]) : null
  ]));
}

// ================================================================ app
async function avviaApp(atleta) {
  const stato = { atleta, programma: null, personali: [], sedute: [] };
  const main = h('main', { class: 'at' });
  const tab = h('nav', { class: 'at-tab', 'aria-label': 'Sezioni' });
  svuota(radice, main, tab);

  async function carica() {
    const [{ programma, esercizi }, sedute] = await Promise.all([api.programma(), api.sedute()]);
    Object.assign(stato, { programma, personali: esercizi, sedute });
  }

  async function instrada() {
    const r = location.hash.slice(1) || 'oggi';
    svuota(tab, [['oggi', 'Oggi'], ['scheda', 'Scheda'], ['progressi', 'Progressi']].map(([k, t]) =>
      h('a', { href: '#' + k, 'aria-current': r === k ? 'page' : null }, [h('span', { html: ICONE[k] }), t])));
    window.scrollTo(0, 0);
    try {
      if (r === 'scheda') vistaScheda();
      else if (r === 'progressi') vistaProgressi();
      else vistaOggi();
    } catch (e) { svuota(main, h('p', { class: 'gc-errore', testo: messaggioErrore(e) })); }
  }
  instradaCorrente = instrada;

  const testa = (titolo, sotto) => h('header', { class: 'at-testa' }, [
    h('div', {}, [h('h1', { testo: titolo }), sotto ? h('p', { testo: sotto }) : null]),
    h('button', { class: 'gc-link', type: 'button', testo: 'Esci', onclick: async () => { await api.esci(); instradaCorrente = null; location.hash = ''; mostraAccesso(); } })
  ]);

  function allena(seduta) {
    apriAllenamento({
      titolo: seduta.nome, seduta, programmaId: stato.programma.id,
      precedenti: stato.sedute, personali: stato.personali,
      salva: dati => api.registraSeduta(dati),
      alSalvato: async r => {
        avviso(`Allenamento salvato: ${r.serie} serie. Il tuo trainer lo vede subito.`);
        await carica(); instrada();
      }
    });
  }

  const sedutaFattaIl = iso => stato.sedute.some(s => s.data === iso);

  // ---------------------------------------------------------------- oggi
  function vistaOggi() {
    const oggi = new Date();
    const nome = stato.atleta.nome.split(' ')[0];
    const p = stato.programma;
    if (!p) {
      svuota(main, testa(`Ciao ${nome}`, stato.atleta.trainerNome ? `Trainer: ${stato.atleta.trainerNome}` : ''),
        h('section', { class: 'at-oggi riposo' }, [
          h('h2', { testo: 'La tua scheda non e’ ancora pronta' }),
          h('p', { testo: 'Appena il tuo trainer la attiva, la trovi qui.' })
        ]));
      return;
    }
    // settimana corrente, da lunedi'
    const lunedi = new Date(oggi); lunedi.setDate(oggi.getDate() - indiceGiorno(oggi));
    const giorni = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunedi); d.setDate(lunedi.getDate() + i); return d; });
    const settimana = h('div', { class: 'at-settimana', 'aria-label': 'Questa settimana' }, giorni.map((d, i) => {
      const previsto = p.scheda.sessioni.some(s => s.giornoSuggerito === i);
      const fatto = sedutaFattaIl(isoData(d));
      return h('div', { class: ['at-giorno', previsto ? 'previsto' : '', fatto ? 'fatto' : '', isoData(d) === isoData(oggi) ? 'oggi' : ''].join(' '),
        title: fatto ? 'Allenamento fatto' : previsto ? 'Allenamento previsto' : 'Riposo' }, [GIORNI[i], h('b', { testo: d.getDate() }), h('i')]);
    }));

    const seduta = sedutaDelGiorno(p, oggi);
    const fattaOggi = sedutaFattaIl(isoData(oggi));
    let card;
    if (seduta && !fattaOggi) {
      card = h('section', { class: 'at-oggi' }, [
        h('small', { testo: `Oggi · ~${seduta.durataStimata} min` }),
        h('h2', { testo: seduta.nome }),
        h('div', { class: 'at-anteprima-es' }, seduta.esercizi.map(e => h('span', { testo: e.nome }))),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Inizia allenamento', onclick: () => allena(seduta) })
      ]);
    } else if (fattaOggi) {
      const ultima = stato.sedute.filter(s => s.data === isoData(oggi)).at(-1);
      card = h('section', { class: 'at-oggi fatto' }, [
        h('small', { testo: 'Oggi' }),
        h('h2', { testo: 'Allenamento fatto ✓' }),
        h('p', { testo: `${ultima.nomeSessione || 'Seduta'}: ${ultima.esercizi.length} esercizi, ${ultima.esercizi.reduce((t, e) => t + e.serie.length, 0)} serie.` })
      ]);
    } else {
      const prossima = [1, 2, 3, 4, 5, 6, 7].map(n => { const d = new Date(oggi); d.setDate(oggi.getDate() + n); return { d, s: sedutaDelGiorno(p, d) }; }).find(x => x.s);
      card = h('section', { class: 'at-oggi riposo' }, [
        h('small', { testo: 'Oggi' }),
        h('h2', { testo: 'Giorno di recupero' }),
        prossima ? h('p', { testo: `Prossimo allenamento ${GIORNI_LUNGHI[indiceGiorno(prossima.d)]}: ${prossima.s.nome}.` }) : null,
        h('button', { class: 'gc-btn', type: 'button', testo: 'Allenati comunque', onclick: () => { location.hash = 'scheda'; } })
      ]);
    }

    const ultima = stato.sedute.at(-1);
    svuota(main,
      testa(`Ciao ${nome}`, `${p.nome}${stato.atleta.trainerNome ? ` · trainer ${stato.atleta.trainerNome}` : ''}`),
      settimana, card,
      ultima ? h('section', { class: 'at-sez' }, [
        h('h2', { testo: 'Ultimo allenamento' }),
        h('div', { class: 'at-storico' }, h('div', {}, [h('span', { testo: ultima.nomeSessione || 'Seduta' }), h('small', { testo: `${dataBreve(ultima.data)} · ${quanto(giorniDa(ultima.data))}` })]))
      ]) : null
    );
  }

  // ---------------------------------------------------------------- scheda
  function vistaScheda() {
    const p = stato.programma;
    if (!p) { svuota(main, testa('La tua scheda'), h('p', { class: 'gc-tenue', testo: 'Il tuo trainer non ha ancora attivato una scheda.' })); return; }
    const oggi = indiceGiorno();
    svuota(main,
      testa('La tua scheda', `${p.nome} · aggiornata il ${dataBreve(p.aggiornatoIl)}`),
      ...p.scheda.sessioni.map(s => h('section', { class: 'at-card' }, [
        h('div', { class: 'at-card-testa' }, [h('h3', { testo: s.nome }), h('span', { testo: `${GIORNI[s.giornoSuggerito] ?? ''} · ~${s.durataStimata} min` })]),
        ...s.esercizi.map(v => h('button', { class: 'at-es', type: 'button', onclick: () => { const es = trova(v.esercizioId, stato.personali); es && apriSchedaTecnica(es); } }, [
          h('span', { html: miniatura(v.anim) }),
          h('div', {}, [
            h('strong', { testo: v.nome }),
            h('small', { testo: `${v.serie} × ${v.ripetizioni}${v.recupero ? ` · recupero ${v.recupero}s` : ''}` }),
            v.note ? h('em', { testo: v.note }) : null
          ]),
          h('span', { class: 'freccia', 'aria-hidden': 'true', testo: '›' })
        ])),
        h('button', { class: 'gc-btn' + (s.giornoSuggerito === oggi ? ' gc-btn-primario' : ''), type: 'button', testo: 'Allenati con questa seduta', onclick: () => allena(s) })
      ])),
      p.scheda.progressione?.length ? h('section', { class: 'at-card' }, [h('h3', { testo: 'Come progredire' }), h('ul', { style: 'margin:0;padding-left:18px;display:grid;gap:4px' }, p.scheda.progressione.map(t => h('li', { testo: t })))]) : null
    );
  }

  // ---------------------------------------------------------------- progressi
  function vistaProgressi() {
    const sedute = stato.sedute;
    if (!sedute.length) { svuota(main, testa('I tuoi progressi'), h('p', { class: 'gc-tenue', testo: 'Dopo il primo allenamento registrato qui trovi carichi e costanza.' })); return; }
    const ader = aderenza(sedute, stato.programma);
    const frequenza = {};
    for (const s of sedute) for (const e of s.esercizi) frequenza[e.esercizioId] = (frequenza[e.esercizioId] || 0) + 1;
    const principali = Object.entries(frequenza).sort((a, b) => b[1] - a[1]).map(([id]) => ({ id, punti: andamento(sedute, id) }))
      .filter(x => x.punti.some(p => p.max > 0)).slice(0, 4);
    const nomeDi = id => sedute.flatMap(s => s.esercizi).find(e => e.esercizioId === id)?.nome || id;
    const settimana = sedute.filter(s => giorniDa(s.data) < 7).length;
    svuota(main,
      testa('I tuoi progressi', `${sedute.length} allenamenti registrati`),
      h('div', { class: 'at-numeri' }, [
        h('div', {}, [h('b', { testo: settimana }), h('span', { testo: 'negli ultimi 7 giorni' })]),
        h('div', {}, [h('b', { testo: ader === null ? '—' : Math.round(ader * 100) + '%' }), h('span', { testo: 'costanza, ultime 4 settimane' })]),
        h('div', {}, [h('b', { testo: sedute.length }), h('span', { testo: 'allenamenti in tutto' })])
      ]),
      h('section', { class: 'at-sez' }, [h('h2', { testo: 'Carichi' }), ...principali.map(({ id, punti }) => {
        const delta = punti.at(-1).max - punti[0].max;
        return h('div', { class: 'at-card at-andamento' }, [
          h('h3', { testo: nomeDi(id) }),
          h('p', {}, [`${kg(punti[0].max)} → ${kg(punti.at(-1).max)} `, delta > 0 ? h('span', { class: 'su', testo: `+${String(delta).replace('.', ',')} kg` }) : null]),
          grafico(punti.map(p => ({ data: p.data, valore: p.max })), { altezza: 100 })
        ]);
      })]),
      h('section', { class: 'at-sez' }, [h('h2', { testo: 'Allenamenti' }), h('div', { class: 'at-storico' }, [...sedute].reverse().slice(0, 12).map(s =>
        h('div', {}, [h('span', { testo: s.nomeSessione || 'Seduta' }), h('small', { testo: `${dataBreve(s.data)} · ${s.origine === 'atleta' ? 'registrato da te' : 'con il trainer'}` })])))])
    );
  }

  try { await carica(); } catch (e) { svuota(main, h('p', { class: 'gc-errore', testo: messaggioErrore(e) })); return; }
  instrada();
}
