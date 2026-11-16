# Pianoapp – plan och status

> Startdokument för projektet. Uppdatera **Status** och **Beslutslogg** efter varje arbetspass så att arbetet kan återupptas i en ny session.

## Mål

En gratis app med öppen källkod för att lära sig spela piano, i stil med Artie och flowkey. Appen lyssnar på ett riktigt piano (digitalt eller akustiskt) **via mikrofonen** och leder användaren genom låtar.

**Plattformar:** Android först (telefon och surfplatta), iOS som bonus.

## Måste-krav (MVP)

1. **Låtbibliotek** med inbyggda låtar och import av egna MIDI-filer.
2. **Lugn notvy** med fallande noter (piano roll) och lång, inställbar framförhållning (antal sekunder framåt). Vyn ska vara mjuk och avskalad, med minimalt UI medan man spelar.
3. **Två lägen:**
   - *Vänta:* låten står still tills rätt ton eller ackord spelas.
   - *Tempo:* noterna rullar i låtens verkliga tempo, som går att justera (till exempel 25–150 %).
4. **Spolning:** dra bakåt och framåt i låten och fortsätt därifrån. Det ska också gå att loopa ett avsnitt.
5. **Träffsäker mikrofondetektering**, även för ackord.
6. **Välja hand:** öva vänster, höger eller båda händerna.

## Senare / bonus

- Notvy (vanliga noter) som alternativ till piano roll
- MIDI över USB eller Bluetooth för den som har det
- Statistik och framsteg per låt
- Import av MusicXML
- Kalibrering mot användarens piano och rum

## Licensprinciper

- Appen licensieras under **MIT**.
- **Ingen kod kopieras från repon utan licens**, till exempel `emiliorl/piano` ("Keyfall"). Repot får bara studeras som inspiration för upplägg och funktioner. Implementationen skrivs från egen design och originalkällor som artiklar och biblioteksdokumentation.
- Kod från repon med MIT-licens, till exempel `Sourish25/Pianotes`, får återanvändas. Licenstexten ska då behållas och källan anges i `THIRD_PARTY_NOTICES.md`.
- Alla beroenden ska ha en tillåtande licens (MIT, BSD, Apache 2.0). Kontrollera licensen innan något läggs till.
- **Låtar:** bara verk som är fria (public domain, till exempel klassisk musik och folkvisor) i egna eller fritt licensierade arrangemang. Användarens egna importer är användarens ansvar.
- En issue har skickats till Keyfall med en fråga om licens. Får vi ett ja kan kod därifrån övervägas senare.

## Teknikval

**Webbteknik (TypeScript), paketerad som native-app med Capacitor.**

Motivering:
- De bästa biblioteken för just det här (MIDI, tonhöjd, ML-modell för polyfon detektering) finns som JS/TS.
- En kodbas räcker för Android, iOS och webben, så det går att testa direkt i webbläsaren under utvecklingen.
- Det passar en webbutvecklares kompetens.
- Mikrofonen fungerar via `getUserMedia` i både Android WebView och iOS WKWebView (iOS 14.3+). Det måste verifieras tidigt (se Fas 0).

Förkastat:
- *Native Kotlin:* ger bara Android och har färre färdiga bibliotek för musik och ML.
- *Flutter / React Native:* ljud och ML kräver mer egen native-kod. Det blir krångligare än nödvändigt.

### Stack (förslag – licens verifieras innan installation)

| Behov | Bibliotek | Licens |
|---|---|---|
| Bygg / dev-server | Vite + TypeScript | MIT |
| UI-ramverk | Svelte 5 (notvyn ritas på canvas utan ramverk) | MIT |
| Native-paketering | Capacitor (Android + iOS) | MIT |
| MIDI-parsning | `@tonejs/midi` | MIT |
| Ljuduppspelning (lyssna på låten) | Tone.js + piano-samples med fri licens | MIT |
| Monofon tonhöjd | `pitchy` (McLeod-metoden) | MIT |
| Polyfon detektering (experiment) | `@spotify/basic-pitch` (TF.js) | Apache 2.0 |
| Rendering av notvy | Canvas 2D eller PixiJS (WebGL) | MIT |
| Tester | Vitest | MIT |
| Notvy (senare) | VexFlow eller OpenSheetMusicDisplay | MIT / BSD |

