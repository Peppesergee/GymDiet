// Bootstrap dell'applicazione: navigazione e rendering delle viste.
import { h, svuota, icona } from './ui.js';
import { getStato, aggiorna, ascolta, indiceGiorno } from './store.js';
import * as vistaOggi from './views/oggi.js';
import * as vistaScheda from './views/scheda.js';
import * as vistaDieta from './views/dietaview.js';
import * as vistaProgressi from './views/progressi.js';
import * as vistaProfilo from './views/profilo.js';
import * as vistaWizard from './views/wizard.js';
import { GIORNI } from './dieta.js';

const TAB = [
  { id: 'oggi', nome: 'Oggi', vista: vistaOggi },
  { id: 'scheda', nome: 'Scheda', vista: vistaScheda },
  { id: 'dieta', nome: 'Dieta', vista: vistaDieta },
  { id: 'progressi', nome: 'Progressi', vista: vistaProgressi },
  { id: 'profilo', nome: 'Profilo', vista: vistaProfilo }
];

const app = document.getElementById('app');
const intestazione = h('header', { class: 'intestazione' });
const contenuto = h('main');
const nav = h('nav', { class: 'nav' });
app.append(intestazione, contenuto, nav);

function vaiA(tab) {
  aggiorna(s => { s.ui.tab = tab; });
  window.scrollTo(0, 0);
}

const ctx = { get stato() { return getStato(); }, aggiorna, vaiA };

function disegnaNav(attiva) {
  svuota(nav);
  for (const t of TAB) {
    nav.appendChild(h('button', {
      class: t.id === attiva ? 'attivo' : '',
      onclick: () => vaiA(t.id)
    }, [
      h('span', { html: icona(t.id) }),
      h('span', { testo: t.nome })
    ]));
  }
}

function disegna() {
  const stato = getStato();
  vistaScheda.pulisci();
  svuota(contenuto);
  svuota(intestazione);

  if (!stato.configurato) {
    nav.classList.add('nascosto');
    intestazione.appendChild(h('div', { class: 'riga' }, [
      h('div', {}, [
        h('h1', { testo: 'GymDiet' }),
        h('div', { class: 'sottotitolo', testo: 'Scheda e dieta su misura' })
      ])
    ]));
    contenuto.appendChild(vistaWizard.render(ctx));
    return;
  }

  nav.classList.remove('nascosto');
  const tab = TAB.find(t => t.id === stato.ui.tab) || TAB[0];
  const oggi = new Date();
  const sottotitoli = {
    oggi: `${GIORNI[indiceGiorno()]} ${oggi.getDate()}/${oggi.getMonth() + 1}`,
    scheda: stato.scheda ? stato.scheda.split : 'Allenamento',
    dieta: stato.macro ? `${stato.macro.kcal} kcal · ${stato.macro.proteine}P ${stato.macro.carboidrati}C ${stato.macro.grassi}G` : 'Piano alimentare',
    progressi: 'Il tuo storico',
    profilo: 'Dati e preferenze'
  };
  intestazione.appendChild(h('div', { class: 'riga-sp' }, [
    h('div', {}, [
      h('h1', { testo: tab.id === 'oggi' ? (stato.profilo.nome ? 'Ciao ' + stato.profilo.nome : 'GymDiet') : tab.nome }),
      h('div', { class: 'sottotitolo', testo: sottotitoli[tab.id] || '' })
    ])
  ]));

  disegnaNav(tab.id);
  contenuto.appendChild(tab.vista.render(ctx));
}

ascolta(disegna);
disegna();

// ------------------------------------------------------------ service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW non registrato', e));
  });
}
