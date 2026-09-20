// Foglio di dettaglio di un esercizio, con animazione, spiegazione e
// sostituzione (dal database curato, per nome libero, o generata con Claude).
import { h, foglio, toast, svuota } from '../ui.js';
import { creaAnimazione, miniatura } from '../anim.js';
import { dettaglioEsercizio, alternativeEsercizio, cercaEsercizi } from '../allenamento.js';
import { sostituisciEsercizioScheda } from '../genera.js';
import { generaEsercizioConClaude } from '../claude.js';
import { GRUPPI } from '../exercises.js';

export function apriEsercizio(voce, contesto = {}) {
  const es = dettaglioEsercizio(voce.esercizioId);
  if (!es) return;

  const boxAnim = h('div', { class: 'anim-box', style: 'width:100%;aspect-ratio:1/1;max-width:320px;margin:0 auto 12px' });
  const etichetta = h('div', { class: 'anim-fase' });
  const contenitore = h('div', { style: 'position:relative;max-width:320px;margin:0 auto' }, [boxAnim, etichetta]);

  const elenco = (titolo, voci) => voci && voci.length
    ? h('div', { style: 'margin-bottom:12px' }, [
        h('h4', { testo: titolo, style: 'font-size:.9rem;color:var(--testo-2);margin-bottom:4px' }),
        h('ul', { style: 'margin:0;padding-left:18px;font-size:.9rem' }, voci.map(t => h('li', { testo: t, style: 'margin-bottom:4px' })))
      ])
    : null;

  const gruppo = GRUPPI[es.gruppo];
  const parametri = voce.serie
    ? h('div', { class: 'macro-riga', style: 'margin-bottom:12px' }, [
        cella(voce.serie, 'serie'),
        cella(voce.ripetizioni, voce.durata ? 'durata' : 'ripetizioni'),
        cella(voce.recupero ? voce.recupero + 's' : '-', 'recupero'),
        cella(voce.rir || '-', 'RIR')
      ])
    : null;

  const azioni = h('div', { class: 'colonna', style: 'margin-top:14px' });
  if (contesto.puoiCambiare && contesto.ctx) {
    azioni.appendChild(h('button', {
      class: 'btn secondario', testo: 'Cambia esercizio',
      onclick: () => apriSostituzione(voce, contesto.ctx, chiudi)
    }));
  }

  const contenuto = h('div', {}, [
    h('div', { class: 'riga', style: 'gap:8px;margin-bottom:10px;flex-wrap:wrap' }, [
      h('span', { class: 'badge verde', testo: gruppo ? gruppo.nome : es.gruppo }),
      h('span', { class: 'badge', testo: es.tipo === 'multi' ? 'Multiarticolare' : es.tipo === 'isometrico' ? 'Isometrico' : es.tipo === 'cardio' ? 'Cardio' : 'Isolamento' }),
      h('span', { class: 'badge blu', testo: 'Livello ' + es.livello })
    ]),
    contenitore,
    parametri,
    h('div', { class: 'info-box', style: 'margin-bottom:12px' }, [
      h('div', {}, [h('strong', { testo: 'Muscoli principali: ' }), es.muscoli.primari.join(', ')]),
      es.muscoli.secondari.length ? h('div', { style: 'margin-top:3px' }, [h('strong', { testo: 'Secondari: ' }), es.muscoli.secondari.join(', ')]) : null
    ]),
    elenco('Preparazione', es.setup),
    elenco('Esecuzione', es.esecuzione),
    elenco('Errori da evitare', es.errori),
    h('div', { class: 'info-box' }, [
      h('div', {}, [h('strong', { testo: 'Respirazione: ' }), es.respiro]),
      es.tempo ? h('div', { style: 'margin-top:3px' }, [h('strong', { testo: 'Tempo di esecuzione: ' }), es.tempo, es.tempo.includes('-') ? ' (discesa-pausa-salita-pausa, in secondi)' : '']) : null
    ]),
    es.varianti ? h('div', { class: 'avviso', style: 'margin-top:10px' }, es.varianti) : null,
    es.personalizzato && es.nota ? h('div', { class: 'info-box', style: 'margin-top:10px;font-size:.82rem' }, es.nota) : null,
    azioni
  ]);

  let anim = null;
  const chiudi = foglio(contenuto, {
    titolo: es.nome,
    allaChiusura: () => { if (anim) anim.destroy(); }
  });
  anim = creaAnimazione(boxAnim, es.anim, { etichetta });
  return chiudi;

  function cella(valore, etichetta) {
    return h('div', { class: 'macro-cella' }, [
      h('div', { class: 'valore', style: 'font-size:.95rem', testo: String(valore) }),
      h('div', { class: 'etichetta', testo: etichetta })
    ]);
  }
}

