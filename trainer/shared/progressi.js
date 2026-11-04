// Calcoli sullo storico degli allenamenti (isomorfi, nessuna dipendenza dal DOM).

/** Ultima seduta in cui l’atleta ha registrato quell'esercizio. */
export function ultimoCarico(sedute, esercizioId) {
  const ordinate = [...sedute].sort((a, b) => b.data.localeCompare(a.data));
  for (const s of ordinate) {
    const e = (s.esercizi || []).find(x => x.esercizioId === esercizioId);
    if (!e) continue;
    const valide = (e.serie || []).filter(x => Number(x.peso) > 0 || Number(x.rip) > 0);
    if (valide.length) return { data: s.data, serie: valide };
  }
  return null;
}

function limiteAlto(testo) {
  const m = String(testo).match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Number(m[2]);
  const s = String(testo).match(/(\d+)/);
  return s ? Number(s[1]) : null;
}

const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');

/** Suggerimento di carico per la prossima seduta. */
export function suggerimento(voce, precedente) {
  if (!precedente) return { testo: 'Prima volta: carico che lasci 2 ripetizioni di margine.', peso: null };
  const alto = limiteAlto(voce.ripetizioni);
  const peso = Math.max(...precedente.serie.map(s => Number(s.peso) || 0));
  if (!peso) return { testo: 'Corpo libero: aggiungi ripetizioni o rallenta la negativa.', peso: 0 };
  const alLimite = alto && precedente.serie.every(s => Number(s.rip) >= alto);
  if (alLimite) {
    const inc = ['squat', 'hinge', 'affondo'].includes(voce.pattern) ? 5 : 2.5;
    return { testo: `Serie chiuse al limite alto: sali a ${fmt(peso + inc)} kg.`, peso: peso + inc, sale: true };
  }
  return { testo: `Resta a ${fmt(peso)} kg e aggiungi ripetizioni.`, peso };
}

/** Andamento del carico massimo per un esercizio, seduta per seduta. */
export function andamento(sedute, esercizioId) {
  return sedute
    .map(s => {
      const e = (s.esercizi || []).find(x => x.esercizioId === esercizioId);
      if (!e || !e.serie || !e.serie.length) return null;
      const max = Math.max(...e.serie.map(x => Number(x.peso) || 0));
      const volume = e.serie.reduce((t, x) => t + (Number(x.peso) || 0) * (Number(x.rip) || 0), 0);
      return { data: s.data, max, volume };
    })
    .filter(Boolean)
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** Sedute fatte / sedute previste nelle ultime `settimane` settimane (0-1). */
export function aderenza(sedute, programma, oggi = new Date(), settimane = 4) {
  if (!programma || !programma.scheda) return null;
  const previste = programma.scheda.sessioni.length * settimane;
  const da = new Date(oggi); da.setDate(da.getDate() - settimane * 7);
  const daIso = isoData(da);
  const fatte = sedute.filter(s => s.data >= daIso).length;
  return previste ? Math.min(1, fatte / previste) : null;
}

export function isoData(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** 0 = lunedi' ... 6 = domenica */
export function indiceGiorno(d = new Date()) { return (d.getDay() + 6) % 7; }

/** Seduta del programma prevista per una data (null se e' giorno di riposo). */
export function sedutaDelGiorno(programma, d = new Date()) {
  if (!programma || !programma.scheda) return null;
  const g = indiceGiorno(d);
  return programma.scheda.sessioni.find(s => s.giornoSuggerito === g) || null;
}

export function giorniDa(isoPassato, oggi = new Date()) {
  if (!isoPassato) return null;
  const [y, m, d] = isoPassato.slice(0, 10).split('-').map(Number);
  const a = new Date(y, m - 1, d);
  const b = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.round((b - a) / 86400000);
}
