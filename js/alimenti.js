// Database alimenti — valori per 100 g (o 100 ml) di prodotto crudo/come acquistato,
// salvo diversa indicazione nel campo `nota`.
// ruolo: proteine | carbo | grassi | verdura | frutta | latticini | libero
// tag:  vg=vegano  veg=vegetariano  gl=contiene glutine  lat=contiene lattosio
//       pes=pesce/crostacei  uov=uova  mai=maiale  fs=frutta secca

function A(id, nome, kcal, p, c, g, fib, ruolo, pasti, tag, min, max, step, nota) {
  return {
    id, nome, kcal, p, c, g, fib, ruolo,
    pasti: pasti.split(' '),
    tag: tag ? tag.split(' ') : [],
    min, max, step: step || 5, nota: nota || ''
  };
}

export const ALIMENTI = [
  // ---------------------------------------------------- FONTI PROTEICHE
  A('petto-pollo', 'Petto di pollo', 110, 23.0, 0, 1.5, 0, 'proteine', 'pranzo cena', '', 80, 300, 10),
  A('fesa-tacchino', 'Fesa di tacchino', 107, 24.0, 0, 1.0, 0, 'proteine', 'pranzo cena', '', 80, 300, 10),
  A('manzo-magro', 'Carne di manzo magra (girello)', 129, 21.5, 0, 4.5, 0, 'proteine', 'pranzo cena', '', 80, 250, 10),
  A('vitello', 'Fettina di vitello', 118, 21.0, 0, 3.5, 0, 'proteine', 'pranzo cena', '', 80, 250, 10),
  A('lonza-maiale', 'Lonza di maiale', 145, 22.0, 0, 6.0, 0, 'proteine', 'pranzo cena', 'mai', 80, 250, 10),
  A('bresaola', 'Bresaola', 151, 32.0, 0, 2.6, 0, 'proteine', 'pranzo cena spuntino', '', 40, 150, 10),
  A('prosciutto-crudo', 'Prosciutto crudo sgrassato', 159, 28.0, 0, 5.0, 0, 'proteine', 'pranzo cena spuntino', 'mai', 40, 120, 10),
  A('uova', 'Uova intere', 143, 12.6, 0.7, 9.5, 0, 'proteine', 'colazione pranzo cena', 'veg uov', 55, 220, 55, '1 uovo medio = 55 g'),
  A('albumi', 'Albume d\'uovo', 52, 11.0, 0.7, 0.2, 0, 'proteine', 'colazione pranzo cena', 'veg uov', 50, 300, 25),
  A('merluzzo', 'Merluzzo / nasello', 82, 18.0, 0, 0.8, 0, 'proteine', 'pranzo cena', 'pes', 90, 350, 10),
  A('salmone', 'Salmone', 208, 20.0, 0, 13.6, 0, 'proteine', 'pranzo cena', 'pes', 80, 250, 10),
  A('tonno-naturale', 'Tonno al naturale (sgocciolato)', 116, 25.0, 0, 1.0, 0, 'proteine', 'pranzo cena spuntino', 'pes', 50, 250, 10),
  A('orata', 'Orata / branzino', 121, 20.7, 0, 4.0, 0, 'proteine', 'pranzo cena', 'pes', 90, 350, 10),
  A('gamberi', 'Gamberi', 85, 18.0, 0.5, 1.0, 0, 'proteine', 'pranzo cena', 'pes', 90, 350, 10),
  A('ricotta', 'Ricotta vaccina', 146, 11.0, 3.5, 10.0, 0, 'proteine', 'colazione cena spuntino', 'veg lat', 60, 250, 10),
  A('fiocchi-latte', 'Fiocchi di latte magri', 98, 13.0, 3.5, 4.0, 0, 'proteine', 'colazione cena spuntino', 'veg lat', 60, 300, 10),
  A('mozzarella', 'Mozzarella', 253, 18.7, 0.7, 19.5, 0, 'proteine', 'pranzo cena', 'veg lat', 50, 200, 10),
  A('grana', 'Grana Padano / Parmigiano', 384, 33.0, 0, 28.0, 0, 'proteine', 'pranzo cena', 'veg lat', 10, 60, 5),
  A('skyr', 'Skyr / yogurt greco 0%', 60, 10.5, 4.0, 0.3, 0, 'proteine', 'colazione spuntino', 'veg lat', 100, 400, 25),
  A('yogurt-greco2', 'Yogurt greco 2%', 73, 9.0, 4.0, 2.0, 0, 'proteine', 'colazione spuntino', 'veg lat', 100, 400, 25),
  A('tofu', 'Tofu', 145, 15.5, 1.5, 8.7, 1.0, 'proteine', 'pranzo cena', 'vg veg', 80, 300, 10),
  A('tempeh', 'Tempeh', 193, 19.0, 9.0, 11.0, 1.4, 'proteine', 'pranzo cena', 'vg veg', 70, 250, 10),
  A('seitan', 'Seitan', 121, 24.0, 4.0, 0.5, 0.6, 'proteine', 'pranzo cena', 'vg veg gl', 70, 250, 10),
  A('lenticchie', 'Lenticchie secche', 291, 22.7, 51.1, 1.0, 13.8, 'proteine', 'pranzo cena', 'vg veg', 40, 150, 10),
  A('ceci', 'Ceci secchi', 316, 20.9, 46.9, 6.3, 13.6, 'proteine', 'pranzo cena', 'vg veg', 40, 150, 10),
  A('fagioli', 'Fagioli borlotti secchi', 291, 20.2, 47.5, 2.0, 17.3, 'proteine', 'pranzo cena', 'vg veg', 40, 150, 10),
  A('yogurt-soia', 'Yogurt di soia naturale', 62, 5.0, 3.0, 3.2, 0.8, 'proteine', 'colazione spuntino', 'vg veg', 100, 400, 25),
  A('proteine-veg', 'Proteine vegetali in polvere (soia/pisello)', 375, 80.0, 4.0, 4.0, 2.0, 'proteine', 'colazione spuntino', 'vg veg', 15, 70, 5, 'misurino tipico 30 g'),
  A('edamame', 'Edamame (fagioli di soia)', 121, 12.0, 5.0, 5.2, 5.2, 'proteine', 'pranzo cena spuntino', 'vg veg', 80, 300, 10),
  A('muscolo-grano', 'Muscolo di grano', 145, 26.0, 5.0, 2.0, 1.0, 'proteine', 'pranzo cena', 'vg veg gl', 70, 250, 10),
  A('proteine-whey', 'Proteine in polvere (whey)', 380, 80.0, 6.0, 5.0, 0, 'proteine', 'colazione spuntino', 'veg lat', 15, 70, 5, 'misurino tipico 30 g'),

  // ---------------------------------------------------- CARBOIDRATI
  A('pasta', 'Pasta di semola (secca)', 353, 12.5, 71.2, 1.4, 2.7, 'carbo', 'pranzo cena', 'vg veg gl', 40, 200, 10),
  A('pasta-integrale', 'Pasta integrale (secca)', 335, 13.0, 66.0, 2.5, 8.0, 'carbo', 'pranzo cena', 'vg veg gl', 40, 200, 10),
  A('riso', 'Riso (crudo)', 332, 6.7, 80.4, 0.4, 1.0, 'carbo', 'pranzo cena', 'vg veg', 40, 200, 10),
  A('riso-basmati', 'Riso basmati (crudo)', 349, 8.1, 78.0, 0.6, 1.6, 'carbo', 'pranzo cena', 'vg veg', 40, 200, 10),
  A('pane', 'Pane comune', 275, 8.6, 55.0, 1.0, 3.0, 'carbo', 'colazione pranzo cena', 'vg veg gl', 25, 200, 10),
  A('pane-integrale', 'Pane integrale', 224, 7.5, 38.9, 1.3, 6.5, 'carbo', 'colazione pranzo cena', 'vg veg gl', 25, 200, 10),
  A('patate', 'Patate', 85, 2.1, 17.9, 0.1, 1.6, 'carbo', 'pranzo cena', 'vg veg', 120, 500, 25),
  A('patate-dolci', 'Patate dolci', 86, 1.6, 20.1, 0.1, 3.0, 'carbo', 'pranzo cena', 'vg veg', 120, 400, 25),
  A('avena', 'Fiocchi d\'avena', 389, 16.9, 66.3, 6.9, 10.6, 'carbo', 'colazione spuntino', 'vg veg gl', 30, 150, 5),
  A('farro', 'Farro perlato (crudo)', 335, 15.1, 67.1, 2.5, 6.8, 'carbo', 'pranzo cena', 'vg veg gl', 40, 180, 10),
  A('quinoa', 'Quinoa (cruda)', 368, 14.1, 64.2, 6.1, 7.0, 'carbo', 'pranzo cena', 'vg veg', 40, 180, 10),
  A('cous-cous', 'Cous cous (crudo)', 376, 12.8, 77.4, 0.6, 5.0, 'carbo', 'pranzo cena', 'vg veg gl', 40, 180, 10),
  A('gallette-riso', 'Gallette di riso', 387, 8.0, 81.5, 3.0, 4.2, 'carbo', 'colazione spuntino', 'vg veg', 9, 90, 9, '1 galletta ~ 9 g'),
  A('fette-biscottate', 'Fette biscottate', 408, 11.3, 76.0, 6.0, 3.5, 'carbo', 'colazione spuntino', 'vg veg gl', 8, 96, 8, '1 fetta ~ 8 g'),
  A('polenta', 'Farina di mais per polenta', 362, 8.7, 76.4, 2.7, 2.0, 'carbo', 'pranzo cena', 'vg veg', 40, 160, 10),
  A('miele', 'Miele', 304, 0.6, 80.3, 0, 0, 'carbo', 'colazione spuntino', 'veg', 5, 40, 5),
  A('marmellata', 'Confettura di frutta', 222, 0.5, 55.0, 0.1, 1.0, 'carbo', 'colazione spuntino', 'vg veg', 10, 50, 5),

  // ---------------------------------------------------- GRASSI
  A('olio-oliva', 'Olio extravergine d\'oliva', 899, 0, 0, 99.9, 0, 'grassi', 'colazione pranzo cena spuntino', 'vg veg', 5, 50, 5, '1 cucchiaio = 10 g'),
  A('mandorle', 'Mandorle', 603, 22.0, 4.6, 55.3, 12.7, 'grassi', 'colazione spuntino', 'vg veg fs', 8, 60, 5),
  A('noci', 'Noci', 689, 14.3, 5.1, 68.1, 6.2, 'grassi', 'colazione spuntino', 'vg veg fs', 8, 50, 5),
  A('burro-arachidi', 'Burro di arachidi 100%', 588, 25.0, 12.0, 50.0, 6.0, 'grassi', 'colazione spuntino', 'vg veg fs', 8, 50, 5),
  A('avocado', 'Avocado', 231, 4.4, 1.8, 23.0, 3.3, 'grassi', 'colazione pranzo cena', 'vg veg', 30, 200, 10),
  A('semi-misti', 'Semi misti (lino, chia, girasole)', 534, 18.0, 12.0, 44.0, 20.0, 'grassi', 'colazione spuntino', 'vg veg', 8, 40, 5),
  A('cioccolato-fondente', 'Cioccolato fondente 85%', 592, 10.0, 19.0, 50.0, 12.0, 'grassi', 'spuntino', 'veg lat', 5, 40, 5),
  A('olive', 'Olive verdi', 142, 0.8, 1.0, 15.0, 4.4, 'grassi', 'pranzo cena', 'vg veg', 15, 80, 10),

  // ---------------------------------------------------- VERDURA
  A('zucchine', 'Zucchine', 17, 1.3, 1.4, 0.1, 1.2, 'verdura', 'pranzo cena', 'vg veg', 150, 350, 50),
  A('spinaci', 'Spinaci', 31, 3.4, 3.0, 0.7, 1.9, 'verdura', 'pranzo cena', 'vg veg', 150, 300, 50),
  A('broccoli', 'Broccoli', 34, 3.0, 4.0, 0.4, 3.1, 'verdura', 'pranzo cena', 'vg veg', 150, 350, 50),
  A('insalata-mista', 'Insalata mista', 19, 1.8, 2.2, 0.4, 1.5, 'verdura', 'pranzo cena', 'vg veg', 100, 250, 50),
  A('pomodori', 'Pomodori', 19, 1.0, 3.5, 0.2, 1.0, 'verdura', 'pranzo cena', 'vg veg', 100, 300, 50),
  A('melanzane', 'Melanzane', 18, 1.1, 2.6, 0.4, 2.6, 'verdura', 'pranzo cena', 'vg veg', 150, 300, 50),
  A('peperoni', 'Peperoni', 22, 0.9, 4.2, 0.3, 1.9, 'verdura', 'pranzo cena', 'vg veg', 150, 300, 50),
  A('finocchi', 'Finocchi', 9, 1.2, 1.0, 0.2, 2.2, 'verdura', 'pranzo cena', 'vg veg', 150, 300, 50),
  A('carote', 'Carote', 35, 1.1, 7.6, 0.2, 3.1, 'verdura', 'pranzo cena spuntino', 'vg veg', 100, 250, 50),
  A('cavolfiore', 'Cavolfiore', 25, 3.2, 2.7, 0.2, 2.4, 'verdura', 'pranzo cena', 'vg veg', 150, 350, 50),
  A('asparagi', 'Asparagi', 24, 3.6, 1.5, 0.2, 2.1, 'verdura', 'pranzo cena', 'vg veg', 150, 300, 50),
  A('fagiolini', 'Fagiolini', 18, 2.1, 2.4, 0.1, 2.9, 'verdura', 'pranzo cena', 'vg veg', 150, 300, 50),

  // ---------------------------------------------------- FRUTTA
  A('mela', 'Mela', 52, 0.3, 13.8, 0.2, 2.4, 'frutta', 'colazione spuntino', 'vg veg', 80, 250, 50, '1 mela media ~ 180 g'),
  A('banana', 'Banana', 89, 1.1, 22.8, 0.3, 2.6, 'frutta', 'colazione spuntino', 'vg veg', 60, 220, 25, '1 banana media ~ 120 g'),
  A('pera', 'Pera', 57, 0.4, 15.2, 0.1, 3.1, 'frutta', 'colazione spuntino', 'vg veg', 80, 250, 50),
  A('arancia', 'Arancia', 47, 0.9, 11.8, 0.1, 2.4, 'frutta', 'colazione spuntino', 'vg veg', 80, 300, 50),
  A('fragole', 'Fragole', 32, 0.7, 7.7, 0.3, 2.0, 'frutta', 'colazione spuntino', 'vg veg', 80, 300, 50),
  A('mirtilli', 'Mirtilli', 57, 0.7, 14.5, 0.3, 2.4, 'frutta', 'colazione spuntino', 'vg veg', 60, 250, 20),
  A('kiwi', 'Kiwi', 61, 1.1, 14.7, 0.5, 3.0, 'frutta', 'colazione spuntino', 'vg veg', 70, 250, 50),
  A('ananas', 'Ananas', 50, 0.5, 13.1, 0.1, 1.4, 'frutta', 'colazione spuntino', 'vg veg', 80, 250, 50),
  A('pesca', 'Pesca', 39, 0.9, 9.5, 0.3, 1.5, 'frutta', 'colazione spuntino', 'vg veg', 80, 250, 50),
  A('uva', 'Uva', 69, 0.7, 18.1, 0.2, 0.9, 'frutta', 'colazione spuntino', 'vg veg', 60, 220, 20),

  // ---------------------------------------------------- LIQUIDI / EXTRA
  A('latte-scremato', 'Latte parzialmente scremato', 46, 3.3, 4.9, 1.5, 0, 'latticini', 'colazione spuntino', 'veg lat', 100, 400, 25),
  A('bevanda-soia', 'Bevanda di soia non zuccherata', 33, 3.3, 0.8, 1.8, 0.5, 'latticini', 'colazione spuntino', 'vg veg', 100, 400, 25),
  A('caffe', 'Caffe (senza zucchero)', 2, 0.1, 0, 0, 0, 'libero', 'colazione spuntino', 'vg veg', 30, 60, 30),
  A('the-verde', 'The verde', 1, 0, 0, 0, 0, 'libero', 'colazione spuntino', 'vg veg', 200, 300, 50)
];

