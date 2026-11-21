# AGENT.md

Context for AI coding tools (Claude Code, the Claude app, others) and for anyone coding by hand.
`CLAUDE.md` only imports this file, so keep everything here.

## Project
Free, open-source piano learning app (Artie/flowkey-like). Listens to a real piano via the
microphone; falling-note view; wait and tempo modes; seek/loop; hand selection. Android first,
iOS bonus. Usable by all ages: simple and clean, not childish. While playing, show only the keys
and the notes to play; settings stay tucked away.

## Where to start
1. `PLAN.md`: goals, phases, overall status and the project-wide decision log (Swedish).
2. `dev-tickets/`: one folder per piece of work, each with a `PLAN.md` that can be resumed cold.
   Read `dev-tickets/PROJECT.md`, then `dev-tickets/INDEX.md` to find the active ticket.
3. `BACKLOG.md`: ideas and things to fix (Swedish). Add new ones there; when work on one starts,
   it becomes a ticket and leaves the backlog.
4. `README.md`: setup, branches and releases.

At the end of a session, update the ticket's `## ▶` section and its line in `INDEX.md`, and
`PLAN.md` **Status** / **Beslutslogg** when something project-wide changed. Work can switch
between tools and people at any time, so nothing important may live only in a chat.

## Stack and commands
TypeScript + Vite + Svelte 5, Vitest, Capacitor (Android). Node 22 (`.nvmrc`), npm.

```sh
npm install
npm run dev              # dev server
npm test                 # unit tests (npm run test:watch while working)
npm run lint             # ESLint for .ts/.js
npm run typecheck        # svelte-check, also covers .svelte
npm run build            # typecheck + production build
npm run android          # build, sync and open Android Studio
npm run spike:detection  # compare detectors against test/fixtures/mic
```

Before a PR: `npm test`, `npm run lint` and `npm run build` must pass (CI runs the same plus an
Android build).

## Structure
```
src/
  audio/     microphone, FFT, FftVerifier (expected-note detection), practice listener
  song/      Song model, MIDI import, built-in songs (text notation), library + IndexedDB storage
  engine/    practice session: wait/tempo, seek, loop, hands. Pure logic, no audio/DOM, tested
  render/    canvas note roll, keyboard layout, timeline, theme
  ui/        Svelte screens: library/, practice/
  platform/  Capacitor-specific code
spikes/      temporary experiments, one folder each; removed once their decision is made
test/fixtures/  real-piano recordings used as detection test data
android/     committed Capacitor project; web assets are copied in by `cap sync`
dev-tickets/ work plans per ticket (see above)
BACKLOG.md   ideas and fixes not yet started
```
Tests sit next to the code as `*.test.ts`. The note view renders to canvas, not Svelte.

## Branches and releases
Feature branches start from `dev` and go back to `dev` through a PR. Pushes to `dev` publish a
prerelease (`vX.Y.Z-dev.N`, debug APK) and the dev web build at `/Piano/dev/`. `main` is stable;
a `vX.Y.Z` tag matching `package.json` publishes a stable release. Workflows in
`.github/workflows/` (`ci`, `release`, `pages`). Details in `README.md`.

Squash-merge PRs with an explicit commit message, so no tool-added trailers end up in history.

## Rules
- Clean, conventional, best-practice structure. No clutter: no stray files, dead code or speculative abstractions. One clear place per concern, following the layout above.
- License: MIT. Only add dependencies with permissive licenses (MIT/BSD/Apache-2.0); verify before adding.
- Never copy code from unlicensed repos (e.g. `emiliorl/piano`). Ideas only. Code from MIT repos must keep its notice and be listed in `THIRD_PARTY_NOTICES.md`.
- Songs: public-domain works only, in own or freely licensed arrangements.
- `src/engine/` is pure logic and must stay covered by tests.
- The detector sits behind an interface so implementations can be swapped and compared.
- Code, comments, commits and PR text in English. Plans in `PLAN.md`, `BACKLOG.md` and `dev-tickets/` in Swedish. Comments short, only where something important needs noting.
- No AI attribution in commits, comments or PRs, and no personal data anywhere in the repo.
- AI tools never commit, push or open a PR unless the owner explicitly asks.
- Manual test instructions are written for a beginner who is not a pianist: name the exact keys.
