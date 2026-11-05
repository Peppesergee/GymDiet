// Interfaccia 3 · Builder: editor di schede. Libreria a sinistra, tavolo di
// lavoro al centro (trascina per aggiungere e riordinare), a destra
// l'anteprima di come la vedra' l’atleta sul telefono.
import { avvia } from '../core/avvio.js';
import { h, svuota, avviso, chiediConferma } from '../core/dom.js';
import { bozzaProgramma, programmaAttivo, catalogo, cerca, trova, GRUPPI, messaggioErrore } from '../core/servizi.js';
import { apriSchedaTecnica, scegliEsercizio, creaEsercizio } from '../core/esercizi-ui.js';
import { creaAnimazione, miniatura } from '../../shared/anim.js';
import { aggiungiEsercizio, sostituisciEsercizio, rimuoviEsercizio, spostaEsercizio, modificaVoce, schedaVuota } from '../../shared/programmi.js';
import { apriNuovaScheda, ordinaSchede, STATI } from '../core/schede-ui.js';
import { GIORNI } from '../../shared/modello.js';

avvia(document.getElementById('app'), async ctx => {
  const atleti = await ctx.api.elencoAtleti();
  const stato = {
    atleta: null, programma: null, scheda: null, nome: '', statoProg: 'bozza',
    giorno: 0, sporco: false, gruppo: null, q: '', anteprimaIdx: 0, vista: 'tavolo'
  };
  let animAnteprima = null;

  // ------------------------------------------------------------ struttura
  const selAtleta = h('select', { id: 'bd-atleta', 'aria-label': 'Atleta' }, atleti.map(c => h('option', { value: c.id, testo: c.nome })));
  const selScheda = h('select', { id: 'bd-scheda', 'aria-label': 'Scheda da modificare' });
  const inNome = h('input', { class: 'bd-nome', id: 'bd-nome', 'aria-label': 'Nome della scheda', placeholder: 'Nome della scheda' });
  const selStato = h('select', { id: 'bd-stato', 'aria-label': 'Stato' }, [h('option', { value: 'bozza', testo: 'Bozza (l’atleta non la vede)' }), h('option', { value: 'attivo', testo: 'Attiva (l’atleta la vede)' }), h('option', { value: 'archiviato', testo: 'Archiviata' })]);
  const indicatore = h('span', { class: 'bd-stato-salva' });
  const btnSalva = h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Salva' });
  const colLib = h('section', { class: 'bd-col bd-col-lib', 'aria-label': 'Libreria esercizi' });
  const colTavolo = h('section', { class: 'bd-col bd-col-tavolo', 'aria-label': 'Programma' });
  const colAnteprima = h('section', { class: 'bd-col bd-col-anteprima', 'aria-label': 'Anteprima atleta' });
  const colonne = h('div', { class: 'bd-colonne', 'data-vista': stato.vista }, [colLib, colTavolo, colAnteprima]);
  const segmenti = h('div', { class: 'bd-segmenti', role: 'group', 'aria-label': 'Vista' });

  ctx.radice.append(h('div', { class: 'bd' }, [
    h('header', { class: 'bd-barra' }, [
      h('div', { class: 'bd-marchio', html: 'GymCoach <span>Builder</span>' }),
      selAtleta, selScheda,
      h('button', { class: 'gc-btn', type: 'button', testo: '+ Nuova scheda', onclick: nuovaScheda }),
      inNome, selStato, indicatore,
      btnSalva
    ]),
    segmenti, colonne
  ]));

  function disegnaSegmenti() {
    svuota(segmenti, [['libreria', 'Libreria'], ['tavolo', 'Scheda'], ['anteprima', 'Anteprima']].map(([k, t]) =>
      h('button', { type: 'button', 'aria-pressed': String(stato.vista === k), testo: t, onclick: () => { stato.vista = k; colonne.dataset.vista = k; disegnaSegmenti(); if (k === 'anteprima') disegnaAnteprima(); } })));
  }

  const segnaSporco = (v = true) => {
    stato.sporco = v;
    indicatore.textContent = v ? 'Modifiche non salvate' : (stato.programma ? 'Salvata' : '');
    indicatore.classList.toggle('sporco', v);
  };
  const cambia = nuova => { stato.scheda = nuova; segnaSporco(); disegnaTavolo(); disegnaAnteprima(); };

  // ------------------------------------------------------------ dati
  async function caricaAtleta(id, programmaId) {
    stato.atleta = await ctx.api.leggiAtleta(id);
    stato.programmi = ordinaSchede(await ctx.api.programmi(id));
    const p = stato.programmi.find(x => x.id === programmaId) || stato.programmi[0] || null;
    svuota(selScheda, stato.programmi.length
      ? stato.programmi.map(x => h('option', { value: x.id, selected: x === p, testo: `${STATI[x.stato]} · ${x.nome}` }))
      : h('option', { value: '', testo: 'Nessuna scheda' }));
    selScheda.disabled = !p; inNome.disabled = !p; selStato.disabled = !p; btnSalva.disabled = !p;
    stato.programma = p;
    stato.scheda = p ? structuredClone(p.scheda) : null;
    stato.nome = p ? p.nome : '';
    stato.statoProg = p ? p.stato : 'bozza';
    stato.giorno = 0; stato.anteprimaIdx = 0;
    inNome.value = stato.nome; selStato.value = stato.statoProg;
    segnaSporco(false);
    disegnaTavolo(); disegnaAnteprima();
  }

  const conferma = async testo => !stato.sporco || chiediConferma(testo, { si: 'Continua' });

  async function nuovaScheda() {
    if (!await conferma('Ci sono modifiche non salvate alla scheda aperta. Continuare senza salvarle?')) return;
    const p = await apriNuovaScheda(ctx, stato.atleta, stato.programmi);
    if (p) caricaAtleta(stato.atleta.id, p.id);
  }

  btnSalva.onclick = async () => {
    if (!stato.programma) return;
    btnSalva.disabled = true;
    const dati = { nome: inNome.value.trim() || 'Scheda', stato: selStato.value, scheda: stato.scheda };
    try {
      const agg = await ctx.api.aggiornaProgramma(stato.programma.id, dati);
      avviso(dati.stato === 'attivo' ? `Scheda attiva: ${stato.atleta.nome.split(' ')[0]} la vede subito` : dati.stato === 'bozza' ? 'Bozza salvata' : 'Scheda salvata');
      await caricaAtleta(stato.atleta.id, agg.id);   // l'attivazione puo' aver archiviato un'altra scheda
    } catch (e) { avviso(messaggioErrore(e), 'errore'); }
    btnSalva.disabled = !stato.programma;
  };
  selScheda.onchange = async () => {
    if (!await conferma('Ci sono modifiche non salvate. Aprire un’altra scheda senza salvarle?')) { selScheda.value = stato.programma.id; return; }
    caricaAtleta(stato.atleta.id, selScheda.value);
  };
  inNome.oninput = () => segnaSporco();
  selStato.onchange = () => segnaSporco();
  selAtleta.onchange = async () => {
    if (stato.sporco && !await chiediConferma('Ci sono modifiche non salvate. Cambiare atleta comunque?', { si: 'Cambia' })) {
      selAtleta.value = stato.atleta.id; return;
    }
    caricaAtleta(selAtleta.value);
  };

  // ------------------------------------------------------------ libreria
  const listaLib = h('div', { class: 'bd-lib' });
  function disegnaLibreria() {
    const base = stato.q.length >= 2 ? cerca(stato.q, ctx.personali) : catalogo(ctx.personali);
    const lista = base.filter(e => !stato.gruppo || e.gruppo === stato.gruppo);
    svuota(listaLib, lista.map(e => {
      const voce = h('div', { class: 'bd-lib-voce', draggable: 'true', title: 'Trascina nella scheda' }, [
        h('span', { html: miniatura(e.anim) }),
        h('div', { onclick: () => apriSchedaTecnica(e), style: 'cursor:pointer' }, [h('strong', { testo: e.nome }), h('small', { testo: (GRUPPI[e.gruppo]?.nome || '') + (e.personalizzato ? ' · personale' : '') })]),
        h('button', { class: 'bd-piu', type: 'button', 'aria-label': `Aggiungi ${e.nome}`, testo: '+', onclick: () => aggiungi(e) })
      ]);
      voce.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/gc-esercizio', e.id); ev.dataTransfer.effectAllowed = 'copy'; });
      return voce;
    }));
    listaLib.append(h('button', { class: 'gc-btn', type: 'button', style: 'margin-top:8px', testo: stato.q.length >= 2 ? `Non c'e'? Crea "${stato.q}"` : '+ Nuovo esercizio', onclick: async () => {
      const e = await creaEsercizio(ctx, stato.q);
      if (e) { aggiungi(e); disegnaLibreria(); }
    } }));
  }
  const chips = h('div', { class: 'gc-chips', style: 'margin-top:8px' }, [[null, 'Tutti'], ...Object.entries(GRUPPI).map(([k, v]) => [k, v.nome])].map(([k, t]) =>
    h('button', { class: 'gc-chip', type: 'button', 'aria-pressed': String(k === stato.gruppo), testo: t, onclick: ev => {
      stato.gruppo = k; chips.querySelectorAll('.gc-chip').forEach(b => b.setAttribute('aria-pressed', String(b === ev.currentTarget))); disegnaLibreria();
    } })));
  colLib.append(
    h('h2', { testo: 'Libreria' }),
    h('input', { class: 'gc-input', id: 'bd-cerca', type: 'search', placeholder: 'Cerca esercizio', oninput: e => { stato.q = e.target.value.trim(); disegnaLibreria(); } }),
    chips, listaLib
  );

  function aggiungi(es, posizione) {
    cambia(aggiungiEsercizio(stato.scheda, stato.giorno, es, stato.atleta.obiettivo, posizione));
    avviso(`${es.nome} aggiunto a ${stato.scheda.sessioni[stato.giorno].nome}`);
  }

  // ------------------------------------------------------------ tavolo
  let trascinoDa = null;
  function disegnaTavolo() {
    if (!stato.scheda) {
      svuota(colTavolo, h('div', { class: 'bd-vuoto' }, [
        h('p', { testo: `${stato.atleta.nome} non ha ancora nessuna scheda.` }),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: '+ Crea la prima scheda', onclick: nuovaScheda })
      ]));
      return;
    }
    const sessioni = stato.scheda.sessioni;
    if (stato.giorno >= sessioni.length) stato.giorno = 0;
    const s = sessioni[stato.giorno];
    const traccia = h('div', { class: 'bd-traccia' });

    traccia.addEventListener('dragover', ev => { ev.preventDefault(); traccia.classList.add('sopra'); });
    traccia.addEventListener('dragleave', ev => { if (!traccia.contains(ev.relatedTarget)) traccia.classList.remove('sopra'); });
    traccia.addEventListener('drop', ev => {
      ev.preventDefault(); traccia.classList.remove('sopra');
      const id = ev.dataTransfer.getData('text/gc-esercizio');
      const bersaglio = ev.target.closest('.bd-blocco');
      const pos = bersaglio ? Number(bersaglio.dataset.i) : s.esercizi.length;
      if (id) { const es = trova(id, ctx.personali); if (es) aggiungi(es, pos); return; }
      if (trascinoDa !== null) {
        const a = Math.min(pos, s.esercizi.length - 1);
        if (a !== trascinoDa) cambia(spostaEsercizio(stato.scheda, stato.giorno, trascinoDa, a));
        trascinoDa = null;
      }
    });

    s.esercizi.forEach((v, i) => {
      const num = (campo, etic, valore, classe = '') => h('label', {}, [etic, h('input', {
        class: classe, value: valore, inputmode: campo === 'ripetizioni' ? 'text' : 'numeric', 'aria-label': `${etic} ${v.nome}`,
        onchange: e => cambia(modificaVoce(stato.scheda, stato.giorno, i, { [campo]: campo === 'ripetizioni' ? e.target.value : Number(e.target.value) || 0 }))
      })]);
      const blocco = h('div', { class: 'bd-blocco', dataset: { i } }, [
        h('span', { class: 'bd-maniglia', 'aria-hidden': 'true', testo: '⋮⋮' }),
        h('span', { html: miniatura(v.anim) }),
        h('div', { class: 'bd-blocco-nome' }, [
          h('strong', { testo: `${i + 1}. ${v.nome}` }),
          h('input', { value: v.note || '', placeholder: 'Nota per l’atleta (es. presa stretta)', 'aria-label': `Nota ${v.nome}`, onchange: e => cambia(modificaVoce(stato.scheda, stato.giorno, i, { note: e.target.value })) })
        ]),
        h('div', { class: 'bd-numeri' }, [num('serie', 'serie', v.serie), num('ripetizioni', 'rip', v.ripetizioni, 'rip'), num('recupero', 'rec', v.recupero)]),
        h('div', { class: 'bd-strumenti' }, [
          h('button', { type: 'button', testo: 'Come si fa', onclick: () => { const es = trova(v.esercizioId, ctx.personali); es && apriSchedaTecnica(es); } }),
          h('button', { type: 'button', testo: 'Sostituisci', onclick: async () => {
            const nuovo = await scegliEsercizio(ctx, { titolo: `Sostituisci ${v.nome}` });
            if (nuovo) cambia(sostituisciEsercizio(stato.scheda, stato.giorno, i, nuovo));
          } }),
          h('button', { type: 'button', testo: '↑', 'aria-label': 'Sposta su', disabled: i === 0, onclick: () => cambia(spostaEsercizio(stato.scheda, stato.giorno, i, i - 1)) }),
          h('button', { type: 'button', testo: '↓', 'aria-label': 'Sposta giu', disabled: i === s.esercizi.length - 1, onclick: () => cambia(spostaEsercizio(stato.scheda, stato.giorno, i, i + 1)) }),
          h('button', { type: 'button', testo: 'Rimuovi', onclick: () => cambia(rimuoviEsercizio(stato.scheda, stato.giorno, i)) })
        ])
      ]);
      const maniglia = blocco.querySelector('.bd-maniglia');
      maniglia.addEventListener('mousedown', () => { blocco.draggable = true; });
      blocco.addEventListener('dragstart', ev => { trascinoDa = i; blocco.classList.add('trascinato'); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(i)); });
      blocco.addEventListener('dragend', () => { blocco.draggable = false; blocco.classList.remove('trascinato'); });
      blocco.addEventListener('dragenter', () => blocco.classList.add('bersaglio'));
      blocco.addEventListener('dragleave', ev => { if (!blocco.contains(ev.relatedTarget)) blocco.classList.remove('bersaglio'); });
      blocco.addEventListener('drop', () => blocco.classList.remove('bersaglio'));
      traccia.append(blocco);
    });
    if (!s.esercizi.length) traccia.append(h('p', { class: 'bd-vuoto', testo: 'Trascina qui gli esercizi dalla libreria, oppure usa il + accanto a ciascuno.' }));

    const totSerie = s.esercizi.reduce((t, v) => t + (Number(v.serie) || 0), 0);
    const gruppi = [...new Set(s.esercizi.map(v => GRUPPI[v.gruppo]?.nome).filter(Boolean))];
    svuota(colTavolo,
      h('h2', { testo: `Scheda di ${stato.atleta.nome}` }),
      h('div', { class: 'bd-giorni', role: 'tablist' }, [
        ...sessioni.map((x, i) => h('button', { class: 'bd-giorno', role: 'tab', type: 'button', 'aria-selected': String(i === stato.giorno), onclick: () => { stato.giorno = i; stato.anteprimaIdx = 0; disegnaTavolo(); disegnaAnteprima(); } }, [x.nome, h('small', { testo: GIORNI[x.giornoSuggerito] ?? '' })])),
        sessioni.length < 7 ? h('button', { class: 'bd-giorno', type: 'button', testo: '+ Giorno', onclick: () => {
          const nuova = structuredClone(stato.scheda);
          const usati = new Set(nuova.sessioni.map(x => x.giornoSuggerito));
          const libero = [0, 1, 2, 3, 4, 5, 6].find(g => !usati.has(g));
          nuova.sessioni.push({ ...schedaVuota([libero]).sessioni[0], id: 'giorno-' + Date.now().toString(36), nome: 'Giorno ' + String.fromCharCode(65 + nuova.sessioni.length) });
          stato.giorno = nuova.sessioni.length - 1; cambia(nuova);
        } }) : null
      ]),
      h('div', { class: 'bd-intesta' }, [
        h('label', { class: 'gc-campo' }, ['Nome della seduta', h('input', { id: 'bd-nome-seduta', value: s.nome, onchange: e => { const n = structuredClone(stato.scheda); n.sessioni[stato.giorno].nome = e.target.value || s.nome; cambia(n); } })]),
        h('label', { class: 'gc-campo' }, ['Giorno', h('select', { id: 'bd-giorno-sett', onchange: e => { const n = structuredClone(stato.scheda); n.sessioni[stato.giorno].giornoSuggerito = Number(e.target.value); cambia(n); } },
          GIORNI.map((g, i) => h('option', { value: i, selected: i === s.giornoSuggerito, testo: g })))]),
        sessioni.length > 1 ? h('button', { class: 'gc-btn', type: 'button', testo: 'Elimina seduta', onclick: async () => {
          if (!await chiediConferma(`Eliminare la seduta "${s.nome}" dal programma?`, { si: 'Elimina', pericolo: true })) return;
          const n = structuredClone(stato.scheda); n.sessioni.splice(stato.giorno, 1); stato.giorno = 0; cambia(n);
        } }) : null
      ]),
      traccia,
      h('div', { class: 'bd-sommario' }, [
        h('span', {}, [h('b', { testo: s.esercizi.length }), ' esercizi']),
        h('span', {}, [h('b', { testo: totSerie }), ' serie']),
        h('span', {}, ['~', h('b', { testo: s.durataStimata }), ' min']),
        gruppi.length ? h('span', { testo: gruppi.join(', ') }) : null
      ])
    );
  }

  // ------------------------------------------------------------ anteprima
  function disegnaAnteprima() {
    if (animAnteprima) { animAnteprima.destroy(); animAnteprima = null; }
    if (!stato.scheda) { svuota(colAnteprima); return; }
    const s = stato.scheda.sessioni[stato.giorno];
    const corrente = s.esercizi[stato.anteprimaIdx] || s.esercizi[0];
    const box = corrente ? h('div', { class: 'anim-box' }) : null;
    svuota(colAnteprima, h('div', { class: 'bd-anteprima' }, [
      h('h2', { testo: 'Cosa vede l’atleta nella sua app' }),
      h('div', { class: 'bd-telefono' }, h('div', { class: 'bd-schermo' }, [
        h('div', { class: 'bd-schermo-testa' }, [h('small', { testo: `${GIORNI[s.giornoSuggerito] ?? ''} · ~${s.durataStimata} min` }), h('h3', { testo: s.nome })]),
        box,
        corrente ? h('p', { class: 'bd-schermo-nota', testo: corrente.note ? `Nota del trainer: ${corrente.note}` : `${corrente.nome}: ${corrente.serie} × ${corrente.ripetizioni}` }) : h('p', { class: 'bd-schermo-nota', testo: 'Nessun esercizio in questa seduta.' }),
        ...s.esercizi.map((v, i) => h('button', { class: 'bd-schermo-voce' + (v === corrente ? ' attiva' : ''), type: 'button', onclick: () => { stato.anteprimaIdx = i; disegnaAnteprima(); } }, [
          h('span', { html: miniatura(v.anim) }),
          h('span', {}, [h('strong', { testo: v.nome }), h('small', { testo: `${v.serie} × ${v.ripetizioni}${v.recupero ? ` · ${v.recupero}s` : ''}` })])
        ]))
      ])),
      h('p', { class: 'bd-didascalia', testo: { attivo: 'Scheda attiva: l’atleta la vede così nella sua app.', bozza: 'Bozza: l’atleta non la vede finché non la attivi e salvi.', archiviato: 'Archiviata: l’atleta non la vede.' }[stato.statoProg] })
    ]));
    if (box) animAnteprima = creaAnimazione(box, corrente.anim, { durata: 2800 });
  }

  // ------------------------------------------------------------ via
  disegnaSegmenti();
  disegnaLibreria();
  if (!atleti.length) { svuota(colTavolo, h('p', { class: 'bd-vuoto', testo: 'Aggiungi un atleta da Studio o Campo per iniziare.' })); return; }
  // da Studio si arriva con #atleta-<id>
  const daHash = location.hash.startsWith('#atleta-') ? location.hash.slice(8) : null;
  const iniziale = atleti.find(a => a.id === daHash) || atleti[0];
  selAtleta.value = iniziale.id;
  await caricaAtleta(iniziale.id);
  window.addEventListener('beforeunload', ev => { if (stato.sporco) { ev.preventDefault(); ev.returnValue = ''; } });
});
