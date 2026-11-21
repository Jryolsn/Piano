# Detection spike

Compares note detection methods on real recordings from a digital piano through an Android
phone mic (Chrome 157, Android 10, 48 kHz). Recordings and the take descriptions are in
`test/fixtures/mic/`, made with the guided recorder in `spikes/mic/`.

Run: `npm run spike:detection` (FFT verification and pitchy). Basic Pitch was run outside the repo
with `@spotify/basic-pitch` 1.0.1 on tfjs CPU and is not a dependency.

## Method

- Onsets: the N strongest energy rises per take, N = number of expected events.
- A method "hits" when it confirms the expected note(s) within 500 ms after the onset.
  Latency is measured from the onset to the end of the first confirming 8192-sample (170 ms) frame.
- Wrong-note false positives: the same frames are checked against distractors where one expected
  note is shifted by ±1, ±2 or ±12 semitones. Any confirmation counts as a false positive.
- Silence: each note C2–C7 is checked against the room-noise take.

## Results (2026-11-21)

FFT verify uses the app's settings, including the adaptive room gate (primed per recording).
Take 04 is the second recording, played with firmer presses.

| Take | FFT verify hits | median ms | wrong-note FP | pitchy hits | median ms | wrong-note FP | Basic Pitch found |
|---|---|---|---|---|---|---|---|
| Middle C ×4 | 4/4 | 140 | 0/24 | 4/4 | 80 | 0/24 | 4/4 |
| Low A0 C1 C2 C3 | 2/4 | 60 | 11/20 | 3/4 | 120 | 2/20 | 1/4 |
| High C5 C6 C7 C8 | 2/4 | 60 | 0/21 | 3/4 | 20 | 0/21 | (first take: 0/4) |
| Scale C4–C5 | 15/15 | 50 | 2/90 | 15/15 | 50 | 1/90 | 15/15 |
| Chord C4 E4 G4 ×4 | 4/4 | 210 | 4/72 | n/a | | | 12/12 notes |
| Two hands C3 + C4 E4 G4 ×4 | 3/4 | 120 | 2/88 | n/a | | | 15/16 notes |
| Repeated C4 ×8 | 8/8 | 100 | 0/48 | 8/8 | 90 | 0/48 | 8/8 |
| Pedal C4 E4 G4 | 3/3 | 90 | 0/18 | 3/3 | 90 | 0/18 | 3/3 |
| Silence (false notes) | 11/61 | | | 6/61 | | | 26 notes |

The "silence" take contains handling noise (peaks up to −17 dBFS), so it is a hard case.

Basic Pitch also added 2–14 extra notes per take, and took 148 s for 92 s of audio on CPU.

The app's first detector (`SpectralDetector`, since removed) found every expected note within 10 ms,
but also confirmed about 95 % of wrong notes and every note in room noise.

Browser: echo cancellation, noise suppression and auto gain were all off as requested. Reported
input latency 40 ms, audio base latency 4 ms.

## Findings

- **FFT verification works for the middle register, including chords and fast repeats.** It is the
  only method here that handles chords in real time. Key rules (see `src/audio/verifier.ts`): odd
  harmonic required, fundamental required above 100 Hz, rise over recent history (ringing notes
  don't count), semitone contrast, octave checks, and a gate that adapts to the room's quietest
  stretch. It now drives the practice screen.
- **pitchy** is very reliable for single notes but cannot do chords. Useful as a cross-check.
- **Basic Pitch** transcribes the middle register well, but is far too slow for real time on a phone,
  works on whole clips rather than a live stream, and hallucinates notes in noise. Not suitable for
  the live loop.
- **Low notes (below about C3):** the 170 ms frame can't separate semitones there, so wrong notes
  pass. Needs a longer frame or a constant-Q transform for the bass.
- **High notes:** the first take was too soft for any method. Re-recorded with firmer presses, they
  are found without wrong-note matches, so the mic is fine; the gate may need tuning for soft playing.
- Chord confirmation is slowest (about 200 ms); shorter frames for upper notes could cut that.
