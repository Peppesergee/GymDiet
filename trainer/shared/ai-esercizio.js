// Generazione di un esercizio con Claude: schema, prompt e normalizzazione.
// Modulo puro (nessuna chiamata di rete): lo usano sia il server Node
// (architettura A) sia la Edge Function di Supabase (architettura B), che
// fanno la chiamata con l'SDK ufficiale e la chiave della piattaforma.
// Cosi' la chiave API non arriva mai nel browser dei trainer.
import { GRUPPI } from './exercises.js';

export const MODELLO = 'claude-opus-5-5';

// Stesso vocabolario usato da js/exercises.js e js/allenamento.js: tenerlo
// allineato se si aggiungono nuovi pattern o animazioni al database curato.
export const PATTERN_VALIDI = [
  'squat', 'hinge', 'affondo', 'spinta-orizzontale', 'spinta-verticale',
  'trazione-orizzontale', 'trazione-verticale',
  'isolamento-petto', 'isolamento-dorso', 'isolamento-spalle', 'isolamento-spalle-post',
  'isolamento-bicipiti', 'isolamento-tricipiti', 'isolamento-quad', 'isolamento-femorali', 'isolamento-polpacci',
  'core-flessione', 'core-rotazione', 'core-antiestensione', 'cardio-liss', 'cardio-hiit'
];
export const ANIM_VALIDE = [
  'squat', 'panca', 'croci', 'french', 'pushup', 'dip', 'trazioni', 'lat', 'rematore', 'pulley',
  'facepull', 'militare', 'alzate', 'curl', 'pushdown', 'stacco', 'hipthrust', 'affondo', 'pressa',
  'legext', 'legcurl', 'calf', 'plank', 'crunch', 'legraise', 'twist', 'mountain', 'camminata', 'jack',
  'burpee', 'scott'
];

export const SCHEMA = {
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

export const SISTEMA = 'Sei un personal trainer che compila schede tecniche di esercizi in italiano, con lo stesso tono operativo e sintetico di una scheda da palestra professionale. Non inventare gruppi muscolari, pattern o animazioni fuori dagli elenchi forniti nello schema.';

export function validaNome(nome) {
  const testo = String(nome || '').trim();
  if (testo.length < 2 || testo.length > 80) return null;
  return testo;
}

/** Parametri della richiesta a POST /v1/messages (da passare all'SDK). */
export function richiesta(nome) {
  return {
    model: MODELLO,
    max_tokens: 16000,
    // il modello ripiega su un'alternativa consigliata se rifiuta la richiesta
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SISTEMA,
    messages: [{
      role: 'user',
      content: `Compila la scheda tecnica per l'esercizio "${nome}". Se il nome e' ambiguo, scegli l'interpretazione piu' comune in palestra.`
    }]
  };
}

function slug(nome) {
  return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'esercizio';
}

/**
 * Dalla risposta dell'API a un esercizio nel formato di shared/exercises.js.
 * Ritorna null se la risposta non e' utilizzabile (rifiuto, testo non JSON).
 */
export function daRisposta(risposta) {
  if (!risposta || risposta.stop_reason === 'refusal') return null;
  const blocco = (risposta.content || []).find(b => b.type === 'text');
  if (!blocco) return null;
  let c;
  try { c = JSON.parse(blocco.text); } catch { return null; }
  if (!c || typeof c.nome !== 'string') return null;
  return {
    id: 'pt-' + slug(c.nome) + '-' + Date.now().toString(36),
    personalizzato: true,
    nome: c.nome,
    gruppo: GRUPPI[c.gruppo] ? c.gruppo : 'core',
    pattern: PATTERN_VALIDI.includes(c.pattern) ? c.pattern : 'isolamento-bicipiti',
    tipo: ['multi', 'isolamento', 'isometrico', 'cardio'].includes(c.tipo) ? c.tipo : 'isolamento',
    livello: Math.min(3, Math.max(1, Math.round(c.livello) || 2)),
    anim: ANIM_VALIDE.includes(c.anim_simile) ? c.anim_simile : 'squat',
    attrezzatura: Array.isArray(c.attrezzatura) && c.attrezzatura.length ? c.attrezzatura : ['palestra'],
    rischio: [],
    muscoli: { primari: c.muscoli_primari || [], secondari: c.muscoli_secondari || [] },
    setup: c.setup || [], esecuzione: c.esecuzione || [], errori: c.errori || [],
    respiro: c.respiro || '', tempo: c.tempo || '', varianti: c.varianti || '',
    nota: 'Generato con Claude: verifica la tecnica prima di proporlo a un cliente.'
  };
}
