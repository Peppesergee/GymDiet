// Quale backend usano le interfacce.
//  - 'demo'     : tutto nel browser (localStorage), dati di esempio. Per provare.
//  - 'rest'     : architettura A. Il server Node sostituisce questo file con
//                 { backend: 'rest' } quando serve le interfacce.
//  - 'supabase' : architettura B. Compila url e anonKey del progetto Supabase
//                 (la anon key e' pubblica per design: la sicurezza sta nelle RLS).
export const CONFIG = {
  backend: 'demo',
  supabase: { url: '', anonKey: '' }
};