/** Riga compatta di un esercizio, con miniatura animata. */
export function rigaEsercizio(voce, onApri, extra) {
  const box = h('div', { class: 'anim-box' });
  const riga = h('button', { class: 'esercizio', type: 'button', onclick: () => onApri(voce) }, [
    box,
    h('div', { class: 'info' }, [
      h('div', { class: 'nome', testo: voce.nome }),
      h('div', { class: 'par', testo: extra || descrizioneParametri(voce) })
    ]),
    h('div', { class: 'freccia', html: '&rsaquo;' })
  ]);
  // animazione leggera solo quando visibile
  const anim = creaAnimazione(box, voce.anim, { durata: 3000 });
  riga._anim = anim;
  return riga;
}

/** Riga statica (miniatura ferma) per gli elenchi di scelta: niente animazione viva, sono liste potenzialmente lunghe. */
function rigaScelta(esercizio, onScegli) {
  return h('button', { class: 'esercizio', type: 'button', onclick: onScegli }, [
    h('span', { html: miniatura(esercizio.anim) }),
    h('div', { class: 'info' }, [
      h('div', { class: 'nome', testo: esercizio.nome }),
      h('div', { class: 'par', testo: (GRUPPI[esercizio.gruppo] || {}).nome || esercizio.gruppo })
    ]),
    h('div', { class: 'freccia', html: '&rsaquo;' })
  ]);
}

export function descrizioneParametri(voce) {
  if (voce.tipo === 'cardio') return `${voce.ripetizioni} · ${voce.gruppo}`;
  const rec = voce.recupero ? ` · recupero ${voce.recupero}s` : '';
  return `${voce.serie} serie × ${voce.ripetizioni}${rec}`;
}

// ---------------------------------------------------------------- sostituzione
/** Foglio "Cambia esercizio": alternative simili, ricerca libera, o generazione con Claude. */
function apriSostituzione(voce, ctx, chiudiDettaglio) {
  const { stato } = ctx;
  const esAttuale = dettaglioEsercizio(voce.esercizioId);

  const contenuto = h('div');
  contenuto.appendChild(h('div', { class: 'info-box', style: 'margin-bottom:14px' },
    `Sostituisci "${esAttuale ? esAttuale.nome : voce.nome}" in questa scheda.`));

  const simili = alternativeEsercizio(voce.pattern, stato.profilo, stato.esclusiEsercizi)
    .filter(a => a.id !== voce.esercizioId);
  if (simili.length) {
    contenuto.appendChild(h('h4', { testo: 'Esercizi simili', style: 'font-size:.9rem;color:var(--testo-2);margin-bottom:2px' }));
    const listaSimili = h('div', { style: 'max-height:240px;overflow-y:auto;margin-bottom:16px' });
    simili.forEach(a => listaSimili.appendChild(rigaScelta(a, () => confermaScelta(a))));
    contenuto.appendChild(listaSimili);
  }

  contenuto.appendChild(h('h4', { testo: 'Cerca un altro esercizio', style: 'font-size:.9rem;color:var(--testo-2);margin-bottom:4px' }));
  const inputRicerca = h('input', { type: 'text', placeholder: 'Es. hack squat, hip thrust monopodalico...' });
  const risultatiRicerca = h('div', { style: 'margin-top:8px' });
  let timerRicerca = null;
  inputRicerca.addEventListener('input', () => {
    clearTimeout(timerRicerca);
    timerRicerca = setTimeout(() => {
      svuota(risultatiRicerca);
      const testo = inputRicerca.value.trim();
      if (testo.length < 2) return;
      const trovati = cercaEsercizi(testo).filter(a => a.id !== voce.esercizioId);
      if (!trovati.length) {
        risultatiRicerca.appendChild(h('div', { class: 'info-box', style: 'font-size:.85rem' }, 'Nessun esercizio trovato nel database.'));
        return;
      }
      trovati.forEach(a => risultatiRicerca.appendChild(rigaScelta(a, () => confermaScelta(a))));
    }, 150);
  });
  contenuto.appendChild(h('div', { class: 'campo mb0' }, [inputRicerca]));
  contenuto.appendChild(risultatiRicerca);

  contenuto.appendChild(h('button', {
    class: 'btn secondario', style: 'margin-top:14px', testo: '✨ Non lo trovi? Chiedilo a Claude',
    onclick: () => apriGenerazioneAi(ctx, confermaScelta)
  }));

  const chiudi = foglio(contenuto, { titolo: 'Cambia esercizio' });

  function confermaScelta(nuovoEsercizio) {
    apriConferma(voce, esAttuale, nuovoEsercizio, ctx, () => { chiudi(); if (chiudiDettaglio) chiudiDettaglio(); });
  }
}

