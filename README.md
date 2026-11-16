# PianoApp

Free, open-source piano learning app. Listens to a real piano through the microphone and guides you
through songs with a falling-note view. Android first, iOS later.

Early development. See `PLAN.md` for goals, phases and status.

## Development

Requires Node.js 20.19 or newer.

```sh
npm install
npm run dev        # dev server
npm test           # unit tests
npm run lint
npm run build
npm run android    # build, sync and open the Android project (needs Android Studio)
```

## Branches and releases

- `dev` is the integration branch. Feature PRs target `dev`; CI (lint, tests, web build, Android
  build) must pass before merge.
- Every push to `dev` publishes a prerelease `vX.Y.Z-dev.N` with an Android APK, and updates the
  dev web build at `/Piano/dev/`. The last 10 dev prereleases are kept.
- `main` is stable. To release: merge `dev` into `main`, set `version` in `package.json`, then push
  the tag `vX.Y.Z`. That publishes a stable release with an APK. The stable web build is at `/Piano/`.

APKs are debug-signed with a shared key in the repo, so a newer APK installs over an older one.
They bundle the web build and run offline. Install on Android by opening the `.apk` from the
release page and allowing installs from that source.

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
