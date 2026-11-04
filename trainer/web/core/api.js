// Contratto unico tra interfacce e backend. Le interfacce chiamano solo
// questi metodi; cambiare architettura vuol dire cambiare adattatore, non UI.
//
//   sessione()                       -> trainer | null
//   accedi(email, password)          -> trainer
//   registra(nome, email, password)  -> trainer
//   esci()
//   elencoAtleti()                  -> [atleta + ultimaSeduta + programmaAttivo]
//   leggiAtleta(id) / creaAtleta(dati) / aggiornaAtleta(id, modifiche) / eliminaAtleta(id)
//   programmi(atletaId)             -> [programma]
//   creaProgramma(atletaId, { nome, stato, scheda }) / aggiornaProgramma(id, {...}) / eliminaProgramma(id)
//   sedute(atletaId)                -> [seduta]
//   registraSeduta(atletaId, seduta)
//   creaInvito(atletaId)            -> { codice, scadeIl }  codice per l'app atleta
//   eserciziPersonali() / creaEsercizio(esercizio)
//
// Contratto dell'app atleta (creaApiAtleta):
//   sessione() / accedi(email, password) / esci()
//   attiva(codice, email, password)  primo accesso con il codice del trainer
//   programma()                      -> { programma attivo | null, esercizi personali usati }
//   sedute() / registraSeduta(seduta)
//
// Regole comuni a tutti i backend: attivare una scheda archivia quella
// attiva precedente dello stesso atleta; l'atleta vede solo la scheda attiva
// e solo i propri dati.
import { CONFIG } from './config.js';

export async function creaApi(config = CONFIG) {
  if (config.backend === 'rest') return (await import('./adapter-rest.js')).creaAdattatoreRest(config);
  if (config.backend === 'supabase') return (await import('./adapter-supabase.js')).creaAdattatoreSupabase(config.supabase);
  return (await import('./adapter-demo.js')).creaAdattatoreDemo();
}

export async function creaApiAtleta(config = CONFIG) {
  if (config.backend === 'rest') return (await import('./adapter-rest.js')).creaAdattatoreRestAtleta(config);
  if (config.backend === 'supabase') return (await import('./adapter-supabase.js')).creaAdattatoreSupabaseAtleta(config.supabase);
  return (await import('./adapter-demo.js')).creaAdattatoreDemoAtleta();
}
