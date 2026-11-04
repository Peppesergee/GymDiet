// Edge Function (Deno): genera un esercizio con Claude e lo salva tra quelli
// del trainer che la chiama. La chiave Anthropic e' un secret del progetto
// Supabase (`supabase secrets set ANTHROPIC_API_KEY=...`), mai nel browser.
// Il salvataggio usa il JWT del trainer, quindi passa dalle stesse policy RLS.
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
// copie di trainer/shared/, aggiornate da `npm run sincronizza`
import { richiesta, daRisposta, validaNome } from '../_shared/ai-esercizio.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
};
const LIMITE_ORARIO = 30;

const risposta = (stato: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { ...CORS, 'content-type': 'application/json' } });

const anthropic = Deno.env.get('ANTHROPIC_API_KEY') ? new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') }) : null;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return risposta(405, { errore: 'Metodo non consentito' });
  if (!anthropic) return risposta(503, { errore: 'Generazione con Claude non configurata (manca ANTHROPIC_API_KEY).' });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return risposta(401, { errore: 'Accesso richiesto' });

  const { nome } = await req.json().catch(() => ({}));
  const testo = validaNome(nome);
  if (!testo) return risposta(400, { errore: 'Scrivi il nome dell\'esercizio (2-80 caratteri).' });

  // limite di costo per trainer: generazioni nell'ultima ora
  const unOraFa = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.from('esercizi_personali')
    .select('id', { count: 'exact', head: true }).gte('creato_il', unOraFa);
  if ((count ?? 0) >= LIMITE_ORARIO) return risposta(429, { errore: 'Hai raggiunto il limite orario di generazioni' });

  let msg;
  try {
    msg = await anthropic.beta.messages.create(richiesta(testo));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return risposta(429, { errore: 'Troppe richieste a Claude: riprova tra poco.' });
    if (e instanceof Anthropic.APIError) return risposta(502, { errore: `Errore di Claude (${e.status ?? 'rete'}).` });
    throw e;
  }
  const esercizio = daRisposta(msg);
  if (!esercizio) return risposta(422, { errore: 'Claude non ha prodotto una scheda utilizzabile per questo nome.' });

  const { id: _scartato, ...dati } = esercizio;
  const { data, error } = await supabase.from('esercizi_personali')
    .insert({ nome: dati.nome, dati }).select('id').single();
  if (error) return risposta(500, { errore: 'Salvataggio non riuscito' });
  return risposta(201, { ...dati, id: data.id, personalizzato: true });
});
