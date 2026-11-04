// Interfaccia 1 · Studio: gestionale da scrivania per il trainer.
import { avvia } from '../core/avvio.js';
import { h, svuota, avviso, finestra, chiediConferma, dataBreve, quanto, iniziali, grafico, kg } from '../core/dom.js';
import { bozzaProgramma, programmaAttivo, statoCliente, catalogo, trova, GRUPPI, OBIETTIVI, messaggioErrore } from '../core/servizi.js';
import { formCliente } from '../core/form-cliente.js';
import { apriSchedaTecnica, scegliEsercizio } from '../core/esercizi-ui.js';
import { miniatura } from '../../shared/anim.js';
import { aggiungiEsercizio, sostituisciEsercizio, rimuoviEsercizio, spostaEsercizio, modificaVoce, candidatiPer } from '../../shared/programmi.js';
import { andamento, giorniDa, ultimoCarico, isoData } from '../../shared/progressi.js';
import { GIORNI, ESPERIENZE } from '../../shared/modello.js';

avvia(document.getElementById('app'), async ctx => {
  const nav = h('nav', { class: 'st-nav', 'aria-label': 'Sezioni' });
  const main = h('main', { class: 'st-main' });
  ctx.radice.append(h('div', { class: 'st' }, [nav, main]));

  const voci = [['clienti', 'Clienti'], ['esercizi', 'Esercizi']];
  function disegnaNav(attiva) {
    svuota(nav,
      h('div', { class: 'st-marchio', html: 'GymCoach<small>Studio</small>' }),
      voci.map(([id, t]) => h('a', { href: '#' + id, 'aria-current': attiva === id ? 'page' : null, testo: t })),
      h('div', { class: 'st-utente' }, [h('span', { testo: ctx.trainer.nome }), h('button', { class: 'gc-link', type: 'button', testo: 'Esci', onclick: ctx.esci })])
    );
  }

  async function instrada() {
    const hash = location.hash.slice(1) || 'clienti';
    window.scrollTo(0, 0);
    try {
      if (hash.startsWith('cliente-')) { disegnaNav('clienti'); await vistaCliente(hash.slice(8)); }
      else if (hash === 'esercizi') { disegnaNav('esercizi'); vistaEsercizi(); }
      else { disegnaNav('clienti'); await vistaClienti(); }
    } catch (e) {
      svuota(main, h('p', { class: 'gc-errore', testo: messaggioErrore(e) }), h('a', { href: '#clienti', testo: 'Torna ai clienti' }));
    }
  }
  window.addEventListener('hashchange', instrada);

  // -------------------------------------------------------------- clienti
  let filtro = 'tutti', ricerca = '';
  async function vistaClienti() {
    const clienti = await ctx.api.elencoClienti();
    const conStato = clienti.map(c => ({ c, s: statoCliente(c) }));
    const conta = k => conStato.filter(x => x.s.chiave === k).length;

    const corpo = h('tbody');
    const disegnaRighe = () => {
      const q = ricerca.toLowerCase();
      const lista = conStato.filter(({ c, s }) =>
        (filtro === 'tutti' || s.chiave === filtro) && (!q || c.nome.toLowerCase().includes(q)));
      svuota(corpo, lista.length ? lista.map(({ c, s }) => h('tr', { onclick: () => { location.hash = 'cliente-' + c.id; } }, [
        h('td', {}, h('div', { class: 'st-persona' }, [h('span', { class: 'st-avatar', testo: iniziali(c.nome) }), h('div', {}, [h('a', { href: '#cliente-' + c.id, testo: c.nome, style: 'color:inherit;font-weight:650;text-decoration:none' }), h('small', { testo: c.email || c.telefono || '' })])])),
        h('td', { class: 'col-ob', testo: OBIETTIVI[c.obiettivo] || c.obiettivo }),
        h('td', { class: 'col-prog', testo: c.programmaAttivo ? c.programmaAttivo.nome : '—' }),
        h('td', { class: 'col-ultima', testo: c.ultimaSeduta ? `${dataBreve(c.ultimaSeduta)} · ${quanto(giorniDa(c.ultimaSeduta))}` : 'Nessuna seduta' }),
        h('td', { class: 'col-stato' }, h('span', { class: `gc-pill gc-pill-${s.livello}`, testo: s.etichetta }))
      ])) : h('tr', {}, h('td', { colspan: 5, class: 'gc-tenue', testo: 'Nessun cliente con questi filtri.' })));
    };
    const chip = (id, t) => h('button', { class: 'gc-chip', type: 'button', 'aria-pressed': String(filtro === id), testo: t, onclick: e => {
      filtro = id; e.currentTarget.parentNode.querySelectorAll('.gc-chip').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); disegnaRighe();
    } });

    svuota(main,
      h('div', { class: 'st-testa' }, [
        h('div', {}, [h('h1', { testo: 'Clienti' }), h('p', { class: 'gc-tenue', testo: `${clienti.length} clienti seguiti` })]),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: '+ Nuovo cliente', onclick: nuovoCliente })
      ]),
      h('div', { class: 'st-kpi' }, [
        h('div', {}, [h('b', { testo: clienti.length - conta('senza') }), h('span', { testo: 'con programma attivo' })]),
        h('div', {}, [h('b', { testo: conta('ok') }), h('span', { testo: 'in regola con le sedute' })]),
        h('div', { class: conta('fermo') ? 'avvisa' : '' }, [h('b', { testo: conta('fermo') }), h('span', { testo: 'da sentire (fermi da 10+ giorni)' })]),
        h('div', {}, [h('b', { testo: conta('senza') }), h('span', { testo: 'senza programma' })])
      ]),
      h('div', { class: 'st-filtri' }, [
        h('input', { class: 'gc-input', id: 'st-cerca', type: 'search', placeholder: 'Cerca cliente', value: ricerca, oninput: e => { ricerca = e.target.value; disegnaRighe(); } }),
        h('div', { class: 'gc-chips' }, [chip('tutti', 'Tutti'), chip('fermo', 'Da sentire'), chip('senza', 'Senza programma'), chip('nuovo', 'Da iniziare')])
      ]),
      h('table', { class: 'st-tabella' }, [
        h('thead', {}, h('tr', {}, ['Cliente', 'Obiettivo', 'Programma attivo', 'Ultima seduta', 'Stato'].map(t => h('th', { testo: t })))),
        corpo
      ])
    );
    disegnaRighe();
  }

  function nuovoCliente() {
    const genera = h('input', { type: 'checkbox', id: 'st-genera', checked: true });
    finestra('Nuovo cliente', chiudi => formCliente({}, {
      etichetta: 'Crea cliente',
      extra: h('label', { class: 'gc-campo', style: 'display:flex;gap:8px;align-items:center;color:var(--gc-testo)' }, [genera, 'Prepara subito una bozza di programma dal profilo']),
      onSalva: async dati => {
        const c = await ctx.api.creaCliente(dati);
        if (genera.checked) await ctx.api.creaProgramma(c.id, bozzaProgramma(c, ctx.personali));
        chiudi();
        avviso(`${c.nome} aggiunto`);
        location.hash = 'cliente-' + c.id;
      }
    }));
  }

  // -------------------------------------------------------------- cliente
  let schedaAperta = 'programma';
  async function vistaCliente(id) {
    const [cliente, programmi, sedute] = await Promise.all([ctx.api.leggiCliente(id), ctx.api.programmi(id), ctx.api.sedute(id)]);
    const stato = statoCliente(cliente);
    const contenuto = h('div');
    const schede = [['programma', 'Programma'], ['storico', `Storico (${sedute.length})`], ['profilo', 'Profilo']];
    const barra = h('div', { class: 'st-schede', role: 'tablist' });
    const mostra = sch => {
      schedaAperta = sch;
      svuota(barra, schede.map(([k, t]) => h('button', { role: 'tab', type: 'button', 'aria-selected': String(k === sch), testo: t, onclick: () => mostra(k) })));
      if (sch === 'programma') svuota(contenuto, pannelloProgramma(cliente, programmi, sedute));
      else if (sch === 'storico') svuota(contenuto, pannelloStorico(cliente, programmi, sedute));
      else svuota(contenuto, pannelloProfilo(cliente));
    };
    svuota(main,
      h('a', { class: 'st-indietro', href: '#clienti', testo: '← Clienti' }),
      h('div', { class: 'st-testa' }, [
        h('div', {}, [
          h('h1', { testo: cliente.nome }),
          h('p', { class: 'gc-tenue', testo: `${OBIETTIVI[cliente.obiettivo]} · ${ESPERIENZE[cliente.esperienza]} · ${cliente.giorniSettimana.map(g => GIORNI[g]).join(' ')} · ${cliente.durataSessione} min` })
        ]),
        h('span', { class: `gc-pill gc-pill-${stato.livello}`, testo: stato.etichetta })
      ]),
      barra, contenuto
    );
    mostra(schedaAperta);
  }

  function pannelloProgramma(cliente, programmi, sedute) {
    const attivo = programmaAttivo(programmi);
    if (!attivo) {
      return h('div', { class: 'st-vuoto' }, [
        h('h2', { testo: 'Nessun programma attivo' }),
        h('p', { class: 'gc-tenue', testo: 'Parti da una bozza costruita sul profilo del cliente: la puoi modificare esercizio per esercizio.' }),
        h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Genera bozza dal profilo', onclick: async () => {
          await ctx.api.creaProgramma(cliente.id, bozzaProgramma(cliente, ctx.personali));
          avviso('Programma creato'); instrada();
        } })
      ]);
    }
    let scheda = structuredClone(attivo.scheda);
    let modificato = false;
    const zona = h('div');
    const barraSalva = h('div', { class: 'st-salva', hidden: true }, [
      h('span', { testo: 'Modifiche non salvate al programma' }),
      h('div', { class: 'gc-azioni', style: 'margin:0' }, [
        h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: 'Annulla', onclick: () => { scheda = structuredClone(attivo.scheda); segna(false); } }),
        h('button', { class: 'gc-btn gc-btn-primario gc-btn-piccolo', type: 'button', testo: 'Salva programma', onclick: async e => {
          const btn = e.currentTarget;
          btn.disabled = true;
          try {
            const agg = await ctx.api.aggiornaProgramma(attivo.id, { nome: attivo.nome, stato: 'attivo', scheda });
            attivo.scheda = agg.scheda; segna(false); avviso('Programma salvato');
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
                const sugg = candidatiPer(v.pattern, { ...cliente, esclusi: [v.esercizioId] });
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
          if (nuovo) cambia(aggiungiEsercizio(scheda, is, nuovo, cliente.obiettivo));
        } }))
      ]))));
    }
    disegna();

    const archiviati = programmi.filter(p => p.id !== attivo.id);
    return h('div', {}, [
      h('div', { class: 'st-testa', style: 'margin-bottom:14px' }, [
        h('div', {}, [h('h2', { testo: attivo.nome, style: 'font-size:1.25rem' }), h('p', { class: 'gc-tenue', testo: `Attivo dal ${dataBreve(attivo.creatoIl)} · ${scheda.sessioni.length} sedute a settimana${archiviati.length ? ` · ${archiviati.length} programmi precedenti` : ''}` })]),
        h('div', { class: 'gc-azioni', style: 'margin:0' }, [
          h('button', { class: 'gc-btn', type: 'button', testo: 'Registra seduta', onclick: () => registraSeduta(cliente, attivo, sedute) }),
          h('button', { class: 'gc-btn', type: 'button', testo: 'Nuovo blocco', onclick: async () => {
            if (!await chiediConferma('Generare un nuovo programma dal profilo? Quello attuale resta nello storico come archiviato.', { si: 'Genera' })) return;
            await ctx.api.creaProgramma(cliente.id, bozzaProgramma(cliente, ctx.personali));
            avviso('Nuovo programma attivo'); instrada();
          } })
        ])
      ]),
      zona, barraSalva
    ]);
  }

  function registraSeduta(cliente, programma, sedute) {
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
    finestra(`Seduta di ${cliente.nome}`, chiudi => h('div', { style: 'display:grid;gap:12px' }, [
      h('div', { class: 'gc-griglia-campi' }, [h('label', { class: 'gc-campo' }, ['Seduta', scelta]), h('label', { class: 'gc-campo' }, ['Data', data])]),
      h('p', { class: 'gc-tenue gc-piccolo', testo: 'I carichi sono precompilati con l\'ultima seduta.' }),
      righe,
      h('div', { class: 'gc-azioni' }, [h('button', { class: 'gc-btn gc-btn-primario', type: 'button', testo: 'Salva seduta', onclick: async () => {
        const s = programma.scheda.sessioni[Number(scelta.value)];
        await ctx.api.registraSeduta(cliente.id, {
          data: data.value, programmaId: programma.id, sessioneRef: s.id, nomeSessione: s.nome, durataMin: s.durataStimata,
          esercizi: valori.map(({ v, serie }) => ({ esercizioId: v.esercizioId, nome: v.nome, serie: serie.filter(x => x.rip !== '').map(x => ({ peso: Number(String(x.peso).replace(',', '.')) || 0, rip: Number(x.rip) || 0 })) })).filter(e => e.serie.length)
        });
        chiudi(); avviso('Seduta registrata'); schedaAperta = 'storico'; instrada();
      } })])
    ]));
  }

  function pannelloStorico(cliente, programmi, sedute) {
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
        h('thead', {}, h('tr', {}, ['Data', 'Seduta', 'Esercizi', 'Durata'].map(t => h('th', { testo: t })))),
        h('tbody', {}, [...sedute].reverse().slice(0, 30).map(s => h('tr', { style: 'cursor:default' }, [
          h('td', { testo: dataBreve(s.data) }), h('td', { testo: s.nomeSessione || '—' }),
          h('td', {}, h('small', { testo: s.esercizi.map(e => `${e.nome} ${e.serie.map(x => x.peso ? `${x.peso}×${x.rip}` : x.rip).join(' ')}`).join(' · ') })),
          h('td', { testo: s.durataMin ? s.durataMin + ' min' : '—' })
        ])))
      ])
    ]);
  }

  function pannelloProfilo(cliente) {
    return h('div', { class: 'st-profilo' }, [
      formCliente(cliente, {
        etichetta: 'Salva profilo',
        onSalva: async dati => { await ctx.api.aggiornaCliente(cliente.id, dati); avviso('Profilo aggiornato'); instrada(); }
      }),
      h('hr', { style: 'border:0;border-top:1px solid var(--gc-bordo);margin:18px 0' }),
      h('button', { class: 'gc-btn', type: 'button', style: 'color:var(--gc-pericolo)', testo: 'Elimina cliente', onclick: async () => {
        if (!await chiediConferma(`Eliminare ${cliente.nome} con programmi e storico? Non si puo' annullare.`, { si: 'Elimina', pericolo: true })) return;
        await ctx.api.eliminaCliente(cliente.id); avviso('Cliente eliminato'); location.hash = 'clienti';
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
        h('button', { class: 'gc-btn', type: 'button', testo: 'Crea con Claude', onclick: async () => { const e = await scegliEsercizio(ctx, { titolo: 'Cerca o crea un esercizio' }); if (e) { apriSchedaTecnica(e); disegna(); } } })]),
      h('div', { class: 'st-filtri' }, [h('input', { class: 'gc-input', id: 'st-cerca-es', type: 'search', placeholder: 'Cerca esercizio', oninput: e => { q = e.target.value.toLowerCase(); disegna(); } }), chips]),
      griglia
    );
    disegna();
  }

  await instrada();
});
