// sazvezdje — the camera tilts up from the city: Lyra, the lyre of Orpheus. Eight stars, eight departments,
// then the invitation. Sky is a gnomonic chart (tangent-plane degrees, north up, east left) centred on
// RA 18h50m, Dec +36°; everything in the picture is placed in those coordinates and projected each frame.

// ---------------------------------------------------------------------------------------------------
// Star -> department. Positions J2000. R/I are display values (core sigma in design units, HDR peak):
// real magnitude differences are compressed so all eight read, and Vega still dominates.
//  id      department     why
//  vega    gitare         the hero star for the hero department
//  eps     dj             the "Double Double": two pairs, like two decks and two ears
//  zeta    klasicni       the hub where the figure's lines meet; the oldest part of the trade
//  delta   ozvucenje      a wide, loud orange pair
//  gamma   klavijature    Sulafat, "the tortoise": the lyre's sound box, the biggest body
//  beta    bubnjevi       Sheliak, an eclipsing pair that pulses on a strict beat
//  eta     studio         the quiet extension, off to the side
//  theta   oprema         the far end: everything that goes with the rest
// ---------------------------------------------------------------------------------------------------
const hms = (h, m, s) => (h + m / 60 + s / 3600) * 15, dm = (d, m) => d + m / 60;
const FIG = [
  { id: 'vega', cat: 'gitare', ra: hms(18, 36, 56), dec: dm(38, 47), mag: 0.0, R: 6.4, I: 10, col: '#a9c6ff', spike: 1 },
  { id: 'eps', cat: 'dj', ra: hms(18, 44, 20), dec: dm(39, 40), mag: 4.7, R: 2.15, I: 2.6, col: '#e6edff', pair: 1 },
  { id: 'zeta', cat: 'klasicni', ra: hms(18, 44, 46), dec: dm(37, 36), mag: 4.4, R: 2.9, I: 3.1, col: '#dfe8ff' },
  { id: 'delta', cat: 'ozvucenje', ra: hms(18, 54, 30), dec: dm(36, 54), mag: 4.3, R: 2.9, I: 3.1, col: '#ffd3a6' },
  { id: 'gamma', cat: 'klavijature', ra: hms(18, 58, 57), dec: dm(32, 41), mag: 3.2, R: 3.6, I: 4.4, col: '#d2e0ff' },
  { id: 'beta', cat: 'bubnjevi', ra: hms(18, 50, 5), dec: dm(33, 22), mag: 3.5, R: 3.35, I: 3.9, col: '#dbe6ff' },
  { id: 'eta', cat: 'studio', ra: hms(19, 13, 45), dec: dm(39, 9), mag: 4.4, R: 2.8, I: 2.9, col: '#c9d9ff' },
  { id: 'theta', cat: 'oprema', ra: hms(19, 16, 22), dec: dm(38, 8), mag: 4.4, R: 2.8, I: 2.9, col: '#ffc48a' },
];
// figure lines (indices into FIG); third entry = dotted extension. Seven solid lines: the seven strings.
const LINES = [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [3, 6, 1], [6, 7, 1]];
const LINE_T = [4.5, 4.92, 5.34, 5.76, 6.18, 6.6, 7.02, 7.5, 7.85];
const BELL = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 15 / 8, 2, 2.5, 3]; // a rising scale, one bell per line
// real neighbours so the field is the true one: [ra, dec, mag, B-V]
const NEIGH = [
  [hms(20, 41, 26), dm(45, 17), 1.25, .09], [hms(20, 22, 14), dm(40, 15), 2.23, .67], [hms(19, 44, 58), dm(45, 8), 2.87, -.02],
  [hms(19, 30, 43), dm(27, 58), 3.08, 1.1], [hms(20, 46, 13), dm(33, 58), 2.48, 1.03], [hms(19, 56, 18), dm(35, 5), 3.89, 1.02],
  [hms(19, 29, 42), dm(51, 44), 3.77, .15], [hms(19, 17, 6), dm(53, 22), 3.79, .96], [hms(19, 36, 26), dm(50, 13), 4.48, .38],
  [hms(18, 19, 52), dm(36, 4), 4.33, 1.17], [hms(18, 55, 20), dm(43, 57), 4.0, 1.6], [hms(19, 0, 0), dm(32, 9), 4.93, 1.47],
  [hms(19, 7, 18), dm(36, 6), 5.25, -.11], [hms(18, 24, 14), dm(39, 30), 5.12, .04], [hms(17, 56, 15), dm(37, 15), 3.86, 1.35],
  [hms(17, 39, 28), dm(46, 0), 3.8, -.18], [hms(17, 15, 3), dm(36, 49), 3.16, 1.44], [hms(17, 23, 41), dm(37, 9), 4.15, 0],
  [hms(18, 7, 33), dm(28, 46), 3.84, -.03], [hms(17, 57, 46), dm(29, 15), 3.7, .94], [hms(17, 58, 30), dm(30, 11), 4.41, .39],
  [hms(17, 46, 27), dm(27, 43), 3.42, .75], [hms(17, 56, 36), dm(51, 29), 2.24, 1.52], [hms(17, 30, 26), dm(52, 18), 2.79, .98],
  [hms(17, 53, 32), dm(56, 52), 3.73, 1.18], [hms(17, 32, 13), dm(55, 11), 4.1, .26], [hms(19, 28, 42), dm(24, 40), 4.44, 1.5],
];
const D2R = Math.PI / 180, RA0 = (18 + 50 / 60) * 15, DEC0 = 36;
function gno(ra, dec) { // -> tangent-plane degrees, x to the west (right on screen), y north
  const a = (ra - RA0) * D2R, d = dec * D2R, d0 = DEC0 * D2R, cd = Math.cos(d);
  const D = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * cd * Math.cos(a);
  return [-(cd * Math.sin(a)) / D / D2R, (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * cd * Math.cos(a)) / D / D2R];
}
function galToEq(l, b) {
  const aG = 192.85948 * D2R, dG = 27.12825 * D2R, lN = 122.93192 * D2R; l *= D2R; b *= D2R;
  const sd = Math.sin(dG) * Math.sin(b) + Math.cos(dG) * Math.cos(b) * Math.cos(lN - l);
  const y = Math.cos(b) * Math.sin(lN - l), x = Math.cos(dG) * Math.sin(b) - Math.sin(dG) * Math.cos(b) * Math.cos(lN - l);
  return [(aG + Math.atan2(y, x)) / D2R, Math.asin(sd) / D2R];
}
const toLin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
const hexLin = h => { const n = parseInt(h.slice(1), 16); return [toLin((n >> 16 & 255) / 255), toLin((n >> 8 & 255) / 255), toLin((n & 255) / 255)]; };
function kelvin(T) { // black-body tint, linear rgb, max channel 1
  const t = T / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = [r, g, b].map(v => toLin(Math.min(255, Math.max(0, v)) / 255)); const m = Math.max(c[0], c[1], c[2]);
  return c.map(v => v / m);
}
const bvCol = bv => { const T = 4600 * (1 / (.92 * bv + 1.7) + 1 / (.92 * bv + .62)); const c = kelvin(T); return c.map(v => .28 + .72 * v); };

const XF = /* glsl */`
uniform vec2 uView, uO, uA, uRot; uniform float uS, uPx, uHor; uniform vec4 uShade; uniform float uShadeA;
float shade(vec2 su){ vec2 d = (su - uShade.xy) / uShade.zw; float r = dot(d, d); return 1. - uShadeA * exp(-r * r); }
vec2 toScreen(vec2 p){ vec2 r = p - uA; return uO + uS * vec2(uRot.x * r.x - uRot.y * r.y, -(uRot.y * r.x + uRot.x * r.y)); }
vec2 toSky(vec2 su){ vec2 v = vec2(su.x - uO.x, -(su.y - uO.y)) / uS; return uA + vec2(uRot.x * v.x + uRot.y * v.y, -uRot.y * v.x + uRot.x * v.y); }
vec4 toClip(vec2 su){ return vec4(su.x / uView.x * 2. - 1., 1. - su.y / uView.y * 2., 0., 1.); }
`;

