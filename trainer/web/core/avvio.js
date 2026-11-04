// Avvio comune: sceglie il backend, mostra l'accesso se serve, poi monta
// l'interfaccia. Ogni interfaccia riceve lo stesso contesto.
import { creaApi } from './api.js';
import { h, svuota, avviso } from './dom.js';
import { messaggioErrore } from './servizi.js';

function moduloAccesso(api, fatto) {
  let modo = 'accesso';
  const errore = h('p', { class: 'gc-errore', role: 'alert' });
  const nome = h('input', { id: 'acc-nome', autocomplete: 'name', required: true });
  const email = h('input', { id: 'acc-email', type: 'email', autocomplete: 'email', required: true });
  const pw = h('input', { id: 'acc-pw', type: 'password', autocomplete: 'current-password', minlength: '8', required: true });
  const campoNome = h('label', { class: 'gc-campo', hidden: true }, ['Nome e cognome', nome]);
  const invio = h('button', { class: 'gc-btn gc-btn-primario', type: 'submit', testo: 'Entra' });
  const cambia = h('button', { class: 'gc-link', type: 'button' });
  const aggiorna = () => {
    campoNome.hidden = modo === 'accesso';
    // un campo obbligatorio nascosto bloccherebbe l'invio del modulo
    nome.required = modo !== 'accesso';
    invio.textContent = modo === 'accesso' ? 'Entra' : 'Crea account';
    cambia.textContent = modo === 'accesso' ? 'Non hai un account? Registrati' : 'Hai gia\' un account? Entra';
    pw.autocomplete = modo === 'accesso' ? 'current-password' : 'new-password';
  };
  cambia.onclick = () => { modo = modo === 'accesso' ? 'registrazione' : 'accesso'; aggiorna(); };
  aggiorna();

  const form = h('form', { class: 'gc-accesso' }, [
    h('h1', { testo: 'GymCoach' }),
    h('p', { class: 'gc-tenue', testo: api.descrizione }),
    campoNome,
    h('label', { class: 'gc-campo' }, ['Email', email]),
    h('label', { class: 'gc-campo' }, ['Password', pw]),
    errore, invio, cambia
  ]);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errore.textContent = '';
    invio.disabled = true;
    try {
      const t = modo === 'accesso' ? await api.accedi(email.value, pw.value) : await api.registra(nome.value, email.value, pw.value);
      fatto(t);
    } catch (x) {
      errore.textContent = messaggioErrore(x);
    } finally { invio.disabled = false; }
  });
  return form;
}

/**
 * monta(ctx) disegna l'interfaccia. ctx = { api, trainer, personali,
 * ricaricaPersonali(), esci(), radice }.
 */
export async function avvia(radice, monta) {
  let api;
  try {
    api = await creaApi();
  } catch (e) {
    svuota(radice, h('p', { class: 'gc-errore', testo: messaggioErrore(e) }));
    return;
  }
  const parti = async trainer => {
    const ctx = {
      api, trainer, radice, personali: [],
      async ricaricaPersonali() { ctx.personali = await api.eserciziPersonali(); return ctx.personali; },
      async esci() { await api.esci(); location.reload(); }
    };
    await ctx.ricaricaPersonali().catch(() => {});
    svuota(radice);
    await monta(ctx);
    if (api.tipo === 'demo') radice.append(fasciaDemo(api));
  };
  const trainer = await api.sessione().catch(() => null);
  if (trainer) return parti(trainer);
  svuota(radice, moduloAccesso(api, parti));
}

function fasciaDemo(api) {
  return h('aside', { class: 'gc-demo' }, [
    h('span', { testo: 'Demo · dati di esempio salvati solo in questo browser' }),
    h('a', { class: 'gc-link', href: '../index.html', testo: 'Altre interfacce' }),
    h('button', {
      class: 'gc-link', type: 'button', testo: 'Ripristina',
      onclick: () => { api.ripristina(); avviso('Dati di esempio ripristinati'); setTimeout(() => location.reload(), 400); }
    })
  ]);
}
