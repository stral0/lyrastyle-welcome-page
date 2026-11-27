# src/xmas — New Year visual kit (Deda Mraz, sleigh, snow)

Three modules, all hand-written GLSL3 `RawShaderMaterial`, procedural (Canvas2D atlases drawn at init, seeded),
pure functions of time (Santa's springs and the sleigh's chain included), `dispose()` on everything. Test scene: `src/scenes/xmaskit.js` (dev only):
`node tools/build.js --dev --entry src/dev/xmas-kit.js --out dist/xmaskit.html`.

Art rule (XMAS.md): figures are **backlit silhouettes**: near-black, a thin warm-gold rim on the edges facing the
light, deep red (≤ #6e1820) only as the light soaking into the hat and coat just inside the lit rim. Keep `rim` modest
(2–3.5) and let `gfx.post` bloom do the rest.

**Face mode (`face: 1`, Santa's default).** Every edge term (crisp rim, side wrap, fur glow, fur halo, red reveal) is
weighted by how much that edge faces the light (the outward normal of the blurred silhouette against `light`): the
edges turned away stay nearly dark, so he reads as a figure against a lamp, not a cut-out with a glowing border. Santa
also defaults to half the shared fur glow (`fur: 0.6`) and a deeper red (`red: [0.105, 0.0075, 0.012]`, linear); the
red can never exceed `red`. `face: 0` (the shared default, used by sleigh.js) keeps the legacy look: fur and hair glow
all round their outline. Costs 4 more coverage taps per covered pixel in face mode.

Common style options (Santa and sleigh), also settable later with `obj.style({...})`:
`light:[x,y]` direction **toward the light in screen terms (x right, y up)**, `rimColor:[r,g,b]` (linear, default warm gold),
`rim` intensity (HDR), `rimPx` / `softPx` rim depth in pixels, `rimClamp:[min,max,softMin,softMax]` (figure units),
`wrap` (side light), `fur` (fur/hair glow), `face` (0..1, weight every edge term by how much it faces the light), `glint` (metal: buckle, bells), `fill:[r,g,b]` (interior; near black),
`red:[r,g,b]` (cloth reveal colour, linear), `furColor`, `opacity`, `blur` (depth-of-field: mip bias 0..4), `softEdge`.
Setters: `setLight(x, y)`, `setRim(color, intensity)`, properties `opacity`, `blur`.

---

## santa.js — `createSanta(ctx, opts) → santa`

Deda Mraz in profile, facing right (`flip` for left). **Figure units:** height 100, feet at (0, 100), x forward, y down.
Proportions: a short, heavy stocking cap whose tail hangs to the ear with the bobble below it, a modest nose, thin fur
bands (hem, coat front, collar, cuffs, brim). He is a **2D cut-out rig**: 25 parts (far arm, both legs as thigh/shin/boot, coat skirt, torso, head, beard, the cap in
two hanging segments, bobble, upper arm, forearm, a gloved hand of palm + thumb + two-knuckle index + two-knuckle fingers,
optional sack), each its own atlas cell. Every frame they are posed by forward kinematics, **two-bone IK** for the
reaching arm (onto a fingertip target, leaning / bending in when it is out of reach) and for both legs (ankles planted,
knees forward, the pelvis drops as far as the stance needs), and drawn in one instanced call into a figure-space
composite; the rim shader reads that composite, so rim, fur glow and red reveal are computed on the whole silhouette
(no seams at joints). **Secondary motion** (coat hem, beard, both cap segments, bobble) is a set of damped springs
driven by gravity, the parents' turning and the pivots' acceleration (inertia), simulated at 120 Hz.

**Poses are numbers, not pictures** (`PARAMS`, see the comment in santa.js): lean, bend, shiftX/Y, head, gaze point +
weight, arm angles a1/a2/wr, finger curls th/i1/i2/f1/f2, far arm fa1/fa2, fingertip target tx/ty + weight tw, ankles
nX/nL/nA fX/fL/fA, a walk (walkD distance, walkS stride, walkW weight, walkV speed: `walkFeet()` plants the feet as a
pure function of distance and starts / ends in the standing stance after whole cycles), travelX/Y (root motion, for
inertia), idle (breathing, sway, slow weight shifts, head drift), breathe, sway. Named poses blend these numbers.

| call | meaning |
|---|---|
| `opts` | style options above, plus `flip`, `sack` (sack over the shoulder), `depthTest` (default true), `seed` |
| `perform(fn, key?)` | **preferred**: `fn(time, full)` → params (any subset; defaults = standing). Must be pure in `time`. The springs are a fixed-step (120 Hz) simulation driven by `fn` (only the trunk is needed then: `full = false`). While `time` moves forward (≤ 2 s per call) under the same `key` (string, number within 1e-6, or an array of those; without a key: the same `fn` object), they integrate on from the cached state: 1–3 steps a frame. Any discontinuity (time going back, a jump past 2 s, a new key, `reset()`) replays the last 2 s from rest, so every frame is still a function of time (jump-safe; cached vs replayed differ by < 1e-3 rad). Pass a fresh closure every frame only together with a key (e.g. `[beat, clockOffset, view.w, view.h]`). `springStats` = `{ replays, steps }`. |
| `pose(a, b = a, f = 0)` | legacy: blend the named poses' parameters (`stand`, `reach`, `pluck`, `sweep0..3`, `wave`); clears `perform` |
| `poseIndex(x)` · `armTarget([fx, fy] \| null)` · `armTargetDesign(x, y)` · `lean(rad)` · `motion(breathe, sway)` | legacy controls (springs then integrate forward and settle after a jump) |
| `reset()` | forget integrated springs (legacy mode; call from `enter()`) |
| `place(x, y, h)` / `placeWorld([x,y,z], heightM, billboard)` | screen / 3D placement, feet at the point |
| `toDesign([fx, fy], out?)`, `toFigure(x, y)` | convert between figure and design units (screen placement) |
| `fingertip`, `shoulder`, `wrist`, `handAngle`, `reachLength`, `params` | after `update()` (figure units) |
| `update(time)` | pose the rig; `render(target, camera?)` composites (if needed) and draws without clearing |
| `composite()` | only if you add `santa.mesh` to your own scene: call it after `update()`, before your render |

Helpers exported: `POSES`, `PARAMS`, `HAND_POSES` (rest, point, hook, open), `mixParams(out, a, b, t)`,
`poseParams(out, name)`, `walkFeet(d, stride)`.

```js
import { createSanta, POSES, mixParams } from '../xmas/santa.js';
const santa = createSanta(ctx, { light: [-0.55, 0.84] });            // light from the upper left, behind him
const P = {};
// update(s): a pure performance in the beat's clock; the fingertip lands exactly on the string (figure units)
santa.place(x, y, h);
const tb = s.time - s.at(0), g = santa.toFigure(stringX, stringY);
santa.perform((T, full) => { const t = T - tb, k = smooth((t - 1) / .6);
  mixParams(P, POSES.stand, POSES.reach, k); P.gazeX = g[0]; P.gazeY = g[1]; P.gazeW = k;
  if (full) { P.tx = g[0]; P.ty = g[1]; P.tw = smooth((t - 1.3) / .4); } return P; }).update(s.time);
// render(target, s): stage.render(hdr); santa.render(hdr); gfx.post(hdr, target, grade);
```
Cost: **2 draw calls** (25 instanced part quads into a 912×1088 RGBA8 mipmapped composite, then one quad with the rim
shader, ~13 taps per covered pixel in face mode); atlas built at init (~0.1 s); springs: 1–3 trunk evaluations per frame (240 only after a jump). In face mode the fur
glow is limited to the outer silhouette (~6 px) and its texture is a slow swell, not a fine noise (no lit speckles inside the figure).

---

## sleigh.js — `createSleigh(ctx, opts) → sleigh`

Sleigh (curved scrolled runners, high back, gilt edge, two dash bells) with Deda Mraz seated holding the reins, a sack
behind him, and 8 reindeer in 4 pairs (antlers, collar bells, 16-frame procedural flying gallop + 8 bold LOD frames).
Harness traces sleigh → pairs and reins hands → first pair are drawn live. A trail of gold sparks leaves the runners
(and a few the bells), drifts down and fades over `sparkLife` s. Billboards face the camera and mirror when flying left.

Motion: **with a path the team is a chain**: each pair (and the sleigh) is where the path was, or will be, for its
place along the team (time offset = distance / speed), with its own heading and depth, so turns run down the team, the
traces curve and the team recedes in perspective; at a crawl (or without a path) it becomes one rigid team. Each reindeer
has its own gallop phase (pairs and pair members never in lockstep), size, bob and head carriage; its body rises at the
gathered (suspension) phase and pitches with the stride; its head is a separate atlas part posed about the base of the
neck that lags the body (the union is shaded, no seam). The sleigh swings like a pendulum under the path's lateral and
forward accelerations and the pull of the strides; the team banks with the turn rate. All pure functions of time.
Below `lodPx` (a reindeer under ~26 px long) it switches to bold LOD frames.

| call | meaning |
|---|---|
| `opts.mode` | `'world'` (default: `pos` in metres, needs a camera) or `'screen'` (design units, y down) |
| `opts.size` | team length (nose of the lead reindeer to the back of the sleigh), metres or design units |
| `opts.path` | `t => ({ pos, dir })`: then `update(time)` needs no pos/dir, the team follows it as a chain and the **spark trail is a pure function of time** (jump-safe). Without it, the team is rigid and sparks come from an update history (cleared on jumps). |
| `opts.gallop` (1.9 strides/s), `sparks` (240), `sparkLife` (2.5), `lodPx` (26), `bank` (extra roll), `chain` (0..1, default 1) | |
| `update(time, pos?, dir?, camera?, size?)` | world: `pos/dir` `[x,y,z]`, camera required; screen: `[x, y]` and `[dx, dy]` (y down) |
| `render(target, camera?)` | draws lines, silhouettes, sparks (no clear). Screen mode uses its own design camera. |
| `group` | `THREE.Group` (3 meshes) to add to your own scene instead (still call `update(..., camera)` each frame) |
| `trail(v)` | 0..1 share of sparks shown (0 hides the trail) |
| `ring(t, k = 1)` | the bells ring at time `t` (the update clock): a third of the sparks shake loose and fall below the team for ~2.6 s (pure in time; `null` = none) |

The anchor (`pos`) is the **centre of the team**; the sleigh trails `size/2` behind it (in time, on a path).

```js
import { createSleigh } from '../xmas/sleigh.js';
const path = t => ({ pos: [lerp(-30, 30, t / 12), 9 + Math.sin(t * .4), -40], dir: [5, .4 * Math.cos(t * .4), 0] });
const sleigh = createSleigh(ctx, { size: 21, light: [0.55, 0.85], path, sparks: 240 });   // sparks: fixed at creation
// update(s): sleigh.update(s.since(1), null, null, camera);
// render:    gfx.draw(world, camera, hdr); sleigh.render(hdr, camera);
```
Cost: **3 draw calls** (instanced silhouettes ×9 with a second tap for the head, harness lines, instanced sparks);
~18 taps per covered pixel; atlas 16 + 8 gallop frames at 5 texels/unit, built at init.

---

## snow.js — `createSnow(ctx, opts) → snow`

One instanced draw call; positions are computed in the vertex shader from `time` (wind, gusts and flutter are integrated
analytically), so any `time` is valid (jump-safe). Additive light, so it brightens what is behind it.

* `'world'` (default): flakes in a `box` (m) that wraps around the camera (real parallax), size attenuation, a minimum
  of ~1.2 px, near flakes open into soft out-of-focus discs (`focus` m, `aperture` m), far flakes stay crisp.
* `'screen'`: design-unit overlay; flake nearness is skewed so most are tiny and slow, a few near and soft (`layers` = skew).

Options: `count` (≤ 6000 world, ~700 screen), `fall` (m/s or design/s), `wind:[x,y,z]`, `sway`, `size` (m or design units),
`focus`, `aperture`, `near`, `color:[r,g,b]` (cool moonlight by default; warm it near lamps), `brightness`, `opacity`,
`shaft: { origin, dir, radius, color }` (world: metres; screen: design units) — flakes inside the shaft glow in its colour.

| call | meaning |
|---|---|
| `update(time, camera)` | world: camera gives the wrap centre and pixel scale; screen: camera not needed |
| `set({...})` | any option above live, plus `density` (0..1 of count) |
| `quality(s.q)` / `density(d)` | scale the flake count |
| `render(target, camera)` | draw (no clear); or add `snow.mesh` to your scene |

```js
import { createSnow } from '../xmas/snow.js';
const snow = createSnow(ctx, { count: 6000, color: [.5, .6, .85], brightness: .55, focus: 7, aperture: .06, size: .03 });
// update(s): snow.quality(s.q).update(s.time, camera);   render: snow.render(hdr, camera);
const veil = createSnow(ctx, { mode: 'screen', count: 700, brightness: .6, size: 3.2,
  shaft: { origin: [300, -100], dir: [.42, .91], radius: 160, color: [1, .62, .3] } });  // warm in the light shaft
```
Cost: **1 draw call**, ≤ 6000 instanced quads at q = 1.

---

## Audio (added to `src/engine/audio.js`; nothing existing changed)

* `ctx.sfx('jingle', { shake, pitch, gain, pan, delay })` — a shaken cluster of eight small sleigh bells tuned in D
  (D6 E6 F#6 A6 D7 E7 F#7 A7, inharmonic crotal partials + pellet clicks), ~1.2 s. `shake` 0..1: 2, 4 or 6 strokes
  (rounded to three levels, two round-robin variants each).
* `ctx.sfx('sleigh', { pitch, gain, pan, delay })` — ~2.5 s soft airy pass (a band of air rising and falling) with faint
  bells that droop slightly in pitch as they go by.
* Warm them in `init()`: `ctx.audio.warm([{ sfx: 'jingle' }, { sfx: 'sleigh' }])`. Peaks: about −15 dBFS each alone; the
  master ceiling holds (everything at once ≈ −6.4 dBFS).
