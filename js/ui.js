// Helper per la costruzione dell'interfaccia.

const TAG_SVG = new Set(['svg', 'path', 'circle', 'line', 'rect', 'text', 'g', 'polyline', 'polygon', 'ellipse', 'tspan', 'defs', 'linearGradient', 'stop']);

export function h(tag, attrs = {}, figli = []) {
  const svg = TAG_SVG.has(tag);
  const e = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') svg ? e.setAttribute('class', v) : (e.className = v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'testo') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'dati') for (const d in v) e.dataset[d] = v[d];
    else e.setAttribute(k, v === true ? '' : v);
  }
  const lista = Array.isArray(figli) ? figli : [figli];
  for (const f of lista) {
    if (f === null || f === undefined || f === false) continue;
    e.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
  }
  return e;
}

export function svuota(nodo) { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); return nodo; }

export function toast(messaggio, ms = 2000) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast', testo: messaggio });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/** Foglio modale che sale dal basso. Ritorna una funzione per chiuderlo. */
export function foglio(contenuto, opzioni = {}) {
  const corpo = h('div', { class: 'foglio' }, [h('div', { class: 'maniglia' })]);
  if (opzioni.titolo) corpo.appendChild(h('h2', { testo: opzioni.titolo }));
  const lista = Array.isArray(contenuto) ? contenuto : [contenuto];
  lista.forEach(c => c && corpo.appendChild(c));
  const sfondo = h('div', { class: 'foglio-sfondo' }, [corpo]);
  const chiudi = () => {
    sfondo.remove();
    document.body.style.overflow = '';
    if (opzioni.allaChiusura) opzioni.allaChiusura();
  };
  sfondo.addEventListener('click', ev => { if (ev.target === sfondo) chiudi(); });
  document.body.appendChild(sfondo);
  document.body.style.overflow = 'hidden';
  return chiudi;
}

export function conferma(messaggio) {
  return new Promise(risolvi => {
    let chiudi;
    const contenuto = h('div', {}, [
      h('p', { testo: messaggio, style: 'margin-bottom:16px' }),
      h('div', { class: 'colonna' }, [
        h('button', { class: 'btn pericolo', testo: 'Conferma', onclick: () => { chiudi(); risolvi(true); } }),
        h('button', { class: 'btn secondario', testo: 'Annulla', onclick: () => { chiudi(); risolvi(false); } })
      ])
    ]);
    chiudi = foglio(contenuto, { titolo: 'Sei sicuro?', allaChiusura: () => risolvi(false) });
  });
}

export function num(v, decimali = 0) {
  const n = Number(v) || 0;
  return n.toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
}

export function macroRiga(m, opzioni = {}) {
  return h('div', { class: 'macro-riga' }, [
    cella('k', num(m.kcal), 'kcal'),
    cella('p', num(m.proteine) + ' g', 'proteine'),
    cella('c', num(m.carboidrati) + ' g', 'carboidr.'),
    cella('g', num(m.grassi) + ' g', 'grassi')
  ]);
  function cella(cls, valore, etichetta) {
    return h('div', { class: 'macro-cella ' + cls }, [
      h('div', { class: 'valore', testo: valore }),
      h('div', { class: 'etichetta', testo: etichetta })
    ]);
  }
}

export function barraMacro(m) {
  const kp = m.proteine * 4, kc = m.carboidrati * 4, kg = m.grassi * 9;
  const tot = Math.max(1, kp + kc + kg);
  return h('div', { class: 'barra' }, [
    h('i', { class: 'p', style: `width:${kp / tot * 100}%` }),
    h('i', { class: 'c', style: `width:${kc / tot * 100}%` }),
    h('i', { class: 'g', style: `width:${kg / tot * 100}%` })
  ]);
}

export function sezione(titolo, figli, opzioni = {}) {
  const box = h('div', { class: 'scheda-box' + (opzioni.compatta ? ' compatta' : '') });
  if (titolo) {
    box.appendChild(opzioni.azione
      ? h('div', { class: 'riga-sp', style: 'margin-bottom:8px' }, [h('h3', { testo: titolo, class: 'mb0' }), opzioni.azione])
      : h('h3', { testo: titolo }));
  }
  (Array.isArray(figli) ? figli : [figli]).forEach(f => f && box.appendChild(f));
  return box;
}

export function campo(etichetta, controllo, aiuto) {
  return h('div', { class: 'campo' }, [
    etichetta ? h('label', { testo: etichetta }) : null,
    controllo,
    aiuto ? h('small', { testo: aiuto }) : null
  ]);
}

export function select(valore, opzioni, onChange) {
  const s = h('select', { onchange: e => onChange(e.target.value) });
  for (const o of opzioni) {
    s.appendChild(h('option', { value: o.id, testo: o.nome, selected: String(o.id) === String(valore) }));
  }
  return s;
}

export function chips(valoreAttivo, opzioni, onChange, multiplo = false) {
  const box = h('div', { class: 'chip-gruppo' });
  const bottoni = [];
  // la selezione vive qui dentro: i chip si aggiornano da soli a ogni tocco,
  // senza dipendere da un ridisegno della vista che li contiene
  let selezione = multiplo ? [...(valoreAttivo || [])] : valoreAttivo;

  const evidenzia = () => {
    for (const { id, elemento } of bottoni) {
      const attivo = multiplo
        ? selezione.some(x => String(x) === String(id))
        : String(selezione) === String(id);
      elemento.classList.toggle('attivo', attivo);
      elemento.setAttribute('aria-pressed', attivo ? 'true' : 'false');
    }
  };

  for (const o of opzioni) {
    const elemento = h('button', {
      type: 'button', class: 'chip', testo: o.nome,
      onclick: () => {
        if (multiplo) {
          selezione = selezione.some(x => String(x) === String(o.id))
            ? selezione.filter(x => String(x) !== String(o.id))
            : [...selezione, o.id];
          evidenzia();
          onChange([...selezione]);
        } else {
          if (String(selezione) === String(o.id)) return;
          selezione = o.id;
          evidenzia();
          onChange(o.id);
        }
      }
    });
    bottoni.push({ id: o.id, elemento });
    box.appendChild(elemento);
  }

  evidenzia();
  return box;
}

export function icona(nome) {
  const p = {
    oggi: '<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>',
    scheda: '<path d="M6.5 6.5h11"/><path d="M4 9h2.5v6H4z"/><path d="M17.5 9H20v6h-2.5z"/><path d="M6.5 12h11"/><path d="M6.5 17.5h11"/>',
    dieta: '<path d="M6 3v8a3 3 0 0 0 6 0V3"/><path d="M9 11v10"/><path d="M17 3c-1.5 2-2 4-2 6s.7 3 2 3 2-1 2-3-.5-4-2-6z"/><path d="M17 12v9"/>',
    progressi: '<path d="M3 20h18"/><path d="M6 20v-6"/><path d="M11 20V8"/><path d="M16 20v-9"/><path d="M21 20V5"/>',
    profilo: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  }[nome] || '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

/** Beep breve di fine recupero (Web Audio, funziona anche su iOS dopo un tap). */
let ctxAudio = null;
export function beep(frequenza = 880, durata = 0.18) {
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (ctxAudio.state === 'suspended') ctxAudio.resume();
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osc.frequency.value = frequenza;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.001, ctxAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctxAudio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + durata);
    osc.connect(gain); gain.connect(ctxAudio.destination);
    osc.start(); osc.stop(ctxAudio.currentTime + durata + 0.02);
  } catch (e) { /* audio non disponibile */ }
}

export function mmss(secondi) {
  const s = Math.max(0, Math.round(secondi));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
