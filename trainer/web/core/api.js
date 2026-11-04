// Contratto unico tra interfacce e backend. Le tre interfacce chiamano solo
// questi metodi; cambiare architettura vuol dire cambiare adattatore, non UI.
//
//   sessione()                       -> trainer | null
//   accedi(email, password)          -> trainer
//   registra(nome, email, password)  -> trainer
//   esci()
//   elencoClienti()                  -> [cliente + ultimaSeduta + programmaAttivo]
//   leggiCliente(id) / creaCliente(dati) / aggiornaCliente(id, modifiche) / eliminaCliente(id)
//   programmi(clienteId)             -> [programma]
//   creaProgramma(clienteId, { nome, stato, scheda }) / aggiornaProgramma(id, {...}) / eliminaProgramma(id)
//   sedute(clienteId)                -> [seduta]
//   registraSeduta(clienteId, seduta)
//   eserciziPersonali() / creaEsercizio(esercizio) / generaEsercizio(nome)
//
// Regola comune a tutti i backend: attivare un programma archivia quello
// attivo precedente dello stesso cliente.
import { CONFIG } from './config.js';

export async function creaApi(config = CONFIG) {
  if (config.backend === 'rest') return (await import('./adapter-rest.js')).creaAdattatoreRest(config);
  if (config.backend === 'supabase') return (await import('./adapter-supabase.js')).creaAdattatoreSupabase(config.supabase);
  return (await import('./adapter-demo.js')).creaAdattatoreDemo();
}
