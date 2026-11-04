// Piccoli strumenti DOM condivisi dalle tre interfacce (nessun framework).

/** h('div', { class, testo, onclick, ... }, [figli]) */
export function h(tag, attr = {}, figli = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'testo') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const f of [].concat(figli)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

export function svuota(el, ...figli) { el.replaceChildren(...figli.flat().filter(Boolean)); return el; }

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
export function dataBreve(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MESI[m - 1]}`;
}
export function quanto(giorni) {
  if (giorni === null || giorni === undefined) return 'mai';
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  if (giorni < 14) return `${giorni} giorni fa`;
  return `${Math.round(giorni / 7)} settimane fa`;
}
export const kg = n => (n ? String(Math.round(n * 10) / 10).replace('.', ',') + ' kg' : 'corpo libero');
export const iniziali = nome => nome.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

/** Notifica breve in basso. */
export function avviso(testo, tipo = 'ok') {
  const el = h('div', { class: `gc-avviso gc-avviso-${tipo}`, role: 'status', testo });
  document.body.append(el);
  setTimeout(() => el.classList.add('via'), 2600);
  setTimeout(() => el.remove(), 3100);
}

/** Dialog modale nativo. `contenuto` puo' essere un nodo o una funzione (chiudi) => nodo. */
export function finestra(titolo, contenuto, { classe = '', alChiudere } = {}) {
  const d = h('dialog', { class: 'gc-finestra ' + classe });
  let chiusa = false;
  const chiudi = () => {
    if (chiusa) return;
    chiusa = true;
    if (alChiudere) alChiudere();
    d.close(); d.remove();
  };
  d.append(
    h('header', { class: 'gc-finestra-testa' }, [
      h('h2', { testo: titolo }),
      h('button', { class: 'gc-chiudi', type: 'button', 'aria-label': 'Chiudi', testo: '×', onclick: chiudi })
    ]),
    h('div', { class: 'gc-finestra-corpo' }, typeof contenuto === 'function' ? contenuto(chiudi) : contenuto)
  );
  d.addEventListener('cancel', e => { e.preventDefault(); chiudi(); });
  d.addEventListener('click', e => { if (e.target === d) chiudi(); });
  document.body.append(d);
  d.showModal();
  return chiudi;
}

/** Conferma dentro la pagina (niente confirm() del browser). */
export function chiediConferma(domanda, { si = 'Conferma', pericolo = false } = {}) {
  return new Promise(risolvi => {
    let fatto = false;
    const chiudi = finestra('Conferma', c => h('div', {}, [
      h('p', { testo: domanda }),
      h('div', { class: 'gc-azioni' }, [
        h('button', { class: 'gc-btn', type: 'button', testo: 'Annulla', onclick: () => { fatto = true; risolvi(false); c(); } }),
        h('button', { class: 'gc-btn gc-btn-primario' + (pericolo ? ' gc-btn-pericolo' : ''), type: 'button', testo: si, onclick: () => { fatto = true; risolvi(true); c(); } })
      ])
    ]));
    const d = document.querySelector('dialog.gc-finestra:last-of-type');
    d && d.addEventListener('close', () => { if (!fatto) risolvi(false); });
    return chiudi;
  });
}

/**
 * Grafico a linea dell'andamento (SVG). punti: [{ data, valore }].
 * Scala unica per linee, etichette e punto finale.
 */
export function grafico(punti, { larghezza = 320, altezza = 110, unita = 'kg' } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${larghezza} ${altezza}`);
  svg.setAttribute('class', 'gc-grafico');
  svg.setAttribute('role', 'img');
  if (!punti.length) return svg;
  const valori = punti.map(p => p.valore);
  let min = Math.min(...valori), max = Math.max(...valori);
  if (min === max) { min -= 5; max += 5; }
  const sx = 34, dx = 10, su = 12, giu = 20;
  const x = i => sx + (punti.length === 1 ? (larghezza - sx - dx) / 2 : i * (larghezza - sx - dx) / (punti.length - 1));
  const y = v => su + (1 - (v - min) / (max - min)) * (altezza - su - giu);
  const add = (tag, attr, testo) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attr) n.setAttribute(k, attr[k]);
    if (testo !== undefined) n.textContent = testo;
    svg.append(n);
    return n;
  };
  for (const v of [min, max]) {
    add('line', { x1: sx, x2: larghezza - dx, y1: y(v), y2: y(v), class: 'gc-grafico-griglia' });
    add('text', { x: sx - 6, y: y(v) + 3.5, 'text-anchor': 'end', class: 'gc-grafico-etichetta' }, String(Math.round(v * 10) / 10).replace('.', ','));
  }
  const linea = punti.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.valore).toFixed(1)}`).join('');
  add('path', { d: `${linea}L${x(punti.length - 1)} ${altezza - giu}L${x(0)} ${altezza - giu}Z`, class: 'gc-grafico-area' });
  add('path', { d: linea, class: 'gc-grafico-linea' });
  const ultimo = punti.at(-1);
  add('circle', { cx: x(punti.length - 1), cy: y(ultimo.valore), r: 4, class: 'gc-grafico-punto' });
  add('text', { x: sx, y: altezza - 5, class: 'gc-grafico-etichetta' }, dataBreve(punti[0].data));
  add('text', { x: larghezza - dx, y: altezza - 5, 'text-anchor': 'end', class: 'gc-grafico-etichetta' }, dataBreve(ultimo.data));
  svg.setAttribute('aria-label', `Da ${valori[0]} a ${ultimo.valore} ${unita}`);
  return svg;
}
