# Builder brief (read after CONTRACT.md)

## Situation
Unattended overnight build. The user is asleep: **never ask anyone anything**; make reasonable calls and note them in your final report. Everything stays local: no uploads, no web requests, no network at all except `npm install` if you truly need a package (you should not). Write only the file(s) you were assigned.

## What we are making
A brand-experience site for **Lyra Style**, a musical-instrument shop in Novi Beograd (since 1989; 4.8★ from 1,074 Google reviews; customers praise being allowed to try instruments). It is a layer over their existing web shop: it must leave people amazed, then hand them to the shop.

Concept: **"Prvo čuj" — listen first.** Sound made visible, and playable. Four scenes, ten beats:
1. `zica` — one string in the dark → the seven strings of a lyre → inside a concert grand.
2. `ploca` — sand on a vibrating plate draws Chladni figures: rhythm has a shape.
3. `talas` — a sound wave crosses Novi Beograd at night, in real time: 11 seconds to Sava Centar.
4. `sazvezdje` — the camera tilts up: Lyra the constellation; its eight stars are the shop's eight departments; then "come and hear it for real".

## The bar
The user's reference is a keynote-grade WebGL piece: every pixel a hand-written shader, film-like grade, typography drawn in the canvas, holds that never freeze, bespoke transitions, procedural sound. **A frame from your scene must look like a still from a film title sequence, not a tech demo.** If it looks like a three.js example, it is not done. Read `research/e-reference-teardown.md` sections 4 and 9 for the techniques and the twelve craft details.

Look: a dark stage. True black `#050403` (warm, never grey), brass light `#d8a548` / deep brass `#8a5a1c`, warm paper white `#f4ead8` for text, Vega blue-white `#bcd4ff` as the cool counter-colour, felt red `#9c2233` only as a rare accent. Light is motivated (one warm key, one cool rim), falls off into darkness, and blooms softly. Use grain, vignette and halation through `gfx.post`. Restraint: one memorable thing per beat; nothing decorative.

## How to work
1. Read `CONTRACT.md`, then skim `src/engine/gfx.js`, `src/engine/deck.js` (state, lifecycle), `src/engine/text.js`, `src/scenes/probe.js` (a minimal working scene), `src/copy.scenes.js` (your words; read-only), `src/site.js`, `src/products.js` if relevant.
2. Build with your private entry and LOOK at screenshots (Read the PNG). Loop: build → shoot → look → criticise like an art director → fix. **At least eight rounds.** Shoot every beat near its start, middle and settled hold (`--eval "window.__lyra.goto('<id>',<beat>);" --evalwait <ms>` or `__lyra.seek(sec)`), then: `--mobile` (portrait 390x844), `--w 2200 --h 900` (ultra-wide), `--w 1024 --h 768`, and `--rm` (reduced motion). Also test going backwards (`__lyra.goto(id, beat, true)` = that beat's finished state) and that `enter()` resets everything.
3. Check: text is readable, never collides with the focal object or the chrome (top-left wordmark, top-right tools, bottom-centre progress rail, bottom-right step buttons), and sits in calm, dark areas. Nothing clips at any aspect ratio. No console errors or warnings from your shaders. No external requests (shot.js prints them).
4. Cost: report `window.__lyra.state()` (`calls`, `tris`) and count your full-screen passes. Scale counts/steps with `s.q`. Avoid loops with more than ~32 texture taps per pixel at full resolution; do expensive work at reduced scale.
5. Sound: code against `ctx.audio` exactly as in the contract (it may be a silent stub while you work; that is fine). Edge-trigger every cue; prime the trigger state in `enter()` so deep links and backward jumps do not replay cues. Interactions should always produce both a visible and an audible answer.
6. Interaction must also work by touch, and nothing essential may depend on hover. A visitor who never touches anything still gets the full story (auto-cues on beat start).
7. Reduced motion (`s.motion` ≈ 0.12, beats arrive finished): keep the picture and the words, drop camera travel and ambient shake.

## Final report (≤ 250 words)
What each beat shows, interactions, techniques, draw calls / triangles / passes, what you would improve with more time, and anything the orchestrator must know (extra copy keys, engine quirks you worked around). Do not paste code.
