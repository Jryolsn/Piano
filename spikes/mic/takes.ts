export interface Take {
  id: string;
  title: string;
  /** Plain-language steps for a non-pianist (Swedish, the tester's language). */
  steps: string[];
  /** MIDI notes to highlight on the keyboard. */
  keys: number[];
  /** What should be heard, for the offline analysis. */
  expected: string;
}

const C4 = 60;

export const TAKES: Take[] = [
  {
    id: '01-silence',
    title: 'Tystnad',
    steps: ['Rör inte pianot.', 'Tryck Spela in, vänta 5 sekunder, tryck Stopp.'],
    keys: [],
    expected: 'room noise only',
  },
  {
    id: '02-middle-c',
    title: 'En tangent, fyra gånger',
    steps: [
      'Hitta den gula tangenten. Det är "mitt-C", ungefär mitt på pianot. Den vita tangenten precis till vänster om en grupp med två svarta.',
      'Tryck på den 4 gånger. Håll ner ungefär 1 sekund varje gång och släpp.',
    ],
    keys: [C4],
    expected: 'C4 x4',
  },
  {
    id: '03-low-notes',
    title: 'Låga toner',
    steps: [
      'Längst till vänster på pianot. Den första gula är allra längst till vänster.',
      'Tryck de gula tangenterna en i taget, från vänster till höger. Håll varje ungefär 1 sekund.',
    ],
    keys: [21, 24, 36, 48],
    expected: 'A0, C1, C2, C3 one at a time',
  },
  {
    id: '04-high-notes',
    title: 'Höga toner',
    steps: [
      'Till höger på pianot. Den sista gula är allra längst till höger.',
      'Tryck de gula tangenterna en i taget, från vänster till höger. Håll varje ungefär 1 sekund.',
    ],
    keys: [72, 84, 96, 108],
    expected: 'C5, C6, C7, C8 one at a time',
  },
  {
    id: '05-scale',
    title: 'Åtta vita tangenter i rad',
    steps: [
      'Börja på mitt-C (första gula).',
      'Tryck de 8 gula vita tangenterna en i taget åt höger, i lugnt tempo. Gå sedan tillbaka åt vänster.',
    ],
    keys: [60, 62, 64, 65, 67, 69, 71, 72],
    expected: 'C major scale C4-C5 up and down',
  },
  {
    id: '06-chord',
    title: 'Tre tangenter samtidigt',
    steps: [
      'Lägg tumme, långfinger och lillfinger på de tre gula tangenterna (varannan vit tangent från mitt-C).',
      'Tryck ner alla tre samtidigt, håll 1 sekund, släpp. Gör det 4 gånger.',
    ],
    keys: [60, 64, 67],
    expected: 'C4 E4 G4 chord x4',
  },
  {
    id: '07-two-hands',
    title: 'Fyra tangenter, två händer',
    steps: [
      'Vänster hand: ett finger på den gula tangenten till vänster. Höger hand: samma tre som förra steget.',
      'Tryck alla fyra samtidigt, håll 1 sekund, släpp. Gör det 4 gånger.',
    ],
    keys: [48, 60, 64, 67],
    expected: 'C3 + C4 E4 G4 chord x4',
  },
  {
    id: '08-repeated',
    title: 'Snabba tryck',
    steps: ['Tryck mitt-C snabbt 8 gånger i rad, ungefär 3 tryck per sekund.'],
    keys: [C4],
    expected: 'C4 x8 fast',
  },
  {
    id: '09-pedal',
    title: 'Med pedal',
    steps: [
      'Tryck ner den högra pedalen vid golvet med foten och håll den nere hela tiden.',
      'Tryck de gula tangenterna en i taget från vänster, ungefär 1 sekund mellan varje. Släpp pedalen sist.',
    ],
    keys: [60, 64, 67],
    expected: 'C4, then E4, then G4 with sustain pedal (notes ring together)',
  },
];
