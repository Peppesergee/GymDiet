// Modalita' allenamento: un esercizio alla volta, carichi e ripetizioni da
// digitare o con + e -, carico suggerito dall'ultima seduta, timer di recupero.
// La usano il trainer in sala (Campo) e l'atleta dalla sua app: cambia solo
// la funzione `salva`, che chiama l'API giusta.
import { h, svuota, avviso } from './dom.js';
import { trova, messaggioErrore } from './servizi.js';
import { apriSchedaTecnica } from './esercizi-ui.js';
import { creaAnimazione } from '../../shared/anim.js';
import { ultimoCarico, suggerimento, isoData } from '../../shared/progressi.js';

const virgola = n => String(n).replace('.', ',');

/**
 * @param titolo      riga in alto (es. "Marco · Upper")
 * @param seduta      seduta della scheda { id, nome, esercizi }
 * @param programmaId scheda a cui collegare la seduta registrata
 * @param precedenti  sedute gia' registrate (per carico suggerito)
 * @param personali   esercizi personali (per "come si fa")
 * @param salva       async (seduta) => void
 * @param alSalvato   (riepilogo) => void
 */
export function apriAllenamento({ titolo, seduta, programmaId, precedenti = [], personali = [], salva, alSalvato }) {
  const inizio = Date.now();
  const dati = seduta.esercizi.map(v => {
    const prec = ultimoCarico(precedenti, v.esercizioId);
    const sugg = suggerimento(v, prec);
    const alto = Number(String(v.ripetizioni).match(/(\d+)\s*$/)?.[1] || String(v.ripetizioni).match(/\d+/)?.[0] || 10);
    return {
      v, prec, sugg,
      serie: Array.from({ length: Number(v.serie) || 1 }, () => ({ peso: sugg.peso ?? 0, rip: alto, fatto: false }))
    };
  });
  let indice = 0, anim = null, timer = null, note = '';
  const strato = h('div', { class: 'al-sessione', role: 'dialog', 'aria-label': titolo });
  const dentro = h('div', { class: 'al-sessione-dentro' });
  const barraTimer = h('div', { class: 'al-timer', hidden: true });
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

  // valore digitabile (tastiera numerica sul telefono) con + e - ai lati
  let progressivo = 0;
  const stepper = (valore, passo, unita, alCambio, { decimali = false, etichetta = unita } = {}) => {
    const id = 'al-val-' + (++progressivo);
    const arrotonda = v => Math.min(999, Math.max(0, decimali ? Math.round(v * 100) / 100 : Math.round(v)));
    const input = h('input', {
      class: 'al-valore', id, value: virgola(valore), type: 'text', autocomplete: 'off',
      inputmode: decimali ? 'decimal' : 'numeric', enterkeyhint: 'done', 'aria-label': etichetta
    });
    const leggi = () => {
      const n = parseFloat(input.value.replace(',', '.'));
      return Number.isFinite(n) ? arrotonda(n) : null;
    };
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      // solo cifre e un separatore decimale
      const pulito = input.value.replace(decimali ? /[^0-9.,]/g : /[^0-9]/g, '');
      if (pulito !== input.value) input.value = pulito;
      const n = leggi();
      if (n !== null) { valore = n; alCambio(valore); }
    });
    input.addEventListener('blur', () => { input.value = virgola(valore); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    const imposta = v => { valore = arrotonda(v); input.value = virgola(valore); alCambio(valore); };
    return h('div', { class: 'al-stepper' }, [
      h('button', { type: 'button', 'aria-label': `meno ${virgola(passo)} ${unita}`, testo: '−', onclick: () => imposta(valore - passo) }),
      h('label', { class: 'al-campo', for: id }, [input, h('small', { testo: unita })]),
      h('button', { type: 'button', 'aria-label': `piu' ${virgola(passo)} ${unita}`, testo: '+', onclick: () => imposta(valore + passo) })
    ]);
  };

  function disegna() {
    anim && anim.destroy();
    const d = dati[indice];
    const box = h('div', { class: 'anim-box' });
    const ultimo = indice === dati.length - 1;
    svuota(dentro,
      h('div', { class: 'al-sessione-testa' }, [
        h('strong', { testo: titolo }),
        h('button', { class: 'gc-chiudi', type: 'button', 'aria-label': 'Chiudi allenamento', testo: '×', onclick: chiudi })
      ]),
      h('div', { class: 'al-progresso' }, dati.map((x, i) => h('i', { class: i === indice ? 'ora' : x.serie.every(s => s.fatto) ? 'fatto' : '' }))),
      h('div', { class: 'al-esercizio' }, [box, h('div', {}, [
        h('h2', { testo: d.v.nome }),
        h('p', { testo: `${d.v.serie} × ${d.v.ripetizioni}${d.v.recupero ? ` · recupero ${d.v.recupero}s` : ''}` }),
        h('button', { class: 'gc-link', type: 'button', style: 'margin-top:6px', testo: 'Come si fa', onclick: () => { const es = trova(d.v.esercizioId, personali); es && apriSchedaTecnica(es); } })
      ])]),
      d.v.note ? h('p', { class: 'al-nota-trainer' }, [h('strong', { testo: 'Nota del trainer: ' }), d.v.note]) : null,
      h('p', { class: 'al-consiglio', testo: d.sugg.testo + (d.prec ? ` (ultima volta: ${d.prec.serie.map(s => `${virgola(s.peso)}×${s.rip}`).join(', ')})` : '') }),
      ...d.serie.map((s, i) => h('div', { class: 'al-serie' }, [
        h('span', { class: 'n', testo: i + 1 }),
        stepper(s.peso, 2.5, 'kg', v => { s.peso = v; }, { decimali: true, etichetta: `Serie ${i + 1}, chili` }),
        stepper(s.rip, 1, d.v.durata ? 'sec' : 'rip', v => { s.rip = v; }, { etichetta: `Serie ${i + 1}, ${d.v.durata ? 'secondi' : 'ripetizioni'}` }),
        h('button', { class: 'al-fatto', type: 'button', 'aria-label': `Serie ${i + 1} fatta`, 'aria-pressed': String(s.fatto), testo: '✓', onclick: e => {
          s.fatto = !s.fatto; e.currentTarget.setAttribute('aria-pressed', String(s.fatto));
          if (s.fatto) {
            // la serie dopo parte dal carico appena usato
            d.serie.slice(i + 1).forEach(x => { if (!x.fatto) x.peso = s.peso; });
            avviaRecupero(d.v.recupero);
            if (d.serie.every(x => x.fatto) && !ultimo) setTimeout(() => { indice++; disegna(); }, 400); else disegna();
          }
        } })
      ])),
      ultimo ? h('textarea', { class: 'al-note', id: 'al-note', placeholder: 'Note sulla seduta (facoltative): come e’ andata, fastidi, sensazioni', oninput: e => { note = e.target.value; } }, note) : null,
      h('div', { class: 'al-naviga' }, [
        h('button', { class: 'gc-btn al-grande', type: 'button', testo: '‹ Prima', disabled: indice === 0, onclick: () => { indice--; disegna(); } }),
        ultimo
          ? h('button', { class: 'gc-btn gc-btn-primario al-grande', type: 'button', testo: 'Termina e salva', onclick: termina })
          : h('button', { class: 'gc-btn gc-btn-primario al-grande', type: 'button', testo: 'Prossimo ›', onclick: () => { indice++; disegna(); } })
      ])
    );
    if (ultimo) dentro.querySelector('#al-note').value = note;
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
      await salva({
        data: isoData(), programmaId, sessioneRef: seduta.id, nomeSessione: seduta.nome,
        durataMin: Math.max(1, Math.round((Date.now() - inizio) / 60000)), note: note.trim(), esercizi
      });
      chiudi();
      alSalvato && alSalvato({ serie: esercizi.reduce((t, x) => t + x.serie.length, 0), esercizi: esercizi.length });
    } catch (x) { avviso(messaggioErrore(x), 'errore'); btn.disabled = false; }
  }

  disegna();
  return chiudi;
}
