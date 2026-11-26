# Lyra Style — interface contract (FROZEN)

One self-contained HTML file: three.js bundled in, one full-window `<canvas id="stage">`, fonts as base64, zero external requests.
A WebGL narrative of **scenes**, each split into **beats** (one "next" = one beat). Not a scrolling page.

Project root: `/home/claude/lyra`. Orchestrator owns `src/engine/deck.js`, `src/engine/gfx.js`, `src/main.js`, `src/index.template.html`, `src/styles.css`, `tools/*`, `dist/*`. **Builders write only the files they are assigned.** Never edit another module; if you need an engine change, say so in your final report.

## Build and look at your work
```
node tools/build.js --dev --entry src/dev/<you>.js --out dist/<you>.html     # your private build
node tools/shot.js shots/<you>-1.png --file dist/<you>.html --hash <scene>-<beat> --wait 4000
# flags: --w 1440 --h 900 | --mobile (390x844 touch) | --rm (reduced motion) | --keys "ArrowRight,ArrowRight" --keywait 2500
#        --eval "window.__lyra.goto('zica',1,true)"  --evalwait 1500   (prints console errors + any external request)
```
`dist/<you>.html?headless` semantics are automatic in shot.js (it sets `window.__LYRA_HEADLESS`, skipping the entry gate).
Open PNGs with the Read tool and **look at them**; iterate until the frame is beautiful. Test hooks: `window.__lyra.goto(id, beat, done)`, `.seek(seconds)`, `.next()`, `.prev()`, `.state()`.
The test browser is software-rendered (llvmpipe): slow, but pixel-correct. Judge looks from screenshots; judge cost from `__lyra.state()` (`calls`, `tris`) and shader complexity, not from its frame rate.

## Scene module — `src/scenes/<id>.js`
```js
export default {
  id: 'zica',                       // lowercase ascii; also the deep-link hash (#zica, #zica-2 = beat 2)
  enterWith: 'pluck',               // transition name used when arriving from the previous scene
  beats: [                          // dur = authored seconds of motion; afterwards the beat HOLDS (drift goes on)
    { dur: 7, copy: ['zica.b1.h', 'zica.b1.p'] },   // copy = keys in src/copy.js shown/announced in this beat
    { dur: 6, copy: ['zica.b2.h'] },
  ],
  create(ctx) {                     // allocate once
    return {
      async init() {},              // heavy one-time work; draw everything once to compile shaders
      enter(s) {}, exit(s) {},      // reset integrators / edge-trigger flags / audio layers
      beat(s) {},                   // optional: called when the visitor steps forward to a new beat
      resize() {},
      update(s) {},                 // timeline state -> uniforms, camera, text. Derive from s; don't accumulate history.
      render(target, s) {},         // draw the finished, graded frame into `target` (null = screen)
      pointer(e, s) {},             // e = {type:'down'|'move'|'up'|'leave', x,y (design units), nx,ny (-1..1, y up)}; return true to consume
      key(e, s) {},                 // optional; return true to consume a KeyboardEvent
    };
  },
};
```
### Timeline state `s`
- `s.t` seconds since the scene was entered; `s.dt` frame delta (0 when paused); `s.time` global seconds.
- `s.beat` current beat index; `s.p[b]` 0..1 progress of beat b's `dur`.
- `s.k(b, t0, t1, ease)` → eased 0..1 over seconds [t0,t1] inside beat b (1 for past beats, 0 for future). **The workhorse**: `lerp(a, b, s.k(1, 0.5, 3, 'inOutCubic'))`. `ease` = name in `ctx.ease` or a function.
- `s.at(b)` seconds into beat b; `s.since(b)` seconds since beat b began (keeps counting through the hold — use for slow drift so holds never freeze).
- `s.enter`, `s.exit` 0..1 while a transition brings the scene in / takes it out.
- `s.q` quality 0.35..1 (scale steps, counts); `s.motion` 1, or 0.12 under prefers-reduced-motion (multiply ambient motion by it).
- `s.mouse.x/y` smoothed pointer, -1..1; `s.mouse.down`.
Backward steps and deep links jump straight to a beat's finished state, so every value must be a pure function of `s`. Followers may use `ctx.util.damp(v, goal, rate, s.dt)` and must be reset in `enter`.