export const ALIMENTI_BY_ID = Object.fromEntries(ALIMENTI.map(a => [a.id, a]));

export const PREFERENZE = [
  { id: 'vegetariano', nome: 'Vegetariano', escludeTag: [], richiedeTag: 'veg' },
  { id: 'vegano', nome: 'Vegano', escludeTag: [], richiedeTag: 'vg' },
  { id: 'senza-glutine', nome: 'Senza glutine', escludeTag: ['gl'] },
  { id: 'senza-lattosio', nome: 'Senza lattosio', escludeTag: ['lat'] },
  { id: 'no-pesce', nome: 'Niente pesce', escludeTag: ['pes'] },
  { id: 'no-maiale', nome: 'Niente maiale', escludeTag: ['mai'] },
  { id: 'no-uova', nome: 'Niente uova', escludeTag: ['uov'] },
  { id: 'no-frutta-secca', nome: 'Niente frutta secca', escludeTag: ['fs'] }
];

/** Filtra il database in base a preferenze e alimenti esclusi manualmente. */
export function alimentiDisponibili(preferenze = [], esclusi = []) {
  const escludeTag = new Set();
  let richiede = null;
  for (const p of PREFERENZE) {
    if (!preferenze.includes(p.id)) continue;
    p.escludeTag.forEach(t => escludeTag.add(t));
    if (p.richiedeTag) richiede = p.richiedeTag === 'vg' ? 'vg' : (richiede === 'vg' ? 'vg' : 'veg');
  }
  return ALIMENTI.filter(a => {
    if (esclusi.includes(a.id)) return false;
    if (a.tag.some(t => escludeTag.has(t))) return false;
    if (richiede && !a.tag.includes(richiede)) return false;
    return true;
  });
}

export function macroDi(alimento, grammi) {
  const k = grammi / 100;
  return {
    kcal: alimento.kcal * k,
    proteine: alimento.p * k,
    carboidrati: alimento.c * k,
    grassi: alimento.g * k,
    fibre: alimento.fib * k
  };
}
