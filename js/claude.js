// Cliente minimale per generare al volo la scheda di un esercizio con l'aiuto
// di Claude, quando non si trova nel database curato dell'app.
//
// Chiamata diretta dal browser (nessun server nostro nel mezzo): la chiave
// API resta sul dispositivo, letta da stato.integrazioni.claudeApiKey e mai
// inclusa nei backup esportati (vedi store.js -> esporta()). L'header
// 'anthropic-dangerous-direct-browser-access' e' quello che l'SDK ufficiale
// invia quando si abilita esplicitamente l'uso lato browser.
import { GRUPPI } from './exercises.js';

const MODELLO = 'claude-opus-5';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Stesso vocabolario usato da js/exercises.js e js/allenamento.js: tenerlo
// allineato se si aggiungono nuovi pattern o animazioni al database curato.
const PATTERN_VALIDI = [
  'squat', 'hinge', 'affondo', 'spinta-orizzontale', 'spinta-verticale',
  'trazione-orizzontale', 'trazione-verticale',
  'isolamento-petto', 'isolamento-dorso', 'isolamento-spalle', 'isolamento-spalle-post',
  'isolamento-bicipiti', 'isolamento-tricipiti', 'isolamento-quad', 'isolamento-femorali', 'isolamento-polpacci',
  'core-flessione', 'core-rotazione', 'core-antiestensione', 'cardio-liss', 'cardio-hiit'
];
const ANIM_VALIDE = [
  'squat', 'panca', 'croci', 'french', 'pushup', 'dip', 'trazioni', 'lat', 'rematore', 'pulley',
  'facepull', 'militare', 'alzate', 'curl', 'pushdown', 'stacco', 'hipthrust', 'affondo', 'pressa',
  'legext', 'legcurl', 'calf', 'plank', 'crunch', 'legraise', 'twist', 'mountain', 'camminata', 'jack',
  'burpee', 'scott'
];

const SCHEMA = {
  type: 'object',
  properties: {
    nome: { type: 'string', description: 'Nome comune dell\'esercizio in italiano, come apparirebbe in una scheda da palestra' },
    gruppo: { type: 'string', enum: Object.keys(GRUPPI) },
    pattern: { type: 'string', enum: PATTERN_VALIDI, description: 'Categoria biomeccanica piu\' vicina, dello stesso vocabolario usato dal resto dell\'app' },
    tipo: { type: 'string', enum: ['multi', 'isolamento', 'isometrico', 'cardio'] },
    livello: { type: 'integer', minimum: 1, maximum: 3, description: '1=principiante, 2=intermedio, 3=avanzato/tecnico' },
    attrezzatura: { type: 'array', items: { type: 'string', enum: ['palestra', 'casa', 'libero'] }, minItems: 1 },
    anim_simile: {
      type: 'string', enum: ANIM_VALIDE,
      description: 'Tra queste animazioni gia\' disponibili nell\'app, quella che rappresenta meglio la postura e il movimento del corpo: e\' un\'approssimazione visiva, non deve essere lo stesso esercizio'
    },
    muscoli_primari: { type: 'array', items: { type: 'string' }, minItems: 1 },
    muscoli_secondari: { type: 'array', items: { type: 'string' } },
    setup: { type: 'array', items: { type: 'string' }, minItems: 1, description: '1-3 frasi brevi sulla posizione di partenza' },
    esecuzione: { type: 'array', items: { type: 'string' }, minItems: 1, description: '2-4 frasi brevi sull\'esecuzione del movimento' },
    errori: { type: 'array', items: { type: 'string' }, minItems: 1, description: '1-3 errori tecnici comuni da evitare' },
    respiro: { type: 'string' },
    tempo: { type: 'string', description: 'es. "2-1-1-0" (discesa-pausa-salita-pausa, in secondi) oppure "isometrico"' },
    varianti: { type: 'string', description: 'Una nota facoltativa su varianti o accorgimenti' }
  },
  required: ['nome', 'gruppo', 'pattern', 'tipo', 'livello', 'attrezzatura', 'anim_simile', 'muscoli_primari', 'muscoli_secondari', 'setup', 'esecuzione', 'errori', 'respiro', 'tempo'],
  additionalProperties: false
};