## Nyckelidé för detekteringen

**Verifiera i stället för att transkribera.** Appen vet redan vilka toner som *ska* spelas. I stället för att gissa fritt vad som hörs ("vad spelas?") räcker det att avgöra om de förväntade tonerna hörs just nu ("hörs C4+E4+G4?").

- Gör en FFT eller en konstant-Q-transform per ljudram.
- Mät energin vid varje förväntad tons grundton och övertoner, jämfört med omgivningen och brusgolvet.
- Kräv en anslagsökning (onset) och några stabila ramar för att undvika att gamla, kvarklingande toner räknas.
- Ignorera de första ca 300 ms efter appens egna ljud, eller stäng av uppspelningen i väntläget.

Det klarar ackord, är snabbare och robustare än full transkription och kan kalibreras per piano. Basic Pitch och `pitchy` utvärderas som komplement och jämförelse, inte som självklara lösningar.

## Arkitektur (moduler)

```
src/
  audio/      mic.ts (getUserMedia, AudioWorklet), analysis.ts (FFT/CQT),
              detector.ts (verifiering av förväntade toner), calibration.ts
  song/       model.ts (Song, Note, Hand), midi.ts (import), library.ts
  engine/     practice.ts (vänta/tempo, position, seek, loop, hand) – ren logik, testbar med fake clock
  render/     roll.ts (fallande noter, framförhållning, keyboard)
  ui/         skärmar: bibliotek, övning, inställningar
  platform/   Capacitor-specifikt (behörigheter, skärm vaken)
spikes/       tillfälliga experiment, en mapp per spike. Tas bort när beslutet är fattat.
```

Principer:
- Övningsmotorn (`engine/`) är ren logik utan beroende till ljud eller rendering, och får tester från start.
- Detektorn får ett gränssnitt (`expected notes → match/no match + confidence`) så att flera implementationer kan bytas och jämföras.
- Spara inspelade testljud från riktigt piano och mobilmikrofon i `test/fixtures/` för regressionstester av detekteringen.

## Faser

### Fas 0 – Grund och riskspikes
- [x] Skapa projekt, Vite + TS, Vitest, lint, `AGENT.md`, `LICENSE` (MIT) – lokalt, inget GitHub-repo ännu
- [x] Välj UI-ramverk: Svelte 5
- [ ] **Spike: mikrofonen i Capacitor på Android.** Fungerar `getUserMedia` i WebView, och hur är latensen? Kontrollera att echo cancellation, noise suppression och auto gain går att stänga av.
- [ ] **Spike: detektering.** Spela in några toner och ackord på det digitala pianot via telefonen. Jämför a) FFT-verifiering, b) `pitchy`, c) Basic Pitch. Mät träffsäkerhet och latens.
- [ ] Beslut om detekteringsmetod → beslutslogg

### Fas 1 – Kärnan (MVP)
- [x] Låtmodell och MIDI-import (händer från spår eller kanaler, tempoändringar)
- [ ] Övningsmotor: vänta, tempo, seek, loop, val av hand, med tester
- [ ] Notvy: fallande noter, inställbar framförhållning, mjuk rullning i 60 fps, keyboard längst ner med markering av nästa toner
- [ ] Detektor kopplad till motorn
- [ ] Övningsskärm med minimalt UI: play/paus, spolningslist, läge och tempo i en infälld panel

### Fas 2 – Låtar och Android
- [ ] Inbyggt bibliotek med cirka 15–30 fria låtar i stigande svårighetsgrad
- [x] Bibliotekskärm och import av egna filer
- [ ] Capacitor-bygge av APK och test på telefon och surfplatta (liggande läge, skärmen hålls vaken)

### Fas 3 – Förfining
- [ ] Kalibrering (brusgolv och nivå per oktav)
- [ ] Förhandslyssning på låten och metronom
- [ ] Sparade framsteg per låt
- [ ] iOS-bygge

## Inspiration (bara idéer, ingen kod)

- `emiliorl/piano` (Keyfall): väntläge som kräver att tonen hålls, seek via reglage och piltangenter, McLeod-detektering med anslagskrav och stabila ramar, att telefonens ljudbearbetning stängs av, ren och testbar motor med fake clock.
- `Sourish25/Pianotes` (MIT): Capacitor-uppsättning och 3D-vattenfall. Här finns ett avskräckande exempel: för mycket UI.
- Kommersiella appar (Artie, flowkey, Simply Piano): UX-flöden.

