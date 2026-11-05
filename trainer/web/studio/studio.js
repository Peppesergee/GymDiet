// Interfaccia 1 · Studio: gestionale da scrivania per il trainer.
import { avvia } from '../core/avvio.js';
import { h, svuota, avviso, finestra, chiediConferma, dataBreve, quanto, iniziali, grafico, kg } from '../core/dom.js';
import { bozzaProgramma, programmaAttivo, statoAtleta, catalogo, trova, GRUPPI, OBIETTIVI, messaggioErrore } from '../core/servizi.js';
import { formAtleta } from '../core/form-atleta.js';
import { apriSchedaTecnica, scegliEsercizio, creaEsercizio } from '../core/esercizi-ui.js';
import { apriInvito, statoApp } from '../core/invito-ui.js';
import { miniatura } from '../../shared/anim.js';
import { aggiungiEsercizio, sostituisciEsercizio, rimuoviEsercizio, spostaEsercizio, modificaVoce, candidatiPer, aggiungiGiorno, rimuoviGiorno, modificaGiorno } from '../../shared/programmi.js';
import { apriNuovaScheda, ordinaSchede, STATI } from '../core/schede-ui.js';
import { andamento, giorniDa, ultimoCarico, isoData } from '../../shared/progressi.js';
import { GIORNI, ESPERIENZE } from '../../shared/modello.js';