export class ErroreClaudeApi extends Error {
  constructor(messaggio, tipo) {
    super(messaggio);
    this.tipo = tipo;
  }
}

function slugId(nome) {
  const base = nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  return 'ai-' + (base || 'esercizio') + '-' + Date.now().toString(36);
}

/**
 * Chiede a Claude la scheda tecnica di un esercizio non presente nel
 * database curato. Ritorna un oggetto nello stesso formato di quelli in
 * js/exercises.js, pronto per essere salvato tra i personalizzati.
 */
export async function generaEsercizioConClaude(nomeRichiesto, apiKey) {
  if (!apiKey) throw new ErroreClaudeApi('Manca la chiave API di Claude: inseriscila dal Profilo.', 'chiave-mancante');
  const testo = String(nomeRichiesto || '').trim();
  if (testo.length < 2) throw new ErroreClaudeApi('Scrivi il nome dell\'esercizio.', 'input');

  let risposta;
  try {
    risposta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODELLO,
        max_tokens: 2048,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: 'Sei un personal trainer che compila schede tecniche di esercizi in italiano, con lo stesso tono operativo e sintetico di una scheda da palestra professionale. Non inventare gruppi muscolari, pattern o animazioni fuori dagli elenchi forniti nello schema.',
        messages: [{
          role: 'user',
          content: `Compila la scheda tecnica per l'esercizio "${testo}". Se il nome e' ambiguo, scegli l'interpretazione piu' comune in palestra.`
        }]
      })
    });
  } catch (e) {
    throw new ErroreClaudeApi('Connessione a Claude non riuscita. Controlla la rete e riprova.', 'rete');
  }

  if (!risposta.ok) {
    const corpo = await risposta.json().catch(() => null);
    const msg = corpo && corpo.error && corpo.error.message;
    if (risposta.status === 401) throw new ErroreClaudeApi('Chiave API non valida o scaduta.', 'chiave-non-valida');
    if (risposta.status === 429) throw new ErroreClaudeApi('Limite di richieste raggiunto: riprova tra poco.', 'limite');
    throw new ErroreClaudeApi(msg || `Errore Claude (${risposta.status}).`, 'api');
  }

  const dati = await risposta.json();
  if (dati.stop_reason === 'refusal') {
    throw new ErroreClaudeApi('Claude non ha generato una risposta per questa richiesta.', 'rifiuto');
  }
  const blocco = (dati.content || []).find(b => b.type === 'text');
  if (!blocco) throw new ErroreClaudeApi('Risposta inattesa da Claude.', 'formato');

  let campi;
  try {
    campi = JSON.parse(blocco.text);
  } catch (e) {
    throw new ErroreClaudeApi('Risposta di Claude non interpretabile.', 'formato');
  }

  return {
    id: slugId(campi.nome),
    personalizzato: true,
    nome: campi.nome,
    gruppo: GRUPPI[campi.gruppo] ? campi.gruppo : 'core',
    pattern: PATTERN_VALIDI.includes(campi.pattern) ? campi.pattern : 'isolamento-bicipiti',
    tipo: campi.tipo,
    livello: Math.min(3, Math.max(1, Math.round(campi.livello) || 2)),
    anim: ANIM_VALIDE.includes(campi.anim_simile) ? campi.anim_simile : 'squat',
    attrezzatura: Array.isArray(campi.attrezzatura) && campi.attrezzatura.length ? campi.attrezzatura : ['palestra'],
    rischio: [],
    muscoli: {
      primari: Array.isArray(campi.muscoli_primari) ? campi.muscoli_primari : [],
      secondari: Array.isArray(campi.muscoli_secondari) ? campi.muscoli_secondari : []
    },
    setup: Array.isArray(campi.setup) ? campi.setup : [],
    esecuzione: Array.isArray(campi.esecuzione) ? campi.esecuzione : [],
    errori: Array.isArray(campi.errori) ? campi.errori : [],
    respiro: campi.respiro || '',
    tempo: campi.tempo || '',
    varianti: campi.varianti || '',
    nota: 'Generato con l\'aiuto di Claude: verifica la tecnica con una fonte affidabile prima di provarlo. L\'animazione mostrata e\' quella piu\' simile tra quelle disponibili, non e\' specifica per questo esercizio.'
  };
}
