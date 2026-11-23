# Third-party notices

## Code copied or adapted into this repository

None yet. When code from a permissively licensed project is reused, add an entry here with the
project name, URL, license, copyright line, and the files it went into, and keep the original
license notice in those files.

## Runtime dependencies (shipped in the app)

| Package | License |
|---|---|
| svelte (runtime, incl. clsx, esm-env, devalue) | MIT |
| @capacitor/core, @capacitor/android | MIT |
| AndroidX libraries (Android app only) | Apache-2.0 |
| @tonejs/midi (incl. midi-file, array-flatten) | MIT |

## Development dependencies (not shipped)

| Package | License |
|---|---|
| vite | MIT |
| vitest | MIT |
| typescript | Apache-2.0 |
| eslint, @eslint/js | MIT |
| typescript-eslint | MIT |
| globals | MIT |
| @sveltejs/vite-plugin-svelte | MIT |
| svelte-check | MIT |
| @types/node | MIT |
| tsx (incl. esbuild) | MIT |
| pitchy (incl. fft.js), detection spike only | MIT |
| @capacitor/cli | MIT |

License audit of the full dev tree (2026-11-16): MIT, Apache-2.0, ISC, BSD-2/3-Clause,
BlueOak-1.0.0 and Unlicense (via @capacitor/cli), plus `lightningcss` (MPL-2.0), a build-time CSS
tool pulled in by Vite. MPL-2.0 is file-level copyleft and only applies if its own files are modified or distributed; it is not bundled
into the app output.

`npm audit` reports a prototype-poisoning advisory in `deepmerge`, used by the Svelte Vite plugin for
build config only. No fix is available yet; it does not ship in the app.

## Assets

**Piano samples** (`public/samples/piano/`): Salamander Grand Piano V2 (Yamaha C5) by Alexander Holm,
licensed CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). Taken from the Tone.js audio
repository (https://github.com/Tonejs/audio), converted to short mono MP3 files, every third note
kept. Changes: shortened, faded out, re-encoded.

Built-in songs (`src/song/builtin.ts`) are public-domain melodies (traditional, Beethoven, Petzold,
Pierpont) in the project's own simple arrangements, under the project's MIT license.
