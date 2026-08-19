// Configurazione iniziale guidata.
import { h, toast } from '../ui.js';
import { blocchi, riepilogoCalcoli } from './profilo.js';
import { rigeneraTutto } from '../genera.js';
import { STATO_INIZIALE } from '../store.js';

const PASSI = [
  { id: 'anagrafica', titolo: 'Chi sei', sottotitolo: 'Servono per calcolare il tuo fabbisogno energetico.' },
  { id: 'obiettivo', titolo: 'Il tuo obiettivo', sottotitolo: 'Da qui dipendono calorie, macro e schema di allenamento.' },
  { id: 'allenamento', titolo: 'Come ti alleni', sottotitolo: 'Tempo a disposizione e attrezzatura.' },
  { id: 'alimentazione', titolo: 'Come mangi', sottotitolo: 'Numero di pasti e preferenze alimentari.' }
];

export function render(ctx) {
  const { stato, aggiorna } = ctx;
  const bozza = structuredClone(stato.profilo && stato.configurato ? stato.profilo : STATO_INIZIALE.profilo);
  let passo = 0;

  const radice = h('div');
  const corpo = h('div');
  const barra = h('div', { class: 'passo-wizard' }, PASSI.map(() => h('i')));
  const testata = h('div', { style: 'margin-bottom:14px' });
  const piede = h('div', { class: 'colonna', style: 'margin-top:6px' });

  radice.append(barra, testata, corpo, piede);

  function disegna() {
    barra.querySelectorAll('i').forEach((el, i) => el.classList.toggle('attivo', i <= passo));
    testata.textContent = '';
    testata.append(
      h('h1', { testo: PASSI[passo].titolo, style: 'margin-bottom:4px' }),
      h('p', { testo: PASSI[passo].sottotitolo, style: 'color:var(--testo-2);font-size:.9rem' })
    );
    corpo.textContent = '';
    const b = blocchi(bozza, () => { if (passo === PASSI.length - 1) aggiornaRiepilogo(); });
    const box = h('div', { class: 'scheda-box' }, b[PASSI[passo].id]);
    corpo.appendChild(box);
    if (passo === PASSI.length - 1) corpo.appendChild(riepilogoCalcoli(bozza));

    piede.textContent = '';
    piede.append(
      h('button', {
        class: 'btn',
        testo: passo === PASSI.length - 1 ? 'Crea scheda e dieta' : 'Avanti',
        onclick: () => {
          if (!valida()) return;
          if (passo < PASSI.length - 1) { passo++; disegna(); window.scrollTo(0, 0); return; }
          aggiorna(s => {
            s.profilo = bozza;
            s.configurato = true;
            s.ui.tab = 'oggi';
            rigeneraTutto(s);
          });
          toast('Tutto pronto!');
        }
      }),
      passo > 0 ? h('button', { class: 'btn secondario', testo: 'Indietro', onclick: () => { passo--; disegna(); window.scrollTo(0, 0); } }) : null
    );
  }

  function aggiornaRiepilogo() {
    const vecchio = corpo.querySelector('.scheda-box:last-child');
    if (!vecchio || corpo.children.length < 2) return;
    corpo.replaceChild(riepilogoCalcoli(bozza), corpo.lastChild);
  }

  function valida() {
    if (passo === 0) {
      if (!(bozza.eta >= 14 && bozza.eta <= 90)) { toast('Inserisci un\'eta valida'); return false; }
      if (!(bozza.peso >= 30 && bozza.peso <= 250)) { toast('Inserisci un peso valido'); return false; }
      if (!(bozza.altezza >= 130 && bozza.altezza <= 220)) { toast('Inserisci un\'altezza valida'); return false; }
    }
    return true;
  }

  disegna();
  return radice;
}