## Kända risker

- Mikrofonlatensen i Android WebView kan vara för hög. Reserv: ett Capacitor-plugin med native-inspelning som skickar ramar till JS.
- Basic Pitch kan vara för tungt eller långsamt i realtid på mobil.
- Högtalarljud från digitalpianot plus rumsakustik ger övertoner och oktavfel. Därför verifiering och kalibrering.

## Status

**2026-11-16:** Fas 0 påbörjad.
- Grundprojekt klart: Vite 8, TypeScript 6, Vitest 5, ESLint 10 (flat config med typescript-eslint). `npm test`, `npm run lint` och `npm run build` går igenom.
- Mappstrukturen enligt arkitekturen finns. Första kod: `song/model.ts` (typer), `audio/detector.ts` (gränssnitt), `engine/window.ts` (`notesInWindow` för framförhållning och handval) med tester.
- Licensgranskning av hela dev-trädet gjord, se `THIRD_PARTY_NOTICES.md`.
- Svelte 5 inkopplat (`App.svelte`, `svelte-check` för typkontroll). ESLint täcker .ts/.js, `svelte-check` täcker .svelte.
- Ingen git-commit och inget GitHub-repo ännu.

- Repo: github.com/Jryolsn/piano. CI (lint, test, build) och GitHub Pages via `.github/workflows/ci.yml`.
- Mikrofonspike, del 1: `spikes/mic/` visar ljudfiltrens status, rapporterad latens, nivå, spektrum och toppar som tonnamn. Sidan kan spela in guidade tagningar som WAV plus en `report.json`, för analys offline och som testdata. Ljudmodulerna `audio/mic.ts`, `audio/wav.ts`, `audio/pitch.ts` och `audio/spectrum.ts` har tester.

- Låtbibliotek: `song/midi.ts` (import med `@tonejs/midi`, händer från spårnamn eller tonhöjd), `song/notation.ts` (kompakt notation för inbyggda låtar), `song/builtin.ts` (8 fria låtar, svårighet 1–4), `song/library.ts` + `song/storage.ts` (importer sparas i IndexedDB), skärm i `ui/library/`.

**Nästa steg:** Jerry spelar in tagningarna på `/Piano/spikes/mic/` och laddar upp dem. Analysen jämför FFT-verifiering, `pitchy` och Basic Pitch på samma ljud. Sedan samma sida i en Capacitor-APK (del 2).

## Beslutslogg

| Datum | Beslut |
|---|---|
| 2026-11-16 | Eget projekt i stället för fork. Keyfall bara som inspiration (saknar licens). |
| 2026-11-16 | TypeScript + Capacitor. Android först, iOS som bonus. |
| 2026-11-16 | Detektering bygger på verifiering av förväntade toner. Metod fastställs efter spike. |
| 2026-11-16 | TypeScript 6 i stället för 7, eftersom typescript-eslint ännu inte stöder 7. Uppgraderas när stödet finns. |
| 2026-11-16 | `lightningcss` (MPL-2.0) accepteras som byggberoende via Vite. Det följer inte med i appen. |
| 2026-11-16 | UI-ramverk: Svelte 5 för skärmar och paneler. Notvyn ritas på canvas utan ramverk. |
| 2026-11-16 | GitHub Pages för testsidor (gratis, samma repo). Vercel kan övervägas senare för förhandsvisningar av PR. |
| 2026-11-16 | Mikrofonspiken körs först i Chrome på Android via Pages, sedan i Capacitor. |
| 2026-11-16 | Upphovsrättsraden i LICENSE är "PianoApp contributors" för att hålla personuppgifter utanför repot. |
| 2026-11-16 | MIDI-import: händer från spårnamn (left/right, LH/RH, bass/treble), annars högsta av två spår = höger, ett enda spår delas vid mellan-C. Slagverk (kanal 10) ignoreras. |
| 2026-11-16 | Importerade låtar sparas lokalt i IndexedDB som tolkad `Song`, inte som rå MIDI. Inbyggda låtar skrivs i egen textnotation i koden. |
