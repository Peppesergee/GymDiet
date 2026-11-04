// Interfaccia 2 · Campo: il trainer in sala con il telefono. Agenda del
// giorno, modalita' allenamento un esercizio alla volta, carichi a un tocco.
import { avvia } from '../core/avvio.js';
import { h, svuota, avviso, finestra, quanto, iniziali } from '../core/dom.js';
import { agendaDiOggi, statoAtleta, programmaAttivo, bozzaProgramma, catalogo, cerca, trova, OBIETTIVI, messaggioErrore } from '../core/servizi.js';
import { formAtleta } from '../core/form-atleta.js';
import { apriSchedaTecnica, rigaEsercizio } from '../core/esercizi-ui.js';
import { apriAllenamento } from '../core/allenamento-ui.js';
import { apriInvito, statoApp } from '../core/invito-ui.js';
import { giorniDa, indiceGiorno } from '../../shared/progressi.js';
import { GIORNI } from '../../shared/modello.js';

const GIORNI_LUNGHI = ['Lunedi\'', 'Martedi\'', 'Mercoledi\'', 'Giovedi\'', 'Venerdi\'', 'Sabato', 'Domenica'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

avvia(document.getElementById('app'), async ctx => {
  const main = h('main', { class: 'cp' });
  const tab = h('nav', { class: 'cp-tab', 'aria-label': 'Sezioni' });
  ctx.radice.append(main, tab);

  const disegnaTab = attiva => svuota(tab, [['oggi', 'Oggi'], ['atleti', 'Atleti'], ['libreria', 'Esercizi']]
    .map(([k, t]) => h('a', { href: '#' + k, 'aria-current': attiva === k ? 'page' : null, testo: t })));

  async function instrada() {
    const r = location.hash.slice(1) || 'oggi';
    window.scrollTo(0, 0);
    try {
      if (r.startsWith('atleta-')) { disegnaTab('atleti'); await vistaAtleta(r.slice(7)); }
      else if (r === 'atleti') { disegnaTab('atleti'); await vistaAtleti(); }
      else if (r === 'libreria') { disegnaTab('libreria'); vistaLibreria(); }
      else { disegnaTab('oggi'); await vistaOggi(); }
    } catch (e) { svuota(main, h('p', { class: 'gc-errore', testo: messaggioErrore(e) })); }
  }
  window.addEventListener('hashchange', instrada);

  // ---------------------------------------------------------------- oggi
  async function vistaOggi() {
    const oggi = new Date();
    const atleti = await ctx.api.elencoAtleti();
    const agenda = await agendaDiOggi(ctx.api, atleti, oggi);
    const fermi = atleti.filter(c => statoAtleta(c).chiave === 'fermo');
    svuota(main,
      h('div', { class: 'cp-data', testo: `${GIORNI_LUNGHI[indiceGiorno(oggi)]} ${oggi.getDate()} ${MESI[oggi.getMonth()]}` }),
      h('h1', { testo: agenda.length ? `${agenda.length} ${agenda.length === 1 ? 'atleta' : 'atleti'} oggi` : 'Giorno libero' }),
      h('div', { class: 'cp-lista' }, agenda.length ? agenda.map(({ atleta, programma, seduta }) => h('article', { class: 'cp-card' }, [
        h('div', { class: 'cp-persona' }, [
          h('span', { class: 'cp-avatar', testo: iniziali(atleta.nome) }),
          h('div', {}, [h('strong', { testo: atleta.nome }), h('span', { testo: `${seduta.nome} · ${seduta.esercizi.length} esercizi · ~${seduta.durataStimata} min` })])
        ]),
        h('p', { class: 'gc-tenue', style: 'margin:0', testo: `Ultima seduta ${quanto(giorniDa(atleta.ultimaSeduta))}` }),
        h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: 'Inizia allenamento', onclick: () => allena(atleta, programma, seduta) })
      ])) : h('p', { class: 'cp-vuoto', testo: 'Nessuna seduta in programma oggi. Puoi comunque allenare un atleta da "Atleti".' })),
      fermi.length ? h('h2', { testo: 'Da sentire' }) : null,
      fermi.length ? h('div', { class: 'cp-lista' }, fermi.map(c => h('a', { class: 'cp-riga', href: '#atleta-' + c.id, style: 'color:inherit;text-decoration:none' }, [
        h('span', {}, [h('strong', { testo: c.nome }), h('br'), h('span', { class: 'gc-tenue', testo: `Ultima seduta ${quanto(giorniDa(c.ultimaSeduta))}` })]),
        h('span', { class: 'gc-pill gc-pill-attenzione', testo: 'Fermo' })
      ]))) : null
    );
  }

  // ---------------------------------------------------------------- atleti
  async function vistaAtleti() {
    const atleti = await ctx.api.elencoAtleti();
    svuota(main,
      h('div', { class: 'cp-data', testo: 'I tuoi atleti' }),
      h('h1', { testo: `${atleti.length} atleti` }),
      h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: '+ Nuovo atleta', onclick: nuovoAtleta }),
      h('div', { class: 'cp-lista', style: 'margin-top:16px' }, atleti.map(c => {
        const s = statoAtleta(c);
        return h('a', { class: 'cp-riga', href: '#atleta-' + c.id, style: 'color:inherit;text-decoration:none' }, [
          h('span', { class: 'cp-persona' }, [h('span', { class: 'cp-avatar', testo: iniziali(c.nome) }), h('span', {}, [h('strong', { testo: c.nome }), h('span', { testo: OBIETTIVI[c.obiettivo] })])]),
          h('span', { class: `gc-pill gc-pill-${s.livello}`, testo: s.chiave === 'ok' ? 'Ok' : s.chiave === 'fermo' ? 'Fermo' : s.chiave === 'senza' ? 'No scheda' : 'Nuovo' })
        ]);
      }))
    );
  }

  function nuovoAtleta() {
    finestra('Nuovo atleta', chiudi => formAtleta({}, {
      compatto: true, etichetta: 'Crea e prepara programma',
      onSalva: async dati => {
        const c = await ctx.api.creaAtleta(dati);
        await ctx.api.creaProgramma(c.id, bozzaProgramma(c, ctx.personali));
        chiudi(); avviso(`${c.nome}: programma pronto`);
        location.hash = 'atleta-' + c.id;
      }
    }));
  }

  async function vistaAtleta(id) {
    const [atleta, programmi, sedute] = await Promise.all([ctx.api.leggiAtleta(id), ctx.api.programmi(id), ctx.api.sedute(id)]);
    const prog = programmaAttivo(programmi);
    const oggi = indiceGiorno();
    svuota(main,
      h('a', { href: '#atleti', class: 'gc-link', testo: '← Atleti' }),
      h('h1', { testo: atleta.nome, style: 'margin-top:10px' }),
      h('p', { class: 'gc-tenue', testo: `${OBIETTIVI[atleta.obiettivo]} · ${sedute.length} sedute registrate · ultima ${quanto(giorniDa(atleta.ultimaSeduta))}` }),
      atleta.note ? h('p', { class: 'cp-nota', testo: atleta.note }) : null,
      h('div', { class: 'cp-app' }, [
        h('span', { class: `gc-pill gc-pill-${statoApp(atleta).livello}`, testo: statoApp(atleta).etichetta }),
        h('button', { class: 'gc-btn gc-btn-piccolo', type: 'button', testo: atleta.accountAtleta ? 'Nuovo codice' : 'Invita all\u2019app', onclick: () => apriInvito(ctx, atleta, instrada) })
      ]),
      prog ? h('h2', { testo: prog.nome }) : null,
      prog ? h('div', { class: 'cp-lista' }, prog.scheda.sessioni.map(s => h('article', { class: 'cp-card' }, [
        h('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:baseline' }, [
          h('strong', { style: 'font:800 1.3rem var(--gc-font-titoli);text-transform:uppercase', testo: s.nome }),
          h('div', { class: 'cp-giorni' }, h('span', { class: s.giornoSuggerito === oggi ? 'oggi' : '', testo: GIORNI[s.giornoSuggerito] ?? '' }))
        ]),
        h('p', { class: 'gc-tenue', style: 'margin:0', testo: s.esercizi.map(e => e.nome).join(' · ') }),
        h('button', { class: 'gc-btn ' + (s.giornoSuggerito === oggi ? 'gc-btn-primario ' : '') + 'cp-grande', type: 'button', testo: 'Allena questa seduta', onclick: () => allena(atleta, prog, s) })
      ]))) : h('div', { class: 'cp-card' }, [
        h('p', { style: 'margin:0', testo: 'Nessuna scheda attiva.' }),
        h('button', { class: 'gc-btn gc-btn-primario cp-grande', type: 'button', testo: 'Prepara la scheda dal profilo', onclick: async () => {
          await ctx.api.creaProgramma(atleta.id, bozzaProgramma(atleta, ctx.personali)); avviso('Scheda pronta'); instrada();
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
  async function allena(atleta, programma, seduta) {
    const precedenti = await ctx.api.sedute(atleta.id);
    apriAllenamento({
      titolo: `${atleta.nome.split(' ')[0]} · ${seduta.nome}`, seduta, programmaId: programma.id,
      precedenti, personali: ctx.personali,
      salva: dati => ctx.api.registraSeduta(atleta.id, dati),
      alSalvato: r => { avviso(`Seduta di ${atleta.nome.split(' ')[0]} salvata: ${r.serie} serie`); instrada(); }
    });
  }

  await instrada();
});
