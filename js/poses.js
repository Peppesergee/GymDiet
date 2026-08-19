// Pose chiave per le animazioni degli esercizi.
// Sistema di coordinate: viewBox 0 0 100 100, pavimento a y=94, persona rivolta a destra.
// Giunti: head, neck, shoulder, elbow, wrist, hip, knee, ankle, toe
// Opzionali (arto lontano, disegnato piu' chiaro): elbow2, wrist2, knee2, ankle2, toe2

const P = (o) => o;

export const ANIMAZIONI = {
  squat: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'bilanciere', ancora: 'shoulder' },
    fasi: ['Partenza', 'Massima profondita'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [43, 38], wrist: [46, 29],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [56, 35], neck: [54, 41], shoulder: [52, 44], elbow: [45, 55], wrist: [48, 46],
          hip: [44, 66], knee: [59, 74], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  panca: {
    scena: ['pavimento', 'panca'],
    attrezzo: { tipo: 'bilanciere', ancora: 'wrist' },
    fasi: ['Braccia tese', 'Petto'],
    pose: [
      P({ head: [27, 60], neck: [32, 63], shoulder: [38, 64], elbow: [39, 54], wrist: [40, 42],
          hip: [54, 65], knee: [68, 73], ankle: [70, 92], toe: [77, 93] }),
      P({ head: [27, 60], neck: [32, 63], shoulder: [38, 64], elbow: [30, 60], wrist: [40, 57],
          hip: [54, 65], knee: [68, 73], ankle: [70, 92], toe: [77, 93] })
    ]
  },
  croci: {
    scena: ['pavimento', 'panca'],
    attrezzo: { tipo: 'manubrio', ancora: 'wrist' },
    fasi: ['Chiusura', 'Massimo allungamento'],
    pose: [
      P({ head: [27, 60], neck: [32, 63], shoulder: [38, 64], elbow: [38, 52], wrist: [40, 43],
          hip: [54, 65], knee: [68, 73], ankle: [70, 92], toe: [77, 93] }),
      P({ head: [27, 60], neck: [32, 63], shoulder: [38, 64], elbow: [31, 58], wrist: [25, 64],
          hip: [54, 65], knee: [68, 73], ankle: [70, 92], toe: [77, 93] })
    ]
  },
  french: {
    scena: ['pavimento', 'panca'],
    attrezzo: { tipo: 'manubrio', ancora: 'wrist' },
    fasi: ['Braccia tese', 'Flessione'],
    pose: [
      P({ head: [27, 60], neck: [32, 63], shoulder: [38, 64], elbow: [38, 52], wrist: [38, 41],
          hip: [54, 65], knee: [68, 73], ankle: [70, 92], toe: [77, 93] }),
      P({ head: [27, 60], neck: [32, 63], shoulder: [38, 64], elbow: [38, 52], wrist: [27, 50],
          hip: [54, 65], knee: [68, 73], ankle: [70, 92], toe: [77, 93] })
    ]
  },
  pushup: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Braccia tese', 'Petto a terra'],
    pose: [
      P({ head: [77, 62], neck: [72, 65], shoulder: [68, 68], elbow: [70, 80], wrist: [71, 92],
          hip: [45, 76], knee: [31, 84], ankle: [19, 90], toe: [14, 93] }),
      P({ head: [77, 76], neck: [72, 79], shoulder: [68, 81], elbow: [61, 87], wrist: [71, 92],
          hip: [45, 85], knee: [31, 89], ankle: [19, 92], toe: [14, 94] })
    ]
  },
  dip: {
    scena: ['parallele'],
    attrezzo: null,
    fasi: ['Braccia tese', 'Gomiti a 90 gradi'],
    pose: [
      P({ head: [52, 30], neck: [50, 36], shoulder: [50, 39], elbow: [51, 49], wrist: [52, 59],
          hip: [47, 62], knee: [41, 76], ankle: [33, 70], toe: [28, 68] }),
      P({ head: [54, 44], neck: [51, 50], shoulder: [50, 53], elbow: [58, 58], wrist: [52, 59],
          hip: [47, 76], knee: [41, 88], ankle: [33, 82], toe: [28, 80] })
    ]
  },
  trazioni: {
    scena: ['sbarra'],
    attrezzo: null,
    fasi: ['Braccia tese', 'Mento sopra la sbarra'],
    pose: [
      P({ head: [46, 32], neck: [50, 38], shoulder: [50, 41], elbow: [55, 28], wrist: [50, 15],
          hip: [50, 64], knee: [46, 80], ankle: [39, 89], toe: [36, 93] }),
      P({ head: [51, 15], neck: [50, 21], shoulder: [49, 25], elbow: [43, 22], wrist: [50, 15],
          hip: [50, 48], knee: [46, 64], ankle: [39, 73], toe: [36, 77] })
    ]
  },
  lat: {
    scena: ['pavimento', 'seduta', 'cavoalto'],
    attrezzo: { tipo: 'cavo', da: [52, 6], a: 'wrist' },
    fasi: ['Braccia tese', 'Sbarra al petto'],
    pose: [
      P({ head: [53, 36], neck: [51, 42], shoulder: [50, 45], elbow: [52, 32], wrist: [53, 20],
          hip: [45, 64], knee: [63, 66], ankle: [66, 84], toe: [72, 86] }),
      P({ head: [53, 36], neck: [51, 42], shoulder: [50, 45], elbow: [42, 40], wrist: [54, 46],
          hip: [45, 64], knee: [63, 66], ankle: [66, 84], toe: [72, 86] })
    ]
  },
  rematore: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'bilanciere', ancora: 'wrist' },
    fasi: ['Braccia tese', 'Bilanciere all ombelico'],
    pose: [
      P({ head: [69, 33], neck: [65, 38], shoulder: [62, 42], elbow: [62, 54], wrist: [62, 66],
          hip: [44, 58], knee: [48, 74], ankle: [48, 92], toe: [56, 93] }),
      P({ head: [69, 33], neck: [65, 38], shoulder: [62, 42], elbow: [54, 44], wrist: [60, 55],
          hip: [44, 58], knee: [48, 74], ankle: [48, 92], toe: [56, 93] })
    ]
  },
  pulley: {
    scena: ['pavimento', 'seduta', 'cavobasso'],
    attrezzo: { tipo: 'cavo', da: [92, 60], a: 'wrist' },
    fasi: ['Allungamento', 'Impugnatura all addome'],
    pose: [
      P({ head: [50, 36], neck: [48, 42], shoulder: [47, 45], elbow: [57, 49], wrist: [67, 53],
          hip: [40, 65], knee: [58, 66], ankle: [72, 74], toe: [78, 72] }),
      P({ head: [47, 34], neck: [45, 40], shoulder: [44, 43], elbow: [34, 50], wrist: [46, 55],
          hip: [40, 65], knee: [58, 66], ankle: [72, 74], toe: [78, 72] })
    ]
  },
  facepull: {
    scena: ['pavimento', 'cavoalto'],
    attrezzo: { tipo: 'cavo', da: [92, 26], a: 'wrist' },
    fasi: ['Braccia tese', 'Impugnatura al viso'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [64, 32], wrist: [76, 29],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [45, 21], wrist: [58, 22],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  militare: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'bilanciere', ancora: 'wrist' },
    fasi: ['Bilanciere alle clavicole', 'Braccia tese'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [43, 40], wrist: [48, 29],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [50, 18], wrist: [50, 7],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  alzate: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'manubrio', ancora: 'wrist' },
    fasi: ['Braccia lungo i fianchi', 'Altezza spalle'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [55, 41], wrist: [56, 54],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [62, 29], wrist: [74, 27],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  curl: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'manubrio', ancora: 'wrist' },
    fasi: ['Braccia tese', 'Contrazione'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [54, 42], wrist: [56, 56],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [54, 42], wrist: [49, 30],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  pushdown: {
    scena: ['pavimento', 'cavoalto'],
    attrezzo: { tipo: 'cavo', da: [58, 6], a: 'wrist' },
    fasi: ['Gomiti a 90 gradi', 'Estensione completa'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [54, 42], wrist: [60, 33],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [54, 42], wrist: [58, 55],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  stacco: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'bilanciere', ancora: 'wrist' },
    fasi: ['In piedi', 'Massimo allungamento'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [55, 40], wrist: [56, 53],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [58, 93] }),
      P({ head: [65, 33], neck: [61, 38], shoulder: [58, 41], elbow: [58, 55], wrist: [57, 70],
          hip: [40, 56], knee: [52, 73], ankle: [50, 92], toe: [58, 93] })
    ]
  },
  hipthrust: {
    scena: ['pavimento', 'pancabassa'],
    attrezzo: { tipo: 'bilanciere', ancora: 'hip' },
    fasi: ['Bacino in basso', 'Estensione completa'],
    pose: [
      P({ head: [18, 53], neck: [23, 56], shoulder: [28, 58], elbow: [31, 68], wrist: [37, 74],
          hip: [50, 80], knee: [67, 68], ankle: [70, 92], toe: [77, 93] }),
      P({ head: [18, 53], neck: [23, 56], shoulder: [28, 58], elbow: [32, 63], wrist: [39, 66],
          hip: [51, 63], knee: [68, 66], ankle: [70, 92], toe: [77, 93] })
    ]
  },
  affondo: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'manubrio', ancora: 'wrist' },
    fasi: ['In piedi', 'Ginocchia a 90 gradi'],
    pose: [
      P({ head: [52, 17], neck: [52, 24], shoulder: [52, 27], elbow: [53, 40], wrist: [54, 53],
          hip: [52, 52], knee: [58, 72], ankle: [62, 92], toe: [69, 93],
          knee2: [46, 72], ankle2: [42, 92], toe2: [49, 93] }),
      P({ head: [52, 29], neck: [52, 36], shoulder: [52, 39], elbow: [53, 52], wrist: [54, 65],
          hip: [52, 64], knee: [66, 74], ankle: [68, 92], toe: [75, 93],
          knee2: [40, 84], ankle2: [32, 92], toe2: [26, 90] })
    ]
  },
  pressa: {
    scena: ['pressa'],
    attrezzo: null,
    fasi: ['Ginocchia flesse', 'Spinta'],
    pose: [
      P({ head: [16, 50], neck: [21, 54], shoulder: [24, 57], elbow: [30, 62], wrist: [36, 64],
          hip: [34, 72], knee: [44, 50], ankle: [58, 56], toe: [63, 52] }),
      P({ head: [16, 50], neck: [21, 54], shoulder: [24, 57], elbow: [30, 62], wrist: [36, 64],
          hip: [34, 72], knee: [52, 56], ankle: [72, 42], toe: [77, 38] })
    ]
  },
  legext: {
    scena: ['pavimento', 'macchina'],
    attrezzo: null,
    fasi: ['Ginocchia flesse', 'Estensione'],
    pose: [
      P({ head: [32, 32], neck: [34, 38], shoulder: [35, 41], elbow: [32, 52], wrist: [38, 58],
          hip: [40, 62], knee: [60, 62], ankle: [63, 82], toe: [69, 84] }),
      P({ head: [32, 32], neck: [34, 38], shoulder: [35, 41], elbow: [32, 52], wrist: [38, 58],
          hip: [40, 62], knee: [60, 62], ankle: [82, 58], toe: [88, 56] })
    ]
  },
  legcurl: {
    scena: ['pavimento', 'pancapiana'],
    attrezzo: null,
    fasi: ['Gambe distese', 'Talloni ai glutei'],
    pose: [
      P({ head: [20, 58], neck: [25, 61], shoulder: [30, 62], elbow: [28, 72], wrist: [22, 70],
          hip: [56, 63], knee: [72, 63], ankle: [88, 63], toe: [92, 68] }),
      P({ head: [20, 58], neck: [25, 61], shoulder: [30, 62], elbow: [28, 72], wrist: [22, 70],
          hip: [56, 63], knee: [72, 63], ankle: [78, 45], toe: [82, 40] })
    ]
  },
  calf: {
    scena: ['pavimento', 'rialzo'],
    attrezzo: null,
    fasi: ['Talloni in basso', 'Sulle punte'],
    pose: [
      P({ head: [50, 19], neck: [50, 26], shoulder: [50, 29], elbow: [55, 42], wrist: [56, 55],
          hip: [50, 54], knee: [50, 73], ankle: [50, 89], toe: [58, 84] }),
      P({ head: [50, 10], neck: [50, 17], shoulder: [50, 20], elbow: [55, 33], wrist: [56, 46],
          hip: [50, 45], knee: [50, 64], ankle: [50, 79], toe: [58, 84] })
    ]
  },
  plank: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Tenuta isometrica', 'Tenuta isometrica'],
    pose: [
      P({ head: [78, 74], neck: [73, 77], shoulder: [69, 79], elbow: [66, 92], wrist: [76, 92],
          hip: [45, 81], knee: [31, 86], ankle: [18, 91], toe: [13, 93] }),
      P({ head: [78, 75], neck: [73, 78], shoulder: [69, 80], elbow: [66, 92], wrist: [76, 92],
          hip: [45, 83], knee: [31, 87], ankle: [18, 91], toe: [13, 93] })
    ]
  },
  crunch: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Scapole a terra', 'Contrazione'],
    pose: [
      P({ head: [24, 82], neck: [29, 84], shoulder: [34, 86], elbow: [32, 78], wrist: [26, 78],
          hip: [58, 89], knee: [72, 74], ankle: [86, 90], toe: [92, 88] }),
      P({ head: [31, 70], neck: [35, 75], shoulder: [39, 80], elbow: [37, 71], wrist: [31, 68],
          hip: [58, 89], knee: [72, 74], ankle: [86, 90], toe: [92, 88] })
    ]
  },
  legraise: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Gambe basse', 'Gambe a 90 gradi'],
    pose: [
      P({ head: [14, 84], neck: [19, 86], shoulder: [24, 88], elbow: [26, 92], wrist: [33, 92],
          hip: [48, 89], knee: [66, 88], ankle: [84, 87], toe: [88, 82] }),
      P({ head: [14, 84], neck: [19, 86], shoulder: [24, 88], elbow: [26, 92], wrist: [33, 92],
          hip: [48, 89], knee: [54, 69], ankle: [58, 49], toe: [64, 46] })
    ]
  },
  twist: {
    scena: ['pavimento'],
    attrezzo: { tipo: 'manubrio', ancora: 'wrist' },
    fasi: ['Rotazione destra', 'Rotazione sinistra'],
    pose: [
      P({ head: [22, 56], neck: [26, 61], shoulder: [29, 64], elbow: [38, 70], wrist: [48, 68],
          hip: [42, 84], knee: [62, 72], ankle: [76, 82], toe: [82, 79] }),
      P({ head: [22, 56], neck: [26, 61], shoulder: [29, 64], elbow: [32, 72], wrist: [34, 80],
          hip: [42, 84], knee: [62, 72], ankle: [76, 82], toe: [82, 79] })
    ]
  },
  mountain: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Ginocchio indietro', 'Ginocchio al petto'],
    pose: [
      P({ head: [80, 66], neck: [75, 69], shoulder: [71, 71], elbow: [72, 81], wrist: [73, 92],
          hip: [47, 79], knee: [33, 85], ankle: [20, 90], toe: [15, 93],
          knee2: [55, 82], ankle2: [45, 90], toe2: [40, 93] }),
      P({ head: [80, 66], neck: [75, 69], shoulder: [71, 71], elbow: [72, 81], wrist: [73, 92],
          hip: [47, 79], knee: [59, 78], ankle: [50, 87], toe: [45, 90],
          knee2: [33, 85], ankle2: [20, 90], toe2: [15, 93] })
    ]
  },
  camminata: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Passo', 'Passo'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [45, 39], wrist: [43, 51],
          elbow2: [55, 39], wrist2: [58, 50],
          hip: [50, 52], knee: [58, 71], ankle: [63, 90], toe: [69, 92],
          knee2: [43, 72], ankle2: [37, 90], toe2: [43, 93] }),
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [55, 39], wrist: [58, 50],
          elbow2: [45, 39], wrist2: [43, 51],
          hip: [50, 52], knee: [43, 72], ankle: [37, 90], toe: [43, 93],
          knee2: [58, 71], ankle2: [63, 90], toe2: [69, 92] })
    ]
  },
  jack: {
    scena: ['pavimento'],
    attrezzo: null,
    fasi: ['Chiuso', 'Aperto'],
    pose: [
      P({ head: [50, 17], neck: [50, 24], shoulder: [50, 27], elbow: [55, 40], wrist: [56, 53],
          elbow2: [45, 40], wrist2: [44, 53],
          hip: [50, 52], knee: [50, 72], ankle: [50, 92], toe: [56, 93],
          knee2: [50, 72], ankle2: [50, 92], toe2: [44, 93] }),
      P({ head: [50, 15], neck: [50, 22], shoulder: [50, 25], elbow: [60, 16], wrist: [66, 6],
          elbow2: [40, 16], wrist2: [34, 6],
          hip: [50, 50], knee: [62, 66], ankle: [72, 86], toe: [78, 88],
          knee2: [38, 66], ankle2: [28, 86], toe2: [22, 88] })
    ]
  },
  burpee: {
    scena: ['pavimento'],
    attrezzo: null,
    ciclo: 'loop',
    fasi: ['In piedi', 'Accosciata', 'Plank'],
    pose: [
      P({ head: [50, 15], neck: [50, 22], shoulder: [50, 25], elbow: [55, 16], wrist: [58, 6],
          hip: [50, 50], knee: [50, 71], ankle: [50, 92], toe: [57, 93] }),
      P({ head: [56, 46], neck: [53, 52], shoulder: [52, 55], elbow: [55, 70], wrist: [58, 88],
          hip: [45, 72], knee: [58, 78], ankle: [50, 92], toe: [57, 93] }),
      P({ head: [78, 68], neck: [73, 71], shoulder: [69, 73], elbow: [70, 82], wrist: [71, 92],
          hip: [45, 80], knee: [31, 86], ankle: [18, 91], toe: [13, 93] })
    ]
  }
};

export const ANIM_DEFAULT = 'squat';
