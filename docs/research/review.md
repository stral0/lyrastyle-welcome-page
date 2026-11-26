# Cold review — dist/lyra-style.html

Would this amaze the client? **Yes on a laptop, not yet on a phone.**
The four scenes are film-grade: the string, the Chladni plate, the wave over Novi Beograd and the constellation all land, and the hand-off to the shop is clear.
On a phone the first instructed gesture ("Prevuci nagore za dalje") fails from the thumb zone, and there is no visible Next button.
The first screen states a founding year the research marks unverified; the owner will read it in the first five seconds.
Fix the two P0s and the text-renderer bug (P1-1) before the client sees it; everything else is polish or risk reduction.

Method: Chrome headless (SwiftShader), real keyboard walk at 1440x900, settled sweeps at 1280x720, 1920x1080, 2200x900, 1024x768, 390x844, 844x390, 320x568, English and reduced motion; slow-motion frame stepping for transitions; CDP touch swipes; no-WebGL launch; sandboxed iframe. Scripts are in `tools/review/`, screenshots in `shots/rv-*.png`. Not measurable here: real frame rate, real trackpad inertia, audio output, Safari/Firefox. Items that rest on code reading rather than a run are marked **(code)**.

---

## P0 — must fix before the client sees it

### P0-1. Phone: swiping up does not advance in the first scene, and there is no Next button
- **Where:** `zica` beats 1–3, 390x844 touch. Also partly `sazvezdje-2`.
- **Observed:** `tools/review/touch.js` (real touch swipes). Swipe-up of 260 px starting at y=700 or y=520 on `#zica`: no advance (the string plucks instead). Only a swipe that starts above the string (y=330) advances. `zica-2` from mid-screen and `zica-3` from the lower half: no advance. Every other scene advances from every start point. `.step` buttons are `display:none` on coarse pointers, so the only other way forward is the 16 px wide rail ticks.
- **Why it matters:** this is the first screen, the hint says "Prevuci nagore za dalje", and a thumb swipe naturally starts in the lower half and crosses the string. A first-time phone visitor is stuck on beat one.
- **Cause:** `src/scenes/zica.js` `lyrePointer()` returns `used = true` on any `move` that crosses a string (`d1 * d < 0`), and `src/engine/deck.js` `up()` skips swipe navigation when `drag.used`. `ploca.js` already solves this (tap strikes, swipe turns the page); `zica.js` does not.
- **Fix:** in `deck.js` `up()`, let only a consumed `down` (a grabbed string) block the swipe; a fast swipe longer than 48 px should navigate even if a `move` was consumed. And keep `.step.next` visible on touch (remove the `@media (pointer:coarse) and (max-width:900px){.step{display:none}}` rule in `src/styles.css`, or show Next only).

### P0-2. "od 1989" is stated as fact on the first screen; research marks it unverified
- **Where:** `zica.b1.p` (sr and en), `<meta name="description">` in `src/index.template.html`, `site.since` in `src/site.js`. Visible in `shots/rv-d-zica-1-S.png`.
- **Observed:** "Lyra Style. Muzički instrumenti u Novom Beogradu, od 1989." Research: a-site-crawl §5 "Founding year, founders, staff: not found [U]"; b-social-voice §2 "No founding year is stated anywhere"; brief: "per a 2018 Novosti feature (not stated on their own site — confirm)".
- **Why it matters:** if the year is wrong, the owner sees a wrong fact about his own shop before anything else.
- **Fix:** ship without the year until the owner confirms: "Lyra Style. Muzički instrumenti, Novi Beograd." / "Lyra Style. Musical instruments, New Belgrade." Remove it from the meta description too.

---

## P1 — clearly worth fixing today

### P1-1. Text renderer draws words more than once: short words look bold, and reveals show hard-edged slices
- **Where:** every in-canvas paragraph and every multi-line headline, all viewports.
- **Observed (settled):** one- and two-letter words are visibly heavier than their neighbours: "u", "je", "i", "za" in `shots/rv-crop-zica3-para.png` (crop of `rv-d-zica-3-S.png`); "i" in "Udari i gledaj" (`rv-d-ploca-1-S.png`); "i" in the star labels "Bubnjevi i udaraljke", "Klavijature i klaviri" (`rv-d-sazvezdje-2-S.png`). Measured: the stem of the standalone "i" carries 29% more ink than the "i" inside "stigao" on the same line.
- **Observed (reveal):** while a headline arrives, the tops of the next line's letters appear early with a hard horizontal cut, and blurred words end in a hard vertical edge: `rv-d-zica-2-3.5.png` ("sedam žica"), `rv-d-zica-3-3.5.png`, `rv-d-tr-ploca-1.png`.
- **Why it matters:** the typography is the most-read element; uneven weight reads as a rendering fault, and the reveal artefact repeats on every beat.
- **Cause:** `src/engine/text.js` `build()`. Each word/glyph quad is enlarged by `ex = pad * .9` (about 0.38 em) and samples one shared texture, so it also draws its neighbours' ink (alpha-blended twice or three times) and the line above/below.
- **Fix:** rasterise each unit into its own atlas cell with a gutter of at least `pad` on all sides (keep the screen positions), so the padding samples empty texels. A cheaper partial fix for the settled state: pass each unit's tight ink rect and multiply alpha by an inside-rect mask when `vBlur == 0`.

