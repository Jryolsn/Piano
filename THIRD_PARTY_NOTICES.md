# Third-party notices

## Code copied or adapted into this repository

None yet. When code from a permissively licensed project is reused, add an entry here with the
project name, URL, license, copyright line, and the files it went into, and keep the original
license notice in those files.

## Runtime dependencies (shipped in the app)

| Package | License |
|---|---|
| svelte (runtime, incl. clsx, esm-env, devalue) | MIT |

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

License audit of the full dev tree (2026-11-16): MIT, Apache-2.0, ISC, BSD-2/3-Clause and
BlueOak-1.0.0, plus `lightningcss` (MPL-2.0), a build-time CSS tool pulled in by Vite. MPL-2.0 is
file-level copyleft and only applies if its own files are modified or distributed; it is not bundled
into the app output.

`npm audit` reports a prototype-poisoning advisory in `deepmerge`, used by the Svelte Vite plugin for
build config only. No fix is available yet; it does not ship in the app.

## Assets

None yet. Songs must be public-domain works in own or freely licensed arrangements.
