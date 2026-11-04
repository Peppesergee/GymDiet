// Interfaccia 1 · Studio: gestionale da scrivania per il trainer.
import { avvia } from '../core/avvio.js';
import { h, svuota, avviso, finestra, chiediConferma, dataBreve, quanto, iniziali, grafico, kg } from '../core/dom.js';
import { bozzaProgramma, programmaAttivo, statoAtleta, catalogo, trova, GRUPPI, OBIETTIVI, messaggioErrore } from '../core/servizi.js';
import { formAtleta } from '../core/form-atleta.js';
import { apriSchedaTecnica, scegliEsercizio, creaEsercizio } from '../core/esercizi-ui.js';
import { apriInvito, statoApp } from '../core/invito-ui.js';
import { miniatura } from '../../shared/anim.js';
import { aggiungiEsercizio, sostituisciEsercizio, rimuoviEsercizio, spostaEsercizio, modificaVoce, candidatiPer } from '../../shared/programmi.js';
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
    const schede = [['programma', 'Scheda'], ['storico', `Storico (${sedute.length})`], ['profilo', 'Profilo']];
    const barra = h('div', { class: 'st-schede', role: 'tablist' });
    const mostra = sch => {
      schedaAperta = sch;
      svuota(barra, schede.map(([k, t]) => h('button', { role: 'tab', type: 'button', 'aria-selected': String(k === sch), testo: t, onclick: () => mostra(k) })));
      if (sch === 'programma') svuota(contenuto, pannelloProgramma(atleta, programmi, sedute));
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

  function pannelloProgramma(atleta, programmi, sedute) {
    const attivo = programmaAttivo(programmi);
    if (!attivo) {
      return h('div', { class: 'st-vuoto' }, [
        h('h2', { testo: 'Nessuna scheda attiva' }),
        h('p', { class: 'gc-tenue', testo: 'Parti da una bozza costruita sul profilo dell’atleta: la puoi modificare esercizio per esercizio.' }),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Genera bozza dal profilo', onclick: async () => {
          await ctx.api.creaProgramma(atleta.id, bozzaProgramma(atleta, ctx.personali));
          avviso('Scheda creata'); instrada();
        } })
      ]);
    }
    let scheda = structuredClone(attivo.scheda);
    let modificato = false;
    const zona = h('div');
    const barraSalva = h('div', { class: 'st-salva', hidden: true }, [
      h('span', { testo: 'Modifiche non salvate alla scheda' }),
      h('div', { class: 'gc-azioni', style: 'margin:0' }, [
        h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: 'Annulla', onclick: () => { scheda = structuredClone(attivo.scheda); segna(false); } }),
        h('button', { class: 'gc-btn gc-btn-primario gc-btn-piccolo', type: 'button', testo: 'Salva scheda', onclick: async e => {
          const btn = e.currentTarget;
          btn.disabled = true;
          try {
            const agg = await ctx.api.aggiornaProgramma(attivo.id, { nome: attivo.nome, stato: 'attivo', scheda });
            attivo.scheda = agg.scheda; segna(false); avviso('Scheda salvata: l\u2019atleta la vede subito');
          } catch (x) { avviso(messaggioErrore(x), 'errore'); }
          btn.disabled = false;
        } })
      ])
    ]);
    const segna = (v = true) => { modificato = v; barraSalva.hidden = !modificato; disegna(); };
    const cambia = nuova => { scheda = nuova; segna(true); };

    function disegna() {
      svuota(zona, h('div', { class: 'st-sedute' }, scheda.sessioni.map((s, is) => h('article', { class: 'st-seduta' }, [
        h('header', {}, [h('h3', { testo: s.nome }), h('span', { testo: `${GIORNI[s.giornoSuggerito] ?? ''} · ~${s.durataStimata} min` })]),
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
      ]))));
    }
    disegna();

    const archiviati = programmi.filter(p => p.id !== attivo.id);
    return h('div', {}, [
      h('div', { class: 'st-testa', style: 'margin-bottom:14px' }, [
        h('div', {}, [h('h2', { testo: attivo.nome, style: 'font-size:1.25rem' }), h('p', { class: 'gc-tenue', testo: `Attivo dal ${dataBreve(attivo.creatoIl)} · ${scheda.sessioni.length} sedute a settimana${archiviati.length ? ` · ${archiviati.length} programmi precedenti` : ''}` })]),
        h('div', { class: 'gc-azioni', style: 'margin:0' }, [
          h('button', { class: 'gc-btn', type: 'button', testo: 'Registra seduta', onclick: () => registraSeduta(atleta, attivo, sedute) }),
          h('button', { class: 'gc-btn', type: 'button', testo: 'Nuovo blocco', onclick: async () => {
            if (!await chiediConferma('Generare una nuova scheda dal profilo? Quella attuale resta nello storico come archiviata.', { si: 'Genera' })) return;
            await ctx.api.creaProgramma(atleta.id, bozzaProgramma(atleta, ctx.personali));
            avviso('Nuova scheda attiva'); instrada();
          } })
        ])
      ]),
      zona, barraSalva
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