/** Ultimo passo: mostra cosa cambia e chiede se mantenere pesi/storico. */
function apriConferma(voce, esAttuale, nuovoEsercizio, ctx, alConferma) {
  const { stato, aggiorna } = ctx;
  const nomeVecchio = esAttuale ? esAttuale.nome : voce.nome;
  const haStorico = stato.log.sessioni.some(s => (s.esercizi || []).some(e => e.esercizioId === voce.esercizioId));

  let mantieni = true;
  const spunta = h('button', {
    class: 'spunta fatto', type: 'button', testo: '✓', title: 'Mantieni pesi e storico',
    onclick: e => { mantieni = !mantieni; e.currentTarget.classList.toggle('fatto', mantieni); }
  });

  const contenuto = h('div', {}, [
    h('p', { style: 'margin-bottom:16px' }, [
      'Sostituire ', h('strong', { testo: nomeVecchio }), ' con ', h('strong', { testo: nuovoEsercizio.nome }), '?'
    ]),
    haStorico ? h('div', { class: 'riga', style: 'gap:10px;margin-bottom:18px' }, [
      spunta,
      h('div', { style: 'flex:1' }, [
        h('div', { style: 'font-weight:650', testo: 'Mantieni pesi e storico' }),
        h('small', { testo: `Le sedute gia' registrate su "${nomeVecchio}" restano collegate a "${nuovoEsercizio.nome}".` })
      ])
    ]) : null,
    h('div', { class: 'colonna' }, [
      h('button', {
        class: 'btn', testo: 'Conferma sostituzione',
        onclick: () => {
          aggiorna(s => sostituisciEsercizioScheda(s, voce, nuovoEsercizio, { mantieniStorico: mantieni }));
          chiudi();
          alConferma();
          toast('Esercizio sostituito');
        }
      }),
      h('button', { class: 'btn secondario', testo: 'Annulla', onclick: () => chiudi() })
    ])
  ]);
  const chiudi = foglio(contenuto, { titolo: 'Conferma' });
}

/** Genera un esercizio non presente nel database, con l'aiuto di Claude. */
function apriGenerazioneAi(ctx, confermaScelta) {
  const { stato } = ctx;
  const chiaveSalvata = stato.integrazioni && stato.integrazioni.claudeApiKey;

  if (!chiaveSalvata) {
    const contenuto = h('div', {}, [
      h('div', { class: 'avviso' }, 'Per usare questa funzione serve la tua chiave API di Claude. Vai su Profilo per inserirla.')
    ]);
    foglio(contenuto, { titolo: 'Chiedi a Claude' });
    return;
  }

  const inputNome = h('input', { type: 'text', placeholder: 'Es. Hack squat al multipower' });
  const areaEsito = h('div', { style: 'margin-top:12px' });
  const bottone = h('button', { class: 'btn', style: 'margin-top:12px', testo: 'Genera con Claude' });

  bottone.addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    if (nome.length < 2) { toast('Scrivi il nome dell\'esercizio'); return; }
    bottone.disabled = true;
    bottone.textContent = 'Generazione in corso...';
    svuota(areaEsito);
    try {
      const nuovo = await generaEsercizioConClaude(nome, chiaveSalvata);
      chiudi();
      confermaScelta(nuovo);
    } catch (e) {
      areaEsito.appendChild(h('div', { class: 'avviso' }, e.message || 'Errore imprevisto.'));
    } finally {
      bottone.disabled = false;
      bottone.textContent = 'Genera con Claude';
    }
  });

  const contenuto = h('div', {}, [
    h('div', { class: 'info-box', style: 'margin-bottom:12px' },
      'Scrivi il nome dell\'esercizio: Claude compila spiegazione, muscoli coinvolti ed errori da evitare. L\'animazione mostrata e\' la piu\' simile tra quelle gia\' disponibili, non e\' specifica per questo esercizio.'),
    h('div', { class: 'campo mb0' }, [inputNome]),
    bottone,
    areaEsito
  ]);
  const chiudi = foglio(contenuto, { titolo: 'Chiedi a Claude' });
}