### `ctx`
- `ctx.THREE`, `ctx.GLSL` (`HASH`, `NOISE`, `COLOR` prelude strings: hash11/12/22/33, ign, vnoise, fbm, toLinear, toSRGB, luma).
- `ctx.gfx`: `W,H,aspect,time,renderer`;
  `target({scale=1 | w,h, hdr=true, depth=false, samples=0, mips=false, max})` → WebGLRenderTarget (scale-targets follow resizes);
  `pass(fragBody, {uniform: value}, {blend:'none'|'add'|'alpha'})` → `{u, render(target)}` — full-screen GLSL3 pass; fragment gets `vUv`, `uRes`, `uTime`, the preludes, writes `fragColor`;
  `draw(scene, camera, target, {clear, color})`; `copy(src, out)`; `free(target)`;
  `post(srcHDR, out, grade)` — bloom + tone map + grade. `grade = {exposure, bloom, threshold, knee, radius, tone:'aces'|'agx'|'none', contrast, saturation, vignette, grain, halation, lift:[r,g,b], gain:[r,g,b], fade}`; animate these with the story.
- **Render recipe**: draw the world into your own HDR target (`gfx.target({depth:true, samples:4})`, linear light, values may exceed 1), `gfx.post(hdr, target, grade)`, then `ui.render(target)` for text. Every material is a `ShaderMaterial`/`RawShaderMaterial` you write (GLSL3 preferred); no stock lit materials, no three.js lights.
- `ctx.view`: design space; **short side is always 1080 units**. Landscape: `h=1080, w=1080*aspect`. Portrait (`view.portrait`): `w=1080, h=1080/aspect`. Origin top-left, y down. Recompute layout from `view` every frame; design portrait and ultra-wide from the start.
- Text: `const ui = ctx.overlay(); const T = ui.text('copy.key or literal', {x, y, size, font:'display'|'displayItalic'|'text'|'textMed', color:'#f4ead8', align:'left'|'center'|'right', valign:'top'|'middle'|'bottom'|'baseline', width (wrap, design units), leading, tracking});`
  per frame: `T.x=..; T.y=..; T.show(inProgress, {style:'blur'|'rise'|'fade', by:'word'|'glyph'|'line', q: outProgress, stagger}); ui.render(target)`.
  `T.set(str)`, `T.width`, `T.height`, `T.alpha`, `T.rotation`, `T.box`. Copy keys are re-resolved when the language changes.
- Copy: `ctx.t('key', {vars})`, `ctx.lang()` ('sr'|'en'). All visible words live in `src/copy.js` (Serbian Latin first, English second). Never hard-code prose in a scene.
- Audio (procedural, muted until a gesture; calls are no-ops while muted): `ctx.audio.pluck(freq, {gain, pan, decay, bright})`, `ctx.audio.drum('kick'|'snare'|'hat'|'tom'|'cymbal'|'rim', {gain, pan, pitch})`, `ctx.audio.key(freq, {gain, pan, dur})`, `ctx.audio.layer(name, 0..1)` continuous beds (`'room'`, `'air'`, `'sub'`, `'shimmer'`, `'hum'`), `ctx.sfx(name, {gain, pitch, pan})` (`'whoosh'|'tick'|'click'|'rise'|'bell'|'grain'|'thud'|'select'`). Fire cues on forward threshold crossings only (`if (prev < at && now >= at && s.dt > 0)`), never every frame.
- `ctx.products` (baked catalogue), `ctx.site` (`shop`, `phone`, `address`, …), `ctx.dom(id)` → a `<div class="scene-dom">` shown only while your scene is current (for real links), `ctx.go(id, beat)`, `ctx.next()`, `ctx.prev()`, `ctx.reduced()`, `ctx.headless`, `ctx.util {clamp, lerp, damp, smoothstep, remap, rng}`, `ctx.ease`.