avvia(document.getElementById('app'), async ctx => {
  const nav = h('nav', { class: 'st-nav', 'aria-label': 'Sezioni' });
  const main = h('main', { class: 'st-main' });
  ctx.radice.append(h('div', { class: 'st' }, [nav, main]));

  const voci = [['atleti', 'Atleti'], ['esercizi', 'Esercizi']];
  function disegnaNav(attiva) {
    svuota(nav,
      h('div', { class: 'st-marchio', html: 'GymCoach<small>Studio</small>' }),
      voci.map(([id, t]) => h('a', { href: '#' + id, 'aria-current': attiva === id ? 'page' : null, testo: t })),
      h('div', { class: 'st-utente' }, [h('span', { testo: ctx.trainer.nome }), h('button', { class: 'gc-link', type: 'button', testo: 'Esci', onclick: ctx.esci })])
    );
  }

  async function instrada() {
    const hash = location.hash.slice(1) || 'atleti';
    window.scrollTo(0, 0);
    try {
      if (hash.startsWith('atleta-')) { disegnaNav('atleti'); await vistaAtleta(hash.slice(7)); }
      else if (hash === 'esercizi') { disegnaNav('esercizi'); vistaEsercizi(); }
      else { disegnaNav('atleti'); await vistaAtleti(); }
    } catch (e) {
      svuota(main, h('p', { class: 'gc-errore', testo: messaggioErrore(e) }), h('a', { href: '#atleti', testo: 'Torna agli atleti' }));
    }
  }
  window.addEventListener('hashchange', instrada);

  // -------------------------------------------------------------- atleti
  let filtro = 'tutti', ricerca = '';
  async function vistaAtleti() {
    const atleti = await ctx.api.elencoAtleti();
    const conStato = atleti.map(c => ({ c, s: statoAtleta(c) }));
    const conta = k => conStato.filter(x => x.s.chiave === k).length;

    const corpo = h('tbody');
    const disegnaRighe = () => {
      const q = ricerca.toLowerCase();
      const lista = conStato.filter(({ c, s }) =>
        (filtro === 'tutti' || s.chiave === filtro) && (!q || c.nome.toLowerCase().includes(q)));
      svuota(corpo, lista.length ? lista.map(({ c, s }) => h('tr', { onclick: () => { location.hash = 'atleta-' + c.id; } }, [
        h('td', {}, h('div', { class: 'st-persona' }, [h('span', { class: 'st-avatar', testo: iniziali(c.nome) }), h('div', {}, [h('a', { href: '#atleta-' + c.id, testo: c.nome, style: 'color:inherit;font-weight:650;text-decoration:none' }), h('small', { testo: c.email || c.telefono || '' })])])),
        h('td', { class: 'col-ob', testo: OBIETTIVI[c.obiettivo] || c.obiettivo }),
        h('td', { class: 'col-prog', testo: c.programmaAttivo ? c.programmaAttivo.nome : '—' }),
        h('td', { class: 'col-ultima', testo: c.ultimaSeduta ? `${dataBreve(c.ultimaSeduta)} · ${quanto(giorniDa(c.ultimaSeduta))}` : 'Nessuna seduta' }),
        h('td', { class: 'col-stato' }, h('span', { class: `gc-pill gc-pill-${s.livello}`, testo: s.etichetta }))
      ])) : h('tr', {}, h('td', { colspan: 5, class: 'gc-tenue', testo: 'Nessun atleta con questi filtri.' })));
    };
    const chip = (id, t) => h('button', { class: 'gc-chip', type: 'button', 'aria-pressed': String(filtro === id), testo: t, onclick: e => {
      filtro = id; e.currentTarget.parentNode.querySelectorAll('.gc-chip').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); disegnaRighe();
    } });

    svuota(main,
      h('div', { class: 'st-testa' }, [
        h('div', {}, [h('h1', { testo: 'Atleti' }), h('p', { class: 'gc-tenue', testo: `${atleti.length} atleti seguiti` })]),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: '+ Nuovo atleta', onclick: nuovoAtleta })
      ]),
      h('div', { class: 'st-kpi' }, [
        h('div', {}, [h('b', { testo: atleti.length - conta('senza') }), h('span', { testo: 'con scheda attiva' })]),
        h('div', {}, [h('b', { testo: conta('ok') }), h('span', { testo: 'in regola con le sedute' })]),
        h('div', { class: conta('fermo') ? 'avvisa' : '' }, [h('b', { testo: conta('fermo') }), h('span', { testo: 'da sentire (fermi da 10+ giorni)' })]),
        h('div', {}, [h('b', { testo: conta('senza') }), h('span', { testo: 'senza scheda' })])
      ]),
      h('div', { class: 'st-filtri' }, [
        h('input', { class: 'gc-input', id: 'st-cerca', type: 'search', placeholder: 'Cerca atleta', value: ricerca, oninput: e => { ricerca = e.target.value; disegnaRighe(); } }),
        h('div', { class: 'gc-chips' }, [chip('tutti', 'Tutti'), chip('fermo', 'Da sentire'), chip('senza', 'Senza scheda'), chip('nuovo', 'Da iniziare')])
      ]),
      h('table', { class: 'st-tabella' }, [
        h('thead', {}, h('tr', {}, ['Atleta', 'Obiettivo', 'Scheda attiva', 'Ultima seduta', 'Stato'].map(t => h('th', { testo: t })))),
        corpo
      ])
    );
    disegnaRighe();
  }

  function nuovoAtleta() {
    const genera = h('input', { type: 'checkbox', id: 'st-genera', checked: true });
    finestra('Nuovo atleta', chiudi => formAtleta({}, {
      etichetta: 'Crea atleta',
      extra: h('label', { class: 'gc-campo', style: 'display:flex;gap:8px;align-items:center;color:var(--gc-testo)' }, [genera, 'Prepara subito una bozza di scheda dal profilo']),
      onSalva: async dati => {
        const c = await ctx.api.creaAtleta(dati);
        if (genera.checked) await ctx.api.creaProgramma(c.id, bozzaProgramma(c, ctx.personali));
        chiudi();
        avviso(`${c.nome} aggiunto`);
        location.hash = 'atleta-' + c.id;
      }
    }));
  }

  // -------------------------------------------------------------- atleta
  let schedaAperta = 'programma';
  async function vistaAtleta(id) {
    const [atleta, programmi, sedute] = await Promise.all([ctx.api.leggiAtleta(id), ctx.api.programmi(id), ctx.api.sedute(id)]);
    const stato = statoAtleta(atleta);
    const app = statoApp(atleta);
    const contenuto = h('div');
    const schede = [['programma', `Schede (${programmi.length})`], ['storico', `Storico (${sedute.length})`], ['profilo', 'Profilo']];
    const barra = h('div', { class: 'st-schede', role: 'tablist' });
    const mostra = sch => {
      schedaAperta = sch;
      svuota(barra, schede.map(([k, t]) => h('button', { role: 'tab', type: 'button', 'aria-selected': String(k === sch), testo: t, onclick: () => mostra(k) })));
      if (sch === 'programma') svuota(contenuto, pannelloSchede(atleta, programmi, sedute));
      else if (sch === 'storico') svuota(contenuto, pannelloStorico(atleta, programmi, sedute));
      else svuota(contenuto, pannelloProfilo(atleta));
    };
    svuota(main,
      h('a', { class: 'st-indietro', href: '#atleti', testo: '← Atleti' }),
      h('div', { class: 'st-testa' }, [
        h('div', {}, [
          h('h1', { testo: atleta.nome }),
          h('p', { class: 'gc-tenue', testo: `${OBIETTIVI[atleta.obiettivo]} · ${ESPERIENZE[atleta.esperienza]} · ${atleta.giorniSettimana.map(g => GIORNI[g]).join(' ')} · ${atleta.durataSessione} min` })
        ]),
        h('div', { class: 'st-azioni-atleta' }, [
          h('span', { class: `gc-pill gc-pill-${stato.livello}`, testo: stato.etichetta }),
          h('span', { class: `gc-pill gc-pill-${app.livello}`, testo: app.etichetta }),
          h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: atleta.accountAtleta ? 'Nuovo codice app' : 'Invita all\u2019app', onclick: () => apriInvito(ctx, atleta, instrada) })
        ])
      ]),
      barra, contenuto
    );
    mostra(schedaAperta);
  }

  // scheda aperta nell'editor, per atleta (resta selezionata tra un salvataggio e l'altro)
  const selezione = {};

  function pannelloSchede(atleta, programmi, sedute) {
    const ordinate = ordinaSchede(programmi);
    let modificato = false;
    const nuova = async () => {
      if (modificato && !await chiediConferma('Ci sono modifiche non salvate alla scheda aperta. Continuare senza salvarle?', { si: 'Continua' })) return;
      const p = await apriNuovaScheda(ctx, atleta, programmi);
      if (p) { modificato = false; selezione[atleta.id] = p.id; instrada(); }
    };
    if (!ordinate.length) {
      return h('div', { class: 'st-vuoto' }, [
        h('h2', { testo: 'Ancora nessuna scheda' }),
        h('p', { class: 'gc-tenue', testo: 'Crea la prima scheda: parti da una proposta basata sul profilo dell’atleta oppure da una scheda vuota.' }),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: '+ Crea la prima scheda', onclick: nuova })
      ]);
    }

    const corrente = ordinate.find(p => p.id === selezione[atleta.id]) || ordinate[0];
    selezione[atleta.id] = corrente.id;
    let scheda = structuredClone(corrente.scheda);
    let nomeScheda = corrente.nome;

    const salva = async (stato = corrente.stato) => {
      const agg = await ctx.api.aggiornaProgramma(corrente.id, { nome: nomeScheda.trim() || 'Scheda', stato, scheda });
      Object.assign(corrente, agg);
      modificato = false;
      return agg;
    };
    const apri = async p => {
      if (p.id === corrente.id) return;
      if (modificato && !await chiediConferma('Ci sono modifiche non salvate. Aprire un’altra scheda senza salvarle?', { si: 'Apri' })) return;
      modificato = false; selezione[atleta.id] = p.id; instrada();
    };

    // ---- elenco delle schede dell'atleta
    const elenco = h('div', { class: 'st-elenco-schede' }, [
      ...ordinate.map(p => h('button', { class: 'st-scheda-voce', type: 'button', 'aria-pressed': String(p.id === corrente.id), onclick: () => apri(p) }, [
        h('span', { class: `st-stato st-stato-${p.stato}`, testo: STATI[p.stato] }),
        h('strong', { testo: p.nome }),
        h('small', { testo: `${p.scheda.sessioni.length} giorni · ${dataBreve(p.creatoIl)}` })
      ])),
      h('button', { class: 'st-scheda-voce st-scheda-nuova', type: 'button', onclick: nuova }, [h('strong', { testo: '+ Nuova scheda' }), h('small', { testo: 'dal profilo, copia o vuota' })])
    ]);

    // ---- barra di salvataggio
    const testoSalva = h('span');
    const btnSalva = h('button', { class: 'gc-btn gc-btn-primario gc-btn-piccolo', type: 'button', testo: 'Salva', onclick: async e => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await salva();
        segna(false);
        avviso(corrente.stato === 'attivo' ? 'Scheda salvata: l’atleta la vede subito' : 'Bozza salvata');
      } catch (x) { avviso(messaggioErrore(x), 'errore'); }
      btn.disabled = false;
    } });
    const barraSalva = h('div', { class: 'st-salva', hidden: true }, [
      testoSalva,
      h('div', { class: 'gc-azioni', style: 'margin:0' }, [
        h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: 'Annulla', onclick: () => { scheda = structuredClone(corrente.scheda); nomeScheda = corrente.nome; inNome.value = nomeScheda; segna(false); } }),
        btnSalva
      ])
    ]);
    const segna = (v = true) => {
      modificato = v;
      barraSalva.hidden = !v;
      testoSalva.textContent = corrente.stato === 'attivo' ? 'Modifiche non salvate · l’atleta vede ancora la versione precedente' : 'Modifiche non salvate alla bozza';
      disegna();
    };
    const cambia = nuova => { scheda = nuova; segna(true); };

    // ---- intestazione della scheda aperta
    const inNome = h('input', { class: 'st-nome-scheda', id: 'st-nome-scheda', value: nomeScheda, 'aria-label': 'Nome della scheda', oninput: e => { nomeScheda = e.target.value; if (!modificato) segna(true); } });
    const spiegazione = {
      attivo: 'Attiva: l’atleta la vede nella sua app.',
      bozza: 'Bozza: l’atleta non la vede finche’ non la attivi.',
      archiviato: 'Archiviata: e’ una scheda passata, puoi riattivarla.'
    }[corrente.stato];
    const attiva = async () => {
      const altra = ordinate.find(p => p.stato === 'attivo' && p.id !== corrente.id);
      if (!await chiediConferma(altra ? `Attivare "${nomeScheda}"? Sostituisce "${altra.nome}", che resta nello storico.` : `Attivare "${nomeScheda}"? L’atleta la vedra’ subito.`, { si: 'Attiva' })) return;
      try { await salva('attivo'); avviso('Scheda attiva: l’atleta la vede subito'); instrada(); } catch (x) { avviso(messaggioErrore(x), 'errore'); }
    };
    const azioni = [
      corrente.stato !== 'attivo' ? h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: corrente.stato === 'bozza' ? 'Attiva scheda' : 'Riattiva', onclick: attiva }) : null,
      corrente.stato === 'attivo' ? h('button', { class: 'gc-btn', type: 'button', testo: 'Registra seduta', onclick: () => registraSeduta(atleta, corrente, sedute) }) : null,
      corrente.stato !== 'attivo' ? h('button', { class: 'gc-btn', type: 'button', style: 'color:var(--gc-pericolo)', testo: 'Elimina', onclick: async () => {
        if (!await chiediConferma(`Eliminare la scheda "${corrente.nome}"? Le sedute gia’ registrate restano nello storico.`, { si: 'Elimina', pericolo: true })) return;
        await ctx.api.eliminaProgramma(corrente.id); delete selezione[atleta.id]; modificato = false; avviso('Scheda eliminata'); instrada();
      } }) : null
    ];

    // ---- giorni ed esercizi
    const zona = h('div');
    function disegna() {
      svuota(zona, h('div', { class: 'st-sedute' }, [
        ...scheda.sessioni.map((s, is) => h('article', { class: 'st-seduta' }, [
          h('header', { class: 'st-seduta-testa' }, [
            h('input', { class: 'st-nome-giorno', value: s.nome, 'aria-label': 'Nome del giorno', onchange: e => cambia(modificaGiorno(scheda, is, { nome: e.target.value.trim() || s.nome })) }),
            h('select', { class: 'st-giorno-sett', 'aria-label': `Giorno della settimana di ${s.nome}`, onchange: e => cambia(modificaGiorno(scheda, is, { giornoSuggerito: Number(e.target.value) })) },
              GIORNI.map((g, i) => h('option', { value: i, selected: i === s.giornoSuggerito, testo: g }))),
            h('span', { class: 'st-durata', testo: `~${s.durataStimata} min` }),
            scheda.sessioni.length > 1 ? h('button', { class: 'st-togli-giorno', type: 'button', title: 'Togli questo giorno', 'aria-label': `Togli ${s.nome}`, testo: '×', onclick: async () => {
              if (s.esercizi.length && !await chiediConferma(`Togliere "${s.nome}" e i suoi ${s.esercizi.length} esercizi dalla scheda?`, { si: 'Togli', pericolo: true })) return;
              cambia(rimuoviGiorno(scheda, is));
            } }) : null
          ]),
          s.esercizi.length ? null : h('p', { class: 'st-giorno-vuoto', testo: 'Nessun esercizio: aggiungine uno qui sotto.' }),
          ...s.esercizi.map((v, ie) => {
            const es = trova(v.esercizioId, ctx.personali);
            const num = (campo, valore, classe = '') => h('input', {
              class: classe, value: valore, 'aria-label': campo, inputmode: campo === 'rip' ? 'text' : 'numeric',
              onchange: e => cambia(modificaVoce(scheda, is, ie, { [campo === 'rip' ? 'ripetizioni' : campo]: campo === 'rip' ? e.target.value : Number(e.target.value) || 0 }))
            });
            return h('div', { class: 'st-voce' }, [
              h('span', { class: 'n', testo: ie + 1 }),
              h('button', { class: 'st-voce-nome', type: 'button', title: 'Come si fa', onclick: () => es && apriSchedaTecnica(es) }, [
                h('span', { html: miniatura(v.anim) }),
                h('span', { style: 'min-width:0' }, [h('strong', { testo: v.nome }), h('small', { testo: GRUPPI[v.gruppo]?.nome || '' })])
              ]),
              h('div', { class: 'st-param' }, [
                h('label', {}, ['serie', num('serie', v.serie)]),
                h('label', {}, ['rip', num('rip', v.ripetizioni, 'rip')]),
                h('label', {}, ['rec s', num('recupero', v.recupero)])
              ]),
              h('input', { class: 'st-nota', value: v.note || '', placeholder: 'Nota per l’atleta (facoltativa)', 'aria-label': `Nota per l’atleta su ${v.nome}`, onchange: e => cambia(modificaVoce(scheda, is, ie, { note: e.target.value })) }),
              h('div', { class: 'st-strumenti' }, [
                h('button', { type: 'button', testo: 'Sostituisci', onclick: async () => {
                  const sugg = candidatiPer(v.pattern, { ...atleta, esclusi: [v.esercizioId] });
                  const nuovo = await scegliEsercizio(ctx, { titolo: `Sostituisci ${v.nome}`, suggeriti: sugg });
                  if (nuovo) cambia(sostituisciEsercizio(scheda, is, ie, nuovo));
                } }),
                h('button', { type: 'button', testo: '↑', 'aria-label': 'Sposta su', disabled: ie === 0, onclick: () => cambia(spostaEsercizio(scheda, is, ie, ie - 1)) }),
                h('button', { type: 'button', testo: '↓', 'aria-label': 'Sposta giu', disabled: ie === s.esercizi.length - 1, onclick: () => cambia(spostaEsercizio(scheda, is, ie, ie + 1)) }),
                h('button', { type: 'button', testo: 'Rimuovi', onclick: () => cambia(rimuoviEsercizio(scheda, is, ie)) })
              ])
            ]);
          }),
          h('div', { class: 'st-aggiungi' }, h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: '+ Aggiungi esercizio', onclick: async () => {
            const nuovo = await scegliEsercizio(ctx, { titolo: `Aggiungi a ${s.nome}` });
            if (nuovo) cambia(aggiungiEsercizio(scheda, is, nuovo, atleta.obiettivo));
          } }))
        ])),
        scheda.sessioni.length < 7 ? h('button', { class: 'st-aggiungi-giorno', type: 'button', onclick: () => cambia(aggiungiGiorno(scheda)) }, [h('strong', { testo: '+ Aggiungi giorno' }), h('small', { testo: 'un altro giorno di allenamento nella settimana' })]) : null
      ]));
    }
    disegna();

    return h('div', {}, [
      h('div', { class: 'st-schede-testa' }, [
        h('h2', { testo: `Schede di ${atleta.nome.split(' ')[0]}` }),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: '+ Nuova scheda', onclick: nuova })
      ]),
      elenco,
      h('div', { class: 'st-scheda-aperta' }, [
        h('div', { class: 'st-testa', style: 'margin-bottom:14px' }, [
          h('div', { class: 'st-titolo-scheda' }, [
            h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [inNome, h('span', { class: `st-stato st-stato-${corrente.stato}`, testo: STATI[corrente.stato] })]),
            h('p', { class: 'gc-tenue', testo: `${spiegazione} ${scheda.sessioni.length} giorni a settimana.` })
          ]),
          h('div', { class: 'gc-azioni', style: 'margin:0' }, azioni)
        ]),
        zona, barraSalva
      ])
    ]);
  }

  function registraSeduta(atleta, programma, sedute) {
    const oggi = new Date();
    const scelta = h('select', { class: 'gc-input', id: 'st-seduta-scelta' }, programma.scheda.sessioni.map((s, i) => h('option', { value: i, testo: s.nome, selected: s.giornoSuggerito === ((oggi.getDay() + 6) % 7) })));
    const data = h('input', { class: 'gc-input', type: 'date', id: 'st-seduta-data', value: isoData(oggi) });
    const righe = h('div');
    let valori = [];
    const ridisegna = () => {
      const s = programma.scheda.sessioni[Number(scelta.value)];
      valori = s.esercizi.map(v => {
        const prec = ultimoCarico(sedute, v.esercizioId);
        return { v, serie: Array.from({ length: Number(v.serie) || 1 }, (_, i) => ({ peso: prec?.serie[i]?.peso ?? prec?.serie[0]?.peso ?? '', rip: '' })) };
      });
      svuota(righe, valori.map(({ v, serie }) => h('div', { style: 'padding:8px 0;border-bottom:1px solid var(--gc-bordo)' }, [
        h('strong', { testo: v.nome }), h('span', { class: 'gc-tenue', testo: ` · ${v.serie}×${v.ripetizioni}` }),
        h('div', { class: 'st-param', style: 'flex-wrap:wrap;margin-top:6px' }, serie.map((x, i) => h('label', {}, [`serie ${i + 1}`,
          h('span', { style: 'display:flex;gap:3px' }, [
            h('input', { value: x.peso, placeholder: 'kg', inputmode: 'decimal', 'aria-label': 'kg', oninput: e => { x.peso = e.target.value; } }),
            h('input', { value: x.rip, placeholder: 'rip', inputmode: 'numeric', 'aria-label': 'ripetizioni', oninput: e => { x.rip = e.target.value; } })
          ])])))
      ])));
    };
    scelta.onchange = ridisegna;
    ridisegna();
    finestra(`Seduta di ${atleta.nome}`, chiudi => h('div', { style: 'display:grid;gap:12px' }, [
      h('div', { class: 'gc-griglia-campi' }, [h('label', { class: 'gc-campo' }, ['Seduta', scelta]), h('label', { class: 'gc-campo' }, ['Data', data])]),
      h('p', { class: 'gc-tenue gc-piccolo', testo: 'I carichi sono precompilati con l\'ultima seduta.' }),
      righe,
      h('div', { class: 'gc-azioni' }, [h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Salva seduta', onclick: async () => {
        const s = programma.scheda.sessioni[Number(scelta.value)];
        await ctx.api.registraSeduta(atleta.id, {
          data: data.value, programmaId: programma.id, sessioneRef: s.id, nomeSessione: s.nome, durataMin: s.durataStimata,
          esercizi: valori.map(({ v, serie }) => ({ esercizioId: v.esercizioId, nome: v.nome, serie: serie.filter(x => x.rip !== '').map(x => ({ peso: Number(String(x.peso).replace(',', '.')) || 0, rip: Number(x.rip) || 0 })) })).filter(e => e.serie.length)
        });
        chiudi(); avviso('Seduta registrata'); schedaAperta = 'storico'; instrada();
      } })])
    ]));
  }

  function pannelloStorico(atleta, programmi, sedute) {
    if (!sedute.length) return h('div', { class: 'st-vuoto' }, [h('h2', { testo: 'Ancora nessuna seduta' }), h('p', { class: 'gc-tenue', testo: 'Le sedute registrate qui o dall\'interfaccia Campo compaiono in questo storico.' })]);
    const frequenza = {};
    for (const s of sedute) for (const e of s.esercizi) frequenza[e.esercizioId] = (frequenza[e.esercizioId] || 0) + 1;
    const principali = Object.entries(frequenza).sort((a, b) => b[1] - a[1]).map(([id]) => id)
      .map(id => ({ id, punti: andamento(sedute, id) })).filter(x => x.punti.some(p => p.max > 0)).slice(0, 6);
    return h('div', {}, [
      h('h2', { testo: 'Andamento dei carichi', style: 'font-size:1.1rem;margin-bottom:10px' }),
      h('div', { class: 'st-andamenti' }, principali.map(({ id, punti }) => {
        const nome = sedute.flatMap(s => s.esercizi).find(e => e.esercizioId === id)?.nome || id;
        const delta = punti.at(-1).max - punti[0].max;
        return h('div', { class: 'st-andamento' }, [
          h('h3', { testo: nome }),
          h('p', {}, [`${kg(punti[0].max)} → ${kg(punti.at(-1).max)} `, delta > 0 ? h('span', { class: 'delta', testo: `+${String(delta).replace('.', ',')} kg` }) : null]),
          grafico(punti.map(p => ({ data: p.data, valore: p.max })))
        ]);
      })),
      h('h2', { testo: 'Sedute', style: 'font-size:1.1rem;margin:4px 0 10px' }),
      h('table', { class: 'st-tabella st-storico' }, [
        h('thead', {}, h('tr', {}, ['Data', 'Seduta', 'Esercizi', 'Durata', 'Registrata da'].map(t => h('th', { testo: t })))),
        h('tbody', {}, [...sedute].reverse().slice(0, 30).map(s => h('tr', { style: 'cursor:default' }, [
          h('td', { testo: dataBreve(s.data) }), h('td', { testo: s.nomeSessione || '—' }),
          h('td', {}, h('small', { testo: s.esercizi.map(e => `${e.nome} ${e.serie.map(x => x.peso ? `${x.peso}×${x.rip}` : x.rip).join(' ')}`).join(' · ') })),
          h('td', { testo: s.durataMin ? s.durataMin + ' min' : '—' }),
          h('td', {}, s.origine === 'atleta' ? h('span', { class: 'gc-origine', title: s.note || '' , testo: 'Atleta' }) : h('small', { testo: 'Trainer' }))
        ])))
      ])
    ]);
  }

  function pannelloProfilo(atleta) {
    return h('div', { class: 'st-profilo' }, [
      formAtleta(atleta, {
        etichetta: 'Salva profilo',
        onSalva: async dati => { await ctx.api.aggiornaAtleta(atleta.id, dati); avviso('Profilo aggiornato'); instrada(); }
      }),
      h('hr', { style: 'border:0;border-top:1px solid var(--gc-bordo);margin:18px 0' }),
      h('button', { class: 'gc-btn', type: 'button', style: 'color:var(--gc-pericolo)', testo: 'Elimina atleta', onclick: async () => {
        if (!await chiediConferma(`Eliminare ${atleta.nome} con programmi e storico? Non si puo' annullare.`, { si: 'Elimina', pericolo: true })) return;
        await ctx.api.eliminaAtleta(atleta.id); avviso('Atleta eliminato'); location.hash = 'atleti';
      } })
    ]);
  }

  // -------------------------------------------------------------- esercizi
  function vistaEsercizi() {
    let gruppo = null, q = '';
    const griglia = h('div', { class: 'st-catalogo' });
    const disegna = () => {
      const lista = catalogo(ctx.personali).filter(e => (!gruppo || e.gruppo === gruppo) && (!q || e.nome.toLowerCase().includes(q)));
      svuota(griglia, lista.map(e => h('button', { type: 'button', onclick: () => apriSchedaTecnica(e) }, [
        h('span', { html: miniatura(e.anim) }), h('span', {}, [h('strong', { testo: e.nome }), h('small', { testo: (GRUPPI[e.gruppo]?.nome || '') + (e.personalizzato ? ' · personale' : '') })])
      ])));
    };
    const chips = h('div', { class: 'gc-chips' }, [[null, 'Tutti'], ...Object.entries(GRUPPI).map(([k, v]) => [k, v.nome])].map(([k, t]) =>
      h('button', { class: 'gc-chip', type: 'button', 'aria-pressed': String(k === gruppo), testo: t, onclick: e => {
        gruppo = k; chips.querySelectorAll('.gc-chip').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); disegna();
      } })));
    svuota(main,
      h('div', { class: 'st-testa' }, [h('div', {}, [h('h1', { testo: 'Esercizi' }), h('p', { class: 'gc-tenue', testo: `${catalogo(ctx.personali).length} esercizi con animazione e scheda tecnica, ${ctx.personali.length} creati da te` })]),
        h('button', { class: 'gc-btn', type: 'button', testo: '+ Nuovo esercizio', onclick: async () => { const e = await creaEsercizio(ctx); if (e) { disegna(); apriSchedaTecnica(e); } } })]),
      h('div', { class: 'st-filtri' }, [h('input', { class: 'gc-input', id: 'st-cerca-es', type: 'search', placeholder: 'Cerca esercizio', oninput: e => { q = e.target.value.toLowerCase(); disegna(); } }), chips]),
      griglia
    );
    disegna();
  }

  await instrada();
});
