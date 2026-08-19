// Database esercizi.
// attrezzatura: 'palestra' (sala pesi completa), 'casa' (manubri/elastici/panca), 'libero' (corpo libero)
// pattern: usato dal generatore per bilanciare la scheda
// anim: chiave dell'animazione SVG (vedi js/poses.js)

export const GRUPPI = {
  petto:        { nome: 'Petto',        colore: '#ff6b6b' },
  dorso:        { nome: 'Dorso',        colore: '#4dabf7' },
  spalle:       { nome: 'Spalle',       colore: '#ffd43b' },
  bicipiti:     { nome: 'Bicipiti',     colore: '#9775fa' },
  tricipiti:    { nome: 'Tricipiti',    colore: '#f783ac' },
  quadricipiti: { nome: 'Quadricipiti', colore: '#69db7c' },
  femorali:     { nome: 'Femorali',     colore: '#38d9a9' },
  glutei:       { nome: 'Glutei',       colore: '#ffa94d' },
  polpacci:     { nome: 'Polpacci',     colore: '#a9e34b' },
  core:         { nome: 'Core',         colore: '#66d9e8' },
  cardio:       { nome: 'Cardio',       colore: '#ff922b' }
};

export const ESERCIZI = [
  // ---------------------------------------------------------------- PETTO
  {
    id: 'panca-piana-bilanciere', nome: 'Panca piana con bilanciere', gruppo: 'petto',
    pattern: 'spinta-orizzontale', tipo: 'multi', livello: 2, anim: 'panca',
    attrezzatura: ['palestra'], rischio: ['spalle'],
    muscoli: { primari: ['Gran pettorale'], secondari: ['Deltoide anteriore', 'Tricipite'] },
    setup: [
      'Sdraiati sulla panca con gli occhi sotto il bilanciere.',
      'Piedi ben piantati a terra, leggera arcata lombare naturale.',
      'Presa poco più larga delle spalle, scapole retratte e depresse (petto in fuori).'
    ],
    esecuzione: [
      'Stacca il bilanciere e portalo sopra le spalle a braccia tese.',
      'Scendi in 2 secondi controllando, toccando il petto all\'altezza dei capezzoli.',
      'Gomiti a circa 45-60° rispetto al busto, mai a 90°.',
      'Spingi verso l\'alto e leggermente indietro, senza staccare le scapole.'
    ],
    errori: [
      'Rimbalzare il bilanciere sul petto.',
      'Gomiti aperti a 90° (stress sulle spalle).',
      'Sollevare il sedere dalla panca.'
    ],
    respiro: 'Inspira in discesa, espira spingendo.', tempo: '2-1-1-0'
  },
  {
    id: 'panca-manubri', nome: 'Panca piana con manubri', gruppo: 'petto',
    pattern: 'spinta-orizzontale', tipo: 'multi', livello: 1, anim: 'panca',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Gran pettorale'], secondari: ['Deltoide anteriore', 'Tricipite'] },
    setup: [
      'Siediti sulla panca con i manubri sulle cosce.',
      'Sdraiati "calciando" i manubri in posizione, scapole retratte.'
    ],
    esecuzione: [
      'Parti a braccia tese con i manubri sopra le spalle.',
      'Scendi controllato fino ad avere i gomiti poco sotto la linea del busto.',
      'Spingi verso l\'alto avvicinando leggermente i manubri senza farli scontrare.'
    ],
    errori: ['Scendere troppo forzando la spalla.', 'Perdere la retrazione scapolare.'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-1-1-0'
  },
  {
    id: 'panca-inclinata-manubri', nome: 'Panca inclinata con manubri', gruppo: 'petto',
    pattern: 'spinta-orizzontale', tipo: 'multi', livello: 1, anim: 'panca',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Petto alto'], secondari: ['Deltoide anteriore', 'Tricipite'] },
    setup: ['Panca inclinata a 30-40°.', 'Schiena appoggiata, scapole retratte.'],
    esecuzione: [
      'Manubri sopra la parte alta del petto a braccia tese.',
      'Scendi in controllo fino all\'altezza delle clavicole.',
      'Spingi in alto seguendo una traiettoria leggermente convergente.'
    ],
    errori: ['Inclinazione oltre 45° (diventa un lavoro di spalle).'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-1-1-0'
  },
  {
    id: 'croci-manubri', nome: 'Croci su panca', gruppo: 'petto',
    pattern: 'isolamento-petto', tipo: 'isolamento', livello: 1, anim: 'croci',
    attrezzatura: ['palestra', 'casa'], rischio: ['spalle'],
    muscoli: { primari: ['Gran pettorale'], secondari: ['Deltoide anteriore'] },
    setup: ['Sdraiato su panca piana o leggermente inclinata, manubri sopra il petto.'],
    esecuzione: [
      'Gomiti leggermente flessi e "bloccati" in quell\'angolo per tutta la serie.',
      'Apri le braccia lateralmente fino a sentire l\'allungamento del petto.',
      'Chiudi immaginando di "abbracciare un albero", senza far toccare i manubri.'
    ],
    errori: ['Usare carichi troppo alti trasformandolo in una spinta.', 'Scendere oltre l\'allungamento confortevole.'],
    respiro: 'Inspira aprendo, espira chiudendo.', tempo: '3-1-1-1'
  },
  {
    id: 'piegamenti', nome: 'Piegamenti sulle braccia (push-up)', gruppo: 'petto',
    pattern: 'spinta-orizzontale', tipo: 'multi', livello: 1, anim: 'pushup',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: ['Gran pettorale'], secondari: ['Tricipite', 'Deltoide anteriore', 'Core'] },
    setup: ['Mani poco più larghe delle spalle, sotto il petto.', 'Corpo in linea retta da testa a talloni, addome contratto.'],
    esecuzione: [
      'Scendi controllato fino a sfiorare il pavimento con il petto.',
      'Gomiti a circa 45° dal busto.',
      'Spingi mantenendo bacino e spalle allineati.'
    ],
    errori: ['Bacino che "cade" o si alza troppo.', 'Range di movimento parziale.'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-0-1-0',
    varianti: 'Troppo difficile? Appoggia le mani su un rialzo. Troppo facile? Piedi su una sedia o zaino carico sulla schiena.'
  },
  {
    id: 'dip-parallele', nome: 'Dip alle parallele', gruppo: 'petto',
    pattern: 'spinta-verticale', tipo: 'multi', livello: 3, anim: 'dip',
    attrezzatura: ['palestra', 'libero'], rischio: ['spalle'],
    muscoli: { primari: ['Petto basso', 'Tricipite'], secondari: ['Deltoide anteriore'] },
    setup: ['Sali sulle parallele a braccia tese, spalle basse e lontane dalle orecchie.'],
    esecuzione: [
      'Inclina leggermente il busto in avanti per enfatizzare il petto.',
      'Scendi fino ad avere le braccia a circa 90°.',
      'Risali spingendo, senza bloccare violentemente i gomiti.'
    ],
    errori: ['Scendere troppo in basso stressando la spalla.', 'Spalle "in su" verso le orecchie.'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-0-1-0'
  },

  // ---------------------------------------------------------------- DORSO
  {
    id: 'trazioni', nome: 'Trazioni alla sbarra', gruppo: 'dorso',
    pattern: 'trazione-verticale', tipo: 'multi', livello: 3, anim: 'trazioni',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: ['Gran dorsale'], secondari: ['Bicipite', 'Romboidi', 'Trapezio inferiore'] },
    setup: ['Presa prona poco più larga delle spalle.', 'Parti a braccia tese, spalle attive (non "appese").'],
    esecuzione: [
      'Inizia deprimendo le scapole, poi tira i gomiti verso il basso e indietro.',
      'Sali fino a portare il mento sopra la sbarra.',
      'Scendi in 2-3 secondi controllando fino a braccia quasi tese.'
    ],
    errori: ['Slanci con le gambe (kipping) se l\'obiettivo è ipertrofia.', 'Mezzo range di movimento.'],
    respiro: 'Espira salendo, inspira scendendo.', tempo: '3-0-1-0',
    varianti: 'Se non riesci: usa un elastico, la lat machine o le trazioni negative (salti su e scendi in 5 secondi).'
  },
  {
    id: 'lat-machine', nome: 'Lat machine avanti', gruppo: 'dorso',
    pattern: 'trazione-verticale', tipo: 'multi', livello: 1, anim: 'lat',
    attrezzatura: ['palestra'], rischio: [],
    muscoli: { primari: ['Gran dorsale'], secondari: ['Bicipite', 'Romboidi'] },
    setup: ['Cosce bloccate sotto i cuscinetti.', 'Presa prona larga, busto inclinato indietro di 10-20°.'],
    esecuzione: [
      'Tira la sbarra verso la parte alta del petto guidando con i gomiti.',
      'Stringi le scapole in basso al termine della trazione.',
      'Risali controllando fino al completo allungamento.'
    ],
    errori: ['Tirare dietro la nuca.', 'Sbilanciare troppo il busto indietro usando lo slancio.'],
    respiro: 'Espira tirando, inspira risalendo.', tempo: '3-0-1-1'
  },
  {
    id: 'rematore-bilanciere', nome: 'Rematore con bilanciere', gruppo: 'dorso',
    pattern: 'trazione-orizzontale', tipo: 'multi', livello: 2, anim: 'rematore',
    attrezzatura: ['palestra'], rischio: ['schiena'],
    muscoli: { primari: ['Gran dorsale', 'Romboidi'], secondari: ['Trapezio', 'Bicipite', 'Erettori spinali'] },
    setup: ['Piedi larghezza anche, ginocchia semi-flesse.', 'Busto inclinato a circa 45°, schiena neutra e petto in fuori.'],
    esecuzione: [
      'Tira il bilanciere verso l\'ombelico/basso addome.',
      'Gomiti vicini al corpo, scapole che si avvicinano.',
      'Scendi controllato senza far cadere il busto.'
    ],
    errori: ['Schiena curva (rischio lombare).', 'Usare le gambe come molla.'],
    respiro: 'Espira tirando, inspira scendendo.', tempo: '2-0-1-1'
  },
  {
    id: 'rematore-manubrio', nome: 'Rematore con manubrio', gruppo: 'dorso',
    pattern: 'trazione-orizzontale', tipo: 'multi', livello: 1, anim: 'rematore',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Gran dorsale'], secondari: ['Romboidi', 'Bicipite'] },
    setup: ['Un ginocchio e una mano sulla panca, schiena parallela al pavimento e neutra.'],
    esecuzione: [
      'Manubrio a braccio teso, spalla allungata.',
      'Tira portando il gomito verso l\'anca, stringendo la scapola.',
      'Scendi lentamente fino al massimo allungamento.'
    ],
    errori: ['Ruotare il busto per aiutarsi.', 'Tirare con il bicipite invece che con il gomito.'],
    respiro: 'Espira tirando, inspira scendendo.', tempo: '2-0-1-1'
  },
  {
    id: 'pulley', nome: 'Pulley basso', gruppo: 'dorso',
    pattern: 'trazione-orizzontale', tipo: 'multi', livello: 1, anim: 'pulley',
    attrezzatura: ['palestra'], rischio: [],
    muscoli: { primari: ['Gran dorsale', 'Romboidi'], secondari: ['Bicipite', 'Deltoide posteriore'] },
    setup: ['Seduto, piedi sulla pedana, ginocchia morbide, busto eretto.'],
    esecuzione: [
      'Parti con le braccia tese e le scapole allungate in avanti.',
      'Tira l\'impugnatura verso l\'addome mantenendo il busto fermo.',
      'Ritorna controllando, lasciando allungare le scapole.'
    ],
    errori: ['Oscillare avanti e indietro con il busto.', 'Alzare le spalle.'],
    respiro: 'Espira tirando, inspira tornando.', tempo: '2-1-1-1'
  },
  {
    id: 'rematore-elastico', nome: 'Rematore con elastico', gruppo: 'dorso',
    pattern: 'trazione-orizzontale', tipo: 'multi', livello: 1, anim: 'pulley',
    attrezzatura: ['casa', 'libero'], rischio: [],
    muscoli: { primari: ['Gran dorsale', 'Romboidi'], secondari: ['Bicipite'] },
    setup: ['Elastico ancorato all\'altezza dell\'addome (porta, ringhiera) o sotto i piedi da seduto.'],
    esecuzione: ['Braccia tese in partenza.', 'Tira i gomiti indietro vicino ai fianchi stringendo le scapole.', 'Ritorna lentamente.'],
    errori: ['Elastico troppo leggero: la serie deve risultare impegnativa.'],
    respiro: 'Espira tirando.', tempo: '2-1-1-1'
  },
  {
    id: 'pullover', nome: 'Pullover con manubrio', gruppo: 'dorso',
    pattern: 'isolamento-dorso', tipo: 'isolamento', livello: 2, anim: 'croci',
    attrezzatura: ['palestra', 'casa'], rischio: ['spalle'],
    muscoli: { primari: ['Gran dorsale'], secondari: ['Petto', 'Tricipite lungo'] },
    setup: ['Sdraiato sulla panca, manubrio tenuto a due mani sopra il petto.'],
    esecuzione: ['Porta il manubrio dietro la testa con i gomiti quasi tesi.', 'Fermati dove senti l\'allungamento.', 'Riporta sopra il petto contraendo il dorsale.'],
    errori: ['Inarcare la lombare.', 'Scendere troppo con carichi alti.'],
    respiro: 'Inspira aprendo, espira chiudendo.', tempo: '3-1-1-0'
  },
  {
    id: 'face-pull', nome: 'Face pull', gruppo: 'dorso',
    pattern: 'isolamento-spalle-post', tipo: 'isolamento', livello: 1, anim: 'facepull',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Deltoide posteriore', 'Trapezio medio'], secondari: ['Romboidi', 'Cuffia dei rotatori'] },
    setup: ['Cavo o elastico all\'altezza del viso, presa neutra.'],
    esecuzione: ['Tira verso la fronte separando le mani.', 'Ruota esternamente le spalle a fine movimento.', 'Ritorna lentamente.'],
    errori: ['Carichi eccessivi che portano a usare il trapezio superiore.'],
    respiro: 'Espira tirando.', tempo: '2-1-1-1'
  },

  // ---------------------------------------------------------------- SPALLE
  {
    id: 'military-press', nome: 'Lento avanti con bilanciere', gruppo: 'spalle',
    pattern: 'spinta-verticale', tipo: 'multi', livello: 2, anim: 'militare',
    attrezzatura: ['palestra'], rischio: ['spalle', 'schiena'],
    muscoli: { primari: ['Deltoide anteriore'], secondari: ['Deltoide laterale', 'Tricipite', 'Core'] },
    setup: ['In piedi, piedi larghezza anche, glutei e addome contratti.', 'Bilanciere appoggiato sulle clavicole, presa poco più larga delle spalle.'],
    esecuzione: [
      'Spingi il bilanciere sopra la testa portando la testa leggermente indietro e poi "attraverso".',
      'A fine movimento le braccia sono tese e il bilanciere sopra la verticale delle orecchie.',
      'Scendi controllato fino alle clavicole.'
    ],
    errori: ['Inarcare fortemente la lombare.', 'Spingere in avanti anziché sopra la testa.'],
    respiro: 'Espira spingendo, inspira scendendo.', tempo: '2-0-1-0'
  },
  {
    id: 'shoulder-press-manubri', nome: 'Shoulder press con manubri', gruppo: 'spalle',
    pattern: 'spinta-verticale', tipo: 'multi', livello: 1, anim: 'militare',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Deltoide anteriore'], secondari: ['Deltoide laterale', 'Tricipite'] },
    setup: ['Seduto con schienale o in piedi, manubri all\'altezza delle orecchie, gomiti leggermente avanti.'],
    esecuzione: ['Spingi verso l\'alto avvicinando i manubri senza farli sbattere.', 'Scendi fino a gomiti a 90°.'],
    errori: ['Gomiti troppo aperti sul piano frontale.', 'Bloccare la respirazione.'],
    respiro: 'Espira spingendo.', tempo: '2-0-1-0'
  },
  {
    id: 'alzate-laterali', nome: 'Alzate laterali', gruppo: 'spalle',
    pattern: 'isolamento-spalle', tipo: 'isolamento', livello: 1, anim: 'alzate',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Deltoide laterale'], secondari: ['Trapezio'] },
    setup: ['In piedi, manubri lungo i fianchi, gomiti appena flessi.'],
    esecuzione: [
      'Alza le braccia lateralmente fino all\'altezza delle spalle.',
      'Immagina di "versare dell\'acqua": mignolo leggermente più alto del pollice.',
      'Scendi in 2-3 secondi senza far cadere i pesi.'
    ],
    errori: ['Slanciare con il busto.', 'Salire sopra la linea delle spalle (entra il trapezio).'],
    respiro: 'Espira salendo.', tempo: '3-0-1-1'
  },
  {
    id: 'alzate-posteriori', nome: 'Alzate posteriori (rear delt)', gruppo: 'spalle',
    pattern: 'isolamento-spalle-post', tipo: 'isolamento', livello: 1, anim: 'alzate',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Deltoide posteriore'], secondari: ['Romboidi', 'Trapezio medio'] },
    setup: ['Busto inclinato in avanti a 45-90°, manubri sotto il petto.'],
    esecuzione: ['Apri le braccia lateralmente con gomiti semi-flessi.', 'Fermati all\'altezza delle spalle, contrai 1 secondo.'],
    errori: ['Usare troppo carico e trasformarlo in un rematore.'],
    respiro: 'Espira aprendo.', tempo: '2-1-1-1'
  },
  {
    id: 'pike-pushup', nome: 'Pike push-up', gruppo: 'spalle',
    pattern: 'spinta-verticale', tipo: 'multi', livello: 2, anim: 'pushup',
    attrezzatura: ['libero', 'casa'], rischio: [],
    muscoli: { primari: ['Deltoide anteriore'], secondari: ['Tricipite', 'Petto alto'] },
    setup: ['Posizione a "V" rovesciata, bacino alto, mani larghezza spalle.'],
    esecuzione: ['Scendi con la testa verso il pavimento tra le mani.', 'Spingi tornando in posizione di partenza.'],
    errori: ['Perdere la posizione a V allungando il corpo.'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-0-1-0'
  },

  // ---------------------------------------------------------------- GAMBE
  {
    id: 'squat-bilanciere', nome: 'Squat con bilanciere', gruppo: 'quadricipiti',
    pattern: 'squat', tipo: 'multi', livello: 3, anim: 'squat',
    attrezzatura: ['palestra'], rischio: ['ginocchia', 'schiena'],
    muscoli: { primari: ['Quadricipite', 'Gluteo'], secondari: ['Femorali', 'Erettori spinali', 'Core'] },
    setup: [
      'Bilanciere sui trapezi (high bar) o sui deltoidi posteriori (low bar).',
      'Piedi larghezza spalle, punte leggermente extraruotate (15-30°).',
      'Addome contratto, sguardo avanti.'
    ],
    esecuzione: [
      'Scendi spingendo il bacino indietro e in basso, ginocchia in linea con le punte.',
      'Arriva almeno con la coscia parallela al pavimento (o alla massima profondità controllata).',
      'Risali spingendo con tutto il piede, senza far cadere il petto in avanti.'
    ],
    errori: ['Ginocchia che collassano verso l\'interno.', 'Talloni che si sollevano.', 'Schiena che si arrotonda in basso ("butt wink" marcato).'],
    respiro: 'Inspira e tieni in discesa, espira nella risalita.', tempo: '3-0-1-0'
  },
  {
    id: 'goblet-squat', nome: 'Goblet squat', gruppo: 'quadricipiti',
    pattern: 'squat', tipo: 'multi', livello: 1, anim: 'squat',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Quadricipite', 'Gluteo'], secondari: ['Core'] },
    setup: ['Manubrio o kettlebell tenuto al petto a due mani, gomiti sotto.'],
    esecuzione: ['Scendi mantenendo il busto eretto.', 'Gomiti tra le ginocchia in basso.', 'Risali spingendo con i talloni.'],
    errori: ['Lasciar cadere il peso in avanti.'],
    respiro: 'Inspira scendendo, espira salendo.', tempo: '3-1-1-0'
  },
  {
    id: 'squat-corpo-libero', nome: 'Squat a corpo libero', gruppo: 'quadricipiti',
    pattern: 'squat', tipo: 'multi', livello: 1, anim: 'squat',
    attrezzatura: ['libero', 'casa'], rischio: [],
    muscoli: { primari: ['Quadricipite', 'Gluteo'], secondari: ['Core'] },
    setup: ['Piedi larghezza spalle, braccia avanti per bilanciarti.'],
    esecuzione: ['Scendi lentamente (3 secondi) fino a coscia parallela.', 'Risali contraendo i glutei in alto.'],
    errori: ['Movimento troppo veloce senza controllo.'],
    respiro: 'Inspira scendendo, espira salendo.', tempo: '3-1-1-0',
    varianti: 'Per aumentare la difficoltà: squat bulgaro, pistol squat assistito, o pausa di 3" in basso.'
  },
  {
    id: 'pressa', nome: 'Leg press', gruppo: 'quadricipiti',
    pattern: 'squat', tipo: 'multi', livello: 1, anim: 'pressa',
    attrezzatura: ['palestra'], rischio: [],
    muscoli: { primari: ['Quadricipite', 'Gluteo'], secondari: ['Femorali'] },
    setup: ['Schiena e bacino ben aderenti allo schienale, piedi a metà pedana larghezza spalle.'],
    esecuzione: ['Scendi fino a circa 90° di ginocchio senza staccare il bacino.', 'Spingi senza bloccare violentemente le ginocchia.'],
    errori: ['Staccare la lombare dallo schienale (scendere troppo).', 'Estensione esplosiva con blocco del ginocchio.'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-0-1-0'
  },
  {
    id: 'affondi', nome: 'Affondi con manubri', gruppo: 'quadricipiti',
    pattern: 'affondo', tipo: 'multi', livello: 2, anim: 'affondo',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: ['ginocchia'],
    muscoli: { primari: ['Quadricipite', 'Gluteo'], secondari: ['Femorali', 'Core'] },
    setup: ['In piedi, manubri lungo i fianchi (o a corpo libero), busto eretto.'],
    esecuzione: ['Fai un passo avanti e scendi finché entrambe le ginocchia sono a 90°.', 'Il ginocchio posteriore sfiora il pavimento.', 'Spingi con il tallone della gamba avanti per tornare su.'],
    errori: ['Passo troppo corto (sovraccarico del ginocchio).', 'Busto che cade in avanti.'],
    respiro: 'Inspira scendendo, espira salendo.', tempo: '2-0-1-0'
  },
  {
    id: 'bulgarian-split-squat', nome: 'Bulgarian split squat', gruppo: 'quadricipiti',
    pattern: 'affondo', tipo: 'multi', livello: 2, anim: 'affondo',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: ['ginocchia'],
    muscoli: { primari: ['Quadricipite', 'Gluteo'], secondari: ['Femorali'] },
    setup: ['Piede posteriore appoggiato su panca/sedia, piede avanti a circa 60-70 cm.'],
    esecuzione: ['Scendi in verticale fino a coscia parallela.', 'Risali spingendo con il piede anteriore.'],
    errori: ['Distanza dalla panca sbagliata.', 'Saltellare per risalire.'],
    respiro: 'Inspira scendendo, espira salendo.', tempo: '3-0-1-0'
  },
  {
    id: 'leg-extension', nome: 'Leg extension', gruppo: 'quadricipiti',
    pattern: 'isolamento-quad', tipo: 'isolamento', livello: 1, anim: 'legext',
    attrezzatura: ['palestra'], rischio: ['ginocchia'],
    muscoli: { primari: ['Quadricipite'], secondari: [] },
    setup: ['Schienale regolato in modo che il ginocchio coincida con il perno della macchina.'],
    esecuzione: ['Estendi le gambe fino quasi al blocco, contraendo 1 secondo.', 'Scendi in 3 secondi.'],
    errori: ['Slanci e rimbalzi.', 'Carico troppo alto con range parziale.'],
    respiro: 'Espira estendendo.', tempo: '3-0-1-1'
  },
  {
    id: 'stacco-rumeno', nome: 'Stacco rumeno (RDL)', gruppo: 'femorali',
    pattern: 'hinge', tipo: 'multi', livello: 2, anim: 'stacco',
    attrezzatura: ['palestra', 'casa'], rischio: ['schiena'],
    muscoli: { primari: ['Femorali', 'Gluteo'], secondari: ['Erettori spinali', 'Dorsale'] },
    setup: ['Bilanciere/manubri davanti alle cosce, piedi larghezza anche, ginocchia leggermente flesse.'],
    esecuzione: [
      'Spingi il bacino indietro facendo scorrere il peso lungo le cosce.',
      'Scendi finché senti i femorali in tensione (di solito sotto il ginocchio), schiena sempre neutra.',
      'Risali estendendo le anche e contraendo i glutei.'
    ],
    errori: ['Piegare le ginocchia come in uno squat.', 'Arrotondare la schiena.', 'Iperestendere la lombare in alto.'],
    respiro: 'Inspira scendendo, espira salendo.', tempo: '3-1-1-0'
  },
  {
    id: 'stacco-terra', nome: 'Stacco da terra', gruppo: 'femorali',
    pattern: 'hinge', tipo: 'multi', livello: 3, anim: 'stacco',
    attrezzatura: ['palestra'], rischio: ['schiena'],
    muscoli: { primari: ['Femorali', 'Gluteo', 'Erettori spinali'], secondari: ['Dorsale', 'Trapezio', 'Quadricipite'] },
    setup: ['Bilanciere sopra la metà del piede, presa poco più larga delle gambe.', 'Spalle appena davanti al bilanciere, schiena neutra, petto alto.'],
    esecuzione: ['Spingi il pavimento con i piedi mantenendo il bilanciere aderente alle gambe.', 'Estendi anche e ginocchia insieme.', 'Riporta a terra invertendo il movimento (prima le anche).'],
    errori: ['Bilanciere lontano dal corpo.', 'Schiena curva.', 'Iperestensione a fine alzata.'],
    respiro: 'Inspira e blocca prima di staccare, espira in alto.', tempo: '2-0-1-1'
  },
  {
    id: 'leg-curl', nome: 'Leg curl', gruppo: 'femorali',
    pattern: 'isolamento-femorali', tipo: 'isolamento', livello: 1, anim: 'legcurl',
    attrezzatura: ['palestra'], rischio: [],
    muscoli: { primari: ['Femorali'], secondari: ['Polpaccio'] },
    setup: ['Sdraiato o seduto alla macchina, rullo appena sopra il tallone.'],
    esecuzione: ['Fletti le ginocchia portando i talloni ai glutei.', 'Ritorna in 3 secondi senza far sbattere i pesi.'],
    errori: ['Sollevare il bacino dal supporto.'],
    respiro: 'Espira flettendo.', tempo: '3-0-1-1'
  },
  {
    id: 'nordic-curl', nome: 'Nordic curl assistito', gruppo: 'femorali',
    pattern: 'isolamento-femorali', tipo: 'isolamento', livello: 3, anim: 'legcurl',
    attrezzatura: ['libero', 'casa'], rischio: ['ginocchia'],
    muscoli: { primari: ['Femorali'], secondari: ['Gluteo'] },
    setup: ['In ginocchio su un tappetino, caviglie bloccate sotto un mobile o da un partner.'],
    esecuzione: ['Scendi lentamente in avanti mantenendo il corpo in linea.', 'Ammortizza con le mani e spingi per risalire.'],
    errori: ['Piegarsi sulle anche invece di restare in linea.'],
    respiro: 'Inspira scendendo.', tempo: '4-0-1-0'
  },
  {
    id: 'hip-thrust', nome: 'Hip thrust', gruppo: 'glutei',
    pattern: 'hinge', tipo: 'multi', livello: 2, anim: 'hipthrust',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Gluteo'], secondari: ['Femorali', 'Quadricipite'] },
    setup: ['Schiena appoggiata alla panca sotto le scapole, bilanciere/manubrio sulle anche.', 'Piedi larghezza anche, tibie verticali in alto.'],
    esecuzione: ['Spingi con i talloni estendendo le anche fino alla linea ginocchia-anca-spalla.', 'Contrai i glutei 1-2 secondi in alto.', 'Scendi controllato senza appoggiare completamente.'],
    errori: ['Iperestendere la lombare invece di usare i glutei.', 'Mento in alto (meglio sguardo avanti/basso).'],
    respiro: 'Espira spingendo in alto.', tempo: '2-1-1-1'
  },
  {
    id: 'ponte-glutei', nome: 'Ponte per glutei a corpo libero', gruppo: 'glutei',
    pattern: 'hinge', tipo: 'isolamento', livello: 1, anim: 'hipthrust',
    attrezzatura: ['libero', 'casa'], rischio: [],
    muscoli: { primari: ['Gluteo'], secondari: ['Femorali'] },
    setup: ['Sdraiato a terra, ginocchia piegate, piedi vicini ai glutei.'],
    esecuzione: ['Solleva il bacino contraendo i glutei.', 'Pausa 2 secondi in alto.', 'Scendi senza appoggiare completamente.'],
    errori: ['Spingere con la zona lombare.'],
    respiro: 'Espira salendo.', tempo: '2-2-1-0',
    varianti: 'Versione monopodalica per aumentare l\'intensità.'
  },
  {
    id: 'calf-raise', nome: 'Calf raise in piedi', gruppo: 'polpacci',
    pattern: 'isolamento-polpacci', tipo: 'isolamento', livello: 1, anim: 'calf',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: ['Gastrocnemio'], secondari: ['Soleo'] },
    setup: ['Avampiedi su un rialzo, talloni liberi di scendere.'],
    esecuzione: ['Scendi lentamente fino al massimo allungamento.', 'Sali sulle punte il più in alto possibile, pausa 1 secondo.'],
    errori: ['Rimbalzare senza controllo.', 'Range di movimento ridotto.'],
    respiro: 'Espira salendo.', tempo: '3-1-1-1'
  },

  // ---------------------------------------------------------------- BRACCIA
  {
    id: 'curl-bilanciere', nome: 'Curl con bilanciere', gruppo: 'bicipiti',
    pattern: 'isolamento-bicipiti', tipo: 'isolamento', livello: 1, anim: 'curl',
    attrezzatura: ['palestra'], rischio: [],
    muscoli: { primari: ['Bicipite brachiale'], secondari: ['Brachiale', 'Avambraccio'] },
    setup: ['In piedi, presa supina larghezza spalle, gomiti vicini al busto.'],
    esecuzione: ['Fletti i gomiti portando il bilanciere verso le spalle.', 'Non muovere i gomiti in avanti.', 'Scendi in 3 secondi fino a braccia quasi tese.'],
    errori: ['Slanciare con la schiena.', 'Aprire i gomiti in avanti (entra il deltoide).'],
    respiro: 'Espira salendo.', tempo: '3-0-1-1'
  },
  {
    id: 'curl-manubri', nome: 'Curl con manubri', gruppo: 'bicipiti',
    pattern: 'isolamento-bicipiti', tipo: 'isolamento', livello: 1, anim: 'curl',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Bicipite brachiale'], secondari: ['Brachiale'] },
    setup: ['In piedi o seduto, manubri lungo i fianchi, presa neutra.'],
    esecuzione: ['Fletti supinando il polso durante la salita.', 'Contrai in alto 1 secondo.', 'Scendi controllato.'],
    errori: ['Oscillare il busto.'],
    respiro: 'Espira salendo.', tempo: '3-1-1-1'
  },
  {
    id: 'hammer-curl', nome: 'Hammer curl', gruppo: 'bicipiti',
    pattern: 'isolamento-bicipiti', tipo: 'isolamento', livello: 1, anim: 'curl',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Brachiale', 'Brachioradiale'], secondari: ['Bicipite'] },
    setup: ['Manubri con presa neutra (palmi verso l\'interno).'],
    esecuzione: ['Fletti mantenendo la presa neutra per tutto il movimento.', 'Scendi in 3 secondi.'],
    errori: ['Ruotare i polsi.'],
    respiro: 'Espira salendo.', tempo: '3-0-1-1'
  },
  {
    id: 'curl-elastico', nome: 'Curl con elastico', gruppo: 'bicipiti',
    pattern: 'isolamento-bicipiti', tipo: 'isolamento', livello: 1, anim: 'curl',
    attrezzatura: ['casa', 'libero'], rischio: [],
    muscoli: { primari: ['Bicipite brachiale'], secondari: ['Avambraccio'] },
    setup: ['In piedi sull\'elastico, impugnature ai lati.'],
    esecuzione: ['Fletti i gomiti contro la resistenza.', 'Rilascia lentamente contrastando il ritorno.'],
    errori: ['Lasciare tornare l\'elastico di scatto.'],
    respiro: 'Espira salendo.', tempo: '3-1-1-1'
  },
  {
    id: 'french-press', nome: 'French press', gruppo: 'tricipiti',
    pattern: 'isolamento-tricipiti', tipo: 'isolamento', livello: 2, anim: 'french',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Tricipite (capo lungo)'], secondari: [] },
    setup: ['Sdraiato su panca, bilanciere EZ o manubri sopra il petto.'],
    esecuzione: ['Fletti i gomiti portando il peso verso la fronte/dietro la testa.', 'Gomiti fermi puntati verso l\'alto.', 'Estendi tornando in posizione.'],
    errori: ['Muovere i gomiti in avanti e indietro.'],
    respiro: 'Inspira scendendo, espira estendendo.', tempo: '3-0-1-0'
  },
  {
    id: 'pushdown', nome: 'Push-down ai cavi', gruppo: 'tricipiti',
    pattern: 'isolamento-tricipiti', tipo: 'isolamento', livello: 1, anim: 'pushdown',
    attrezzatura: ['palestra', 'casa'], rischio: [],
    muscoli: { primari: ['Tricipite'], secondari: [] },
    setup: ['Cavo alto (o elastico ancorato in alto), gomiti aderenti ai fianchi.'],
    esecuzione: ['Estendi i gomiti spingendo verso il basso.', 'Contrai 1 secondo in basso.', 'Risali controllando fino a 90°.'],
    errori: ['Staccare i gomiti dai fianchi.', 'Usare il busto per spingere.'],
    respiro: 'Espira spingendo.', tempo: '2-1-1-1'
  },
  {
    id: 'dip-panca', nome: 'Dip tra due appoggi', gruppo: 'tricipiti',
    pattern: 'isolamento-tricipiti', tipo: 'multi', livello: 1, anim: 'dip',
    attrezzatura: ['libero', 'casa', 'palestra'], rischio: ['spalle'],
    muscoli: { primari: ['Tricipite'], secondari: ['Petto', 'Deltoide anteriore'] },
    setup: ['Mani su una sedia/panca dietro di te, gambe distese o piegate davanti.'],
    esecuzione: ['Scendi flettendo i gomiti fino a 90°.', 'Spingi per risalire tenendo i gomiti stretti.'],
    errori: ['Scendere troppo (stress sulla spalla).', 'Allontanare troppo il bacino dall\'appoggio.'],
    respiro: 'Inspira scendendo, espira spingendo.', tempo: '2-0-1-0'
  },
  {
    id: 'diamond-pushup', nome: 'Diamond push-up', gruppo: 'tricipiti',
    pattern: 'isolamento-tricipiti', tipo: 'multi', livello: 2, anim: 'pushup',
    attrezzatura: ['libero', 'casa'], rischio: [],
    muscoli: { primari: ['Tricipite'], secondari: ['Petto'] },
    setup: ['Mani sotto lo sterno con indici e pollici a formare un rombo.'],
    esecuzione: ['Scendi con i gomiti stretti al corpo.', 'Spingi mantenendo il corpo in linea.'],
    errori: ['Aprire i gomiti verso l\'esterno.'],
    respiro: 'Espira spingendo.', tempo: '2-0-1-0'
  },

  // ---------------------------------------------------------------- CORE
  {
    id: 'plank', nome: 'Plank', gruppo: 'core',
    pattern: 'core-antiestensione', tipo: 'isometrico', livello: 1, anim: 'plank',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: ['Retto addominale', 'Trasverso'], secondari: ['Glutei', 'Spalle'] },
    setup: ['Appoggio su avambracci e punte dei piedi, gomiti sotto le spalle.'],
    esecuzione: ['Corpo in linea retta, glutei e addome contratti.', 'Mantieni la posizione respirando normalmente.'],
    errori: ['Bacino troppo alto o troppo basso.', 'Trattenere il respiro.'],
    respiro: 'Respirazione continua e controllata.', tempo: 'isometrico', durata: true
  },
  {
    id: 'crunch', nome: 'Crunch', gruppo: 'core',
    pattern: 'core-flessione', tipo: 'isolamento', livello: 1, anim: 'crunch',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: ['Retto addominale'], secondari: [] },
    setup: ['Sdraiato a terra, ginocchia piegate, mani alle tempie o incrociate al petto.'],
    esecuzione: ['Arrotola il busto sollevando le scapole da terra.', 'Contrai 1 secondo.', 'Scendi lentamente senza appoggiare la testa.'],
    errori: ['Tirare il collo con le mani.', 'Usare lo slancio.'],
    respiro: 'Espira salendo.', tempo: '2-1-2-0'
  },
  {
    id: 'leg-raise', nome: 'Leg raise a terra', gruppo: 'core',
    pattern: 'core-flessione', tipo: 'isolamento', livello: 2, anim: 'legraise',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: ['schiena'],
    muscoli: { primari: ['Retto addominale (basso)'], secondari: ['Flessori dell\'anca'] },
    setup: ['Sdraiato supino, mani sotto i glutei, lombare aderente al pavimento.'],
    esecuzione: ['Solleva le gambe tese fino a 90°.', 'Scendi lentamente senza staccare la lombare da terra.'],
    errori: ['Inarcare la lombare in discesa.'],
    respiro: 'Espira salendo.', tempo: '3-0-1-0'
  },
  {
    id: 'russian-twist', nome: 'Russian twist', gruppo: 'core',
    pattern: 'core-rotazione', tipo: 'isolamento', livello: 1, anim: 'twist',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: ['schiena'],
    muscoli: { primari: ['Obliqui'], secondari: ['Retto addominale'] },
    setup: ['Seduto, busto inclinato indietro a 45°, piedi sollevati o appoggiati.'],
    esecuzione: ['Ruota il busto portando le mani (o un peso) da un lato all\'altro.', 'Il movimento parte dal busto, non dalle braccia.'],
    errori: ['Muovere solo le braccia.', 'Curvare la schiena.'],
    respiro: 'Espira ad ogni rotazione.', tempo: 'controllato'
  },
  {
    id: 'mountain-climber', nome: 'Mountain climber', gruppo: 'core',
    pattern: 'core-antiestensione', tipo: 'multi', livello: 1, anim: 'mountain',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: [],
    muscoli: { primari: ['Core'], secondari: ['Spalle', 'Flessori anca', 'Cardio'] },
    setup: ['Posizione di plank alto (braccia tese), corpo in linea.'],
    esecuzione: ['Porta alternativamente un ginocchio verso il petto.', 'Mantieni il bacino basso e fermo.'],
    errori: ['Bacino che rimbalza in alto.'],
    respiro: 'Respirazione ritmica.', tempo: 'veloce', durata: true
  },

  // ---------------------------------------------------------------- CARDIO
  {
    id: 'camminata-inclinata', nome: 'Camminata in salita (tapis roulant)', gruppo: 'cardio',
    pattern: 'cardio-liss', tipo: 'cardio', livello: 1, anim: 'camminata',
    attrezzatura: ['palestra'], rischio: [],
    muscoli: { primari: ['Sistema cardiovascolare'], secondari: ['Glutei', 'Polpacci'] },
    setup: ['Inclinazione 8-12%, velocità 5-6 km/h, senza appoggiarsi alle maniglie.'],
    esecuzione: ['Mantieni un ritmo in cui riesci ancora a parlare a fatica (Zona 2).'],
    errori: ['Aggrapparsi alle maniglie annullando il lavoro.'],
    respiro: 'Respirazione regolare e nasale se possibile.', tempo: 'continuo', durata: true
  },
  {
    id: 'corsa-leggera', nome: 'Corsa leggera / camminata veloce', gruppo: 'cardio',
    pattern: 'cardio-liss', tipo: 'cardio', livello: 1, anim: 'camminata',
    attrezzatura: ['palestra', 'casa', 'libero'], rischio: ['ginocchia'],
    muscoli: { primari: ['Sistema cardiovascolare'], secondari: ['Gambe'] },
    setup: ['All\'aperto o su tapis roulant, scarpe adeguate.'],
    esecuzione: ['Ritmo costante e conversazionale per tutta la durata.'],
    errori: ['Partire troppo forte.'],
    respiro: 'Regolare.', tempo: 'continuo', durata: true
  },
  {
    id: 'jumping-jack', nome: 'Jumping jack', gruppo: 'cardio',
    pattern: 'cardio-hiit', tipo: 'cardio', livello: 1, anim: 'jack',
    attrezzatura: ['casa', 'libero', 'palestra'], rischio: ['ginocchia'],
    muscoli: { primari: ['Sistema cardiovascolare'], secondari: ['Spalle', 'Polpacci'] },
    setup: ['In piedi, braccia lungo i fianchi.'],
    esecuzione: ['Salta divaricando le gambe e portando le braccia sopra la testa.', 'Torna alla posizione di partenza con un secondo salto.'],
    errori: ['Atterrare rigidi sui talloni.'],
    respiro: 'Ritmica.', tempo: 'veloce', durata: true
  },
  {
    id: 'burpee', nome: 'Burpee', gruppo: 'cardio',
    pattern: 'cardio-hiit', tipo: 'cardio', livello: 2, anim: 'burpee',
    attrezzatura: ['casa', 'libero', 'palestra'], rischio: ['ginocchia', 'schiena'],
    muscoli: { primari: ['Full body', 'Sistema cardiovascolare'], secondari: [] },
    setup: ['In piedi, spazio libero attorno.'],
    esecuzione: ['Scendi in accosciata, mani a terra.', 'Porta i piedi indietro in plank (opzionale: un push-up).', 'Riporta i piedi avanti e salta in alto.'],
    errori: ['Schiena curva nel plank.', 'Atterraggio rigido.'],
    respiro: 'Espira nel salto.', tempo: 'veloce', durata: true
  }
];

export const ESERCIZI_BY_ID = Object.fromEntries(ESERCIZI.map(e => [e.id, e]));

export function trovaEsercizio(id) {
  return ESERCIZI_BY_ID[id] || null;
}
