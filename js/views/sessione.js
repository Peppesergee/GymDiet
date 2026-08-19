// Modalita' allenamento: registrazione serie, timer di recupero, salvataggio.
import { h, foglio, toast, beep, mmss, conferma } from '../ui.js';
import { apriEsercizio } from './esercizio.js';
import { creaAnimazione } from '../anim.js';
import { oggiISO } from '../store.js';

/** Ultimo carico registrato per un esercizio. */
export function ultimoCarico(log, esercizioId) {
  for (let i = log.sessioni.length - 1; i >= 0; i--) {
    const s = log.sessioni[i];
    const e = (s.esercizi || []).find(x => x.esercizioId === esercizioId);
    if (e && e.serie && e.serie.length) {
      const valide = e.serie.filter(x => Number(x.peso) > 0 || Number(x.rip) > 0);
      if (valide.length) return { data: s.data, serie: valide };
    }
  }
  return null;
}

function limiteAltoRipetizioni(testo) {
  const m = String(testo).match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Number(m[2]);
  const s = String(testo).match(/(\d+)/);
  return s ? Number(s[1]) : null;
}

/** Suggerimento di progressione in base all'ultima seduta. */
export function suggerimento(voce, precedente) {
  if (!precedente) return 'Prima volta: parti con un carico che ti lasci 2 ripetizioni di margine.';
  const alto = limiteAltoRipetizioni(voce.ripetizioni);
  const tutteAlLimite = alto && precedente.serie.every(s => Number(s.rip) >= alto);
  const peso = Math.max(...precedente.serie.map(s => Number(s.peso) || 0));
  if (!peso) return 'Ultima volta a corpo libero: aggiungi ripetizioni o rallenta la fase negativa.';
  if (tutteAlLimite) {
    const incremento = ['squat', 'hinge', 'affondo'].includes(voce.pattern) ? 5 : 2.5;
    return `Hai chiuso tutte le serie al limite alto: sali a ${(peso + incremento).toFixed(1).replace('.0', '')} kg.`;
  }
  return `Ultima volta ${peso} kg. Aggiungi ripetizioni fino a chiudere tutte le serie al limite alto.`;
}

export function apriSessione(sessione, ctx) {
  const { stato, aggiorna } = ctx;
  const inizio = Date.now();
  const dati = sessione.esercizi.map(voce => ({
    voce,
    serie: Array.from({ length: Number(voce.serie) || 1 }, () => ({ peso: '', rip: '' }))
  }));

  const animazioni = [];
  let timerId = null, timerFine = 0;
  const barraTimer = h('div', { class: 'timer nascosto' });

  function avviaTimer(secondi) {
    if (!secondi) return;
    timerFine = Date.now() + secondi * 1000;
    barraTimer.classList.remove('nascosto');
    clearInterval(timerId);
    const disegna = () => {
      const restanti = (timerFine - Date.now()) / 1000;
      if (restanti <= 0) {
        clearInterval(timerId);
        barraTimer.classList.add('nascosto');
        beep(880); setTimeout(() => beep(1180), 220);
        if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
        return;
      }
      barraTimer.textContent = '';
      barraTimer.append(
        h('span', { testo: 'Recupero ' + mmss(restanti) }),
        h('button', { testo: '+30s', onclick: () => { timerFine += 30000; disegna(); } }),
        h('button', { testo: 'Stop', onclick: () => { clearInterval(timerId); barraTimer.classList.add('nascosto'); } })
      );
    };
    disegna();
    timerId = setInterval(disegna, 250);
  }

  const contenuto = h('div');
  contenuto.appendChild(h('div', { class: 'info-box', style: 'margin-bottom:12px' }, [
    h('strong', { testo: 'Riscaldamento: ' }), sessione.riscaldamento.join(' · ')
  ]));

  dati.forEach((riga, idx) => {
    const voce = riga.voce;
    const precedente = ultimoCarico(stato.log, voce.esercizioId);
    const boxAnim = h('div', { class: 'anim-box', style: 'width:56px;height:56px;flex:0 0 56px' });
    animazioni.push(creaAnimazione(boxAnim, voce.anim, { durata: 3200 }));

    const righeSerie = h('div');
    riga.serie.forEach((serie, i) => {
      righeSerie.appendChild(h('div', { class: 'serie-riga' }, [
        h('div', { class: 'n', testo: String(i + 1) }),
        h('input', {
          type: 'number', inputmode: 'decimal', placeholder: 'kg', step: '0.5',
          oninput: e => { serie.peso = e.target.value; }
        }),
        h('input', {
          type: 'number', inputmode: 'numeric', placeholder: voce.durata ? 'sec' : 'rip',
          oninput: e => { serie.rip = e.target.value; }
        }),
        h('button', {
          class: 'spunta', testo: '✓', title: 'Serie completata',
          onclick: e => {
            e.currentTarget.classList.toggle('fatto');
            if (e.currentTarget.classList.contains('fatto')) avviaTimer(voce.recupero);
          }
        })
      ]));
    });

    contenuto.appendChild(h('div', { class: 'scheda-box compatta' }, [
      h('div', { class: 'riga', style: 'margin-bottom:8px' }, [
        boxAnim,
        h('div', { style: 'flex:1;min-width:0' }, [
          h('div', { style: 'font-weight:650', testo: `${idx + 1}. ${voce.nome}` }),
          h('div', { class: 'par', style: 'font-size:.8rem;color:var(--testo-2)', testo: `${voce.serie} × ${voce.ripetizioni}${voce.recupero ? ' · rec ' + voce.recupero + 's' : ''}` })
        ]),
        h('button', { class: 'btn secondario piccolo', testo: 'Come si fa', onclick: () => apriEsercizio(voce, {}) })
      ]),
      h('div', { class: 'info-box', style: 'margin-bottom:9px;font-size:.8rem' }, suggerimento(voce, precedente)),
      righeSerie
    ]));
  });

  const note = h('textarea', { rows: 2, placeholder: 'Note sulla seduta (facoltative)' });
  contenuto.appendChild(h('div', { class: 'campo' }, [note]));

  contenuto.appendChild(h('button', {
    class: 'btn', testo: 'Termina e salva',
    onclick: async () => {
      const durataMin = Math.max(1, Math.round((Date.now() - inizio) / 60000));
      const esercizi = dati.map(r => ({
        esercizioId: r.voce.esercizioId,
        nome: r.voce.nome,
        serie: r.serie.filter(s => s.peso !== '' || s.rip !== '').map(s => ({ peso: Number(s.peso) || 0, rip: Number(s.rip) || 0 }))
      })).filter(e => e.serie.length);
      if (!esercizi.length) {
        const ok = await conferma('Non hai registrato nessuna serie. Salvare comunque la seduta?');
        if (!ok) return;
      }
      aggiorna(s => {
        s.log.sessioni.push({
          id: 'w' + Date.now(),
          data: oggiISO(),
          sessioneId: sessione.id,
          nome: sessione.nome,
          durataMin,
          esercizi,
          note: note.value.trim()
        });
      });
      chiudi();
      toast('Allenamento salvato');
    }
  }));

  contenuto.appendChild(h('div', { style: 'height:8px' }));
  document.body.appendChild(barraTimer);

  const chiudi = foglio(contenuto, {
    titolo: sessione.nome,
    allaChiusura: () => {
      animazioni.forEach(a => a.destroy());
      clearInterval(timerId);
      barraTimer.remove();
    }
  });
  return chiudi;
}
