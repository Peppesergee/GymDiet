// Modulo anagrafica + profilo di allenamento dell’atleta, riusato da tutte le UI.
import { h } from './dom.js';
import { OBIETTIVI, ESPERIENZE, ATTREZZATURE, LIMITAZIONI, GIORNI, PROFILO_PREDEFINITO, normalizzaAtleta } from '../../shared/modello.js';
import { messaggioErrore } from './servizi.js';

const opzioni = (mappa, valore) => Object.entries(mappa).map(([k, v]) => h('option', { value: k, selected: k === valore, testo: v }));

function chipsMultiple(prefisso, voci, scelti, alCambio) {
  const set = new Set(scelti);
  return h('div', { class: 'gc-chips', role: 'group' }, voci.map(([valore, testo]) => {
    const b = h('button', { class: 'gc-chip', type: 'button', id: `${prefisso}-${valore}`, 'aria-pressed': String(set.has(valore)), testo });
    b.onclick = () => {
      set.has(valore) ? set.delete(valore) : set.add(valore);
      b.setAttribute('aria-pressed', String(set.has(valore)));
      alCambio([...set]);
    };
    return b;
  }));
}

/**
 * @param iniziale dati dell’atleta (o vuoto per uno nuovo)
 * @param onSalva async (dati) => void; se lancia, l'errore appare nel modulo
 * @param compatto mostra solo i campi essenziali (UI da bordo palestra)
 */
export function formAtleta(iniziale = {}, { onSalva, etichetta = 'Salva', compatto = false, extra = null } = {}) {
  const d = { ...PROFILO_PREDEFINITO, nome: '', email: '', telefono: '', note: '', ...iniziale };
  const errore = h('p', { class: 'gc-errore', role: 'alert' });
  const campo = (id, etic, input) => h('label', { class: 'gc-campo', for: id }, [etic, input]);
  const inp = (id, tipo, valore, attr = {}) => h('input', { id, name: id, type: tipo, value: valore ?? '', ...attr });

  const els = {
    nome: inp('fc-nome', 'text', d.nome, { required: true, autocomplete: 'off' }),
    email: inp('fc-email', 'email', d.email),
    telefono: inp('fc-telefono', 'tel', d.telefono),
    sesso: h('select', { id: 'fc-sesso' }, opzioni({ uomo: 'Uomo', donna: 'Donna' }, d.sesso)),
    eta: inp('fc-eta', 'number', d.eta, { inputmode: 'numeric', min: 12, max: 95 }),
    peso: inp('fc-peso', 'number', d.peso, { inputmode: 'decimal', step: '0.5' }),
    altezza: inp('fc-altezza', 'number', d.altezza, { inputmode: 'numeric' }),
    obiettivo: h('select', { id: 'fc-obiettivo' }, opzioni(OBIETTIVI, d.obiettivo)),
    esperienza: h('select', { id: 'fc-esperienza' }, opzioni(ESPERIENZE, d.esperienza)),
    attrezzatura: h('select', { id: 'fc-attrezzatura' }, opzioni(ATTREZZATURE, d.attrezzatura)),
    durataSessione: h('select', { id: 'fc-durata' }, opzioni({ 30: '30 min', 45: '45 min', 60: '60 min', 75: '75 min', 90: '90 min' }, String(d.durataSessione))),
    note: h('textarea', { id: 'fc-note', rows: 2, testo: d.note || '' })
  };
  let giorni = d.giorniSettimana, limitazioni = d.limitazioni;

  const form = h('form', { class: 'gc-form-atleta', novalidate: true }, [
    campo('fc-nome', 'Nome e cognome', els.nome),
    compatto ? null : h('div', { class: 'gc-griglia-campi' }, [campo('fc-email', 'Email', els.email), campo('fc-telefono', 'Telefono', els.telefono)]),
    h('div', { class: 'gc-griglia-campi' }, [
      campo('fc-obiettivo', 'Obiettivo', els.obiettivo),
      campo('fc-esperienza', 'Esperienza', els.esperienza)
    ]),
    compatto ? null : h('div', { class: 'gc-griglia-campi' }, [
      campo('fc-sesso', 'Sesso', els.sesso), campo('fc-eta', 'Eta\'', els.eta),
      campo('fc-peso', 'Peso (kg)', els.peso), campo('fc-altezza', 'Altezza (cm)', els.altezza)
    ]),
    h('div', { class: 'gc-campo' }, ['Giorni di allenamento', chipsMultiple('fc-g', GIORNI.map((g, i) => [i, g]), giorni, v => { giorni = v; })]),
    h('div', { class: 'gc-griglia-campi' }, [
      campo('fc-durata', 'Durata seduta', els.durataSessione),
      campo('fc-attrezzatura', 'Dove si allena', els.attrezzatura)
    ]),
    compatto ? null : h('div', { class: 'gc-campo' }, ['Zone da proteggere', chipsMultiple('fc-l', Object.entries(LIMITAZIONI), limitazioni, v => { limitazioni = v; })]),
    compatto ? null : campo('fc-note', 'Note', els.note),
    extra,
    errore,
    h('div', { class: 'gc-azioni' }, [h('button', { class: 'gc-btn gc-btn-primario', type: 'submit', testo: etichetta })])
  ]);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errore.textContent = '';
    const dati = {
      nome: els.nome.value, email: els.email.value, telefono: els.telefono.value, note: els.note.value,
      sesso: els.sesso.value, eta: Number(els.eta.value), peso: Number(els.peso.value), altezza: Number(els.altezza.value),
      obiettivo: els.obiettivo.value, esperienza: els.esperienza.value, attrezzatura: els.attrezzatura.value,
      durataSessione: Number(els.durataSessione.value), giorniSettimana: giorni, limitazioni,
      focus: d.focus || 'nessuno', cardio: d.cardio || 'auto'
    };
    const btn = form.querySelector('button[type=submit]');
    try {
      normalizzaAtleta(dati);   // stesso controllo del server, per un errore immediato
      btn.disabled = true;
      await onSalva(dati);
    } catch (x) {
      errore.textContent = messaggioErrore(x);
    } finally { btn.disabled = false; }
  });
  return form;
}
