# AGENT.md

Context for AI coding tools working in this repo.

## Project
Free, open-source piano learning app (Artie/flowkey-like). Listens to a real piano via the microphone; falling-note view; wait and tempo modes; seek/loop. Android first, iOS bonus.

Read `PLAN.md` first: goals, tech stack, phases, status and decision log. Update its **Status** and **Decision log** at the end of each work session.

## Stack
TypeScript + Vite + Svelte 5, packaged with Capacitor. Tests with Vitest. The falling-note view renders to canvas, not Svelte.

## Rules
- Clean, conventional, best-practice structure. No clutter: no stray files, dead code or speculative abstractions. Code must always be easy to find: one clear place per concern, following the module layout in `PLAN.md`.
- License: MIT. Only add dependencies with permissive licenses (MIT/BSD/Apache-2.0); verify before adding.
- Never copy code from unlicensed repos (e.g. `emiliorl/piano`). Ideas only. Code from MIT repos must keep its notice and be listed in `THIRD_PARTY_NOTICES.md`.
- Songs: public-domain works only, in own or freely licensed arrangements.
- `src/engine/` is pure logic (no audio/DOM) and must stay covered by tests.
- The detector sits behind an interface so implementations can be swapped and compared.
- Commits and code comments in English. Comments short, only where something important needs noting.
- No AI attribution in commits, comments or PRs, and no personal data anywhere in the repo.
- Never commit, push or open a PR unless explicitly asked.
