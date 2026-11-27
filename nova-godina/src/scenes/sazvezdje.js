// sazvezdje — the camera tilts up from the city: Lyra, the lyre of Orpheus. Eight stars, eight departments,
// then the invitation. Sky is a gnomonic chart (tangent-plane degrees, north up, east left) centred on
// RA 18h50m, Dec +36°; everything in the picture is placed in those coordinates and projected each frame.
// New Year: a sleigh crosses past Lyra and dwindles into Vega; gentle snow in front; the end card wishes a happy new year.

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
import { createSleigh } from '../xmas/sleigh.js';
import { createSnow } from '../xmas/snow.js';
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
${S} .sz-star{position:absolute;left:-24px;top:-24px;width:48px;height:48px;border-radius:50%;pointer-events:auto;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:none}
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
${S} .sz-close{flex:none;display:inline-flex;align-items:center;gap:.55em;font-size:.9rem;line-height:1;padding:.7rem 1.05rem .7rem .85rem;min-height:44px;border-radius:999px;border:1px solid rgba(244,234,216,.42);background:rgba(244,234,216,.08);color:var(--paper);cursor:pointer;transition:border-color .2s,background .2s}
${S} .sz-close svg{width:14px;height:14px;flex:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;fill:none}
${S} .sz-close:hover{border-color:var(--paper);background:rgba(244,234,216,.14)}
${S} .sz-close:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
${S} .sz-grab{display:none}
${S}[data-layout="sheet"] .sz-grab{display:block;flex:none;position:relative;height:22px;margin:0;padding:0;border:0;background:none;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent}
${S}[data-layout="sheet"] .sz-grab::after{content:"";position:absolute;left:50%;top:10px;width:42px;height:4px;margin-left:-21px;border-radius:2px;background:rgba(244,234,216,.38)}
${S}[data-layout="sheet"] .sz-head{padding-top:.55rem;touch-action:none}
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
${S} .sz-end[data-fit] .sz-contact{margin-top:clamp(2px,calc(var(--u)*8),8px)}
${S} .sz-end[data-fit] .sz-contact a{padding:.72em 0}
${S} .sz-end[data-fit] .sz-reviews{margin-top:0;font-size:14px;line-height:1.4}
${S} .sz-end[data-fit="2"] .sz-reviews{display:none}
@media (hover:hover) and (pointer:fine){${S} .sz-contact a,${S} .sz-end[data-fit] .sz-contact a{padding:.5em 0}}
@media (prefers-reduced-motion:reduce){${S} .sz-panel,${S} .sz-panel.on,${S} .sz-star i{transition:none}}
`)('.scene-dom[data-scene="sazvezdje"]');

export default {
  id: 'sazvezdje', enterWith: 'tilt',
  beats: [
    { dur: 8.5, textAt: 4.8, copy: ['sazvezdje.b1.h', 'sazvezdje.b1.p'] },   // words as the tilt settles (it ends at 3.6 s); the drawing and the sleigh go on
    { dur: 6, textAt: 2.9, copy: ['sazvezdje.b2.h', 'sazvezdje.b2.p'] },     // headline with the labels, paragraph right after
    { dur: 6, textAt: 3.4, copy: ['sazvezdje.b3.h', 'sazvezdje.b3.p', 'sazvezdje.reviews'] }, // greeting, invitation, address, then the end card
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
    const fieldSeed = stars.map(() => rnd());
    const fieldSP = stars.map(s => [.9 + .27 * Math.max(0, 7 - s.m), .6 * Math.pow(10, -.4 * (s.m - 6) * .62)]);
    const FAR = new THREE.Sphere(new THREE.Vector3(), 1e9);

    // ---------- engraved lyre (old star-atlas manner): thin line quads in sky coordinates ----------
    // Drawn in a frame pinned to the stars: bridge = gamma..beta, yoke = delta..zeta, outer strings = the
    // figure's own long lines, right horn tip = epsilon. The frame is affine, i.e. the lyre is seen obliquely.
    const engSegs = [];
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
      for (const s of strokes) for (let i = 0; i < s.p.length - 1; i++) {
        const a = map(s.p[i][0], s.p[i][1]), b = map(s.p[i + 1][0], s.p[i + 1][1]), o = lerp(s.o0, s.o1, i / Math.max(1, s.p.length - 2));
        engSegs.push([a, b, s.w, o]);
      }
    }

    // ---------- one mesh, one draw call: the figure lines, leader ticks and meteor (kind 0, design units), Lyra's
    // own stars (kind 1, design units: core, wings, Vega's spikes), the engraving (kind 2, sky) and the field
    // stars (kind 3, sky; gaussian quads, brightest first so quality can cut the faint tail). All additive.
    // The first NL + NI quads are rewritten every frame (an update range), the rest never change.
    const NL = LINES.length + N + 1, NI = N + 1, NE = engSegs.length, DYN = NL + NI, NQ = DYN + NE + NS;
    const wg = new THREE.BufferGeometry();
    const wPos = new Float32Array(NQ * 8), wA = new Float32Array(NQ * 8), wB = new Float32Array(NQ * 8), wP = new Float32Array(NQ * 16), wC = new Float32Array(NQ * 12), wK = new Float32Array(NQ * 4);
    {
      const idx = new Uint32Array(NQ * 6), LQ = [0, -1, 1, -1, 1, 1, 0, 1], SQ = [-1, -1, 1, -1, 1, 1, -1, 1];
      const quad = (q, cr, k, a, b, p, c) => { wPos.set(cr, q * 8); idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6); for (let v = 0; v < 4; v++) { wK[q * 4 + v] = k; if (a) { wA.set(a, q * 8 + v * 2); wB.set(b, q * 8 + v * 2); wP.set(p, q * 16 + v * 4); wC.set(c, q * 12 + v * 3); } } };
      for (let q = 0; q < NL; q++) quad(q, LQ, 0);
      for (let q = NL; q < DYN; q++) quad(q, SQ, 1);
      engSegs.forEach((e, i) => quad(DYN + i, LQ, 2, e[0], e[1], [e[2], e[3], 0, 0], [0, 0, 0]));
      stars.forEach((s, i) => quad(DYN + NE + i, SQ, 3, [s.x, s.y], [fieldSeed[i], 0], [fieldSP[i][0], fieldSP[i][1], 0, 0], s.c));
      wg.setAttribute('position', new THREE.BufferAttribute(wPos, 2)); wg.setAttribute('aK', new THREE.BufferAttribute(wK, 1)); wg.setIndex(new THREE.BufferAttribute(idx, 1));
      for (const [n, a, sz] of [['aA', wA, 2], ['aB', wB, 2], ['aP', wP, 4], ['aCol', wC, 3]]) { const at = new THREE.BufferAttribute(a, sz); at.setUsage(THREE.DynamicDrawUsage); wg.setAttribute(n, at); }
    }
    const dirty = () => { for (const n of ['aA', 'aB', 'aP', 'aCol']) { const at = wg.attributes[n]; at.clearUpdateRanges(); at.addUpdateRange(0, DYN * 4 * at.itemSize); at.needsUpdate = true; } };
    const setLine = (q, ax, ay, bx, by, prog, alpha, mode, head, c) => {
      for (let v = 0; v < 4; v++) { wA[q * 8 + v * 2] = ax; wA[q * 8 + v * 2 + 1] = ay; wB[q * 8 + v * 2] = bx; wB[q * 8 + v * 2 + 1] = by; wP.set([prog, alpha, mode, head], q * 16 + v * 4); wC.set(c, q * 12 + v * 3); }
    };
    const setStar = (j, x, y, R, I, E, sx, ph, c) => { const q = NL + j; for (let v = 0; v < 4; v++) { wA[q * 8 + v * 2] = x; wA[q * 8 + v * 2 + 1] = y; wB[q * 8 + v * 2] = R; wB[q * 8 + v * 2 + 1] = I; wP.set([E, sx, ph, 0], q * 16 + v * 4); wC.set(c, q * 12 + v * 3); } };
    const worldMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { ...xfU(), uTime: { value: 0 }, uSc: { value: 1 }, uGain: { value: 1 }, uReveal: { value: 0 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Vector3(...hexLin('#c7a57a')) } },
      vertexShader: 'precision highp float;\n' + XF + /* glsl */`
        in vec2 position, aA, aB; in vec4 aP; in vec3 aCol; in float aK; uniform float uTime, uSc, uGain, uReveal;
        out vec2 vQ, vE; out vec4 vP; out vec3 vCol; flat out int vK;
        void main(){
          int k = int(aK + .5); vK = k; vP = aP; vCol = aCol; vE = aB; vQ = position;
          if (k == 0) {                                              // line, design units
            vec2 d = aB - aA; float len = max(length(d), 1e-3); vec2 t = d / len, n = vec2(-t.y, t.x); const float PAD = 13.;
            float al = mix(-PAD, len + PAD, position.x); vec2 p = aA + t * al + n * position.y * PAD;
            vQ = vec2(al, position.y * PAD); vE = vec2(len, 0.); gl_Position = toClip(p);
          } else if (k == 1) {                                       // Lyra star: aB = (R, I), aP.x = window
            vQ = position * aP.x; gl_Position = toClip(aA + vQ);
          } else if (k == 2) {                                       // engraving, sky
            vec2 A = toScreen(aA), B = toScreen(aB), d = B - A; float len = max(length(d), 1e-4); vec2 t = d / len, n = vec2(-t.y, t.x);
            float pad = 2.2 / uPx + .4;
            vec2 p = mix(A - t * .3 / uPx, B + t * .3 / uPx, position.x) + n * position.y * pad;
            vQ = vec2(0., position.y * pad); vE = vec2(aP.x * clamp((uReveal * 1.18 - aP.y) / .18, 0., 1.), 0.);
            gl_Position = toClip(p);
          } else {                                                   // field star, sky
            vec2 su = toScreen(aA); float sd = aB.x;
            float up = (uHor - su.y) / uView.y, ext = smoothstep(0., .3, up), low = clamp(1. - up * 1.15, 0., 1.);
            float tw = sin(uTime * (1.3 + 2.6 * fract(sd * 7.3)) + sd * 40.) * sin(uTime * (.7 + 1.9 * fract(sd * 3.1)) + sd * 17.);
            float sc = 1. + uSc * (.08 + .55 * low * low) * tw;
            float sig = aP.x * uPx * (.8 + .2 * uGain), sg = max(sig, .72);
            float peak = aP.y * sc * ext * (sig * sig) / (sg * sg) * uGain * shade(su);
            vCol = mix(aCol, aCol * vec3(1., .7, .42), low * low * .85) * peak; vE = vec2(sg, 0.);
            float hs = sg * 3.3 + 1.; vQ = position * hs;
            gl_Position = peak > 1e-5 ? toClip(su + vQ / uPx) : vec4(2., 2., 2., 1.);
          }
        }`,
      fragmentShader: /* glsl */`precision highp float; uniform float uPx, uTime, uAlpha; uniform vec3 uCol;
        in vec2 vQ, vE; in vec4 vP; in vec3 vCol; flat in int vK; out vec4 fragColor;
        void main(){
          vec3 c;
          if (vK == 0) {
            float prog = vP.x, alpha = vP.y, mode = vP.z, head = vP.w; if (alpha <= 0.) discard;
            float u = vQ.x, v = abs(vQ.y), vLen = vE.x, end = vLen * prog, aa = 1. / uPx;
            float hw = .55 * aa + .3;
            float core = 1. - smoothstep(hw - aa * .6, hw + aa * .6, v);
            float glow = exp(-v * v / (2. * 3.4 * 3.4));
            float m = smoothstep(-aa, aa, u) * (1. - smoothstep(end - aa, end + aa, u));
            if (mode < 0.) {                                         // meteor: taper from tail to head
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
          } else if (vK == 1) {
            float R = vE.x, I = vE.y, E = vP.x; float d = length(vQ), r = d / R;
            float core = exp(-.5 * r * r);
            float wings = .055 / pow(1. + r * r * .16, 1.55);
            float sp = 0.;
            if (vP.y > 0.) {
              vec2 a = abs(vQ); float sw = max(.6 / uPx, R * .085), br = 1. + .12 * sin(uTime * .7 + vP.z);
              float l1 = exp(-a.y * a.y / (2. * sw * sw)) / (1. + pow(a.x / (R * 2.7 * br), 1.75));
              float l2 = exp(-a.x * a.x / (2. * sw * sw)) / (1. + pow(a.y / (R * 2.7 / br), 1.75));
              sp = (l1 + l2) * .3 * vP.y;
            }
            float win = 1. - smoothstep(.55, 1., d / E);
            c = (mix(vCol, vec3(1.), .6) * core + vCol * (wings + sp)) * I * win;
          } else if (vK == 2) {
            float aa = 1. / uPx, hw = .5 * aa + .18; float k = 1. - smoothstep(hw - aa * .6, hw + aa * .6, abs(vQ.y));
            c = uCol * k * vE.x * uAlpha;
          } else {
            float r2 = dot(vQ, vQ) / (vE.x * vE.x);
            c = vCol * (exp(-.5 * r2) + .012 / (1. + r2 * .12));
          }
          fragColor = vec4(c, 1.); }`,
    });
    const worldMesh = new THREE.Mesh(wg, worldMat); worldMesh.frustumCulled = false; wg.boundingSphere = FAR;
    const world = new THREE.Scene(); world.add(worldMesh);
    const dummyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ---------- New Year: the sleigh past Lyra, and snow ----------
    // The team flies a path in sky coordinates (so it, and its spark trail, ride with the stars), drawn through the
    // kit's screen mode. Everything is a pure function of the flight clock s.at(0) (or s.at(2) on the end card).
    const VEGA = sky[0];
    const sleighT = { O: [0, 0], S: 90, c: 1, s: 0 };         // the sky -> design transform for this frame
    const toD = (p) => { const dx = p[0] - ANCH[0], dy = p[1] - ANCH[1]; return [sleighT.O[0] + sleighT.S * (sleighT.c * dx - sleighT.s * dy), sleighT.O[1] - sleighT.S * (sleighT.s * dx + sleighT.c * dy)]; };
    let FL = null, FE = null, FP = null, flightMode = 0;                  // flight plans (beat 0, end card); which one the path follows
    const skyPath = t => (flightMode === 1 ? FE : flightMode === 2 ? FP : FL).at(t);
    const sleighPath = t => { const a = toD(skyPath(t - .01)), b = toD(skyPath(t + .01)), p = toD(skyPath(t)); return { pos: p, dir: [b[0] - a[0], b[1] - a[1]] }; };
    const sleigh = createSleigh(ctx, { mode: 'screen', size: 220, light: [.42, .9], rim: 2.6, path: sleighPath, sparks: 220, sparkLife: 2.4, seed: 1989 });
    const snow = createSnow(ctx, { mode: 'screen', count: 260, size: 2.7, fall: 24, wind: [9, 0, 0], sway: .32, layers: 1.5, aperture: .75, color: [.5, .6, .9], brightness: .34, seed: 2027 });
    // a flight: a gentle arc of cubic segments [p0, c1, c2, p1, c1, c2, p2, ...], then a recession straight into the
    // vanishing point v (exponential, so the speed is continuous at the last point r); the team shrinks with the
    // distance left. The pace along the arc eases: in briskly, a slower glide through the middle, gathering again
    // into the recession (arc length s = L (x + c sin(2 pi x) / 2 pi)); a gentle rise and fall rides on it. Pure in t.
    function flight(pts, v, t0, tr, fEnd) {
      const nS = (pts.length - 1) / 3, s0 = pts[0], r = pts[pts.length - 1], c1 = pts[1], NLUT = 64 * nS;
      const bz = u => { const j = Math.min(nS - 1, Math.floor(u * nS)), w = u * nS - j, m = 1 - w, P = pts.slice(j * 3, j * 3 + 4); return [0, 1].map(k => m * m * m * P[0][k] + 3 * m * m * w * P[1][k] + 3 * m * w * w * P[2][k] + w * w * w * P[3][k]); };
      const LUT = [0]; let L = 0, pp = bz(0); for (let i = 1; i <= NLUT; i++) { const p = bz(i / NLUT); L += Math.hypot(p[0] - pp[0], p[1] - pp[1]); LUT.push(L); pp = p; }
      const uOf = d => { let i = 1; while (i < NLUT && LUT[i] < d) i++; const a = LUT[i - 1], b = LUT[i]; return (i - 1 + (b > a ? (d - a) / (b - a) : 0)) / NLUT; };
      const C = .24, TAUc = Math.PI * 2, ease = x => x + C * Math.sin(TAUc * x) / TAUc;
      const v0 = L / (tr - t0), ve = v0 * (1 + C), RV = Math.hypot(r[0] - v[0], r[1] - v[1]), k = ve / RV, tv = tr + Math.log(1 / fEnd) / k;
      const t1 = [c1[0] - s0[0], c1[1] - s0[1]], l1 = Math.hypot(...t1);
      // the rise and fall: a fraction of the team's length, fading out as it recedes
      const und = (t, f) => TEAM_DEG * .045 * f * f * (Math.sin((t - t0) * 2.1) + .35 * Math.sin((t - t0) * 3.7 + 1.1));
      return {
        t0, tr, tv, k, fEnd,
        f: t => t <= tr ? 1 : Math.max(fEnd, Math.exp(-k * (t - tr))),
        at(t) {
          let p;
          if (t < t0) p = [s0[0] + t1[0] / l1 * ve * (t - t0), s0[1] + t1[1] / l1 * ve * (t - t0)];
          else if (t < tr) p = bz(uOf(L * ease((t - t0) / (tr - t0))));
          else { const f = this.f(t); p = [v[0] + (r[0] - v[0]) * f, v[1] + (r[1] - v[1]) * f]; }
          p[1] += und(t, this.f(t)); return p;
        },
      };
    }

    // ---------- in-canvas type ----------
    const ui = ctx.overlay();
    const PAPER = '#f4ead8', DIM = '#b5a993', BRASS = '#d8a548';
    const h1 = ui.text('sazvezdje.b1.h', { size: 118, font: 'display', color: PAPER, width: 760, leading: 1.04, tracking: -.012 });
    const p1 = ui.text('sazvezdje.b1.p', { size: 38, font: 'text', color: DIM, width: 600, leading: 1.42 });
    const h2 = ui.text('sazvezdje.b2.h', { size: 96, font: 'display', color: PAPER, width: 700, leading: 1.05, tracking: -.012 });
    const p2 = ui.text('sazvezdje.b2.p', { size: 42, font: 'displayItalic', color: BRASS, width: 600, leading: 1.3 });
    // end-card headline in two voices: the greeting (first line of the copy, italic) and the invitation (the rest)
    const GREET = '#f6e3bd';
    const h3g = ui.text('', { size: 128, font: 'displayItalic', color: GREET, align: 'center', leading: 1.04, tracking: -.01 });
    const h3 = ui.text('', { size: 112, font: 'display', color: PAPER, align: 'center', leading: 1.04, tracking: -.014 });
    let hGreet = '', hInvite = '';
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
    const pGrab = el('button', 'sz-grab'); pGrab.type = 'button'; pGrab.tabIndex = -1; pGrab.setAttribute('aria-hidden', 'true'); // phones: the sheet's handle (tap or pull down to close)
    const pCloseL = el('span'); pClose.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>'; pClose.append(pCloseL);
    const pBody = el('div', 'sz-body'), pList = el('ul', 'sz-list'), pFoot = el('div', 'sz-foot'), pAll = ext(el('a', 'sz-all'), ctx.site.shop), pNote = el('p', 'sz-note');
    pList.lang = 'sr'; pHeadL.append(pStar, pTitle, pCount); pHead.append(pHeadL, pClose); pBody.append(pList); pFoot.append(pAll, pNote); panel.append(pGrab, pHead, pBody, pFoot);
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
    let swp = null, noClick = 0, tapS = null;
    const btns = FIG.map((f, i) => {
      const b = el('button', 'sz-star'); b.type = 'button'; b.append(el('i')); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'sz-panel'); b.tabIndex = -1;
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && hoverB !== i) { hoverB = i; if (open !== i) ctx.sfx('select', { gain: .28, pitch: pitchOf(i) * .75 }); } });
      b.addEventListener('pointerleave', () => { if (hoverB === i) hoverB = -1; });
      b.addEventListener('focus', () => { let fv = true; try { fv = b.matches(':focus-visible'); } catch (e) { /* old engines */ } if (fv) { if (focusI !== i && open !== i) ctx.sfx('select', { gain: .28, pitch: pitchOf(i) * .75 }); focusI = i; } });
      b.addEventListener('blur', () => { if (focusI === i) focusI = -1; });
      b.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') swp = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
      b.addEventListener('pointerup', e => { if (!swp || e.pointerId !== swp.id) return; const dx = e.clientX - swp.x, dy = e.clientY - swp.y, d = Math.max(Math.abs(dx), Math.abs(dy)), el2 = performance.now() - swp.t; swp = null;
        if (d > 12) noClick = performance.now() + 450;
        if (d > 48 && el2 < (d > 90 ? 1500 : 900)) { /* the deck's own swipe rule */ const hz = Math.abs(dx) > Math.abs(dy); const dir = (hz ? dx < 0 : dy < 0) ? 1 : -1; if (ctx.request) ctx.request(dir); else if (dir > 0) ctx.next(); else ctx.prev(); } });
      b.addEventListener('pointercancel', () => { swp = null; });
      b.addEventListener('click', () => { if (performance.now() < noClick) return; if (open === i) closePanel(true); else openPanel(i); });
      return b;
    });
    FIG.map((f, i) => i).sort((a, b) => FIG[a].mag - FIG[b].mag || a - b).forEach(i => starsEl.append(btns[i])); // tab order: brightest first
    dom.append(starsEl, endEl, panel);

    function fillPanel(i) {
      const c = catOf(i);
      pStar.textContent = ctx.t('sazvezdje.star.' + FIG[i].id); pTitle.textContent = catName(i); pCount.textContent = countText(c.count);
      panel.setAttribute('aria-label', catName(i) + ', ' + countText(c.count));
      pCloseL.textContent = ctx.t('sazvezdje.close');
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
      panel.inert = false; panel.classList.add('on'); if (ctx.chrome) ctx.chrome(false); // the deck's rail and step buttons stay off the panel
      btns.forEach((b, j) => b.setAttribute('aria-expanded', String(j === i)));
      ctx.sfx('select', { gain: .5 }); ctx.sfx('bell', { gain: .5, pitch: pitchOf(i) });
      const f = () => { if (open === i) { try { pTitle.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } };
      f(); requestAnimationFrame(f);
    }
    function closePanel(refocus) {
      const i = open; if (i < 0) return; open = -1;
      const had = panel.contains(document.activeElement);
      panel.classList.remove('on'); panel.inert = true; if (ctx.chrome) ctx.chrome(true); btns.forEach(b => b.setAttribute('aria-expanded', 'false'));
      ctx.sfx('tick', { gain: .3 });
      if (refocus && starsLive) { try { btns[i].focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      else if (had) { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
    pClose.addEventListener('click', () => closePanel(true));
    pGrab.addEventListener('click', () => closePanel(false));
    { // phones: pull the sheet down by its handle or header to close it
      let g = null;
      const dn = e => { if (e.pointerType === 'mouse' || e.target.closest('button:not(.sz-grab), a')) return; g = { y: e.clientY, x: e.clientX, t: performance.now(), id: e.pointerId }; };
      const upG = e => { if (!g || e.pointerId !== g.id) return; const dy = e.clientY - g.y, dx = e.clientX - g.x, el2 = performance.now() - g.t; g = null;
        if (dy > 50 && dy > Math.abs(dx) * 1.2 && el2 < 1500 && dom.dataset.layout === 'sheet') closePanel(false); };
      for (const n of [pGrab, pHead]) { n.addEventListener('pointerdown', dn); n.addEventListener('pointerup', upG); n.addEventListener('pointercancel', () => { g = null; }); }
    }
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
      { const hl = ctx.t('sazvezdje.b3.h').split('\n'); hGreet = hl.length > 1 ? hl[0].trim() : ''; hInvite = (hl.length > 1 ? hl.slice(1) : hl).join(' ').trim(); h3g.set(hGreet); h3.set(hInvite); }
      addrBase = ctx.t('sazvezdje.b3.p').split('\n').map(x => x.replace(/([.!?])\s+(?=\S)/g, '$1\n')).join('\n'); // one sentence per line, then balanced in compose()
      panel.setAttribute('aria-label', open >= 0 ? catName(open) + ', ' + countText(catOf(open).count) : ctx.t('sazvezdje.b2.h')); endEl.setAttribute('aria-label', ctx.t('sazvezdje.b3.h').replace(/\s*\n\s*/g, ' '));
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
      const key = [Math.round(view.w), Math.round(view.h), ctx.lang(), Math.round(view.cssW), dom.hidden ? 0 : 1, view.scale.toFixed(3), Math.round(view.safeTop), Math.round(view.safeBottom)].join(':');
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
      // end card: one centred stack; the constellation takes whatever height the words leave. Its bottom always clears the
      // bottom chrome (h - safeBottom), measured with the real DOM heights; when it does not fit, step down in order:
      // compact DOM type (reviews line 14 px, tighter contact rows), tighter gaps and a smaller constellation, smaller
      // headline and address, then no reviews line, then smaller still.
      {
        const short = !portrait && view.cssH < 560; c.split = short;
        const em = short ? 'split' : 'stack'; if (dom.dataset.end !== em) dom.dataset.end = em; // the DOM width depends on it
        const domOn = !dom.hidden;
        const LV = [ // dom fit, gap scale, smallest constellation, greeting scale, address step, lift (landscape: Vega may rise toward the header's empty middle)
          { fit: '', g: 1, sMin: 20, gk: 1, ad: 0, lift: 0 }, { fit: '', g: 1, sMin: 20, gk: 1, ad: 0, lift: 1 }, { fit: '1', g: 1, sMin: 20, gk: 1, ad: 0, lift: 1 },
          { fit: '1', g: .6, sMin: 14, gk: 1, ad: 0, lift: 1 }, { fit: '1', g: .6, sMin: 14, gk: .88, ad: 4, lift: 1 }, { fit: '2', g: .6, sMin: 14, gk: .88, ad: 4, lift: 1 },
          { fit: '2', g: .45, sMin: 10, gk: .76, ad: 6, lift: 1 },
        ];
        const domH = fit => { // the end card's real height at a fit level (null while the scene's DOM is not laid out)
          if (!domOn) return null; if (fit) endEl.dataset.fit = fit; else delete endEl.dataset.fit;
          const hh = endEl.offsetHeight; return hh > 4 ? hh : null; };
        const colW = short ? w * .5 - Math.max(sS + 20, w * .06) - 40 : Math.min(portrait ? w - 2 * sS + 30 : 1500, w - 2 * sS);
        const GB = { font: 'displayItalic', leading: 1.04, tracking: -.01 }, IB = { ...HB, tracking: -.014 }, al = short ? 'left' : 'center';
        const limit = h - sB - 4; // the card's bottom edge, design units
        let L = null;
        for (let li = 0; li < LV.length; li++) {
          const lv = LV[li], mH = domH(lv.fit);
          const dH = (mH != null ? mH : (endH > 4 && li === 0 ? endH : (narrow ? 190 : 122))) / u;
          // greeting: italic, one line, the largest size that fits; invitation: roman, a step smaller, balanced
          let gS = Math.round((portrait ? 116 : (short ? 100 : 124)) * lv.gk);
          for (; gS > 56; gS -= 4) { const r = breakLines(hGreet || ' ', 'displayItalic', gS, -.01, colW); if (r && r.lines.length <= 1) break; }
          const iS = Math.round(gS * (portrait ? .82 : .84));
          const iW = Math.round(balance(hInvite, 'display', iS, -.014, colW) || colW);
          const aSize = (portrait ? 39 : 34) - lv.ad;
          const br = breakLines(addrBase, 'text', aSize, 0, colW), aText = br ? br.lines.join('\n') : addrBase, aW = br ? 0 : colW;
          const mg = hGreet ? measure(hGreet, { ...GB, size: gS, align: al }) : { w: 0, h: 0 }, gGap = hGreet ? Math.round(gS * .02) : 0;
          const mi = measure(hInvite, { ...IB, size: iS, width: iW, align: al });
          const mh = { w: Math.max(mg.w, mi.w), h: mg.h + gGap + mi.h };
          const ma = measure(aText, { size: aSize, font: 'text', leading: 1.46, width: aW, align: al });
          const r = { li, lv, dH, gS, iS, iW, aSize, aText, aW, mg, gGap, mh, ma, tw: Math.max(mh.w, ma.w) };
          if (short) {
            const yh = bot - ma.h - 20 - mh.h, endY = limit - 2 - dH;
            r.fits = Math.min(yh, endY) >= sT + 4;
          } else {
            const T0 = portrait ? Math.max(150, sT - 36) : sT - 6 - 40 * lv.lift, B0 = limit;
            const g1 = (portrait ? 52 : 34) * lv.g, g2 = (portrait ? 30 : 16) * lv.g, g3 = (portrait ? 50 : 34) * lv.g, words = mh.h + ma.h + dH + g1 + g2 + g3;
            Object.assign(r, { T0, B0, g1, g2, g3, words });
            r.fits = B0 - T0 - words >= lv.sMin * (FH + .5);
          }
          L = r; if (r.fits) break;
        }
        if (domOn) { if (L.lv.fit) endEl.dataset.fit = L.lv.fit; else delete endEl.dataset.fit; }
        c.endFit = L.li; c.endDH = L.dH * u;
        h3g.size = L.gS; h3g.wrap = 0; h3.size = L.iS; h3.wrap = L.iW;
        p3.size = L.aSize; p3.wrap = L.aW; p3.set(L.aText);
        h3g.opt('align', al); h3.opt('align', al); p3.opt('align', al);
        const { mh, ma, dH, tw } = L; c.gOff = L.mg.h + L.gGap;
        if (short) {
          const x0 = Math.max(sS + 20, w * .06), ya = bot - ma.h, yh = ya - 20 - mh.h;
          const S2 = clamp((yh - sT - 40) / (FH + .6), 12, 60);
          c.p2 = { S: S2, x: w * .5, y: Math.max(120, sT - 50) + (FH / 2 + .2) * S2 }; c.t3 = { x: x0, y: yh }; c.tp3 = { x: x0 + 3, y: ya };
          c.endY = limit - 2 - dH;
          c.sh2 = { x: w * .5, y: (Math.min(yh, c.endY) + h) / 2, rx: w * .62, ry: (h - Math.min(yh, c.endY)) * .62, a: .78 };
        } else {
          const { T0, B0, g1, g2, g3, words } = L, sMin = L.lv.sMin;
          const S2 = clamp((B0 - T0 - words) / (FH + .5), sMin, portrait ? 70 : 54), used = (FH + .5) * S2 + words;
          let y0 = T0 + Math.max(0, B0 - T0 - used) * .4;
          if (y0 + used > B0) y0 = Math.max(T0 - (FH + .5) * S2 * .5, B0 - used); // nothing left to give: the constellation tucks under the header, the card never under the rail
          c.p2 = { S: sMin >= 20 ? Math.max(S2, w / 52) : S2, x: w / 2, y: y0 + (FH / 2 + .25) * S2 };
          let y = y0 + (FH + .5) * S2 + g1; c.t3 = { x: w / 2, y }; y += mh.h + g2; c.tp3 = { x: w / 2, y }; y += ma.h + g3; c.endY = y;
          c.sh2 = { x: w / 2, y: (c.t3.y + y + dH) / 2 + 10, rx: Math.min(w * .6, tw / 2 + 230), ry: (y + dH - c.t3.y) / 2 + 120, a: .86 };
        }
      }
      c.sizes = sizes;
      c.L1 = solve(c.p1, sizes, c.B1, c.obst1); c.LO = solve(c.pO, sizes, c.BO, []);
      buildFlights(c);
      C = c; return c;
    }

    // ---------- flight plans (sky coordinates; rebuilt with the layout) ----------
    // Beat 0: in from the left edge, a gentle descending arc just above eta (its sparks fall across eta and theta),
    // then into the lyre's top triangle between epsilon and zeta, receding into Vega. Team about 2.4 degrees long.
    const TEAM_DEG = 2.4, REAR = [121 / 250, 10 / 250];      // runners: behind and just below the team centre (team lengths)
    function buildFlights(c) {
      const eta = sky[6], p = c.p0, nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
      // in high from the left; just over eta (its runners skim the star); a swoop down under the lyre's yoke; up into Vega
      const s0 = [ANCH[0] - (p.x + 20) / p.S - TEAM_DEG * .62, eta[1] + (c.portrait ? 1.6 : 1.05)];
      const m = [eta[0] + .55, eta[1] - .02], tm = nrm(1, -.32), r = c.portrait ? [-.6, 2.25] : [-.75, 2.2];
      const dv = nrm(VEGA[0] - r[0], VEGA[1] - r[1]), hl = Math.min(2.5, (m[0] - s0[0]) * .35);
      FL = flight([s0, [s0[0] + (m[0] - s0[0]) * .4, s0[1] - (c.portrait ? .45 : .1)], [m[0] - tm[0] * hl, m[1] - tm[1] * hl], m,
        [m[0] + tm[0] * 1.2, m[1] + tm[1] * 1.2], [r[0] - dv[0] * 1.2, r[1] - dv[1] * 1.2], r], VEGA, c.portrait ? 6.2 : 5.6, 9.7, .12);
      // when, and how closely, the runners and the sparks falling under them pass each of Lyra's stars
      FL.glint = FIG.map(() => ({ d: 1e9, t: 0 }));
      for (let t = FL.t0; t <= FL.tv; t += .025) {
        const a = FL.at(t - .01), b = FL.at(t + .01), q = FL.at(t), d = nrm(b[0] - a[0], b[1] - a[1]), td = TEAM_DEG * Math.pow(FL.f(t), .8);
        const rx = q[0] - d[0] * REAR[0] * td, ry = q[1] - d[1] * REAR[0] * td - REAR[1] * td, fall = .08 * td;
        for (let i = 1; i < N; i++) {
          const sx = sky[i][0], sy = sky[i][1], yy = clamp(sy, ry - fall, ry), dd = Math.hypot(sx - rx, sy - yy);
          if (dd < FL.glint[i].d) FL.glint[i] = { d: dd, t };
        }
      }
      FL.glint.forEach(g => { g.a = Math.max(Math.exp(-Math.pow(g.d / .45, 2)), .4 * Math.exp(-Math.pow(g.d / 1.1, 2))); });
      // end card: a small team comes in from the right, high, and goes home to Vega before the invitation settles
      const P2 = c.p2, toSky = (X, Y) => [ANCH[0] + (X - P2.x) / P2.S, ANCH[1] - (Y - P2.y) / P2.S];
      const vs = [P2.x + (VEGA[0] - ANCH[0]) * P2.S, P2.y - (VEGA[1] - ANCH[1]) * P2.S];
      const len = clamp(view.cssW * .06, 52, 86) * view.w / view.cssW; c.endTeam = len;
      const e0 = [view.w + len * .7, vs[1] + (c.portrait ? 150 : 120)], er = [vs[0] + Math.min(300, (view.w - vs[0]) * .5), vs[1] + 34];
      const ed = nrm(er[0] - vs[0], er[1] - vs[1]);
      FE = flight([toSky(...e0), toSky(e0[0] - 160, e0[1] - 10), toSky(er[0] + ed[0] * 150, er[1] + ed[1] * 150), toSky(...er)], VEGA, .9, 2.7, .14);
      // reduced motion: parked, small, just above and to the right of Vega, facing it
      const pk = [VEGA[0] + .95, VEGA[1] + .85];
      FP = { at: t => [pk[0] - t * 1e-4, pk[1]], f: () => 1 };
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
      if (s.beat !== lastBeat) { if (open >= 0) closePanel(false); leaveT = lastBeat === 0 && s.beat === 1 && s.dt > 0 ? lastB0 : null; lastBeat = s.beat; }
      const interactive = s.beat === 1 && s.at(1) >= .9; // on the end card the only actions are the CTA, phones and email
      const k1 = s.k(1, 0, 2.2, 'inOutCubic'), k2 = s.k(2, .1, 2.5, 'inOutCubic');
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

      // Lyra's stars (+ the sleigh's twinkle: each star flickers up as the spark trail sweeps past it; Vega flashes
      // once as the team vanishes into it)
      const b0 = s.at(0), red = ctx.reduced(), fly = s.beat === 0 && !red;
      const flash = fly ? Math.exp(-Math.pow((b0 - FL.tv) / .14, 2)) : 0;
      for (let i = 0; i < N; i++) {
        const f = FIG[i], act = interactive && (hoverB === i || hoverL === i || focusI === i) ? 1 : 0, sel = open === i ? 1 : 0;
        hov[i] = snap ? Math.max(act, sel) : damp(hov[i], Math.max(act, sel * .85), 9, s.dt || 1 / 60);
        const e = s.k(0, 3 + i * .1, 4.7 + i * .1, 'outCubic'), nat = f.spike ? .86 : .56;
        const sc = 1 + (f.spike ? .06 : .045) * Math.sin(t * (f.spike ? .83 : 1.1 + i * .17) + i * 2.1) * m + (f.spike ? .035 * Math.sin(t * 2.3 + 1) + .02 * Math.sin(t * 5.3) : .02 * Math.sin(t * 3.1 + i)) * m;
        let gl = 0;
        if (fly && i > 0) { const G = FL.glint[i], dt = b0 - G.t; gl = G.a * smoothstep(-.35, .05, dt) * Math.exp(-Math.max(0, dt) / 1.1) * (.72 + .28 * Math.sin(b0 * 31 + i * 1.9)); }
        if (i === 0) gl = flash;
        const R = f.R * kS * lerp(nat, 1, e) * (1 + hov[i] * (f.spike ? .22 : .5)) * (1 + gl * (f.spike ? .12 : .22)), I = f.I * lerp(f.spike ? .8 : .5, 1, e) * sc * (1 + hov[i] * (f.spike ? .35 : .7)) * (1 + gl * (f.spike ? .45 : 1.7));
        Rv[i] = R;
        const col = hexLin(f.col), tw = f.spike ? .05 * Math.sin(t * 1.9) * m : 0;
        const cl = [col[0] * (1 + tw), col[1], col[2] * (1 - tw)];
        const put = (q, x, y, r, inten) => setStar(q, x, y, r, inten, r * (f.spike ? 30 : 10), f.spike ? lerp(.7, 1, e) * (1 + flash * .5) : 0, i * 1.7, cl);
        if (f.pair) { const sep = Math.max(.04 * pose.S, R * 1.5 + 1.1) * (1 + hov[i] * .25), ax = -sn * sep, ay = -cs * sep; put(i, P[i][0] + ax, P[i][1] + ay, R, I); put(N, P[i][0] - ax, P[i][1] - ay, R * .96, I * .9); Rv[i] = R + sep * .5; }
        else put(i, P[i][0], P[i][1], R, I);
      }

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
      dirty();

      // the sleigh: beat 0 flight past Lyra into Vega; a tiny echo on the end card; parked by Vega under reduced motion
      sleighOn = false;
      const setT = (O0, O1, S) => { sleighT.O = [O0, O1]; sleighT.S = S; sleighT.c = cs; sleighT.s = sn; };
      if (s.beat === 0) {
        setT(ox, oy, pose.S);
        if (red) {
          flightMode = 2; sleigh.trail(0); sleigh.opacity = .9; sleigh.setRim(null, 3); sleigh.update(7.3, null, null, null, TEAM_DEG * .46 * pose.S); sleighOn = true;
        } else if (b0 > FL.t0 - .4 && b0 < FL.tv + .01) {
          flightMode = 0; const f = FL.f(b0);
          sleigh.trail(1); sleigh.opacity = smoothstep(FL.fEnd, FL.fEnd * 1.9, f);
          sleigh.setRim(null, 2.6 + 2.4 * (1 - f));                // the rim gathers as the team dwindles, so it stays a glint
          sleigh.update(b0, null, null, null, TEAM_DEG * pose.S * Math.pow(f, .8)); sleighOn = true;
        }
        if (!red) {
          const te = FL.glint[6].t, pan = x => clamp((x - w / 2) / (w / 2), -1, 1) * .6;
          cue('SLa', b0, te - 1.15, s, () => ctx.sfx('sleigh', { gain: .8, pan: pan(P[6][0]) }));
          cue('SLb', b0, te - .1, s, () => ctx.sfx('jingle', { shake: .45, gain: .34, pan: pan(P[6][0]) }));
          cue('SLc', b0, FL.tv - .04, s, () => ctx.sfx('bell', { gain: .22, pitch: 3, pan: pan(P[0][0]) }));
        }
        lastB0 = b0;
      } else if (s.beat === 1 && leaveT != null && !red && s.at(1) < .8) {
        // stepped on mid-flight: the team flies on and fades out instead of vanishing (a follower, reset in enter)
        const T = leaveT + s.at(1);
        if (T > FL.t0 - .4 && T < FL.tv + .01) {
          setT(ox, oy, pose.S); flightMode = 0; const f = FL.f(T);
          sleigh.trail(1); sleigh.opacity = smoothstep(FL.fEnd, FL.fEnd * 1.9, f) * (1 - s.k(1, 0, .8, 'inOutSine'));
          sleigh.setRim(null, 2.6 + 2.4 * (1 - f)); sleigh.update(T, null, null, null, TEAM_DEG * pose.S * Math.pow(f, .8)); sleighOn = true;
        }
      } else if (s.beat === 2 && !red) {
        const T2 = s.at(2);
        if (T2 > FE.t0 - .4 && T2 < FE.tv + .01) {
          setT(c.p2.x + (ox - pose.x), c.p2.y + (oy - pose.y), c.p2.S); flightMode = 1; const f = FE.f(T2);
          sleigh.trail(.7); sleigh.opacity = smoothstep(FE.fEnd, FE.fEnd * 1.9, f) * .95;
          sleigh.setRim(null, 3.4); sleigh.update(T2, null, null, null, c.endTeam * Math.pow(f, .8)); sleighOn = true;
        }
        cue('EJ', T2, FE.tv - .05, s, () => ctx.sfx('jingle', { shake: .15, gain: .16, pitch: 1.25, pan: .3 }));
      }
      // snow: in front of everything but the words; thinnest while the labels are up
      snow.density(lerp(lerp(.85, .3, k1), .62, k2) * (1 - .55 * oK)).quality(s.q).update(s.time * (red ? .3 : 1));

      // engraving: in, then partly out
      engA = s.k(0, 5.2, 8.4, 'inOutSine') * lerp(1, .55, smoothstep(8.6, 17, s.since(0))) * lerp(1, .7, k1) * lerp(1, .75, k2) * (1 - .45 * oK);
      worldMat.uniforms.uReveal.value = s.k(0, 5.0, 8.3); worldMat.uniforms.uAlpha.value = engA * ENG_GAIN;

      // uniforms
      const glow = .24 * gK * lerp(1, 1.7, k2);
      skyLo.u.uGlow.value = glow; skyHi.u.uQ.value = s.q; skyLo.u.uMW.value = lerp(1, .6, k2);
      worldMat.uniforms.uGain.value = lerp(.55, 1, clamp((pose.S - 28) / 60));
      { const a = c.sh1, b = c.sh2, kk = k2; cam.shade.set(lerp(a.x, b.x, kk), lerp(a.y, b.y, kk), lerp(a.rx, b.rx, kk), lerp(a.ry, b.ry, kk)); cam.shadeA = lerp(lerp(.0, a.a, s.k(0, 3, 5.5)), b.a, kk) * (1 - oK); }
      xfSet(skyLo.u); xfSet(skyHi.u); xfSet(worldMat.uniforms);
      worldMat.uniforms.uTime.value = s.time; worldMat.uniforms.uSc.value = .35 + .65 * m;
      wg.setDrawRange(0, (DYN + NE + Math.floor(NS * clamp(.25 + .75 * s.q, .25, 1))) * 6);
      grade.exposure = lerp(.92, 1, s.k(0, 0, 3)) * (1 - .4 * oK); grade.vignette = lerp(.34, .42, k2) + .1 * oK; grade.saturation = 1.06 - .12 * oK;

      // words
      const o1 = s.k(1, 0, .7), o1p = s.k(1, 0, .55), o2 = s.k(2, 0, .6);
      h1.x = c.t1.x; h1.y = c.t1.y; h1.show(s.k(0, 2.4, 3.7), { style: 'blur', by: 'glyph', q: o1, stagger: .7 });
      p1.x = c.tp1.x; p1.y = c.tp1.y; p1.show(s.k(0, 3.6, 4.8), { style: 'rise', by: 'word', q: o1p });
      h2.x = c.t2.x; h2.y = c.t2.y; h2.alpha = 1 - oK; h2.show(s.k(1, .8, 1.9), { style: 'blur', by: 'glyph', q: o2, stagger: .7 });
      p2.x = c.tp2.x; p2.y = c.tp2.y; p2.alpha = 1 - oK; p2.show(s.k(1, 1.7, 2.7), { style: 'rise', by: 'word', q: o2 });
      h3g.x = c.t3.x; h3g.y = c.t3.y; h3g.alpha = 1 - oK * .9; h3g.show(s.k(2, 1.0, 1.9), { style: 'blur', by: 'glyph', stagger: .7 });
      h3.x = c.t3.x; h3.y = c.t3.y + c.gOff; h3.alpha = 1 - oK * .9; h3.show(s.k(2, 1.3, 2.3), { style: 'blur', by: 'glyph', stagger: .7 });
      p3.x = c.tp3.x; p3.y = c.tp3.y; p3.alpha = 1 - oK * .9; p3.show(s.k(2, 1.9, 3.0), { style: 'rise', by: 'line', stagger: .6 });
      endK = s.k(2, 2.4, 3.4, 'outCubic') * (1 - oK);

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
        if (hh > 4 && c.endDH && Math.abs(hh - c.endDH) > 1.5) C = null; // the card changed height (late font, wrap): lay out again
      } else if (endLive !== null || endEl.style.visibility !== 'hidden') { endEl.style.visibility = 'hidden'; endEl.style.opacity = '0'; }
      if (s.beat === 2 && !on && endH < 4) { endEl.style.top = '-2000px'; endEl.style.visibility = 'hidden'; const hh = endEl.offsetHeight; if (hh > 0) endH = hh; }
      if (live !== endLive) { endLive = live; endEl.inert = !live; endEl.setAttribute('aria-hidden', String(!live)); }
    }

    let sleighOn = false, leaveT = null, lastB0 = 0;
    function renderWorld() {
      skyLo.render(lo); skyHi.u.tLo.value = lo.texture; skyHi.render(hdr);
      gfx.draw(world, dummyCam, hdr, { clear: false });
      if (sleighOn) sleigh.render(hdr);
      snow.render(hdr);
    }
    const labelHit = (x, y) => { for (let i = 0; i < N; i++) { const b = labBox[i]; if (b.a > .5 && x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 10 && y < b.y + b.h + 10) return i; } return -1; };

    relabel();
    return {
      async init() { // compile everything once behind the loader
        try { ctx.audio.warm && ctx.audio.warm([{ sfx: 'bell' }, { sfx: 'select' }, { sfx: 'tick' }, { sfx: 'jingle' }, { sfx: 'sleigh' }]); } catch (e) { /* optional */ }
        cam.view.set(view.w, view.h); cam.S = 90; cam.px = view.scale; cam.hor = view.h * 1.2;
        xfSet(skyLo.u); xfSet(skyHi.u); xfSet(worldMat.uniforms); worldMat.uniforms.uAlpha.value = .1; worldMat.uniforms.uReveal.value = 1;
        for (let q = 0; q < NL; q++) setLine(q, 100 + q, 100, 300, 300 + q, 1, .2, q % 3 === 0 ? 12 : q === NL - 1 ? -1 : 0, .5, LINE_COL);
        for (let i = 0; i < NI; i++) setStar(i, 200 + i * 30, 200, 3, 2, 30, i ? 0 : 1, 0, [1, 1, 1]);
        dirty(); const c = compose(); sleighT.O = [c.p0.x, c.p0.y]; sleighT.S = c.p0.S; flightMode = 0; sleigh.update(FL.tr, null, null, null, 200); sleighOn = true; snow.update(0);
        const tmp = gfx.target({ w: 64, h: 64, hdr: false }); renderWorld(); gfx.post(hdr, tmp, grade); ui.render(tmp); gfx.free(tmp); sleighOn = false;
      },
      enter(s) { tapS = swp = null; endEl.style.visibility = 'hidden'; endEl.style.opacity = '0'; leaveT = null; lastB0 = 0; glowK = s.enter < 1 || (s.beat === 0 && s.bt < 2.5) ? 0 : 1; prev = {}; snap = true; lastBeat = s.beat; hoverB = hoverL = focusI = -1; if (open >= 0) closePanel(false); openK = 0; hov.fill(0); vis.fill(0); starsLive = null; endLive = null; lastT.fill(''); canvas.style.cursor = ''; },
      exit() { if (open >= 0) closePanel(false); hoverB = hoverL = -1; canvas.style.cursor = ''; },
      beat() { if (open >= 0) closePanel(false); },
      resize() { C = null; lastT.fill(''); },
      lang() { relabel(); },
      update,
      render(target) { renderWorld(); gfx.post(hdr, target, grade); ui.render(target); },
      pointer(e, s) {
        if (e.type === 'leave') { hoverL = -1; canvas.style.cursor = ''; return false; }
        const can = s.beat === 1 && starsLive, i = can ? labelHit(e.x, e.y) : -1;
        const touch = e.pointerType && e.pointerType !== 'mouse';
        if (touch) { // no hover on touch; act on a tap, so a swipe that starts on a label still steps the story
          if (e.type === 'down') { tapS = { x: e.x, y: e.y, i }; return false; }
          if (e.type === 'up' && tapS) { const q = tapS; tapS = null; if (Math.hypot(e.x - q.x, e.y - q.y) > 12 * view.w / (view.cssW || view.w)) return false;
            if (i >= 0 && i === q.i && open !== i) openPanel(i); else if (open >= 0) closePanel(false); }
          return false;
        }
        if (e.type === 'move') { if (i !== hoverL) { hoverL = i; canvas.style.cursor = i >= 0 ? 'pointer' : ''; if (i >= 0 && open !== i) ctx.sfx('select', { gain: .28, pitch: pitchOf(i) * .75 }); } return false; }
        if (e.type === 'down') { if (i >= 0 && open !== i) { openPanel(i); return true; } if (open >= 0) { closePanel(false); return true; } }
        return false;
      },
      key(e) { if (e.key === 'Escape' && open >= 0) { closePanel(true); return true; } return false; },
    };
  },
};
