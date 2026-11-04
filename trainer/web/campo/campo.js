// Interfaccia 2 · Campo: il trainer in sala con il telefono. Agenda del
// giorno, modalita' allenamento un esercizio alla volta, carichi a un tocco.
import { avvia } from '../core/avvio.js';
import { h, svuota, avviso, finestra, quanto, iniziali } from '../core/dom.js';
import { agendaDiOggi, statoCliente, programmaAttivo, bozzaProgramma, catalogo, cerca, trova, OBIETTIVI, messaggioErrore } from '../core/servizi.js';
import { formCliente } from '../core/form-cliente.js';
import { apriSchedaTecnica, rigaEsercizio } from '../core/esercizi-ui.js';
import { creaAnimazione } from '../../shared/anim.js';
import { ultimoCarico, suggerimento, giorniDa, isoData, indiceGiorno } from '../../shared/progressi.js';
import { GIORNI } from '../../shared/modello.js';

const GIORNI_LUNGHI = ['Lunedi\'', 'Martedi\'', 'Mercoledi\'', 'Giovedi\'', 'Venerdi\'', 'Sabato', 'Domenica'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

avvia(document.getElementById('app'), async ctx => {
  const main = h('main', { class: 'cp' });
  const tab = h('nav', { class: 'cp-tab', 'aria-label': 'Sezioni' });
  ctx.radice.append(main, tab);

  const disegnaTab = attiva => svuota(tab, [['oggi', 'Oggi'], ['clienti', 'Clienti'], ['libreria', 'Esercizi']]
    .map(([k, t]) => h('a', { href: '#' + k, 'aria-current': attiva === k ? 'page' : null, testo: t })));

  async function instrada() {
    const r = location.hash.slice(1) || 'oggi';
    window.scrollTo(0, 0);
    try {
      if (r.startsWith('cliente-')) { disegnaTab('clienti'); await vistaCliente(r.slice(8)); }
      else if (r === 'clienti') { disegnaTab('clienti'); await vistaClienti(); }
      else if (r === 'libreria') { disegnaTab('libreria'); vistaLibreria(); }
      else { disegnaTab('oggi'); await vistaOggi(); }
    } catch (e) { svuota(main, h('p', { class: 'gc-errore', testo: messaggioErrore(e) })); }
  }
  window.addEventListener('hashchange', instrada);

  // ---------------------------------------------------------------- oggi
  async function vistaOggi() {
    const oggi = new Date();
    const clienti = await ctx.api.elencoClienti();
    const agenda = await agendaDiOggi(ctx.api, clienti, oggi);
    const fermi = clienti.filter(c => statoCliente(c).chiave === 'fermo');
    svuota(main,
      h('div', { class: 'cp-data', testo: `${GIORNI_LUNGHI[indiceGiorno(oggi)]} ${oggi.getDate()} ${MESI[oggi.getMonth()]}` }),
      h('h1', { testo: agenda.length ? `${agenda.length} ${agenda.length === 1 ? 'cliente' : 'clienti'} oggi` : 'Giorno libero' }),
      h('div', { class: 'cp-lista' }, agenda.length ? agenda.map(({ cliente, programma, seduta }) => h('article', { class: 'cp-card' }, [
        h('div', { class: 'cp-persona' }, [
          h('span', { class: 'cp-avatar', testo: iniziali(cliente.nome) }),
          h('div', {}, [h('strong', { testo: cliente.nome }), h('span', { testo: `${seduta.nome} · ${seduta.esercizi.length} esercizi · ~${seduta.durataStimata} min` })])
        ]),
        h('p', { class: 'gc-tenue', style: 'margin:0', testo: `Ultima seduta ${quanto(giorniDa(cliente.ultimaSeduta))}` }),
        h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: 'Inizia allenamento', onclick: () => allena(cliente, programma, seduta) })
      ])) : h('p', { class: 'cp-vuoto', testo: 'Nessuna seduta in programma oggi. Puoi comunque allenare un cliente da "Clienti".' })),
      fermi.length ? h('h2', { testo: 'Da sentire' }) : null,
      fermi.length ? h('div', { class: 'cp-lista' }, fermi.map(c => h('a', { class: 'cp-riga', href: '#cliente-' + c.id, style: 'color:inherit;text-decoration:none' }, [
        h('span', {}, [h('strong', { testo: c.nome }), h('br'), h('span', { class: 'gc-tenue', testo: `Ultima seduta ${quanto(giorniDa(c.ultimaSeduta))}` })]),
        h('span', { class: 'gc-pill gc-pill-attenzione', testo: 'Fermo' })
      ]))) : null
    );
  }

  // ---------------------------------------------------------------- clienti
  async function vistaClienti() {
    const clienti = await ctx.api.elencoClienti();
    svuota(main,
      h('div', { class: 'cp-data', testo: 'I tuoi clienti' }),
      h('h1', { testo: `${clienti.length} clienti` }),
      h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: '+ Nuovo cliente', onclick: nuovoCliente }),
      h('div', { class: 'cp-lista', style: 'margin-top:16px' }, clienti.map(c => {
        const s = statoCliente(c);
        return h('a', { class: 'cp-riga', href: '#cliente-' + c.id, style: 'color:inherit;text-decoration:none' }, [
          h('span', { class: 'cp-persona' }, [h('span', { class: 'cp-avatar', testo: iniziali(c.nome) }), h('span', {}, [h('strong', { testo: c.nome }), h('span', { testo: OBIETTIVI[c.obiettivo] })])]),
          h('span', { class: `gc-pill gc-pill-${s.livello}`, testo: s.chiave === 'ok' ? 'Ok' : s.chiave === 'fermo' ? 'Fermo' : s.chiave === 'senza' ? 'No prog.' : 'Nuovo' })
        ]);
      }))
    );
  }

  function nuovoCliente() {
    finestra('Nuovo cliente', chiudi => formCliente({}, {
      compatto: true, etichetta: 'Crea e prepara programma',
      onSalva: async dati => {
        const c = await ctx.api.creaCliente(dati);
        await ctx.api.creaProgramma(c.id, bozzaProgramma(c, ctx.personali));
        chiudi(); avviso(`${c.nome}: programma pronto`);
        location.hash = 'cliente-' + c.id;
      }
    }));
  }

  async function vistaCliente(id) {
    const [cliente, programmi, sedute] = await Promise.all([ctx.api.leggiCliente(id), ctx.api.programmi(id), ctx.api.sedute(id)]);
    const prog = programmaAttivo(programmi);
    const oggi = indiceGiorno();
    svuota(main,
      h('a', { href: '#clienti', class: 'gc-link', testo: '← Clienti' }),
      h('h1', { testo: cliente.nome, style: 'margin-top:10px' }),
      h('p', { class: 'gc-tenue', testo: `${OBIETTIVI[cliente.obiettivo]} · ${sedute.length} sedute registrate · ultima ${quanto(giorniDa(cliente.ultimaSeduta))}` }),
      cliente.note ? h('p', { class: 'cp-consiglio', testo: cliente.note }) : null,
      prog ? h('h2', { testo: prog.nome }) : null,
      prog ? h('div', { class: 'cp-lista' }, prog.scheda.sessioni.map(s => h('article', { class: 'cp-card' }, [
        h('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:baseline' }, [
          h('strong', { style: 'font:800 1.3rem var(--gc-font-titoli);text-transform:uppercase', testo: s.nome }),
          h('div', { class: 'cp-giorni' }, h('span', { class: s.giornoSuggerito === oggi ? 'oggi' : '', testo: GIORNI[s.giornoSuggerito] ?? '' }))
        ]),
        h('p', { class: 'gc-tenue', style: 'margin:0', testo: s.esercizi.map(e => e.nome).join(' · ') }),
        h('button', { class: 'gc-btn ' + (s.giornoSuggerito === oggi ? 'gc-btn-primario ' : '') + 'cp-grande', type: 'button', testo: 'Allena questa seduta', onclick: () => allena(cliente, prog, s) })
      ]))) : h('div', { class: 'cp-card' }, [
        h('p', { style: 'margin:0', testo: 'Nessun programma attivo.' }),
        h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: 'Prepara programma dal profilo', onclick: async () => {
          await ctx.api.creaProgramma(cliente.id, bozzaProgramma(cliente, ctx.personali)); avviso('Programma pronto'); instrada();
        } })
      ])
    );
  }

  // ---------------------------------------------------------------- libreria
  function vistaLibreria() {
    const lista = h('div', { class: 'gc-lista-es' });
    const disegna = q => svuota(lista, (q.length >= 2 ? cerca(q, ctx.personali) : catalogo(ctx.personali)).map(e => rigaEsercizio(e, { azione: apriSchedaTecnica, etichetta: 'Come si fa' })));
    svuota(main,
      h('div', { class: 'cp-data', testo: 'Libreria' }),
      h('h1', { testo: 'Esercizi' }),
      h('input', { class: 'gc-input', id: 'cp-cerca', type: 'search', placeholder: 'Cerca esercizio', style: 'min-height:52px;margin-bottom:10px', oninput: e => disegna(e.target.value.trim()) }),
      lista
    );
    disegna('');
  }

  // ---------------------------------------------------------------- allenamento
  async function allena(cliente, programma, seduta) {
    const sedute = await ctx.api.sedute(cliente.id);
    const inizio = Date.now();
    const dati = seduta.esercizi.map(v => {
      const prec = ultimoCarico(sedute, v.esercizioId);
      const sugg = suggerimento(v, prec);
      const alto = Number(String(v.ripetizioni).match(/(\d+)\s*$/)?.[1] || String(v.ripetizioni).match(/\d+/)?.[0] || 10);
      return {
        v, prec, sugg,
        serie: Array.from({ length: Number(v.serie) || 1 }, () => ({ peso: sugg.peso ?? 0, rip: alto, fatto: false }))
      };
    });
    let indice = 0, anim = null, timer = null;
    const strato = h('div', { class: 'cp-sessione', role: 'dialog', 'aria-label': `Allenamento di ${cliente.nome}` });
    const dentro = h('div', { class: 'cp-sessione-dentro' });
    const barraTimer = h('div', { class: 'cp-timer', hidden: true });
    strato.append(dentro);
    document.body.append(strato, barraTimer);
    document.body.style.overflow = 'hidden';

    const chiudi = () => {
      anim && anim.destroy(); clearInterval(timer);
      strato.remove(); barraTimer.remove(); document.body.style.overflow = '';
    };

    function avviaRecupero(sec) {
      if (!sec) return;
      clearInterval(timer);
      const fine = Date.now() + sec * 1000;
      barraTimer.hidden = false;
      const tick = () => {
        const resta = Math.max(0, Math.round((fine - Date.now()) / 1000));
        svuota(barraTimer,
          h('i', { style: `width:${100 - (resta / sec) * 100}%` }),
          h('b', { testo: `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}` }),
          h('span', { testo: 'Recupero' }),
          h('button', { type: 'button', testo: 'Salta', onclick: () => { clearInterval(timer); barraTimer.hidden = true; } })
        );
        if (resta <= 0) { clearInterval(timer); barraTimer.hidden = true; if (navigator.vibrate) navigator.vibrate([150, 80, 150]); }
      };
      tick(); timer = setInterval(tick, 500);
    }

    const stepper = (valore, passo, unita, alCambio) => {
      const out = h('output', {}, [String(valore).replace('.', ','), h('small', { testo: unita })]);
      const imposta = v => { valore = Math.max(0, Math.round(v * 10) / 10); out.firstChild.textContent = String(valore).replace('.', ','); alCambio(valore); };
      return h('div', { class: 'cp-stepper' }, [
        h('button', { type: 'button', 'aria-label': `meno ${passo} ${unita}`, testo: '−', onclick: () => imposta(valore - passo) }),
        out,
        h('button', { type: 'button', 'aria-label': `piu' ${passo} ${unita}`, testo: '+', onclick: () => imposta(valore + passo) })
      ]);
    };

    function disegna() {
      anim && anim.destroy();
      const d = dati[indice];
      const box = h('div', { class: 'anim-box' });
      const ultimo = indice === dati.length - 1;
      svuota(dentro,
        h('div', { class: 'cp-sessione-testa' }, [
          h('strong', { testo: `${cliente.nome.split(' ')[0]} · ${seduta.nome}` }),
          h('button', { class: 'gc-chiudi', type: 'button', 'aria-label': 'Chiudi allenamento', testo: '×', onclick: chiudi })
        ]),
        h('div', { class: 'cp-progresso' }, dati.map((x, i) => h('i', { class: i === indice ? 'ora' : x.serie.every(s => s.fatto) ? 'fatto' : '' }))),
        h('div', { class: 'cp-esercizio' }, [box, h('div', {}, [
          h('h2', { testo: d.v.nome }),
          h('p', { testo: `${d.v.serie} × ${d.v.ripetizioni}${d.v.recupero ? ` · rec ${d.v.recupero}s` : ''}` }),
          h('button', { class: 'gc-link', type: 'button', style: 'margin-top:6px', testo: 'Come si fa', onclick: () => { const es = trova(d.v.esercizioId, ctx.personali); es && apriSchedaTecnica(es); } })
        ])]),
        h('p', { class: 'cp-consiglio', testo: d.sugg.testo + (d.prec ? ` (ultima: ${d.prec.serie.map(s => `${String(s.peso).replace('.', ',')}×${s.rip}`).join(', ')})` : '') }),
        ...d.serie.map((s, i) => h('div', { class: 'cp-serie' }, [
          h('span', { class: 'n', testo: i + 1 }),
          stepper(s.peso, 2.5, 'kg', v => { s.peso = v; }),
          stepper(s.rip, 1, d.v.durata ? 'sec' : 'rip', v => { s.rip = v; }),
          h('button', { class: 'cp-fatto', type: 'button', 'aria-label': `Serie ${i + 1} fatta`, 'aria-pressed': String(s.fatto), testo: '✓', onclick: e => {
            s.fatto = !s.fatto; e.currentTarget.setAttribute('aria-pressed', String(s.fatto));
            if (s.fatto) {
              // la serie dopo parte dal carico appena usato
              d.serie.slice(i + 1).forEach(x => { if (!x.fatto) x.peso = s.peso; });
              avviaRecupero(d.v.recupero);
              if (d.serie.every(x => x.fatto) && !ultimo) setTimeout(() => { indice++; disegna(); }, 400); else disegna();
            }
          } })
        ])),
        h('div', { class: 'cp-naviga' }, [
          h('button', { class: 'gc-btn cp-grande', type: 'button', testo: '‹ Prima', disabled: indice === 0, onclick: () => { indice--; disegna(); } }),
          ultimo
            ? h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: 'Termina e salva', onclick: termina })
            : h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: 'Prossimo ›', onclick: () => { indice++; disegna(); } })
        ])
      );
      anim = creaAnimazione(box, d.v.anim, { durata: 2800 });
      strato.scrollTo(0, 0);
    }

    async function termina(e) {
      const esercizi = dati.map(d => ({
        esercizioId: d.v.esercizioId, nome: d.v.nome,
        serie: d.serie.filter(s => s.fatto).map(s => ({ peso: s.peso, rip: s.rip }))
      })).filter(x => x.serie.length);
      if (!esercizi.length) { avviso('Segna almeno una serie fatta con ✓', 'errore'); return; }
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await ctx.api.registraSeduta(cliente.id, {
          data: isoData(), programmaId: programma.id, sessioneRef: seduta.id, nomeSessione: seduta.nome,
          durataMin: Math.max(1, Math.round((Date.now() - inizio) / 60000)), esercizi
        });
        chiudi();
        avviso(`Seduta di ${cliente.nome.split(' ')[0]} salvata: ${esercizi.reduce((t, x) => t + x.serie.length, 0)} serie`);
        instrada();
      } catch (x) { avviso(messaggioErrore(x), 'errore'); btn.disabled = false; }
    }

    disegna();
  }

  await instrada();
});
