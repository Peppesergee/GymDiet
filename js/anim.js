// Renderer SVG animato per le figure degli esercizi.
import { ANIMAZIONI, ANIM_DEFAULT } from './poses.js';

const NS = 'http://www.w3.org/2000/svg';
const GIUNTI_ARTO2 = ['elbow2', 'wrist2', 'knee2', 'ankle2', 'toe2'];

function el(tag, attrs) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return 0.5 - Math.cos(Math.PI * t) / 2; }

function interpolaPose(a, b, t) {
  const out = {};
  const chiavi = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of chiavi) {
    const pa = a[k] || b[k];
    const pb = b[k] || a[k];
    if (!Array.isArray(pa)) continue;
    out[k] = [lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t)];
  }
  return out;
}

function disegnaScena(svg, scena) {
  const g = el('g', { class: 'anim-scena' });
  for (const s of scena || []) {
    switch (s) {
      case 'pavimento':
        g.appendChild(el('line', { x1: 2, y1: 94, x2: 98, y2: 94, class: 'anim-pavimento' }));
        break;
      case 'panca':
        g.appendChild(el('rect', { x: 22, y: 66, width: 56, height: 4, rx: 1.5, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 28, y1: 70, x2: 28, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 72, y1: 70, x2: 72, y2: 94, class: 'anim-oggetto-linea' }));
        break;
      case 'pancapiana':
        g.appendChild(el('rect', { x: 14, y: 64, width: 62, height: 4, rx: 1.5, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 20, y1: 68, x2: 20, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 70, y1: 68, x2: 70, y2: 94, class: 'anim-oggetto-linea' }));
        break;
      case 'pancabassa':
        g.appendChild(el('rect', { x: 8, y: 60, width: 30, height: 4, rx: 1.5, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 12, y1: 64, x2: 12, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 34, y1: 64, x2: 34, y2: 94, class: 'anim-oggetto-linea' }));
        break;
      case 'seduta':
        g.appendChild(el('rect', { x: 30, y: 68, width: 26, height: 4, rx: 1.5, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 42, y1: 72, x2: 42, y2: 94, class: 'anim-oggetto-linea' }));
        break;
      case 'cavoalto':
        g.appendChild(el('line', { x1: 92, y1: 6, x2: 92, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 50, y1: 6, x2: 94, y2: 6, class: 'anim-oggetto-linea' }));
        break;
      case 'cavobasso':
        g.appendChild(el('line', { x1: 92, y1: 40, x2: 92, y2: 94, class: 'anim-oggetto-linea' }));
        break;
      case 'sbarra':
        g.appendChild(el('line', { x1: 22, y1: 13, x2: 78, y2: 13, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 24, y1: 13, x2: 24, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 76, y1: 13, x2: 76, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 2, y1: 94, x2: 98, y2: 94, class: 'anim-pavimento' }));
        break;
      case 'parallele':
        g.appendChild(el('line', { x1: 36, y1: 60, x2: 74, y2: 60, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 40, y1: 60, x2: 40, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 70, y1: 60, x2: 70, y2: 94, class: 'anim-oggetto-linea' }));
        g.appendChild(el('line', { x1: 2, y1: 94, x2: 98, y2: 94, class: 'anim-pavimento' }));
        break;
      case 'macchina':
        g.appendChild(el('rect', { x: 24, y: 62, width: 22, height: 4, rx: 1.5, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 24, y1: 62, x2: 24, y2: 34, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 34, y1: 66, x2: 34, y2: 94, class: 'anim-oggetto-linea' }));
        break;
      case 'pressa':
        g.appendChild(el('line', { x1: 10, y1: 46, x2: 32, y2: 76, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 28, y1: 78, x2: 46, y2: 78, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 62, y1: 60, x2: 86, y2: 26, class: 'anim-oggetto' }));
        break;
      case 'rialzo':
        g.appendChild(el('rect', { x: 40, y: 84, width: 26, height: 10, rx: 1, class: 'anim-oggetto' }));
        g.appendChild(el('line', { x1: 2, y1: 94, x2: 98, y2: 94, class: 'anim-pavimento' }));
        break;
    }
  }
  svg.appendChild(g);
}

/**
 * Crea un'animazione dentro un contenitore.
 * @returns {{destroy:Function, pausa:Function, riprendi:Function}}
 */
