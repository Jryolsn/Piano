export interface Take {
  id: string;
  instruction: string;
}

/** Guided recordings. Each take is a few seconds long; leave a short pause between notes. */
export const TAKES: Take[] = [
  { id: '01-silence', instruction: 'Silence: do not play, about 5 seconds of room noise.' },
  { id: '02-middle-c', instruction: 'Middle C (C4), 4 times, about 1 second each.' },
  { id: '03-low-notes', instruction: 'Low notes, one at a time: A0, C1, C2, C3.' },
  { id: '04-high-notes', instruction: 'High notes, one at a time: C5, C6, C7, C8.' },
  { id: '05-scale', instruction: 'C major scale up and down, C4 to C5, medium tempo.' },
  { id: '06-c-major-chord', instruction: 'C major chord (C4 E4 G4), 4 times.' },
  { id: '07-two-hand-chord', instruction: 'Left hand C3, right hand C4 E4 G4, together, 4 times.' },
  { id: '08-repeated-notes', instruction: 'C4 repeated fast, about 8 times.' },
  { id: '09-held-then-new', instruction: 'Hold C4 with sustain pedal, then play E4, then G4.' },
];
