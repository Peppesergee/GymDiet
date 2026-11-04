// Le Edge Function vengono impacchettate solo con i file sotto
// supabase/functions/: copiamo li' i moduli condivisi che servono.
import { copyFileSync, mkdirSync } from 'node:fs';

const dest = new URL('./supabase/functions/_shared/', import.meta.url);
mkdirSync(dest, { recursive: true });
for (const f of ['ai-esercizio.js', 'exercises.js']) {
  copyFileSync(new URL(`../shared/${f}`, import.meta.url), new URL(f, dest));
  console.log('copiato', f);
}