export function creaAnimazione(container, chiave, opzioni = {}) {
  const def = ANIMAZIONI[chiave] || ANIMAZIONI[ANIM_DEFAULT];
  const durata = opzioni.durata || 2600;
  const svg = el('svg', { viewBox: '0 0 100 100', class: 'anim-svg', 'aria-hidden': 'true' });
  container.innerHTML = '';
  disegnaScena(svg, def.scena);

  const gAttrezzo = el('g', { class: 'anim-attrezzo' });
  const gArto2 = el('g', { class: 'anim-arto2' });
  const gCorpo = el('g', { class: 'anim-corpo' });
  svg.appendChild(gArto2);
  svg.appendChild(gAttrezzo);
  svg.appendChild(gCorpo);
  container.appendChild(svg);

  // elementi corpo
  const testa = el('circle', { r: 6, class: 'anim-testa' });
  const segmenti = {};
  const nomiSeg = [
    ['neck', 'shoulder'], ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle'], ['ankle', 'toe'],
    ['shoulder', 'elbow'], ['elbow', 'wrist']
  ];
  for (const [a, b] of nomiSeg) {
    const l = el('line', { class: 'anim-seg' });
    segmenti[a + '-' + b] = l;
    gCorpo.appendChild(l);
  }
  gCorpo.appendChild(testa);
  const giunti = {};
  for (const nome of ['shoulder', 'elbow', 'hip', 'knee', 'ankle']) {
    const c = el('circle', { r: 1.6, class: 'anim-giunto' });
    giunti[nome] = c;
    gCorpo.appendChild(c);
  }

  const seg2 = {};
  for (const [a, b] of [['hip', 'knee2'], ['knee2', 'ankle2'], ['ankle2', 'toe2'], ['shoulder', 'elbow2'], ['elbow2', 'wrist2']]) {
    const l = el('line', { class: 'anim-seg2' });
    seg2[a + '-' + b] = l;
    gArto2.appendChild(l);
  }

  // attrezzo
  let attrezzoEls = [];
  const at = def.attrezzo;
  if (at) {
    if (at.tipo === 'bilanciere') {
      const barra = el('line', { class: 'anim-barra' });
      const p1 = el('circle', { r: 5.5, class: 'anim-disco' });
      const p2 = el('circle', { r: 5.5, class: 'anim-disco' });
      attrezzoEls = [barra, p1, p2];
    } else if (at.tipo === 'manubrio') {
      const barra = el('line', { class: 'anim-barra' });
      const p1 = el('circle', { r: 2.6, class: 'anim-disco' });
      const p2 = el('circle', { r: 2.6, class: 'anim-disco' });
      attrezzoEls = [barra, p1, p2];
    } else if (at.tipo === 'cavo') {
      attrezzoEls = [el('line', { class: 'anim-cavo' }), el('circle', { r: 2, class: 'anim-disco' })];
    }
    attrezzoEls.forEach(e => gAttrezzo.appendChild(e));
  }

  function applica(pose) {
    if (pose.head) {
      testa.setAttribute('cx', pose.head[0]);
      testa.setAttribute('cy', pose.head[1]);
    }
    for (const [a, b] of nomiSeg) {
      const l = segmenti[a + '-' + b];
      const pa = pose[a], pb = pose[b];
      if (!pa || !pb) { l.setAttribute('opacity', 0); continue; }
      l.setAttribute('opacity', 1);
      l.setAttribute('x1', pa[0]); l.setAttribute('y1', pa[1]);
      l.setAttribute('x2', pb[0]); l.setAttribute('y2', pb[1]);
    }
    // collo (testa -> neck)
    for (const nome in giunti) {
      const p = pose[nome];
      if (!p) continue;
      giunti[nome].setAttribute('cx', p[0]);
      giunti[nome].setAttribute('cy', p[1]);
    }
    const haArto2 = GIUNTI_ARTO2.some(k => pose[k]);
    gArto2.setAttribute('opacity', haArto2 ? 1 : 0);
    if (haArto2) {
      for (const key in seg2) {
        const [a, b] = key.split('-');
        const pa = pose[a], pb = pose[b];
        const l = seg2[key];
        if (!pa || !pb) { l.setAttribute('opacity', 0); continue; }
        l.setAttribute('opacity', 1);
        l.setAttribute('x1', pa[0]); l.setAttribute('y1', pa[1]);
        l.setAttribute('x2', pb[0]); l.setAttribute('y2', pb[1]);
      }
    }
    if (at && attrezzoEls.length) {
      if (at.tipo === 'cavo') {
        const w = pose[at.a] || pose.wrist;
        attrezzoEls[0].setAttribute('x1', at.da[0]); attrezzoEls[0].setAttribute('y1', at.da[1]);
        attrezzoEls[0].setAttribute('x2', w[0]); attrezzoEls[0].setAttribute('y2', w[1]);
        attrezzoEls[1].setAttribute('cx', w[0]); attrezzoEls[1].setAttribute('cy', w[1]);
      } else {
        const p = pose[at.ancora] || pose.wrist;
        const larghezza = at.tipo === 'bilanciere' ? 13 : 5;
        attrezzoEls[0].setAttribute('x1', p[0] - larghezza); attrezzoEls[0].setAttribute('y1', p[1]);
        attrezzoEls[0].setAttribute('x2', p[0] + larghezza); attrezzoEls[0].setAttribute('y2', p[1]);
        attrezzoEls[1].setAttribute('cx', p[0] - larghezza); attrezzoEls[1].setAttribute('cy', p[1]);
        attrezzoEls[2].setAttribute('cx', p[0] + larghezza); attrezzoEls[2].setAttribute('cy', p[1]);
      }
    }
  }

  const pose = def.pose;
  const nFasi = pose.length;
  const loop = def.ciclo === 'loop';
  let inizio = null, rafId = null, attivo = true, ultimo = 0;
  const intervallo = 1000 / (opzioni.fps || 30);
  const etichetta = opzioni.etichetta || null;

  function frame(ts) {
    if (!attivo) return;
    if (inizio === null) inizio = ts;
    if (ts - ultimo < intervallo) { rafId = requestAnimationFrame(frame); return; }
    ultimo = ts;
    const totale = loop ? durata * nFasi / 2 : durata;
    let u = ((ts - inizio) % totale) / totale;
    let idxA, idxB, t;
    if (loop) {
      const pos = u * nFasi;
      idxA = Math.floor(pos) % nFasi;
      idxB = (idxA + 1) % nFasi;
      t = easeInOut(pos - Math.floor(pos));
    } else {
      // andata e ritorno sull'intera sequenza
      const avanti = u < 0.5;
      const v = avanti ? u * 2 : (1 - u) * 2;
      const pos = Math.min(v * (nFasi - 1), nFasi - 1.0001);
      idxA = Math.floor(pos);
      idxB = Math.min(idxA + 1, nFasi - 1);
      t = easeInOut(pos - idxA);
    }
    applica(interpolaPose(pose[idxA], pose[idxB], t));
    if (etichetta && def.fasi) {
      const testo = def.fasi[t < 0.5 ? idxA : idxB];
      if (etichetta.textContent !== testo) etichetta.textContent = testo;
    }
    rafId = requestAnimationFrame(frame);
  }

  applica(pose[0]);

  const controller = {
    pausa() { attivo = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; },
    riprendi() { if (!attivo) { attivo = true; inizio = null; ultimo = 0; rafId = requestAnimationFrame(frame); } },
    destroy() {
      attivo = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (osservatore) osservatore.disconnect();
      document.removeEventListener('visibilitychange', suVisibilita);
      container.innerHTML = '';
    }
  };

  function suVisibilita() { document.hidden ? controller.pausa() : controller.riprendi(); }
  document.addEventListener('visibilitychange', suVisibilita);

  // le animazioni fuori schermo restano ferme (batteria)
  let osservatore = null;
  if (opzioni.osserva !== false && 'IntersectionObserver' in window) {
    attivo = false;
    osservatore = new IntersectionObserver(voci => {
      for (const v of voci) v.isIntersecting ? controller.riprendi() : controller.pausa();
    }, { rootMargin: '80px' });
    osservatore.observe(container);
  } else {
    rafId = requestAnimationFrame(frame);
  }

  return controller;
}

/** Miniatura statica (prima posa) per le liste. */
export function miniatura(chiave) {
  const def = ANIMAZIONI[chiave] || ANIMAZIONI[ANIM_DEFAULT];
  const p = def.pose[0];
  const seg = [['neck', 'shoulder'], ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle'], ['ankle', 'toe'], ['shoulder', 'elbow'], ['elbow', 'wrist']];
  let d = '';
  for (const [a, b] of seg) {
    if (p[a] && p[b]) d += `M${p[a][0]} ${p[a][1]}L${p[b][0]} ${p[b][1]}`;
  }
  return `<svg viewBox="0 0 100 100" class="anim-mini" aria-hidden="true"><path d="${d}"/><circle cx="${p.head[0]}" cy="${p.head[1]}" r="6"/></svg>`;
}