const CSS = (S => `
${S}{--u:1px;font-family:var(--sans);color:var(--paper)}
${S} .sz-stars{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
${S} .sz-star{position:absolute;left:-24px;top:-24px;width:48px;height:48px;border-radius:50%;pointer-events:auto;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
${S} .sz-star i{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:1px solid transparent;transform:translate(var(--dx,0px),var(--dy,0px)) scale(.78);transition:border-color .25s ease,transform .4s cubic-bezier(.2,.7,.2,1)}
${S} .sz-star:hover i{border-color:rgba(244,234,216,.34);transform:translate(var(--dx,0px),var(--dy,0px)) scale(1)}
${S} .sz-star[aria-expanded="true"] i{border-color:rgba(216,165,72,.75);transform:translate(var(--dx,0px),var(--dy,0px)) scale(1)}
${S} .sz-star:focus-visible i{border:2px solid var(--brass);transform:translate(var(--dx,0px),var(--dy,0px)) scale(1.1)}
${S} .sz-panel{position:absolute;right:max(1.4rem,env(safe-area-inset-right));top:4.7rem;bottom:5rem;width:min(440px,calc(100vw - 2.8rem));display:flex;flex-direction:column;overflow:hidden;
  background:rgba(11,9,7,.88);border:1px solid var(--line);border-radius:12px;-webkit-backdrop-filter:blur(22px) saturate(1.15);backdrop-filter:blur(22px) saturate(1.15);box-shadow:0 34px 90px rgba(0,0,0,.6);
  opacity:0;visibility:hidden;transform:translate3d(22px,0,0);transition:opacity .3s ease,transform .5s cubic-bezier(.2,.7,.2,1),visibility 0s linear .5s}
${S} .sz-panel.on{opacity:1;visibility:visible;transform:none;transition:opacity .35s ease,transform .55s cubic-bezier(.2,.7,.2,1),visibility 0s}
${S}[data-short] .sz-panel{top:.6rem;bottom:.6rem}
${S}[data-layout="sheet"] .sz-panel{left:0;right:0;top:auto;bottom:0;width:auto;height:70%;border-radius:18px 18px 0 0;border-width:1px 0 0;transform:translate3d(0,30px,0)}
${S}[data-layout="sheet"] .sz-panel.on{transform:none}
${S} .sz-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.5rem 1.5rem 1.15rem}
${S} .sz-starname{margin:0 0 .5rem;font-size:.8rem;line-height:1.3;color:var(--brass)}
${S} .sz-title{margin:0;font-family:var(--serif);font-weight:400;font-size:clamp(1.7rem,1.25rem + 1.6vw,2.15rem);line-height:1.08;letter-spacing:-.012em;font-variation-settings:"opsz" 96;text-wrap:balance;outline:none}
${S} .sz-count{margin:.55rem 0 0;font-size:.92rem;color:var(--dim);font-variant-numeric:tabular-nums}
${S} .sz-close{flex:none;font-size:.84rem;line-height:1;padding:.72rem 1rem;min-height:44px;border-radius:999px;border:1px solid var(--line);color:var(--paper);transition:border-color .2s,background .2s}
${S} .sz-close:hover{border-color:var(--paper);background:rgba(244,234,216,.06)}
${S} .sz-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(244,234,216,.22) transparent;border-top:1px solid var(--line)}
${S} .sz-list{list-style:none;margin:0;padding:0}
${S} .sz-list li+li{border-top:1px solid rgba(244,234,216,.09)}
${S} .sz-item{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:1.25rem;align-items:baseline;padding:.82rem 1.5rem .9rem;text-decoration:none;color:var(--paper);transition:background .2s}
${S} .sz-brand{grid-column:1/-1;font-size:.76rem;line-height:1.3;color:var(--dim);margin-bottom:.16rem}
${S} .sz-name{font-size:.98rem;line-height:1.36;text-wrap:pretty;text-decoration:underline;text-decoration-color:transparent;text-decoration-thickness:1px;text-underline-offset:.22em;transition:text-decoration-color .2s}
${S} .sz-price{font-size:.98rem;line-height:1.36;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;transition:color .2s}
${S} .sz-item:hover{background:rgba(244,234,216,.055)}
${S} .sz-item:hover .sz-name,${S} .sz-item:focus-visible .sz-name{text-decoration-color:rgba(244,234,216,.6)}
${S} .sz-item:hover .sz-price{color:var(--brass)}
${S} .sz-item:focus-visible{outline-offset:-4px;border-radius:6px}
${S} .sz-foot{flex:none;padding:1rem 1.5rem max(1.15rem,env(safe-area-inset-bottom));border-top:1px solid var(--line)}
${S} .sz-all{display:block;padding:.95rem 1.2rem;border-radius:999px;background:var(--paper);color:var(--ink);font-weight:600;font-size:.98rem;line-height:1.2;text-align:center;text-decoration:none;transition:background .2s}
${S} .sz-all:hover{background:#fff}
${S} .sz-note{margin:.8rem 0 0;font-size:.78rem;line-height:1.5;color:var(--dim);text-align:center;text-wrap:balance}
${S} .sz-end{position:absolute;left:50%;top:0;width:max-content;max-width:calc(100vw - 2.6rem);transform:translate(-50%,0);display:flex;flex-direction:column;align-items:center;text-align:center;opacity:0;visibility:hidden}
${S}[data-end="split"] .sz-end{left:auto;right:max(1.6rem,env(safe-area-inset-right));transform:none;align-items:flex-end;text-align:right;max-width:46vw}
${S} .sz-cta{display:inline-block;padding:.92em 1.9em;border-radius:999px;background:var(--paper);color:var(--ink);font-weight:600;font-size:clamp(15px,calc(var(--u)*33),21px);line-height:1.15;text-decoration:none;transition:background .2s,box-shadow .3s}
${S} .sz-cta:hover{background:#fff;box-shadow:0 0 0 6px rgba(244,234,216,.1)}
${S} .sz-cta{display:inline-flex;align-items:center;gap:.7em;padding-left:.75em}
${S} .sz-cta::before{content:"";width:1.7em;height:1.7em;border-radius:.42em;background:var(--logo) center/cover no-repeat;flex:none;box-shadow:0 2px 10px rgba(156,24,32,.35)}
${S} .sz-contact{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:0 2.2em;margin:clamp(6px,calc(var(--u)*18),16px) 0 0;font-size:clamp(13.5px,calc(var(--u)*28),18px);line-height:1.3}
${S}[data-end="split"] .sz-contact{justify-content:flex-end}
${S} .sz-grp{display:inline-flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:0 1.05em}
${S} .sz-k{color:rgba(244,234,216,.72)}
${S} .sz-contact a{display:inline-block;padding:1em 0;color:var(--paper);white-space:nowrap;font-variant-numeric:tabular-nums;text-decoration:underline;text-decoration-color:rgba(244,234,216,.28);text-decoration-thickness:1px;text-underline-offset:.3em;transition:text-decoration-color .2s,color .2s}
${S} .sz-contact a:hover{color:#fff;text-decoration-color:var(--brass)}
${S} .sz-reviews{margin:clamp(2px,calc(var(--u)*8),8px) 0 0;font-size:clamp(15px,calc(var(--u)*19),17px);line-height:1.5;color:rgba(244,234,216,.8)}
${S} .sz-reviews span{display:inline-block;max-width:100%;text-wrap:balance}
@media (hover:hover) and (pointer:fine){${S} .sz-contact a{padding:.5em 0}}
@media (prefers-reduced-motion:reduce){${S} .sz-panel,${S} .sz-panel.on,${S} .sz-star i{transition:none}}
`)('.scene-dom[data-scene="sazvezdje"]');

