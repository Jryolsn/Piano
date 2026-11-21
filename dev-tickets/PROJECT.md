# Project facts — PianoApp

Read this before `README.md`'s generic method; these are the local details.

## Repo

- Main repo: `github.com/Jryolsn/piano` — this workspace lives inside it at
  `dev-tickets/`. There is no second ticket folder; never create one.
- The workspace is committed with the repo (not gitignored), so plans are
  part of the project history and are reviewed like any other file.
- Stack: TypeScript + Vite + Svelte 5, Vitest, packaged for Android with
  Capacitor. npm.
- Repo rules that apply to all ticket work live in `../AGENT.md` (module
  layout, licensing, branches and PRs). Read it before touching code.

## Plans at two levels

- `../PLAN.md` is the project plan: goals, phases, overall status and the
  project-wide decision log. It stays short and points to tickets.
- `dev-tickets/<ticket>/PLAN.md` holds the detail for one piece of work.
  When a ticket is done, move its lasting decisions to the decision log in
  `../PLAN.md` and tick the matching phase item there.

- `../BACKLOG.md` holds ideas and fixes that are not yet started. A new
  ticket usually starts from a backlog item; remove the item when the
  ticket is created.

## Language

- Plans, decisions and findings are written in **Swedish**, since that is
  the working language for this project.
- Everything that lands in the code stays in English: code, comments,
  commit messages, PR text, and the structural files in this folder
  (`README.md`, `CLAUDE.md`, this file, `INDEX.md`).
- Ticket folder names are English kebab-case.

## Naming

- Ticket folder: kebab-case after the work, not the branch
  (`bass-detection`, not `claude/project-thread-abc`).
- Original ticket text, when there is any, goes in `original-tickets/`.
- Mockups go in `mockups/` with descriptive names (`practice-screen.png`).

## Verification

"How to verify" sections list `npm test`, `npm run lint` and
`npm run build`, plus what to check by hand: in the browser (`npm run dev`,
or the dev build at `jryolsn.github.io/Piano/dev/`) and, for microphone or
native changes, on an Android phone with the dev APK. Manual steps are
written for a beginner who is not a pianist: name the exact keys to press.
Audio recordings used as test data go in `../test/fixtures/`.