## Transition module — entry in `src/engine/transitions.js`
`{ dur, create(ctx) → { render({A, B, p, out, time, from, to, sa, sb}) } }`. `A`, `B` are LDR sRGB targets holding the finished frames of both scenes, both still running. Guard: `p<=0` copy A, `p>=1` copy B. Blend in linear light. Carry an object across the cut.

## Craft rules (from the reference teardown)
1. Holds are never frozen: after a beat's move ends, slow asymptotic drift + sums of incommensurate sines on the camera.
2. Exponential smoothing for followers; named eases with intent (inOutCubic/Quart camera, outCubic arrivals, damped cosine for anything physical).
3. Restrained pointer parallax (~0.03 rad), faded out during big moves.
4. Analytic anti-aliasing (`fwidth`), dither and grain so dark gradients never band.
5. Text arrives 0.2–1.6 s after the picture settles, by word, blur or rise, ~1.2 s in, <1 s out.
6. Seeded PRNG for all procedural layout (`ctx.util.rng(seed)`); deterministic frames.
7. Budget: ≤ ~120 draw calls and ≤ ~8 full-screen passes per scene at `q=1`; scale counts with `s.q`. Must hold 60 fps on a mid-range laptop iGPU at 1440x900.
8. No external requests of any kind. No images from the web. Everything is generated.

## Palette and type (tokens)
Stage black `#050403` (never grey), warm paper white `#f4ead8`, brass `#d8a548`, deep brass `#8a5a1c`, Vega blue-white `#bcd4ff`, felt red `#9c2233` (rare). Display: Fraunces (roman + italic, optical size axis). Text: Instrument Sans. Sentence case; no all-caps eyebrows; no monospace labels.

## Addenda (still frozen)
- Scene order and entrances: `zica` (first) → `ploca` (enterWith `'pluck'`) → `talas` (enterWith `'grain'`) → `sazvezdje` (enterWith `'tilt'`). Unknown transition names fall back to `'fade'`, so you can set yours now.
- Copy keys for every scene already exist in `src/copy.scenes.js` (read-only for scene builders). If you need more words, add `copy: { sr: {...}, en: {...} }` to your scene's default export; the deck merges it. Prefix keys with your scene id.
- Private dev entries exist: `src/dev/zica.js`, `ploca.js`, `talas.js`, `sazvezdje.js` (each boots only that scene).
- Text font roles: `display`, `displayLight`, `displayItalic` (Fraunces), `text`, `textMed` (Instrument Sans). Headline sizes 96–190 units, paragraph 34–44, small labels 26–30; paragraph `width` ≤ 760 units; keep text ≥ 90 units from every edge and clear of the chrome (top 110 units, bottom 130 units).
- `s.enter`/`s.exit` are 1/0 outside transitions. A scene's first beat starts when its transition starts.
- DOM inside `ctx.dom(id)`: style with a `<style>` you inject there, scoped to `.scene-dom[data-scene="<id>"]`; use CSS variables `--ink --paper --dim --brass --line --panel --serif --sans`. External links: `<a href target="_blank" rel="noopener">`. Wheel events inside `.scene-dom` do not advance the deck.
- Test-browser timing: in the headless test browser the deck lets time advance up to 0.34 s per frame, so `--wait 4000` really is about 4 s of scene time even at a few fps. For exact frames use `--eval "window.__lyra.goto('<id>',<beat>); window.__lyra.seek(<sec>)"`.
- Audio is final (see src/engine/audio.js header). Extras: every call takes `delay` (seconds), and `ctx.audio.warm([{pluck:f, body, bright, decay} | {key:f} | {drum:'kick'} | {sfx:'bell'} | {layer:'shimmer'}])` pre-renders buffers; call it in your `init()` for the cues you use so first use does not hitch.
- `ctx.view.safeTop`, `safeBottom`, `safeSide` (design units): keep all in-canvas text inside these (they grow on phones and short landscape windows where the CSS-sized chrome takes more design units). Use them instead of the fixed 110/130/90.
- The text engine now gives small type a physical floor on phones (paragraphs ≥ 15 px, labels ≥ 12 px), so on narrow screens blocks may be up to 30% larger than authored: lay out from `T.width`/`T.height`, never from assumed sizes. U+00A0 in copy keeps words together.