### P1-2. Sound keeps playing after the visitor leaves the tab — including after "Otvori prodavnicu"
- **Where:** all scenes with sound on. **(code)**
- **Observed:** `deck.js` `frame()` stops rendering when `document.hidden`, but nothing pauses audio; `src/engine/audio.js` has no `visibilitychange` handling. Every shop link is `target="_blank"`, so the hand-off itself leaves the beds (room, air, hum) droning in the background tab.
- **Fix:** in `deck.js`, on `visibilitychange`: when hidden, `audio.setMuted(true)` (remember the user's choice); restore on return.

### P1-3. Wheel and key-repeat can skip beats
- **Where:** `deck.js` wheel and keydown handlers.
- **Observed:** holding ArrowRight for about a second runs from `#zica` to `#sazvezdje-3` (`tools/review/eng3.js`, "HELD ArrowRight"); there is no `e.repeat` guard, so any slightly long press skips a beat. One decaying wheel burst advanced four steps in the test; the test's event spacing was stretched by the slow renderer, but the logic is the same on a real trackpad: after the 750 ms lock, the inertial tail accumulates past 60 again, and `wheelAcc` never decays between gestures.
- **Why it matters:** the hint says "Skroluj"; a beat skipped is a beat of the story lost. Real trackpad behaviour could not be measured here.
- **Fix:** ignore `e.repeat` for next/prev. For wheel, treat a continuous stream as one gesture: keep extending the lock while events arrive less than about 150 ms apart, and zero `wheelAcc` after a quiet gap.

### P1-4. "Skoro osam hiljada instrumenata" is not what the number means
- **Where:** `zica.b2.p` (sr and en), `shots/rv-d-zica-2-S.png`.
- **Observed:** research: 7,933 *products*, including picks at 40 RSD, cables and strings. The sentence then adds "i sve što ide uz njih", which counts the accessories twice.
- **Fix:** "U ponudi je skoro osam hiljada artikala: instrumenti i sve što ide uz njih." / "We stock nearly eight thousand items: instruments and everything that goes with them."

### P1-5. Phone: small type, and the bottom navigation disappears over the city
- **Where:** 390x844, all scenes; worst in `talas`.
- **Observed:** one design unit is 0.36 CSS px on a 390 px phone, so paragraphs (36–38 units) are about 13 px and hints and map labels (28–32 units) about 10–11 px: "Povuci žicu.", "Udari ploču.", "Sava Centar", "Lyra Style" in `shots/rv-sheet-m-a.png`, `rv-sheet-m-b.png`. In `rv-m-talas-1.png` and `rv-m-talas-2.png` the rail ticks and "Pregled" sit directly on lit buildings and wave rings and are close to invisible; on a phone they are the only persistent navigation.
- **Fix:** give portrait a minimum physical size (for example `size * max(1, 15 / (38 * view.cssW / 1080))` for paragraphs, 12 px floor for hints and labels). Add a bottom gradient scrim under `.rail` and `.step` in `styles.css` (for example a 5 rem `linear-gradient(transparent, rgba(5,4,3,.75))` on `#ui::after`).

### P1-6. GPU memory and a readback every 1.5 s
- **Where:** `zica.js:452`, `ploca.js:278`, `talas.js:518` (each `gfx.target({depth:true, samples:4})`), `deck.js` `snapshot()`. **(code)**
- **Observed:** three full-resolution 4x MSAA RGBA16F targets with depth stay allocated for the whole session although at most two scenes render at once. Estimate at the 3.2 MP cap (a 1440x900 laptop at DPR 2): about 180 MB each, about 600 MB in total with bloom and the LDR pair; on a 390x844 phone at DPR 2 about 260 MB. That is where iOS Safari drops contexts. Separately, `snapshot()` runs `drawImage(canvas)` + `toDataURL` every 1.5 s for as long as a beat is held; Chrome logs "GPU stall due to ReadPixels" for it (`tools/check.js` filters that warning out). During the slow hold drifts a periodic stall shows as a tick.
- **Fix:** one shared MSAA HDR target owned by `gfx` (each scene finishes `gfx.post` into its LDR target before the next scene draws, so one is enough); use 2 samples or none when `dpr >= 1.5` or `s.q < 1`. Take the snapshot once per beat, or only in `openOver()`.

### P1-7. `talas-2`: the "Lyra Style" map label is unreadable at the moment the wave starts
- **Where:** `talas` beat 2, 1440x900 and 390x844: `shots/rv-d-talas-2-S.png`, `rv-m-talas-2.png`, `rv-int-talas-2.png`.
- **Observed:** the label sits on a lit tower and inside the rings; it reads as noise. This is the frame that says "the sound starts at our door".
- **Fix:** in `talas.js`, place the label on the dark side of the origin (below-left, as in beat 1) and draw a soft dark plate or shadow under it; fade it while a ring passes through.

### P1-8. The entry gate has no English
- **Where:** gate, all viewports: `shots/review-gate.png`, `rv-gate-m.png`.
- **Observed:** the EN toggle lives in the top bar, which is `opacity:0` until start; pressing L on the gate does nothing. An English visitor's first screen is Serbian only.
- **Fix:** show a small "EN / SR" toggle on the gate (reuse `toggleLang`), or accept `l` before start.

---

## P2 — polish

**Picture and layout**
- `grain` transition (ploča → talas): for about half a second the old and new headlines are double-exposed in the same place, and the old paragraph collides with the "Lyra Style" label (`shots/rv-sheet-tr-talas.png`, third frame). Finish `s.exit` text fade before `talas.b1.h` starts (it starts at about 0.6 s of a 2.8 s transition).
- `talas-1`: for the first 1.5 s the timer ("0,3 s" … "1,2 s") overlaps the "Lyra Style" label (`rv-sheet-tr-talas.png`, frames 5–9). At 11 s the wavefront line strikes through the last line of the paragraph (`rv-d-talas-1-S.png`).
- `talas-2`: the hint "Klikni bilo gde i pusti talas." sits on the bright horizon band (`rv-d-talas-2-S.png`).
- `sazvezdje-3`: address lines are dim grey over a dense starfield and the three lines have uneven gaps (39 px then 33 px at 1440x900); the review line is 12–14 px (`rv-d-sazvezdje-3-S.png`). Strengthen `cam.shade` behind the block, set the address in paper white, equalise leading between `p3` and `p3b`.
- Idle chrome fades to 0.28 opacity after 3.2 s; over `talas` the Next button and rail are then barely visible (`rv-d-talas-2-S.png`). Hold at 0.5, or do not fade `.step.next`.
- 844x390: headline and paragraph in `zica-3` sit 6 px under the top bar (`rv-land-zica-3.png`). The chrome is sized in CSS px while the design's 110-unit top clearance shrinks to 40 px.
- 320–360 px wide: "Zvuk: ne" wraps to two lines and "Pregled" touches the first rail tick (`rv-sheet-320.png`).
- `zica-3`: the damper felts read as a row of red "C" shapes rather than piano parts (`rv-d-zica-3-S.png`). The weakest image of the ten; consider lowering their brightness.
- Overview in English shows baked Serbian thumbnails until each beat has been visited.

**Copy — Serbian**
- Line breaks split what belongs together: "u Novom / Beogradu" (`rv-d-zica-1-S.png`), "343 / metra" (`rv-d-talas-1-S.png`), "artikala, od / prvih" (`rv-d-ploca-2-S.png`), "Udari i / gledaj." (`rv-sheet-1280-a.png`). Use U+00A0 after one-letter words and prepositions and between number and unit; `text.js` only breaks on plain spaces, so this works today.
- `ploca.b1.p` ends "Udari i gledaj." and the hint 80 px below says "Udari ploču." Drop one.
- `talas.hint`: "Klikni" on a phone. Use "Dodirni bilo gde i pusti talas." when `view.touch`.
- `sazvezdje.b3.p`: "Radnim danima 10–19, subotom 10–15." reads better as "Radnim danima 10–19 h, subotom 10–15 h."
- `sazvezdje.reviews`: "iz više od hiljadu recenzija" → "na osnovu više od hiljadu recenzija".
- `ui.soundOn` / `ui.soundOff`: "Zvuk: da / Zvuk: ne" is not idiomatic. "Zvuk: uključen / isključen".
- `ui.title`: Serbian uses a spaced en dash: "Lyra Style – prvo čuj".
- Help lists "1–9"; there are four scenes. "1–4".
- Correct as shipped and worth keeping: number agreement in the panel ("2.302 artikla", "271 artikal", "398 artikala"), decimal comma ("4,8", "11,0 s"), thousands dot, non-breaking space before RSD.

**Copy — English**
- `zica.b3.p`: "came from us. So does the small violin…" changes tense mid-thought. "…came from us. So do the small violins for the first year of music school."
- `talas.b2.p`: "Our systems work in embassies" is a calque. "Our systems run in embassies and restaurants, and at the Slavija fountain."
- `talas.hint`: "Tap anywhere…" on touch.
- `sazvezdje.b3.p`: "building 2" is not what the signs say; a visitor on foot needs the local word: "LUX 51, lamela 2 (the second building)". "Weekdays 10–19, Saturday 10–15" → "Weekdays 10:00–19:00, Saturdays 10:00–15:00".
- `gate.ready`: "It is best with sound." → "Best with sound."

**Facts against research**
- Unverified and stated: founding year (P0-2). Address "16 … lamela 2 … Smolućska 16V" is rated about 90% in a-site-crawl §0 and b-social-voice §0 says "Have the owner confirm before launch"; hours come from Google, not the shop's own site. Confirm both with the owner.
- Verified: Steinway for Skupština grada; embassies, restaurants, Slavija fountain; 2,049 drum items; 4.8 from 1,074 reviews; eight departments and their counts; phones and email; 3.82 km to Sava Centar is 11.1 s at 343 m/s.

**Accessibility and engineering**
- Gate: 16 invisible controls behind it are focusable (Shift+Tab from "Uđi sa zvukom" lands on an `opacity:0` Next button, `tools/review/eng2.js`). Set `inert` on `.top`, `.rail`, `.step` until `begin()`. The loading message has no `aria-live`.
- Overview: Tab leaves the dialog to `<body>` and the canvas behind it; no `aria-label` on `.over` or `.help`; `.help` lacks `aria-modal`. `.rail` has a hard-coded English `aria-label="Progress"`. The canvas has `aria-label` but no role; add `role="img"`. The document has no `<h1>`.
- 18 Tab presses to reach the first star in `sazvezdje-2` (chrome and ten ticks come first). Put `.scene-dom` before `.rail` in tab order.
- Tap targets: rail ticks 16x38 px, top-bar tools 30 px tall on phones.
- No-WebGL fallback (`shots/rv-nogl-sr.png`): readable and it scrolls with the wheel, but End/PageDown/Space do nothing because `<body>` is the scroller (`html` stays `overflow:hidden`); it prints the interaction hints ("Povuci žicu.", "Klikni bilo gde…") as paragraphs; headlines are plain `<p>`; no language toggle, no phone, email or department links; the English fallback keeps the Serbian `<title>`.
- `hashchange` during a transition is dropped and the URL then disagrees with the scene (URL `#sazvezdje-2`, scene `talas`, `tools/review/eng1.js`). Queue the last request. `#Sazvezdje-2` (capitalised) falls back to `#zica`.
- Browser Back leaves the site (beats use `replaceState`). Reasonable; decide deliberately.
- `text.js` `ready` loads fonts with the sample `'Ščćžđ'`, which only covers the latin-ext subset files; the basic-latin italic Fraunces is never requested by the DOM. Chrome renders it correctly here, but add ASCII to the sample (`'Aa Ščćžđ'`) so first rasterisation cannot fall back to Georgia elsewhere. **(code)**
- Passed: zero external requests; only `lyrastyle.rs`, `tel:` and `mailto:` URLs in the file; sandboxed iframe without storage or fullscreen starts, navigates and switches language without throwing; all ten cold deep links; resize and rotation mid-transition and with the panel open; 90 mashed keys end in a consistent state; panel focus trap, Esc and focus return; live region announces each beat; language switch updates an open panel.

---

## Strongest — do not touch

- The opening: one string in a beam of light, "Prvo čuj." (`rv-d-zica-1-S.png`), and the pull-and-release response (`rv-int-zica-pull.png`).
- The Chladni plate, both figures and the scatter-and-reform on a strike (`rv-d-ploca-2-S.png`, `rv-int-ploca-1.png`).
- The wavefront lighting the blocks with the live timer to Sava Centar (`rv-d-talas-1-3.5.png`). The best idea on the site.
- The constellation with the engraved lyre, the label solver, and the department panel on desktop and as a phone sheet (`rv-d-sazvezdje-2-S.png`, `rv-panel-d.png`, `rv-panel-m.png`).
- The end card's single clear action, "Otvori prodavnicu" (`rv-d-sazvezdje-3-S.png`).
- The `pluck` transition (`rv-sheet-tr-ploca.png`), the gate, the overview grid.
- Compositions at 2200x900, 1024x768 and 1280x720 (`rv-sheet-uw-*.png`, `rv-sheet-1024-*.png`).
- Palette, grade and the Fraunces / Instrument Sans pairing.