export default {
  id: 'sazvezdje', enterWith: 'tilt',
  beats: [
    { dur: 8.5, copy: ['sazvezdje.b1.h', 'sazvezdje.b1.p'] },
    { dur: 6, copy: ['sazvezdje.b2.h', 'sazvezdje.b2.p'] },
    { dur: 6, copy: ['sazvezdje.b3.h', 'sazvezdje.b3.p', 'sazvezdje.reviews'] },
  ],
  copy: {
    sr: {
      'sazvezdje.items1': '{n} artikal', 'sazvezdje.items2': '{n} artikla',
      'sazvezdje.star.vega': 'Vega, alfa Lire', 'sazvezdje.star.eps': 'Epsilon Lire, dvostruka dvojna zvezda', 'sazvezdje.star.zeta': 'Zeta Lire',
      'sazvezdje.star.delta': 'Delta Lire', 'sazvezdje.star.gamma': 'Sulafat, gama Lire', 'sazvezdje.star.beta': 'Šelijak, beta Lire',
      'sazvezdje.star.eta': 'Eta Lire', 'sazvezdje.star.theta': 'Teta Lire',
    },
    en: {
      'sazvezdje.items1': '{n} item', 'sazvezdje.items2': '{n} items',
      'sazvezdje.star.vega': 'Vega, Alpha Lyrae', 'sazvezdje.star.eps': 'Epsilon Lyrae, the Double Double', 'sazvezdje.star.zeta': 'Zeta Lyrae',
      'sazvezdje.star.delta': 'Delta Lyrae', 'sazvezdje.star.gamma': 'Sulafat, Gamma Lyrae', 'sazvezdje.star.beta': 'Sheliak, Beta Lyrae',
      'sazvezdje.star.eta': 'Eta Lyrae', 'sazvezdje.star.theta': 'Theta Lyrae',
    },
  },
  create(ctx) {
    const { THREE, gfx, view, util, ease } = ctx; const { clamp, lerp, damp, smoothstep, rng } = util;
    const N = FIG.length, cats = ctx.products.cats;
    const catOf = i => cats.find(c => c.id === FIG[i].cat) || cats[i % cats.length];
    const sky = FIG.map(f => gno(f.ra, f.dec));
    const xs = sky.map(p => p[0]), ys = sky.map(p => p[1]);
    const ANCH = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const HALF_W = (Math.max(...xs) - Math.min(...xs)) / 2, HALF_H = (Math.max(...ys) - Math.min(...ys)) / 2;
    const PHI_MAX = 5 * D2R, PHI_MID = PHI_MAX * .45;
    // Milky Way: the galactic equator is a straight line on a gnomonic chart
    const gA = gno(...galToEq(56, 3)), gB = gno(...galToEq(84, 3));
    let bt = [gB[0] - gA[0], gB[1] - gA[1]]; { const l = Math.hypot(bt[0], bt[1]); bt = [bt[0] / l, bt[1] / l]; }
    let bn = [-bt[1], bt[0]]; if ((ANCH[0] - gA[0]) * bn[0] + (ANCH[1] - gA[1]) * bn[1] < 0) bn = [-bn[0], -bn[1]];
    const bandAt = (x, y) => { const d = (x - gA[0]) * bn[0] + (y - gA[1]) * bn[1]; return Math.exp(-d * d / (2 * 8.5 * 8.5)); };

    // ---------- shared camera uniforms ----------
    const cam = { shade: new THREE.Vector4(0, 0, 1, 1), shadeA: 0, O: new THREE.Vector2(960, 540), A: new THREE.Vector2(ANCH[0], ANCH[1]), rot: new THREE.Vector2(1, 0), view: new THREE.Vector2(1920, 1080), S: 90, px: 1, hor: 2000 };
    const xfU = () => ({ uView: { value: cam.view }, uO: { value: cam.O }, uA: { value: cam.A }, uRot: { value: cam.rot }, uS: { value: 90 }, uPx: { value: 1 }, uHor: { value: 2000 }, uShade: { value: cam.shade }, uShadeA: { value: 0 } });
    const xfPass = () => ({ uView: cam.view, uO: cam.O, uA: cam.A, uRot: cam.rot, uS: 90, uPx: 1, uHor: 2000, uShade: cam.shade, uShadeA: 0 });
    const xfSet = u => { u.uS.value = cam.S; u.uPx.value = cam.px; u.uHor.value = cam.hor; u.uShadeA.value = cam.shadeA; };

    // ---------- targets + full-screen passes ----------
    const hdr = gfx.target({});
    const lo = gfx.target({ scale: .4, max: 820 });
    const skyLo = gfx.pass(XF + /* glsl */`
      uniform vec4 uBand; uniform float uGlow, uMW;
      void main(){
        vec2 su = vec2(vUv.x, 1. - vUv.y) * uView; vec2 p = toSky(su);
        vec2 rp = p - uBand.xy; float d = dot(rp, uBand.zw), a = dot(rp, vec2(uBand.w, -uBand.z));
        vec2 q = vec2(a, d);
        float w1 = fbm(q * vec2(.05, .085) + 3.1);
        float w2 = fbm(q * vec2(.13, .21) + vec2(11.3, 7.7) + w1 * 1.6);
        float w3 = fbm(q * vec2(.34, .46) + vec2(2.9, 31.) + w2);
        float dd = d + (w1 - .5) * 8.;
        float band = exp(-dd * dd / (2. * 7.2 * 7.2));
        float wide = exp(-d * d / (2. * 16. * 16.));
        float clouds = band * (.3 + 1.5 * w2 * w2) * (.72 + .56 * w3);
        float rc = (fbm(vec2(a * .06, 4.2)) - .5) * 7. - 3.4;
        float rw = 1.5 + 2.6 * fbm(vec2(a * .11, 9.));
        float rift = exp(-pow((d - rc) / rw, 2.)) * smoothstep(.3, .62, fbm(q * vec2(.1, .3) + 20.));
        float fil = smoothstep(.5, .74, fbm(q * vec2(.3, .55) + 40. + w1 * 2.));
        float I = clouds * (1. - .82 * rift) * (1. - .4 * fil);
        vec3 mw = mix(vec3(.52, .66, 1.), vec3(1., .95, .87), smoothstep(.2, 1., band * (.45 + w2))) * I * .074 + vec3(.42, .58, 1.) * wide * .007;
        float up = (uHor - su.y) / uView.y;                        // frame heights above the horizon
        float e = max(up, 0.);
        vec3 glow = vec3(1., .5, .16) * exp(-e / .07) * .46 + vec3(1., .58, .26) * exp(-e / .26) * .07
                  + vec3(.22, .5, .34) * exp(-pow((up - .34) / .17, 2.)) * .012;
        float dn = fbm(p * .16 + 5.) ; fragColor = vec4(mw * uMW + glow * uGlow, I * .9 + .12 + (dn - .5) * .75 + (w3 - .5) * .3);
      }`, { ...xfPass(), uBand: new THREE.Vector4(gA[0], gA[1], bn[0], bn[1]), uGlow: 1, uMW: 1 });
    const skyHi = gfx.pass(XF + /* glsl */`
      uniform sampler2D tLo; uniform float uQ;
      vec3 dust(vec2 p, float cell, float seed, float occ, float ppd, float gain){
        vec2 g = p / cell - .5, id0 = floor(g), f0 = fract(g); vec3 acc = vec3(0.);
        float sig = max(.6, .2 * sqrt(ppd * cell) * .3) / (ppd * cell), inv = 1. / (2. * sig * sig);
        for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
          vec2 o = vec2(float(i), float(j)), id = id0 + o;
          vec2 h = hash22(id + seed); float k = hash12(id * 1.31 + seed + 7.7);
          vec2 dv = f0 - o - h + .5; float e = exp(-dot(dv, dv) * inv);
          float b = pow(fract(k * 91.7), 7.), t = fract(k * 17.3);
          vec3 col = mix(vec3(1., .78, .56), vec3(.68, .8, 1.), smoothstep(.2, .8, t));
          acc += col * step(k, occ) * e * (.022 + .34 * b);
        }
        return acc * gain * smoothstep(2.4, 6., cell * ppd);
      }
      vec2 rt(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
      void main(){
        vec2 su = vec2(vUv.x, 1. - vUv.y) * uView; vec2 p = toSky(su);
        vec4 l = texture(tLo, vUv); vec3 c = l.rgb;
        float occ = clamp(.1 + 1.05 * l.a, 0.02, .9), ppd = uS * uPx;
        float up = (uHor - su.y) / uView.y, ext = smoothstep(0., .3, up);
        vec3 st = dust(rt(p, .6) + 31., .17, 19., occ * .85, ppd, 1.6) + dust(rt(p, 1.9) + 77., .31, 43., occ * .7, ppd, 2.6);
        if (uQ > .55) st += dust(p, .1, 0., occ, ppd, 1.);
        c += st * ext * mix(vec3(1., .7, .45), vec3(1.), smoothstep(.0, .5, up));
        c *= shade(su);
        fragColor = vec4(c, 1.);
      }`, { ...xfPass(), tLo: null, uQ: 1 });

    // ---------- background stars: points with gaussian profiles ----------
    const rnd = rng(1989);
    const stars = [];
    {
      const X0 = -34, X1 = 31, Y0 = -31, Y1 = 26, B = .46, M0 = 3.7, M1 = 9.7, e0 = Math.pow(10, B * M0), e1 = Math.pow(10, B * M1);
      const nearFig = (x, y) => { let m = 1e9; for (const p of sky) m = Math.min(m, Math.hypot(x - p[0], y - p[1])); return m; };
      const colour = m => { const r = rnd(); const bv = r < .3 ? -.15 + rnd() * .3 : r < .62 ? .2 + rnd() * .45 : r < .95 ? .75 + rnd() * .6 : 1.4 + rnd() * .3; return bvCol(m > 8 ? bv * .8 + .1 : bv); };
      let guard = 0;
      while (stars.length < 11200 && guard++ < 200000) {
        const x = lerp(X0, X1, rnd()), y = lerp(Y0, Y1, rnd());
        if (rnd() > .34 + .66 * bandAt(x, y)) continue;
        let m = Math.log10(e0 + rnd() * (e1 - e0)) / B;
        const df = nearFig(x, y), dc = Math.hypot(x - ANCH[0], y - ANCH[1]);
        if (df < .55 && m < 7.6) continue;
        if (dc < 6.5 && m < 5.9) m += 1.7;
        stars.push({ x, y, m, c: colour(m) });
      }
      for (let k = 0; k < 16; k++) { // loose open clusters, mostly in the band
        let cx, cy, tries = 0; do { cx = lerp(X0, X1, rnd()); cy = lerp(Y0, Y1, rnd()); } while (rnd() > bandAt(cx, cy) + .12 && tries++ < 40);
        if (Math.hypot(cx - ANCH[0], cy - ANCH[1]) < 6) continue;
        const n = 14 + Math.floor(rnd() * 34), r = .1 + rnd() * .32;
        for (let j = 0; j < n; j++) { const a = rnd() * 6.283, d = r * Math.sqrt(-2 * Math.log(1 - rnd() * .98)) * .7; stars.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, m: 7 + rnd() * 2.7, c: bvCol(-.1 + rnd() * .5) }); }
      }
      for (const s of NEIGH) { const p = gno(s[0], s[1]); stars.push({ x: p[0], y: p[1], m: s[2], c: bvCol(s[3]) }); }
      { const p = gno(hms(18, 53, 35), dm(33, 2)); stars.push({ x: p[0], y: p[1], m: 8.3, c: [.45, .95, .85] }); } // M57, the Ring: a tiny teal smudge between beta and gamma
      stars.sort((a, b) => a.m - b.m);
    }
    const NS = stars.length;
    const pts = new THREE.BufferGeometry();
    {
      const pos = new Float32Array(NS * 3), col = new Float32Array(NS * 3), sp = new Float32Array(NS * 2);
      stars.forEach((s, i) => {
        pos.set([s.x, s.y, rnd()], i * 3); col.set(s.c, i * 3);
        sp.set([.9 + .27 * Math.max(0, 7 - s.m), .6 * Math.pow(10, -.4 * (s.m - 6) * .62)], i * 2);
      });
      pts.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pts.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); pts.setAttribute('aSP', new THREE.BufferAttribute(sp, 2));
    }
    const ptsMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
      uniforms: { ...xfU(), uTime: { value: 0 }, uSc: { value: 1 }, uGain: { value: 1 } },
      vertexShader: XF + /* glsl */`
        in vec3 position; in vec3 aCol; in vec2 aSP; uniform float uTime, uSc, uGain;
        out vec3 vCol; out float vSig;
        void main(){
          vec2 su = toScreen(position.xy); float sd = position.z;
          float up = (uHor - su.y) / uView.y, ext = smoothstep(0., .3, up), low = clamp(1. - up * 1.15, 0., 1.);
          float tw = sin(uTime * (1.3 + 2.6 * fract(sd * 7.3)) + sd * 40.) * sin(uTime * (.7 + 1.9 * fract(sd * 3.1)) + sd * 17.);
          float sc = 1. + uSc * (.08 + .55 * low * low) * tw;
          float sig = aSP.x * uPx * (.8 + .2 * uGain), sg = max(sig, .72);
          float peak = aSP.y * sc * ext * (sig * sig) / (sg * sg) * uGain * shade(su);
          vCol = mix(aCol, aCol * vec3(1., .7, .42), low * low * .85) * peak; vSig = sg;
          gl_PointSize = 2. * (sg * 3.3 + 1.);
          gl_Position = toClip(su);
        }`,
      fragmentShader: /* glsl */`precision highp float; in vec3 vCol; in float vSig; out vec4 fragColor;
        void main(){ vec2 d = (gl_PointCoord - .5) * 2. * (vSig * 3.3 + 1.); float r2 = dot(d, d) / (vSig * vSig);
          fragColor = vec4(vCol * (exp(-.5 * r2) + .012 / (1. + r2 * .12)), 1.); }`,
    });
    const FAR = new THREE.Sphere(new THREE.Vector3(), 1e9);
    const points = new THREE.Points(pts, ptsMat); points.frustumCulled = false; pts.boundingSphere = FAR;

    // ---------- engraved lyre (old star-atlas manner): thin line quads in sky coordinates ----------
    // Drawn in a frame pinned to the stars: bridge = gamma..beta, yoke = delta..zeta, outer strings = the
    // figure's own long lines, right horn tip = epsilon. The frame is affine, i.e. the lyre is seen obliquely.
    const eng = new THREE.BufferGeometry();
    {
      const [ze, de, ga, be, ep] = [sky[2], sky[3], sky[4], sky[5], sky[1]];
      const Mb = [(be[0] + ga[0]) / 2, (be[1] + ga[1]) / 2], Mt = [(ze[0] + de[0]) / 2, (ze[1] + de[1]) / 2];
      const V = [Mt[0] - Mb[0], Mt[1] - Mb[1]], Ub = [(be[0] - ga[0]) / 2, (be[1] - ga[1]) / 2], Ut = [(ze[0] - de[0]) / 2, (ze[1] - de[1]) / 2];
      const H = Math.hypot(V[0], V[1]) / ((Math.hypot(Ub[0], Ub[1]) + Math.hypot(Ut[0], Ut[1])) / 2); // string length in half-widths
      const map = (X, Y) => { const v = Y / H, ux = Ub[0] + (Ut[0] - Ub[0]) * v, uy = Ub[1] + (Ut[1] - Ub[1]) * v; return [Mb[0] + v * V[0] + X * ux, Mb[1] + v * V[1] + X * uy]; };
      let eu = .6, ev = 1.5; // epsilon in the lyre frame
      for (let k = 0; k < 6; k++) { const ux = Ub[0] + (Ut[0] - Ub[0]) * ev, uy = Ub[1] + (Ut[1] - Ub[1]) * ev, rx = ep[0] - Mb[0], ry = ep[1] - Mb[1], det = ux * V[1] - V[0] * uy; eu = (rx * V[1] - V[0] * ry) / det; ev = (ux * ry - uy * rx) / det; }
      const tip = [eu, ev * H];
      const bez = (p0, p1, p2, p3, n = 22) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; o.push([m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]]); } return o; };
      const mir = pts_ => pts_.map(p => [-p[0], p[1]]);
      const strokes = []; const add = (p, w, o0, o1) => { strokes.push({ p, w, o0, o1 }); };
      // sound box: the tortoise shell, an egg a little wider at the bottom; the strings run over its face
      const CY = .36, shell = k => { const o = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.28319; o.push([1.74 * k * (1 + .09 * Math.cos(a)) * Math.sin(a), CY - 1.62 * k * Math.cos(a)]); } return o; };
      const box = shell(1), inner = shell(.87);
      add(box, 1, 0, .26); add(inner, .5, .14, .34);
      // arms: two horns rising from the shell, thick at the root, flaring to a point above the yoke
      const cl = [...bez([1.2, 1.5], [1.98, 2.25], [2.04, 3.5], [1.36, H - .12], 24), ...bez([1.36, H - .12], [1.2, H + .34], [1.3, H + .8], [1.66, H + 1.2], 14).slice(1)];
      const edge = sgn => cl.map((p, i) => { const a = cl[Math.max(0, i - 1)], b = cl[Math.min(cl.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const t = i / (cl.length - 1), th = (t < .64 ? lerp(.34, .2, t / .64) : lerp(.2, 0, Math.pow((t - .64) / .36, .85))) / 2; return [p[0] - ty * th * sgn, p[1] + tx * th * sgn]; });
      const eo = edge(1), ei = edge(-1);
      add(eo, 1, .22, .56); add(ei, 1, .24, .58); add(mir(eo), 1, .22, .56); add(mir(ei), 1, .24, .58);
      for (let i = 3; i < cl.length - 2; i += 2) { const a = eo[i], b = ei[i], f = i > 24 ? .7 : .42; const tk = [a, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]]; add(tk, .4, .58, .8); add(mir(tk), .4, .58, .8); } // horn rings
      // yoke with knobs and pegs, bridge, tailpiece, five inner strings (the two outer ones are the constellation's own lines)
      const yk = .08; add([[-1.78, H - yk], [1.78, H - yk]], .9, .54, .66); add([[-1.78, H + yk], [1.78, H + yk]], .9, .56, .68);
      for (const sg of [-1, 1]) { const c = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.2832; c.push([sg * 1.88 + Math.cos(a) * .11, H + Math.sin(a) * .11]); } add(c, .8, .64, .7); }
      for (let k = -3; k <= 3; k++) add([[k / 3, H + yk], [k / 3, H + yk + .2]], .6, .68, .76);
      add([[-1.16, -.05], [1.16, -.05]], .7, .5, .6); add([[-1.16, .05], [1.16, .05]], .7, .52, .62);
      for (let k = -2; k <= 2; k++) add([[k / 3, .05], [k / 3, H - yk]], .5, .66 + (k + 2) * .03, .82 + (k + 2) * .03);
      for (let k = -3; k <= 3; k++) add([[k / 3, -.05], [k * .05, -.92]], .42, .74, .84);
      { const c = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.2832; c.push([Math.cos(a) * .17, -1.0 + Math.sin(a) * .09]); } add(c, .6, .8, .86); }
      // hatching in the shadow crescent of the shell
      const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const hx = Math.cos(-.7), hy = Math.sin(-.7);
      for (let k = 0; k < 34; k++) { const o = -2.3 + k * .1; let run = null; for (let i = 0; i <= 120; i++) { const t = -3 + i * .05, x = -hy * o + hx * t - .3, y = hx * o + hy * t + .2; const ok = (x < -.5 || y < -.55) && x < .9 && inside(box, x, y) && !inside(inner, x, y); if (ok && !run) run = [x, y]; if ((!ok || i === 120) && run) { if (Math.hypot(x - run[0], y - run[1]) > .08) add([run, [x - hx * .05, y - hy * .05]], .3, .8 + k * .004, .92 + k * .002); run = null; } } }
      let nseg = 0; for (const s of strokes) nseg += s.p.length - 1;
      const A = new Float32Array(nseg * 8), Bb = new Float32Array(nseg * 8), cr = new Float32Array(nseg * 8), wo = new Float32Array(nseg * 8), idx = new Uint16Array(nseg * 6); let q = 0;
      for (const s of strokes) for (let i = 0; i < s.p.length - 1; i++) {
        const a = map(s.p[i][0], s.p[i][1]), b = map(s.p[i + 1][0], s.p[i + 1][1]), o = lerp(s.o0, s.o1, i / Math.max(1, s.p.length - 2));
        for (let v = 0; v < 4; v++) { A.set(a, q * 8 + v * 2); Bb.set(b, q * 8 + v * 2); wo.set([s.w, o], q * 8 + v * 2); }
        cr.set([0, -1, 1, -1, 1, 1, 0, 1], q * 8); idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6); q++;
      }
      eng.setAttribute('position', new THREE.BufferAttribute(cr, 2)); eng.setAttribute('aA', new THREE.BufferAttribute(A, 2)); eng.setAttribute('aB', new THREE.BufferAttribute(Bb, 2)); eng.setAttribute('aWO', new THREE.BufferAttribute(wo, 2)); eng.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    const engMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { ...xfU(), uReveal: { value: 0 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Vector3(...hexLin('#c7a57a')) } },
      vertexShader: XF + /* glsl */`
        in vec2 position, aA, aB, aWO; uniform float uReveal; out float vV, vW;
        void main(){ vec2 A = toScreen(aA), B = toScreen(aB), d = B - A; float len = max(length(d), 1e-4); vec2 t = d / len, n = vec2(-t.y, t.x);
          float pad = 2.2 / uPx + .4;
          vec2 p = mix(A - t * .3 / uPx, B + t * .3 / uPx, position.x) + n * position.y * pad;
          vV = position.y * pad; vW = aWO.x * clamp((uReveal * 1.18 - aWO.y) / .18, 0., 1.);
          gl_Position = toClip(p); }`,
      fragmentShader: /* glsl */`precision highp float; uniform float uPx, uAlpha; uniform vec3 uCol; in float vV, vW; out vec4 fragColor;
        void main(){ float aa = 1. / uPx, hw = .5 * aa + .18; float c = 1. - smoothstep(hw - aa * .6, hw + aa * .6, abs(vV));
          fragColor = vec4(uCol * c * vW * uAlpha, 1.); }`,
    });
    const engMesh = new THREE.Mesh(eng, engMat); engMesh.frustumCulled = false; eng.boundingSphere = FAR;

    // ---------- lines (figure, leader ticks, meteor): a small dynamic mesh in design units ----------
    const NL = LINES.length + N + 1, lg = new THREE.BufferGeometry();
    const lA = new Float32Array(NL * 8), lB = new Float32Array(NL * 8), lP = new Float32Array(NL * 16), lC = new Float32Array(NL * 12);
    {
      const cr = new Float32Array(NL * 8), idx = new Uint16Array(NL * 6);
      for (let q = 0; q < NL; q++) { cr.set([0, -1, 1, -1, 1, 1, 0, 1], q * 8); idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6); }
      lg.setAttribute('position', new THREE.BufferAttribute(cr, 2)); lg.setIndex(new THREE.BufferAttribute(idx, 1));
      for (const [n, a, sz] of [['aA', lA, 2], ['aB', lB, 2], ['aP', lP, 4], ['aCol', lC, 3]]) { const at = new THREE.BufferAttribute(a, sz); at.setUsage(THREE.DynamicDrawUsage); lg.setAttribute(n, at); }
    }
    const setLine = (q, ax, ay, bx, by, prog, alpha, mode, head, c) => {
      for (let v = 0; v < 4; v++) { lA[q * 8 + v * 2] = ax; lA[q * 8 + v * 2 + 1] = ay; lB[q * 8 + v * 2] = bx; lB[q * 8 + v * 2 + 1] = by; lP.set([prog, alpha, mode, head], q * 16 + v * 4); lC.set(c, q * 12 + v * 3); }
    };
    const lineMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uView: { value: cam.view }, uPx: { value: 1 } },
      vertexShader: /* glsl */`
        in vec2 position, aA, aB; in vec4 aP; in vec3 aCol; uniform vec2 uView;
        out vec2 vL; out float vLen; out vec4 vP; out vec3 vCol;
        void main(){ vec2 d = aB - aA; float len = max(length(d), 1e-3); vec2 t = d / len, n = vec2(-t.y, t.x); const float PAD = 13.;
          float al = mix(-PAD, len + PAD, position.x); vec2 p = aA + t * al + n * position.y * PAD;
          vL = vec2(al, position.y * PAD); vLen = len; vP = aP; vCol = aCol;
          gl_Position = vec4(p.x / uView.x * 2. - 1., 1. - p.y / uView.y * 2., 0., 1.); }`,
      fragmentShader: /* glsl */`precision highp float; uniform float uPx; in vec2 vL; in float vLen; in vec4 vP; in vec3 vCol; out vec4 fragColor;
        void main(){
          float prog = vP.x, alpha = vP.y, mode = vP.z, head = vP.w; if (alpha <= 0.) discard;
          float u = vL.x, v = abs(vL.y), end = vLen * prog, aa = 1. / uPx;
          float hw = .55 * aa + .3;
          float core = 1. - smoothstep(hw - aa * .6, hw + aa * .6, v);
          float glow = exp(-v * v / (2. * 3.4 * 3.4));
          float m = smoothstep(-aa, aa, u) * (1. - smoothstep(end - aa, end + aa, u));
          vec3 c;
          if (mode < 0.) {                                           // meteor: taper from tail to head
            float t = clamp(u / vLen, 0., 1.); float tp = pow(t, 1.7);
            float hd = exp(-pow((u - vLen) / 5., 2.)) * exp(-v * v / (2. * 1.6 * 1.6));
            c = vCol * ((core + glow * .12) * tp * m + hd * 1.1) * alpha;
          } else {
            float on = 1.;
            if (mode > 0.) { float f = abs(fract(u / mode) - .5), e = aa / mode; on = 1. - smoothstep(.16 - e, .16 + e, f); }
            float I = (core + glow * .13) * m * on * alpha;
            float trail = exp(-max(end - u, 0.) / 80.) * m * (core + glow * .3) * head;
            float hd = exp(-pow((u - end) / 8., 2.)) * exp(-v * v / (2. * 2.4 * 2.4)) * head;
            c = vCol * (I + trail * 1.2) + mix(vCol, vec3(1.), .6) * hd * 3.2;
          }
          fragColor = vec4(c, 1.); }`,
    });
    const lineMesh = new THREE.Mesh(lg, lineMat); lineMesh.frustumCulled = false; lg.boundingSphere = FAR;

    // ---------- Lyra's own stars: instanced quads (core, wings, Vega's spikes) ----------
    const NI = N + 1, sg = new THREE.InstancedBufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2)); sg.setIndex([0, 1, 2, 0, 2, 3]);
    const iC = new Float32Array(NI * 2), iR = new Float32Array(NI * 3), iCol = new Float32Array(NI * 3), iX = new Float32Array(NI * 2);
    for (const [n, a, sz] of [['iC', iC, 2], ['iR', iR, 3], ['iCol', iCol, 3], ['iX', iX, 2]]) { const at = new THREE.InstancedBufferAttribute(a, sz); at.setUsage(THREE.DynamicDrawUsage); sg.setAttribute(n, at); }
    sg.instanceCount = NI;
    const starMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uView: { value: cam.view }, uPx: { value: 1 }, uTime: { value: 0 } },
      vertexShader: /* glsl */`
        in vec2 position, iC, iX; in vec3 iR, iCol; uniform vec2 uView;
        out vec2 vP, vX; out vec3 vR, vCol;
        void main(){ vec2 p = iC + position * iR.z; vP = position * iR.z; vR = iR; vCol = iCol; vX = iX;
          gl_Position = vec4(p.x / uView.x * 2. - 1., 1. - p.y / uView.y * 2., 0., 1.); }`,
      fragmentShader: /* glsl */`precision highp float; uniform float uPx, uTime; in vec2 vP, vX; in vec3 vR, vCol; out vec4 fragColor;
        void main(){
          float R = vR.x, I = vR.y, E = vR.z; float d = length(vP), r = d / R;
          float core = exp(-.5 * r * r);
          float wings = .055 / pow(1. + r * r * .16, 1.55);
          float sp = 0.;
          if (vX.x > 0.) {
            vec2 a = abs(vP); float sw = max(.6 / uPx, R * .085), br = 1. + .12 * sin(uTime * .7 + vX.y);
            float l1 = exp(-a.y * a.y / (2. * sw * sw)) / (1. + pow(a.x / (R * 2.7 * br), 1.75));
            float l2 = exp(-a.x * a.x / (2. * sw * sw)) / (1. + pow(a.y / (R * 2.7 / br), 1.75));
            sp = (l1 + l2) * .3 * vX.x;
          }
          float win = 1. - smoothstep(.55, 1., d / E);
          vec3 c = (mix(vCol, vec3(1.), .6) * core + vCol * (wings + sp)) * I * win;
          fragColor = vec4(c, 1.); }`,
    });
    const starMesh = new THREE.Mesh(sg, starMat); starMesh.frustumCulled = false; sg.boundingSphere = FAR;

    const world = new THREE.Scene(); world.add(points, engMesh, lineMesh, starMesh);
    const dummyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ---------- in-canvas type ----------
    const ui = ctx.overlay();
    const PAPER = '#f4ead8', DIM = '#b5a993', BRASS = '#d8a548';
    const h1 = ui.text('sazvezdje.b1.h', { size: 118, font: 'display', color: PAPER, width: 760, leading: 1.04, tracking: -.012 });
    const p1 = ui.text('sazvezdje.b1.p', { size: 38, font: 'text', color: DIM, width: 600, leading: 1.42 });
    const h2 = ui.text('sazvezdje.b2.h', { size: 96, font: 'display', color: PAPER, width: 700, leading: 1.05, tracking: -.012 });
    const p2 = ui.text('sazvezdje.b2.p', { size: 42, font: 'displayItalic', color: BRASS, width: 600, leading: 1.3 });
    const h3 = ui.text('sazvezdje.b3.h', { size: 128, font: 'display', color: PAPER, align: 'center', width: 1500, leading: 1.04, tracking: -.014 });
    const p3 = ui.text('', { size: 34, font: 'text', color: PAPER, align: 'center', leading: 1.46 });
    const catName = i => { const c = catOf(i); return c[ctx.lang()] || c.sr; };
    const labels = FIG.map((f, i) => ui.text(catName(i), { size: 34, font: 'display', color: PAPER, leading: 1.1 }));
    const mcache = new Map();
    const measure = (src, o) => { const k = ctx.lang() + '|' + src + '|' + JSON.stringify(o) + '|' + view.scale.toFixed(3); let r = mcache.get(k); if (!r) { r = ui.measure(src, o); mcache.set(k, r); if (mcache.size > 400) mcache.clear(); } return r; };
    // balanced line breaks: the narrowest wrap width that keeps the fewest lines (no orphans, no ragged headline)
    const mctx = document.createElement('canvas').getContext('2d');
    const FONT = { display: '400 Xpx "Fraunces", Georgia, serif', displayItalic: 'italic 400 Xpx "Fraunces", Georgia, serif', text: '400 Xpx "Instrument Sans", system-ui, sans-serif' };
    const effSize = size => { const u = view.cssW / view.w, floor = (size >= 33 ? 15 : 12) / u; return size < 60 ? Math.max(size, Math.min(floor, size * 1.3)) : size; }; // mirrors the text engine
    function breakLines(src, role, size, tracking, maxW) { // -> { lines, w } or null when a single word is wider than maxW
      const rs = Math.min(view.scale, 3), px = Math.max(6, effSize(size) * rs); mctx.font = FONT[role].replace('X', px); if ('letterSpacing' in mctx) mctx.letterSpacing = (tracking * px) + 'px';
      const sp = mctx.measureText(' ').width / rs, lines = []; let wmax = 0;
      for (const para of String(ctx.t(src)).split('\n')) {
        const words = para.split(' ').filter(Boolean), ws = words.map(x => mctx.measureText(x).width / rs), n = ws.length; if (!n) continue;
        if (Math.max(...ws) > maxW) return null;
        const width = (i, j) => { let t = 0; for (let k = i; k < j; k++) t += ws[k] + (k > i ? sp : 0); return t; };
        let best = null;
        for (let L = 1; L <= n && !best; L++) { // fewest lines first; among those, the smallest longest line
          const rec = (i, left) => { if (left === 1) return { m: width(i, n), cut: [] }; let b = { m: 1e9, cut: [] }; for (let j = i + 1; j <= n - left + 1; j++) { const a = width(i, j); if (a > maxW) break; const r = rec(j, left - 1), m = Math.max(a, r.m); if (m < b.m) b = { m, cut: [j, ...r.cut] }; } return b; };
          const r = rec(0, L); if (r.m <= maxW) best = r;
        }
        if (!best) { lines.push(para); wmax = Math.max(wmax, maxW); continue; }
        const cuts = [0, ...best.cut, n]; for (let k = 0; k < cuts.length - 1; k++) lines.push(words.slice(cuts[k], cuts[k + 1]).join(' '));
        wmax = Math.max(wmax, best.m);
      }
      return { lines, w: wmax };
    }
    const balance = (src, role, size, tracking, maxW) => { const r = breakLines(src, role, size, tracking, maxW); return r ? Math.min(maxW, r.w * 1.012 + 6) : 0; };
    const mixHex = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), ch = sh => Math.round(lerp(A >> sh & 255, B >> sh & 255, clamp(t))); return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); };

    // ---------- DOM: star buttons, department panel, end card ----------
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const canvas = gfx.renderer.domElement;
    const safeUrl = u => /^https:\/\/lyrastyle\.rs\//.test(u || '') ? u : ctx.site.shop;
    const ext = (a, href) => { a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
    const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ctx.lang() === 'en' ? ',' : '.');
    const countText = n => {
      let k = 'sazvezdje.items'; const a = n % 10, b = n % 100;
      if (ctx.lang() === 'en') { if (n === 1) k = 'sazvezdje.items1'; }
      else if (a === 1 && b !== 11) k = 'sazvezdje.items1'; else if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) k = 'sazvezdje.items2';
      return ctx.t(k, { n: fmt(n) });
    };
    const dom = ctx.dom('sazvezdje');
    { const st = document.createElement('style'); st.textContent = CSS; dom.append(st); }
    const starsEl = el('div', 'sz-stars'); starsEl.setAttribute('role', 'group');
    const panel = el('section', 'sz-panel'); panel.id = 'sz-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.inert = true;
    const pHead = el('header', 'sz-head'), pHeadL = el('div'), pStar = el('p', 'sz-starname'), pTitle = el('h2', 'sz-title'), pCount = el('p', 'sz-count'), pClose = el('button', 'sz-close');
    pTitle.id = 'sz-title'; pTitle.tabIndex = -1; pClose.type = 'button';
    const pBody = el('div', 'sz-body'), pList = el('ul', 'sz-list'), pFoot = el('div', 'sz-foot'), pAll = ext(el('a', 'sz-all'), ctx.site.shop), pNote = el('p', 'sz-note');
    pList.lang = 'sr'; pHeadL.append(pStar, pTitle, pCount); pHead.append(pHeadL, pClose); pBody.append(pList); pFoot.append(pAll, pNote); panel.append(pHead, pBody, pFoot);
    const endEl = el('div', 'sz-end'); endEl.inert = true; endEl.setAttribute('role', 'group');
    const eCta = ext(el('a', 'sz-cta'), safeUrl(ctx.site.shop)), eContact = el('p', 'sz-contact'), eRev = el('p', 'sz-reviews');
    const gPh = el('span', 'sz-grp'), kPh = el('span', 'sz-k'), gMl = el('span', 'sz-grp'), kMl = el('span', 'sz-k');
    const tel = n => { const a = el('a', '', n); a.href = 'tel:' + n.replace(/[^+\d]/g, ''); return a; };
    const aMail = el('a', '', ctx.site.email); aMail.href = 'mailto:' + ctx.site.email;
    gPh.append(kPh, tel(ctx.site.phone1), tel(ctx.site.phone2)); gMl.append(kMl, aMail); eContact.append(gPh, gMl); endEl.append(eCta, eContact, eRev);

    let addrBase = '';
    let open = -1, hoverB = -1, hoverL = -1, focusI = -1, lastBeat = 0, snap = true, openK = 0, endH = 0, starsLive = null, endLive = null;
    const hov = new Float32Array(N), vis = new Float32Array(N), labBox = FIG.map(() => ({ x: 0, y: 0, w: 0, h: 0, a: 0 }));
    const pitchOf = i => BELL[[0, 2, 3, 4, 6, 5, 7, 8][i] % BELL.length];
    const btns = FIG.map((f, i) => {
      const b = el('button', 'sz-star'); b.type = 'button'; b.append(el('i')); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'sz-panel'); b.tabIndex = -1;
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && hoverB !== i) { hoverB = i; if (open !== i) ctx.sfx('select', { gain: .28, pitch: pitchOf(i) * .75 }); } });
      b.addEventListener('pointerleave', () => { if (hoverB === i) hoverB = -1; });
      b.addEventListener('focus', () => { let fv = true; try { fv = b.matches(':focus-visible'); } catch (e) { /* old engines */ } if (fv) { if (focusI !== i && open !== i) ctx.sfx('select', { gain: .28, pitch: pitchOf(i) * .75 }); focusI = i; } });
      b.addEventListener('blur', () => { if (focusI === i) focusI = -1; });
      b.addEventListener('click', () => { if (open === i) closePanel(true); else openPanel(i); });
      return b;
    });
    FIG.map((f, i) => i).sort((a, b) => FIG[a].mag - FIG[b].mag || a - b).forEach(i => starsEl.append(btns[i])); // tab order: brightest first
    dom.append(starsEl, endEl, panel);

    function fillPanel(i) {
      const c = catOf(i);
      pStar.textContent = ctx.t('sazvezdje.star.' + FIG[i].id); pTitle.textContent = catName(i); pCount.textContent = countText(c.count);
      panel.setAttribute('aria-label', catName(i) + ', ' + countText(c.count));
      pClose.textContent = ctx.t('sazvezdje.close');
      pList.textContent = '';
      for (const it of c.items || []) {
        const li = el('li'), a = ext(el('a', 'sz-item'), safeUrl(it.url));
        let name = it.name || ''; const br = it.brand || '';
        if (br && name.toLowerCase().startsWith(br.toLowerCase() + ' ')) name = name.slice(br.length + 1);
        a.append(el('span', 'sz-brand', br), ' ', el('span', 'sz-name', name), ' ', el('span', 'sz-price', fmt(it.price) + '\u00a0RSD'));
        li.append(a); pList.append(li);
      }
      pAll.href = safeUrl(c.url); pAll.textContent = ctx.t('sazvezdje.all'); pNote.textContent = ctx.t('sazvezdje.note');
    }
    function openPanel(i) {
      if (lastBeat !== 1) return;
      open = i; fillPanel(i); pBody.scrollTop = 0;
      panel.inert = false; panel.classList.add('on');
      btns.forEach((b, j) => b.setAttribute('aria-expanded', String(j === i)));
      ctx.sfx('select', { gain: .5 }); ctx.sfx('bell', { gain: .5, pitch: pitchOf(i) });
      const f = () => { if (open === i) { try { pTitle.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } };
      f(); requestAnimationFrame(f);
    }
    function closePanel(refocus) {
      const i = open; if (i < 0) return; open = -1;
      const had = panel.contains(document.activeElement);
      panel.classList.remove('on'); panel.inert = true; btns.forEach(b => b.setAttribute('aria-expanded', 'false'));
      ctx.sfx('tick', { gain: .3 });
      if (refocus && starsLive) { try { btns[i].focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      else if (had) { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
    pClose.addEventListener('click', () => closePanel(true));
    panel.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll('button, a[href]')]; if (!f.length) return;
        const first = f[0], last = f[f.length - 1], act = document.activeElement;
        if (e.shiftKey && (act === first || act === pTitle)) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && act === last) { first.focus(); e.preventDefault(); }
        return;
      }
      const tag = (e.target.tagName || '').toLowerCase(), ctl = tag === 'a' || tag === 'button';
      // let the list scroll with the keyboard instead of stepping the story
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key) || ((e.key === ' ' || e.key === 'Enter') && !ctl)) e.stopPropagation();
    });
    function relabel() {
      starsEl.setAttribute('aria-label', ctx.t('sazvezdje.b2.h'));
      FIG.forEach((f, i) => { btns[i].setAttribute('aria-label', catName(i) + ', ' + countText(catOf(i).count)); labels[i].set(catName(i)); });
      eCta.textContent = ctx.t('sazvezdje.cta'); kPh.textContent = ctx.t('sazvezdje.phone'); kMl.textContent = ctx.t('sazvezdje.mail');
      eRev.textContent = ''; for (const part of ctx.t('sazvezdje.reviews').split(/(?<=[.!?])\s+/)) { eRev.append(el('span', '', part), ' '); }
      addrBase = ctx.t('sazvezdje.b3.p').split('\n').map(x => x.replace(/([.!?])\s+(?=\S)/g, '$1\n')).join('\n'); // one sentence per line, then balanced in compose()
      panel.setAttribute('aria-label', open >= 0 ? catName(open) + ', ' + countText(catOf(open).count) : ctx.t('sazvezdje.b2.h')); endEl.setAttribute('aria-label', ctx.t('sazvezdje.b3.h'));
      if (open >= 0) fillPanel(open);
      C = null;
    }

    // ---------- composition: poses, text blocks, label layout (pure functions of the view) ----------
    let C = null;
    const starAt = (pose, i, phi = PHI_MID) => { const dx = sky[i][0] - ANCH[0], dy = sky[i][1] - ANCH[1], c = Math.cos(phi), s = Math.sin(phi); return [pose.x + pose.S * (c * dx - s * dy), pose.y - pose.S * (s * dx + c * dy)]; };
    const starScale = S => Math.pow(clamp(S / 90, .3, 1.25), .7);
    function solve(pose, sizes, B, obstacles) {
      const P = FIG.map((f, i) => starAt(pose, i)), k = starScale(pose.S), rad = FIG.map(f => f.R * k * 3 + (f.spike ? 8 : 4));
      const rectHit = (a, b, pad) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
      const segs = LINES.map(l => [P[l[0]], P[l[1]]]);
      const cands = P.map((p, i) => {
        const { w, h } = sizes[i], out = [], cx = pose.x, cy = pose.y; let ox = p[0] - cx, oy = p[1] - cy; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
        const push = (x, y, align, dx, dy, pref) => {
          const b = { x, y, w, h, align, dx: x - p[0], dy: y - p[1] }; let c = pref + (1 - (dx * ox + dy * oy)) * 2.2;
          const ovx = Math.max(0, B.x0 - x) + Math.max(0, x + w - B.x1), ovy = Math.max(0, B.y0 - y) + Math.max(0, y + h - B.y1); let hard = 0;
          if (ovx + ovy > 0) hard += 60 + (ovx + ovy) * 2;
          for (const o of obstacles) if (rectHit(b, o, 18)) hard += 80;
          for (let j = 0; j < N; j++) { if (j === i) continue; const qx = clamp(P[j][0], x, x + w), qy = clamp(P[j][1], y, y + h); if (Math.hypot(P[j][0] - qx, P[j][1] - qy) < rad[j] + 14) hard += 70; }
          for (const sgm of segs) { let hit = 0; for (let t = 0; t <= 24; t++) { const sx = lerp(sgm[0][0], sgm[1][0], t / 24), sy = lerp(sgm[0][1], sgm[1][1], t / 24); if (sx > x - 9 && sx < x + w + 9 && sy > y - 7 && sy < y + h + 7) hit++; } if (hit) hard += 44 + hit * 6; }
          b.cost = c; b.hard = hard; out.push(b);
        };
        for (const g of [rad[i] + 30, rad[i] + 56, rad[i] + 88]) {
          const g7 = g * .74;
          const far = (g - rad[i] - 30) * .05;
          push(p[0] + g, p[1] - h * .52, 'left', 1, 0, far); push(p[0] - g - w, p[1] - h * .52, 'right', -1, 0, .6 + far);
          push(p[0] + g7, p[1] - g7 - h * .8, 'left', .7, -.7, 1.4 + far); push(p[0] - g7 - w, p[1] - g7 - h * .8, 'right', -.7, -.7, 1.6 + far);
          push(p[0] + g7, p[1] + g7 - h * .2, 'left', .7, .7, 1.4 + far); push(p[0] - g7 - w, p[1] + g7 - h * .2, 'right', -.7, .7, 1.6 + far);
          push(p[0] - w / 2, p[1] - g - h + 4, 'center', 0, -1, 2.2 + far); push(p[0] - w / 2, p[1] + g - 4, 'center', 0, 1, 2.2 + far);
          push(p[0] - w * .18, p[1] - g - h + 4, 'left', .3, -1, 2.6 + far); push(p[0] - w * .82, p[1] - g - h + 4, 'right', -.3, -1, 2.6 + far);
          push(p[0] - w * .18, p[1] + g - 4, 'left', .3, 1, 2.6 + far); push(p[0] - w * .82, p[1] + g - 4, 'right', -.3, 1, 2.6 + far);
        }
        return out;
      });
      const pick = cands.map(cs => cs.reduce((a, b) => (b.cost + b.hard < a.cost + a.hard ? b : a)));
      const pair = (a, b) => rectHit(a, b, 16) ? 90 : 0;
      for (let sweep = 0; sweep < 14; sweep++) {
        let changed = false;
        for (let i = 0; i < N; i++) {
          let best = null, bc = 1e9;
          for (const c of cands[i]) { let t = c.cost + c.hard; for (let j = 0; j < N; j++) if (j !== i) t += pair(c, pick[j]); if (t < bc - 1e-6) { bc = t; best = c; } }
          if (best !== pick[i]) { pick[i] = best; changed = true; }
        }
        if (!changed) break;
      }
      let clean = true; for (let i = 0; i < N; i++) { if (pick[i].hard > 0) clean = false; for (let j = i + 1; j < N; j++) if (pair(pick[i], pick[j])) clean = false; }
      return { off: pick.map(b => ({ dx: b.dx, dy: b.dy, w: b.w, h: b.h, align: b.align })), clean };
    }
    function compose() {
      const key = [Math.round(view.w), Math.round(view.h), ctx.lang(), Math.round(view.cssW), Math.round(endH), view.scale.toFixed(3), Math.round(view.safeTop), Math.round(view.safeBottom)].join(':');
      if (C && C.key === key) return C;
      const w = view.w, h = view.h, portrait = view.portrait, u = view.cssW / w, FW = HALF_W * 2, FH = HALF_H * 2;
      const sT = view.safeTop || 110, sB = view.safeBottom || 130, sS = view.safeSide || 90; // all type stays inside these
      const sheet = portrait || view.cssW < 760, narrow = view.cssW <= 640;
      const top = sT + 14, bot = h - sB - 20;
      const c = { key, sheet, portrait, top, bot, u, split: false };
      const fitHead = (T, kkey, sizes, maxW, base) => { // largest size that sets in three lines or fewer
        let pick = sizes[sizes.length - 1], bw = maxW, bl = 99;
        for (const sz of sizes) { const r = breakLines(kkey, 'display', sz, base.tracking || 0, maxW); if (r && r.lines.length < bl) { pick = sz; bw = Math.min(maxW, r.w * 1.012 + 6); bl = r.lines.length; if (bl <= 3) break; } }
        T.size = pick; T.wrap = Math.round(bw); return measure(kkey, { ...base, size: pick, width: T.wrap }); };
      const labSize = portrait ? 42 : 34, labWrap = portrait ? 380 : 400;
      const sizes = FIG.map((f, i) => { const o = { size: labSize, font: 'display', leading: 1.1 }; let m = measure(catName(i), o), wrap = 0; if (m.w > labWrap) { wrap = Math.round(labWrap * .82 * effSize(labSize) / labSize); m = measure(catName(i), { ...o, width: wrap }); } labels[i].size = labSize; labels[i].wrap = wrap; return { w: m.w, h: m.h }; });
      const HB = { font: 'display', leading: 1.04, tracking: -.012 };
      if (!portrait) {
        const x0 = Math.max(sS + 20, w * .072);
        const S0 = Math.min(92, w * .5 / FW, (bot - top - 70) / (FH + .7));
        c.p0 = { S: S0, x: w * .645, y: (top + bot) / 2 + 3 };
        const tight = clamp((1.62 - w / h) / .3); // 4:3 and narrower: pull the figure in so labels have a right margin
        c.p1 = { S: S0 * lerp(1.03, .9, tight), x: w * lerp(.615, .556, tight), y: c.p0.y };
        const gx0 = c.p0.x + (sky[4][0] - ANCH[0]) * S0 - 150, gx1 = c.p1.x + (sky[4][0] - ANCH[0]) * c.p1.S - 150;
        const m1 = fitHead(h1, 'sazvezdje.b1.h', [118, 108, 100, 96], Math.min(760, gx0 - x0), HB);
        p1.wrap = Math.round(balance('sazvezdje.b1.p', 'text', 38, 0, Math.min(740, gx0 - x0)) || 600); const mp1 = measure('sazvezdje.b1.p', { size: 38, font: 'text', leading: 1.42, width: p1.wrap });
        c.t1 = { x: x0, y: bot - mp1.h - 30 - m1.h }; c.tp1 = { x: x0 + 4, y: bot - mp1.h };
        const m2 = fitHead(h2, 'sazvezdje.b2.h', [100, 96], Math.min(760, gx1 - x0), HB);
        const mp2 = measure('sazvezdje.b2.p', { size: 42, font: 'displayItalic', leading: 1.3, width: 600 });
        c.t2 = { x: x0, y: bot - mp2.h - 22 - m2.h }; c.tp2 = { x: x0 + 3, y: bot - mp2.h };
        c.obst1 = [{ x: x0, y: c.t2.y, w: Math.max(m2.w, mp2.w), h: bot - c.t2.y }];
        c.B1 = { x0: sS, x1: w - sS, y0: sT + 6, y1: h - sB + 4 };
        if (sheet) { const ah = h * .3; c.pO = { S: Math.min(c.p1.S, (ah - 190) / FH), x: w / 2, y: 110 + (ah - 110) / 2 - 16 }; c.BO = { x0: sS, x1: w - sS, y0: sT, y1: ah }; }
        else { const aw = w - (440 + 23 + 26) / u; c.pO = { S: Math.min(c.p1.S, (aw - 300) / FW, (bot - top - 60) / (FH + .7)), x: aw / 2 + 24, y: c.p0.y }; c.BO = { x0: sS, x1: aw - 20, y0: top, y1: bot }; }
        c.tiltD = h * .035; c.hor0 = h * 1.2;
        c.sh1 = { x: x0 + 300, y: bot - 140, rx: 640, ry: 330, a: .4 };
      } else {
        const tx = sS + 2, ty = sT + 34;
        const m1 = fitHead(h1, 'sazvezdje.b1.h', [108, 100, 96], w - 2 * sS, HB);
        p1.size = 44; p1.wrap = Math.round(balance('sazvezdje.b1.p', 'text', 44, 0, w - 2 * sS - 10) || 860); const mp1 = measure('sazvezdje.b1.p', { size: 44, font: 'text', leading: 1.42, width: p1.wrap });
        c.t1 = { x: tx, y: ty }; c.tp1 = { x: tx + 3, y: ty + m1.h + 34 };
        const f0 = c.tp1.y + mp1.h + 70, S0 = Math.min(108, 880 / FW, (bot - f0 - 60) / (FH + .4));
        c.p0 = { S: S0, x: 540, y: f0 + (bot - f0) / 2 - 10 };
        const m2 = fitHead(h2, 'sazvezdje.b2.h', [100, 96], w - 2 * sS, HB);
        p2.size = 46; const mp2 = measure('sazvezdje.b2.p', { size: 46, font: 'displayItalic', leading: 1.3, width: 600 });
        c.t2 = { x: tx, y: ty }; c.tp2 = { x: tx + 2, y: ty + m2.h + 24 };
        const f1 = c.tp2.y + mp2.h + 120, S1 = Math.min(98, 800 / FW, (bot - f1 - 130) / (FH + .2));
        c.p1 = { S: S1, x: 548, y: f1 + (bot - f1) / 2 - 20 };
        c.obst1 = [{ x: tx, y: ty, w: Math.max(m2.w, mp2.w), h: c.tp2.y + mp2.h - ty }];
        c.B1 = { x0: sS - 20, x1: w - sS + 20, y0: c.tp2.y + mp2.h + 30, y1: h - sB };
        const ah = h * .3; c.pO = { S: Math.min(S1, (ah - 250) / FH), x: 540, y: 120 + (ah - 120) / 2 - 22 }; c.BO = { x0: sS - 30, x1: w - sS + 30, y0: sT, y1: ah - 6 };
        c.tiltD = h * .025; c.hor0 = h * 1.13;
        c.sh1 = { x: 500, y: ty + 170, rx: 700, ry: 360, a: .4 };
      }
      // end card: one centred stack; the constellation takes whatever height the words leave
      {
        const dH = (endH > 4 ? endH : (narrow ? 190 : 122)) / u;
        const short = !portrait && view.cssH < 560; c.split = short;
        const colW = short ? w * .5 - Math.max(sS + 20, w * .06) - 40 : Math.min(portrait ? w - 2 * sS + 30 : 1500, w - 2 * sS);
        h3.size = portrait ? 112 : (short ? 96 : 122); h3.wrap = Math.round(balance('sazvezdje.b3.h', 'display', h3.size, -.014, colW) || colW);
        const aSize = portrait ? 39 : 34, al = short ? 'left' : 'center';
        const br = breakLines(addrBase, 'text', aSize, 0, colW);
        p3.size = aSize; p3.wrap = br ? 0 : colW; p3.set(br ? br.lines.join('\n') : addrBase);
        h3.opt('align', al); p3.opt('align', al);
        const mh = measure('sazvezdje.b3.h', { ...HB, tracking: -.014, size: h3.size, width: h3.wrap, align: al });
        const ma = measure(p3._src, { size: aSize, font: 'text', leading: 1.46, width: p3.wrap, align: al });
        const tw = Math.max(mh.w, ma.w);
        if (short) {
          const x0 = Math.max(sS + 20, w * .06), ya = bot - ma.h, yh = ya - 20 - mh.h;
          const S2 = clamp((yh - sT - 40) / (FH + .6), 20, 60);
          c.p2 = { S: S2, x: w * .5, y: Math.max(120, sT - 50) + (FH / 2 + .2) * S2 }; c.t3 = { x: x0, y: yh }; c.tp3 = { x: x0 + 3, y: ya };
          c.endY = h - sB - 6 - dH;
          c.sh2 = { x: w * .5, y: (Math.min(yh, c.endY) + h) / 2, rx: w * .62, ry: (h - Math.min(yh, c.endY)) * .62, a: .78 };
        } else {
          const T0 = portrait ? Math.max(150, sT - 36) : sT - 6, B0 = h - sB + (portrait ? -6 : 2);
          const g1 = portrait ? 52 : 22, g2 = portrait ? 30 : 16, g3 = portrait ? 50 : 34, words = mh.h + ma.h + dH + g1 + g2 + g3;
          const S2 = clamp((B0 - T0 - words) / (FH + .5), 20, portrait ? 70 : 54), used = (FH + .5) * S2 + words, y0 = T0 + Math.max(0, B0 - T0 - used) * .4;
          c.p2 = { S: Math.max(S2, w / 52), x: w / 2, y: y0 + (FH / 2 + .25) * S2 };
          let y = y0 + (FH + .5) * S2 + g1; c.t3 = { x: w / 2, y }; y += mh.h + g2; c.tp3 = { x: w / 2, y }; y += ma.h + g3; c.endY = y;
          c.sh2 = { x: w / 2, y: (c.t3.y + y + dH) / 2 + 10, rx: Math.min(w * .6, tw / 2 + 230), ry: (y + dH - c.t3.y) / 2 + 120, a: .86 };
        }
      }
      c.sizes = sizes;
      c.L1 = solve(c.p1, sizes, c.B1, c.obst1); c.LO = solve(c.pO, sizes, c.BO, []);
      C = c; return c;
    }

    // ---------- cues ----------
    let prev = {};
    const cue = (key, now, at, s, fire) => { const p = prev[key]; prev[key] = now; if (p !== undefined && p < at && now >= at && s.dt > 0) fire(); };

    // ---------- per-frame state shared between update and render ----------
    const P = FIG.map(() => [0, 0]), Rv = new Float32Array(N), LINE_COL = hexLin('#b9cdfa'), TICK_COL = hexLin('#e9dcc2'), MET_COL = [.85, 1, .92];
    const grade = { exposure: 1, bloom: .62, threshold: .95, knee: .7, radius: 1.15, tone: 'aces', contrast: 1.03, saturation: 1.06, vignette: .34, grain: .03, halation: .18, lift: [.0016, .0019, .0031], gain: [1, 1, 1] };
    let endK = 0, engA = 0, glowK = 0; const ENG_GAIN = /engdebug/.test(location.search) ? .9 : .18;

    function meteor(t, vega) {
      if (ctx.reduced()) return null;
      const W = 21, i = Math.floor((t - 13) / W); if (i < 0) return null;
      const r = rng(7919 + i * 131); if (r() > .64) return null;
      const t0 = 13 + i * W + r() * (W - 2), dur = .5 + r() * .5, tau = (t - t0) / dur; if (tau < 0 || tau > 1) return null;
      const sx = (.06 + .88 * r()) * view.w, sy = (.1 + .42 * r()) * view.h; let dx = sx - vega[0], dy = sy - vega[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const len = (200 + 360 * r()) * clamp(dl / 500, .5, 1.2), e = 1 - Math.pow(1 - tau, 2), hx = sx + dx * len * e, hy = sy + dy * len * e, tl = Math.min(len * e, 190);
      return { ax: hx - dx * tl, ay: hy - dy * tl, bx: hx, by: hy, a: Math.pow(Math.sin(Math.PI * tau), .8) * (.45 + .5 * r()) };
    }

    function update(s) {
      const c = compose(), w = view.w, h = view.h, m = s.motion, t = s.t;
      if (s.beat !== lastBeat) { if (open >= 0) closePanel(false); lastBeat = s.beat; }
      const interactive = s.beat === 1 && s.at(1) >= .9; // on the end card the only actions are the CTA, phones and email
      const k1 = s.k(1, 0, 2.2, 'inOutCubic'), k2 = s.k(2, .1, 3, 'inOutCubic');
      openK = snap ? (open >= 0 ? 1 : 0) : damp(openK, open >= 0 ? 1 : 0, 4.2, s.dt || 1 / 60);
      const oK = ease.inOutSine(openK);
      // pose
      const mixP = (a, b, k) => ({ S: lerp(a.S, b.S, k), x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
      let pose = mixP(mixP(c.p0, c.p1, k1), c.p2, k2); pose = mixP(pose, c.pO, oK);
      const tilt = 1 - s.k(0, .1, 4.6, 'inOutCubic');
      const lag = 40 * (1 - Math.exp(-t / 50)) * m * (1 - .6 * oK);
      const big = 1 - Math.max(tilt, Math.sin(Math.PI * k1) * .8, Math.sin(Math.PI * k2) * .8);
      const ox = pose.x + lag + (9 * Math.sin(t * .13 + 1) + 5 * Math.sin(t * .071)) * m - s.mouse.x * 13 * m * big;
      const oy = pose.y - tilt * c.tiltD + (6 * Math.sin(t * .11) + 4 * Math.sin(t * .053 + 2)) * m + s.mouse.y * 8 * m * big;
      const phi = PHI_MAX * (1 - Math.exp(-t / 210)) * (m >= 1 ? 1 : .45 / .12 * m);
      cam.O.set(ox, oy); cam.rot.set(Math.cos(phi), Math.sin(phi)); cam.view.set(w, h); cam.S = pose.S; cam.px = view.scale;
      if (s.enter >= 1) glowK = Math.min(1, glowK + s.dt / 2.5);
      const gK = ease.inOutSine(glowK);
      cam.hor = lerp(h * 1.9, c.hor0 - k2 * h * .02, gK); // the horizon stays below the frame; only its airglow reaches the bottom edge
      const cs = cam.rot.x, sn = cam.rot.y, kS = starScale(pose.S);
      for (let i = 0; i < N; i++) { const dx = sky[i][0] - ANCH[0], dy = sky[i][1] - ANCH[1]; P[i][0] = ox + pose.S * (cs * dx - sn * dy); P[i][1] = oy - pose.S * (sn * dx + cs * dy); }

      // Lyra's stars
      const b0 = s.at(0);
      for (let i = 0; i < N; i++) {
        const f = FIG[i], act = interactive && (hoverB === i || hoverL === i || focusI === i) ? 1 : 0, sel = open === i ? 1 : 0;
        hov[i] = snap ? Math.max(act, sel) : damp(hov[i], Math.max(act, sel * .85), 9, s.dt || 1 / 60);
        const e = s.k(0, 3 + i * .1, 4.7 + i * .1, 'outCubic'), nat = f.spike ? .86 : .56;
        const sc = 1 + (f.spike ? .06 : .045) * Math.sin(t * (f.spike ? .83 : 1.1 + i * .17) + i * 2.1) * m + (f.spike ? .035 * Math.sin(t * 2.3 + 1) + .02 * Math.sin(t * 5.3) : .02 * Math.sin(t * 3.1 + i)) * m;
        const R = f.R * kS * lerp(nat, 1, e) * (1 + hov[i] * (f.spike ? .22 : .5)), I = f.I * lerp(f.spike ? .8 : .5, 1, e) * sc * (1 + hov[i] * (f.spike ? .35 : .7));
        Rv[i] = R;
        const col = hexLin(f.col), tw = f.spike ? .05 * Math.sin(t * 1.9) * m : 0;
        const put = (q, x, y, r, inten) => { iC[q * 2] = x; iC[q * 2 + 1] = y; iR[q * 3] = r; iR[q * 3 + 1] = inten; iR[q * 3 + 2] = r * (f.spike ? 30 : 10); iCol[q * 3] = col[0] * (1 + tw); iCol[q * 3 + 1] = col[1]; iCol[q * 3 + 2] = col[2] * (1 - tw); iX[q * 2] = f.spike ? lerp(.7, 1, e) : 0; iX[q * 2 + 1] = i * 1.7; };
        if (f.pair) { const sep = Math.max(.04 * pose.S, R * 1.5 + 1.1) * (1 + hov[i] * .25), ax = -sn * sep, ay = -cs * sep; put(i, P[i][0] + ax, P[i][1] + ay, R, I); put(N, P[i][0] - ax, P[i][1] - ay, R * .96, I * .9); Rv[i] = R + sep * .5; }
        else put(i, P[i][0], P[i][1], R, I);
      }
      for (const n of ['iC', 'iR', 'iCol', 'iX']) sg.attributes[n].needsUpdate = true;

      // labels: layout blend, visibility, colour
      for (let i = 0; i < N; i++) {
        const a = c.L1.off[i], o = c.LO.off[i], T = labels[i], cur = oK > .5 ? o : a;
        const dx = lerp(a.dx, o.dx, oK), dy = lerp(a.dy, o.dy, oK);
        const act = interactive && (hoverB === i || hoverL === i || focusI === i), sel = open === i;
        let target = 0;
        if (s.beat >= 1) target = open >= 0 ? (sel || act ? 1 : 0) : s.beat === 1 ? 1 : 1 - s.k(2, 0, .6);
        vis[i] = snap ? target : damp(vis[i], target, 7, s.dt || 1 / 60);
        const inP = s.k(1, .9 + i * .15, 1.9 + i * .15);
        const Bx = open >= 0 ? c.BO : c.B1;
        const bw = cur.w, bh = cur.h, x = clamp(P[i][0] + dx, Math.min(Bx.x0, w - bw - view.safeSide), Math.max(Bx.x0, Bx.x1 - bw)), y = clamp(P[i][1] + dy, view.safeTop, h - view.safeBottom - bh);
        T.opt('align', cur.align); T.x = cur.align === 'right' ? x + bw : cur.align === 'center' ? x + bw / 2 : x; T.y = y;
        T.alpha = vis[i] * (.82 + .18 * hov[i]); T.color = sel ? mixHex(PAPER, BRASS, oK) : mixHex('#dccfb6', '#fff8ea', hov[i]);
        T.show(inP, { style: 'rise', by: 'word', stagger: .4 });
        const lb = labBox[i]; lb.x = x; lb.y = y; lb.w = bw; lb.h = bh; lb.a = vis[i] * inP;
        // leader tick, from the star's edge to the nearest point of the label
        const nx = clamp(P[i][0], x - 9, x + bw + 9), ny = clamp(P[i][1], y + bh * .18, y + bh * .86); let tx = nx - P[i][0], ty = ny - P[i][1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const g0 = Math.min(Rv[i] * 2.7 + 8, tl * .6);
        setLine(LINES.length + i, P[i][0] + tx * g0, P[i][1] + ty * g0, nx, ny, ease.outCubic(clamp(inP * 1.4)), tl - g0 > 6 ? (.3 + .3 * hov[i]) * vis[i] * clamp(inP * 2) : 0, 0, 0, TICK_COL);
      }
      // figure lines
      for (let j = 0; j < LINES.length; j++) {
        const [a, b, dot] = LINES[j], pr = s.k(0, LINE_T[j], LINE_T[j] + (dot ? .5 : .62), 'inOutSine');
        let dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const ga = Rv[a] * 2.9 + 7, gb = Rv[b] * 2.9 + 7, hd = s.beat === 0 ? Math.sin(Math.PI * pr) : 0;
        const lit = Math.max(hov[a], hov[b]);
        setLine(j, P[a][0] + dx * ga, P[a][1] + dy * ga, P[b][0] - dx * gb, P[b][1] - dy * gb, pr, (dot ? .32 : .44) * (1 + .5 * lit), dot ? 12 : 0, hd, LINE_COL);
        cue('L' + j, b0, LINE_T[j], s, () => ctx.sfx('bell', { gain: dot ? .3 : .55, pitch: BELL[j], pan: clamp((P[b][0] - w / 2) / (w / 2), -1, 1) * .5 }));
      }
      for (let i = 0; i < N; i++) cue('T' + i, s.at(1), .9 + i * .15, s, () => ctx.sfx('tick', { gain: .12, pitch: .8 + i * .06, pan: clamp((P[i][0] - w / 2) / (w / 2), -1, 1) * .5 }));
      const me = meteor(t, P[0]);
      if (me) setLine(NL - 1, me.ax, me.ay, me.bx, me.by, 1, me.a * .8, -1, 0, MET_COL); else setLine(NL - 1, 0, 0, 1, 0, 0, 0, 0, 0, MET_COL);
      for (const n of ['aA', 'aB', 'aP', 'aCol']) lg.attributes[n].needsUpdate = true;

      // engraving: in, then partly out
      engA = s.k(0, 5.2, 8.4, 'inOutSine') * lerp(1, .55, smoothstep(8.6, 17, s.since(0))) * lerp(1, .7, k1) * lerp(1, .75, k2) * (1 - .45 * oK);
      engMat.uniforms.uReveal.value = s.k(0, 5.0, 8.3); engMat.uniforms.uAlpha.value = engA * ENG_GAIN;

      // uniforms
      const glow = .24 * gK * lerp(1, 1.7, k2);
      skyLo.u.uGlow.value = glow; skyHi.u.uQ.value = s.q; skyLo.u.uMW.value = lerp(1, .6, k2);
      ptsMat.uniforms.uGain.value = lerp(.55, 1, clamp((pose.S - 28) / 60));
      { const a = c.sh1, b = c.sh2, kk = k2; cam.shade.set(lerp(a.x, b.x, kk), lerp(a.y, b.y, kk), lerp(a.rx, b.rx, kk), lerp(a.ry, b.ry, kk)); cam.shadeA = lerp(lerp(.0, a.a, s.k(0, 3, 5.5)), b.a, kk) * (1 - oK); }
      xfSet(skyLo.u); xfSet(skyHi.u); xfSet(ptsMat.uniforms); xfSet(engMat.uniforms);
      ptsMat.uniforms.uTime.value = s.time; ptsMat.uniforms.uSc.value = .35 + .65 * m; starMat.uniforms.uTime.value = s.time;
      lineMat.uniforms.uPx.value = starMat.uniforms.uPx.value = view.scale;
      pts.setDrawRange(0, Math.floor(NS * clamp(.25 + .75 * s.q, .25, 1)));
      grade.exposure = lerp(.92, 1, s.k(0, 0, 3)) * (1 - .4 * oK); grade.vignette = lerp(.34, .42, k2) + .1 * oK; grade.saturation = 1.06 - .12 * oK;

      // words
      const o1 = s.k(1, 0, .7), o1p = s.k(1, 0, .55), o2 = s.k(2, 0, .6);
      h1.x = c.t1.x; h1.y = c.t1.y; h1.show(s.k(0, 3.3, 5.1), { style: 'blur', by: 'glyph', q: o1, stagger: .7 });
      p1.x = c.tp1.x; p1.y = c.tp1.y; p1.show(s.k(0, 5.5, 7), { style: 'rise', by: 'word', q: o1p });
      h2.x = c.t2.x; h2.y = c.t2.y; h2.alpha = 1 - oK; h2.show(s.k(1, 2, 3.5), { style: 'blur', by: 'glyph', q: o2, stagger: .7 });
      p2.x = c.tp2.x; p2.y = c.tp2.y; p2.alpha = 1 - oK; p2.show(s.k(1, 3.2, 4.3), { style: 'rise', by: 'word', q: o2 });
      h3.x = c.t3.x; h3.y = c.t3.y; h3.alpha = 1 - oK * .9; h3.show(s.k(2, 2.2, 3.9), { style: 'blur', by: 'glyph', stagger: .7 });
      p3.x = c.tp3.x; p3.y = c.tp3.y; p3.alpha = 1 - oK * .9; p3.show(s.k(2, 3.4, 4.9), { style: 'rise', by: 'line', stagger: .6 });
      endK = s.k(2, 4.3, 5.3, 'outCubic') * (1 - oK);

      syncDom(s, c, interactive);
      snap = false;
    }

    // ---------- DOM sync ----------
    const bpos = FIG.map(() => [0, 0]), lastT = FIG.map(() => '');
    function syncDom(s, c, interactive) {
      const u = c.u;
      if (interactive !== starsLive) {
        starsLive = interactive; starsEl.inert = !interactive; starsEl.setAttribute('aria-hidden', String(!interactive)); starsEl.style.visibility = interactive ? 'visible' : 'hidden';
        btns.forEach(b => { b.tabIndex = interactive ? 0 : -1; });
        if (!interactive && starsEl.contains(document.activeElement)) { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
      const lay = c.sheet ? 'sheet' : 'side'; if (dom.dataset.layout !== lay) dom.dataset.layout = lay;
      const sh = !c.sheet && view.cssH < 560; if (sh !== ('short' in dom.dataset)) { if (sh) dom.dataset.short = ''; else delete dom.dataset.short; }
      const em = c.split ? 'split' : 'stack'; if (dom.dataset.end !== em) dom.dataset.end = em;
      const us = u.toFixed(4) + 'px'; if (dom.style.getPropertyValue('--u') !== us) dom.style.setProperty('--u', us);
      if (interactive) {
        for (let i = 0; i < N; i++) { bpos[i][0] = P[i][0] * u; bpos[i][1] = P[i][1] * u; }
        for (let it = 0; it < 3; it++) for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { // keep 46 px between hit areas
          let dx = bpos[j][0] - bpos[i][0], dy = bpos[j][1] - bpos[i][1]; const d = Math.hypot(dx, dy) || 1; if (d < 46) { const p = (46 - d) / 2 / d; dx *= p; dy *= p; bpos[i][0] -= dx; bpos[i][1] -= dy; bpos[j][0] += dx; bpos[j][1] += dy; }
        }
        for (let i = 0; i < N; i++) {
          const k = bpos[i][0].toFixed(1) + ',' + bpos[i][1].toFixed(1); if (k === lastT[i]) continue; lastT[i] = k;
          btns[i].style.transform = `translate3d(${bpos[i][0].toFixed(1)}px,${bpos[i][1].toFixed(1)}px,0)`;
          btns[i].firstChild.style.setProperty('--dx', (P[i][0] * u - bpos[i][0]).toFixed(1) + 'px'); btns[i].firstChild.style.setProperty('--dy', (P[i][1] * u - bpos[i][1]).toFixed(1) + 'px');
        }
      }
      const on = s.beat === 2 && endK > .01, live = on && endK > .6 && open < 0;
      if (on) {
        endEl.style.visibility = 'visible'; endEl.style.opacity = endK.toFixed(3); endEl.style.top = (c.endY * u + (1 - endK) * 10).toFixed(1) + 'px';
        const hh = endEl.offsetHeight; if (hh > 0 && Math.abs(hh - endH) > 1.5) endH = hh;
      } else if (endLive !== null || endEl.style.visibility !== 'hidden') { endEl.style.visibility = 'hidden'; endEl.style.opacity = '0'; }
      if (s.beat === 2 && !on && endH < 4) { endEl.style.top = '-2000px'; endEl.style.visibility = 'hidden'; const hh = endEl.offsetHeight; if (hh > 0) endH = hh; }
      if (live !== endLive) { endLive = live; endEl.inert = !live; endEl.setAttribute('aria-hidden', String(!live)); }
    }

    function renderWorld() {
      skyLo.render(lo); skyHi.u.tLo.value = lo.texture; skyHi.render(hdr);
      engMesh.visible = engMat.uniforms.uAlpha.value > .0005;
      gfx.draw(world, dummyCam, hdr, { clear: false });
    }
    const labelHit = (x, y) => { for (let i = 0; i < N; i++) { const b = labBox[i]; if (b.a > .5 && x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 10 && y < b.y + b.h + 10) return i; } return -1; };

    relabel();
    return {
      async init() { // compile everything once behind the loader
        try { ctx.audio.warm && ctx.audio.warm([{ sfx: 'bell' }, { sfx: 'select' }, { sfx: 'tick' }]); } catch (e) { /* optional */ }
        cam.view.set(view.w, view.h); cam.S = 90; cam.px = view.scale; cam.hor = view.h * 1.2;
        xfSet(skyLo.u); xfSet(skyHi.u); xfSet(ptsMat.uniforms); xfSet(engMat.uniforms); engMat.uniforms.uAlpha.value = .1; engMat.uniforms.uReveal.value = 1;
        for (let q = 0; q < NL; q++) setLine(q, 100 + q, 100, 300, 300 + q, 1, .2, q % 3 === 0 ? 12 : q === NL - 1 ? -1 : 0, .5, LINE_COL);
        for (let i = 0; i < NI; i++) { iC[i * 2] = 200 + i * 30; iC[i * 2 + 1] = 200; iR.set([3, 2, 30], i * 3); iCol.set([1, 1, 1], i * 3); iX[i * 2] = i ? 0 : 1; }
        const tmp = gfx.target({ w: 64, h: 64, hdr: false }); renderWorld(); gfx.post(hdr, tmp, grade); ui.render(tmp); gfx.free(tmp);
      },
      enter(s) { glowK = s.enter < 1 || (s.beat === 0 && s.bt < 2.5) ? 0 : 1; prev = {}; snap = true; lastBeat = s.beat; hoverB = hoverL = focusI = -1; if (open >= 0) closePanel(false); openK = 0; hov.fill(0); vis.fill(0); starsLive = null; endLive = null; lastT.fill(''); canvas.style.cursor = ''; },
      exit() { if (open >= 0) closePanel(false); hoverB = hoverL = -1; canvas.style.cursor = ''; },
      beat() { if (open >= 0) closePanel(false); },
      resize() { C = null; lastT.fill(''); },
      lang() { relabel(); },
      update,
      render(target) { renderWorld(); gfx.post(hdr, target, grade); ui.render(target); },
      pointer(e, s) {
        if (e.type === 'leave') { hoverL = -1; canvas.style.cursor = ''; return false; }
        const can = s.beat === 1 && starsLive, i = can ? labelHit(e.x, e.y) : -1;
        if (e.type === 'move') { if (i !== hoverL) { hoverL = i; canvas.style.cursor = i >= 0 ? 'pointer' : ''; if (i >= 0 && open !== i) ctx.sfx('select', { gain: .28, pitch: pitchOf(i) * .75 }); } return false; }
        if (e.type === 'down') { if (i >= 0 && open !== i) { openPanel(i); return true; } if (open >= 0) { closePanel(false); return true; } }
        return false;
      },
      key(e) { if (e.key === 'Escape' && open >= 0) { closePanel(true); return true; } return false; },
    };
  },
};
