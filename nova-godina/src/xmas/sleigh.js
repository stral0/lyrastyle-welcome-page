// xmas/sleigh.js — Deda Mraz's sleigh and eight reindeer (four pairs) as a backlit silhouette team, with harness
// lines, glinting bells and a trail of gold sparks. Three draw calls: silhouettes (instanced), lines, sparks.
// Works in a 3D scene (camera-facing billboards, size in metres) and in screen space (design units).
// Motion: with a path function the team is a chain: each pair (and the sleigh) is where the path was (or will be) for
// its place along the team, so turns run down the team and the traces curve; every reindeer gallops at its own phase,
// its body bobbing and pitching with its legs and its head lagging; the sleigh swings like a pendulum under the
// path's accelerations and the pull of the strides. All pure functions of time. See src/xmas/README.md for the API.
import { createPen, boxPen, atlasTexture, curve, SIL_HEAD, SIL_SHADE, SIL_DEFAULTS, silUniforms, silSetters, designCamera, mulberry } from './santa.js';

const TAU = Math.PI * 2;
const D = 5;                                   // atlas texels per cell unit (reindeer body ~ 30 units long)
const FUR = { fur: 1 }, CLOTH = { cloth: 1 }, DARK = {}, GLINT = { glint: 1 }, HAIR = { fur: 0.85 }, GILT = { glint: 0.45 };
const RD = { u0: -40, v0: -40, uw: 76, vh: 66 };       // reindeer cell box (units)
const SL = { u0: -30, v0: -40, uw: 60, vh: 56 };       // sleigh cell box
const NF = 16, NFL = 8;                                // gallop frames (fine, bold LOD)

// ------------------------------------------------------------------ reindeer (side view, facing right, body centre at 0,0, y down)
const lerp = (a, b, t) => a + (b - a) * t, lerpN = lerp;
function leg(pen, root, angs, lens, ws, hoofW, f) {
  const pts = [root]; let p = root;
  for (let i = 0; i < angs.length; i++) { p = [p[0] + Math.sin(angs[i]) * lens[i], p[1] + Math.cos(angs[i]) * lens[i]]; pts.push(p); }
  pen.limb(pts, ws, f);
  // hoof: a small wedge continuing the last segment
  const a = angs[angs.length - 1], tip = [p[0] + Math.sin(a) * 1.8, p[1] + Math.cos(a) * 1.8];
  pen.capsule(p, tip, hoofW, hoofW * 0.8, f);
  return tip;
}
// phase 0..1 of the stride; lod: bold simplified shapes for small sizes.
// part: 'body' (legs, body, tail, collar and a stub of the neck; drawn per gallop frame) or 'head' (neck, head, ear,
// antlers; drawn once, unpitched, and posed live about the base of the neck so it can lag the body) or 'all'.
export const NECK = [10.4, -4.4];                    // the head part's pivot (unpitched body units)
export const framePitch = phase => 0.07 * Math.cos(phase * TAU);
export function drawReindeer(pen, phase, rnd, lod = false, part = 'all') {
  const e = 0.5 + 0.5 * Math.sin(phase * TAU);                  // e = 1: stretched out, 0: gathered
  const eF = 0.5 + 0.5 * Math.sin((phase + 0.08) * TAU), eFf = 0.5 + 0.5 * Math.sin((phase + 0.15) * TAU);
  const eH = 0.5 + 0.5 * Math.sin((phase - 0.06) * TAU), eHf = 0.5 + 0.5 * Math.sin((phase + 0.02) * TAU);
  const W = lod ? 1.55 : 1;
  const pitch = part === 'head' ? 0 : framePitch(phase);
  const R = p => { const c = Math.cos(pitch), sn = Math.sin(pitch); return [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]; };
  const body = part !== 'head', head = part !== 'body';
  const front = (ee) => leg(pen, R([9.6, 1.4]), [lerp(0.3, 1.05, ee), lerp(-1.45, 1.2, ee), lerp(-0.55, 1.4, ee)], [8.4, 7.4, 6.4],
    [4.4 * W, 2.7 * W, 2.1 * W, 1.7 * W], 2.0 * W, DARK);
  const hind = (ee) => leg(pen, R([-11.6, 0.6]), [lerp(0.95, -0.45, ee), lerp(-0.45, -1.25, ee), lerp(0.45, -1.45, ee)], [9.0, 8.6, 7.4],
    [5.6 * W, 3.0 * W, 2.0 * W, 1.7 * W], 2.0 * W, DARK);
  if (body) {
    // far legs first (they sit behind the body), then the body, then the near legs
    front(eFf); hind(eHf);
    pen.limb([R([-15.4, -2.2]), R([-17.6, -4.4]), R([-18.4, -6.6])], [3.0 * W, 2.4 * W, 1.0 * W], DARK);
    pen.shape([[-16.2, -1.0], [-14.8, -5.0], [-9.4, -6.4], [-2, -5.8], [5, -6.4], [10.2, -8.0], [13.6, -5.8], [15.2, -1.4], [13.8, 2.8], [8.4, 4.8], [1.0, 4.4],
      [-6, 4.6], [-12.4, 3.6]].map(R), DARK);
    pen.limb([R([9.6, -3.4]), R(NECK), R([12.2, -8.2])], [9.4, 9.0, 8.0], DARK);      // the base of the neck
  }
  if (head) {
    const nb = R(NECK), nm = R([14.2, -11.4]), nh = R([16.8, -15.8]);
    pen.limb([nb, nm, nh], [9.0, 6.0, 4.8], DARK);
    const H = R;
    pen.shape([[15.2, -18.8], [18.4, -20.6], [21.8, -19.4], [24.8, -17.0], [26.6, -15.0], [25.8, -13.4], [22.0, -13.2], [18.2, -13.0], [15.4, -15.0]].map(H), DARK);
    pen.shape([[16.6, -18.4], [13.6, -20.8], [12.6, -20.6], [15.6, -17.6]].map(H), DARK);
    const antler = (o, k) => {
      const sh = p => H([p[0] + o[0], p[1] + o[1]]);
      const beam = lod ? [[17.4, -19.6], [16.2, -23.6], [13.8, -27.0], [10.6, -28.8]] : [[17.6, -19.4], [16.8, -22.8], [15.0, -26.2], [12.4, -28.6], [9.4, -29.6]];
      const bc = curve(beam.map(sh), false, 0.6);
      pen.limb(bc, bc.map((_, i, a) => lerp(1.6, 0.75, i / (a.length - 1)) * W * k), DARK);
      const tines = lod ? [[[16.4, -23.0], [19.0, -26.6]], [[13.6, -27.2], [14.6, -31.0]]]
        : [[[16.8, -22.6], [19.4, -26.0], [19.8, -27.8]], [[14.6, -26.6], [15.8, -30.2], [15.4, -31.8]], [[17.6, -20.8], [20.2, -21.8]]];
      for (const t of tines) { const c = curve(t.map(sh), false, 0.5); pen.limb(c, c.map((_, i, a) => lerp(1.15, 0.55, i / (a.length - 1)) * W * k), DARK); }
    };
    antler([-1.6, -0.9], 0.9); antler([0, 0], 1);
  }
  if (body) {
    const cl = [R([11.0, -7.8]), R([12.8, -3.6]), R([13.6, 0.6])];
    pen.line(cl, 1.4 * W, DARK);
    for (const p of (lod ? [cl[1]] : cl)) pen.circle([p[0] + 0.9, p[1] + 0.4], 1.05 * W, GLINT);
    front(eF); hind(eH);
  }
  return { harness: R([8.0, -3.0]), back: R([2, -6]), neck: R(NECK), pitch };
}

// ------------------------------------------------------------------ sleigh with Deda Mraz seated (units, centre 0,0, y down)
export function drawSleigh(pen, rnd, lod = false) {
  const W = lod ? 1.5 : 1;
  // the sack, piled in the back, bulging above the seat back
  pen.shape([[-21, -8], [-23.4, -14], [-22.2, -21.6], [-17.6, -26.6], [-12.0, -27.6], [-8.4, -24.4], [-8.0, -17], [-9.6, -9]], DARK);
  pen.limb([[-12.4, -27.0], [-11.2, -29.6], [-9.6, -30.4]], [2.6, 1.8, 2.4], DARK);
  // far runner (behind) and struts
  pen.line([[-19, 11.2], [0, 12.0], [17.6, 11.0], [22.4, 6.2], [22.8, 1.6], [20.6, 0.2]], 1.0 * W, DARK);
  // Deda Mraz seated: torso rises above the seat; hat drooping back with its bobble; beard; arm forward with the reins
  pen.shape([[-9.0, -6], [-9.6, -14.6], [-8.0, -19.6], [-4.6, -21.4], [-0.6, -21.0], [2.6, -17.4], [4.0, -12], [4.4, -6]], CLOTH);
  pen.shape([[-5.8, -21.0], [-6.0, -25.2], [-3.4, -27.6], [0.0, -27.4], [1.8, -25.8], [2.8, -24.2], [2.4, -22.8], [1.0, -21.4]], DARK);    // head + nose
  pen.limb(curve([[-2.6, -27.4], [-4.6, -30.2], [-8.0, -31.0], [-10.4, -29.0], [-11.2, -25.8]], false, 0.5), [7.0, 5.2, 4.0, 3.2, 2.8, 2.6, 2.4, 2.4, 2.2, 2.2], CLOTH);
  pen.fur([[-6.6, -26.6], [-3.0, -27.8], [1.2, -27.0]], 2.4 * W, rnd, { len: 0.7 });
  pen.circle([-11.4, -24.4], 1.9 * W, FUR);
  pen.hairs([[-11.4, -26.2], [-13.0, -24.4], [-11.4, -22.6], [-9.8, -24.4]], { width: 0, len: 0.8, hw: 0.3, spacing: 0.25, spread: 0.6, rnd, f: FUR, side: 0, closed: true });
  pen.shape([[0.6, -22.8], [2.8, -21.6], [4.6, -18.6], [5.2, -15.2], [3.8, -12.6], [1.6, -14.4], [-0.4, -18.4]], HAIR);       // beard
  pen.hairs([[2.8, -21.6], [4.6, -18.6], [5.2, -15.2], [3.8, -12.6]], { width: 0.3, len: 1.0, hw: 0.25, spacing: 0.2, spread: 0.4, flow: 0.6, rnd, f: HAIR, side: 1 });
  pen.limb([[-2.6, -17.8], [3.6, -12.4], [8.4, -14.4]], [4.2, 3.6, 3.2], CLOTH);                                                // arm with the reins
  pen.fur([[7.4, -16.4], [7.8, -12.4]], 1.8 * W, rnd, { len: 0.6 });
  pen.ellipse([9.8, -14.4], 1.9, 1.6, 0, DARK);
  // the sleigh body: high curved back, low waist, scrolled dash at the front
  const body = [[-21.2, -1.6], [-21.8, -8.6], [-20.6, -14.6], [-18.2, -16.6], [-16.2, -14.6], [-15.4, -9.2], [-10, -6.8], [0, -6.4], [8, -6.8],
    [12.6, -9.0], [15.8, -12.6], [18.4, -13.8], [20.2, -12.0], [19.2, -9.2], [16.6, -4.8], [13.6, 2.2], [8, 5.2], [-6, 5.6], [-15.6, 4.6], [-19.8, 2.0]];
  pen.shape(body, DARK);
  // gilt edge along the top of the body and the dash scroll catch the light
  pen.line([[-21.8, -8.6], [-20.6, -14.6], [-18.2, -16.6], [-16.2, -14.6], [-15.4, -9.2], [-10, -6.8], [0, -6.4], [8, -6.8], [12.6, -9.0], [15.8, -12.6], [18.4, -13.8], [20.2, -12.0]], 0.9 * W, GILT);
  pen.circle([18.6, -11.2], 1.8 * W, DARK);
  // struts and the near runner: a long curved bar ending in a scroll at the front
  for (const x of [-14, -3, 8]) pen.capsule([x, 4.4], [x + 1.2, 11.8], 1.3 * W, 1.1 * W, DARK);
  const run = [[-21.4, 10.6], [-17, 12.4], [0, 12.8], [16.4, 12.0], [21.8, 8.6], [24.2, 3.6], [23.0, 0.2], [20.6, 0.4], [20.2, 2.6], [21.8, 3.4]];
  pen.line(run, 1.5 * W, DARK);
  pen.line([[-21.4, 10.6], [-17, 12.4], [0, 12.8], [16.4, 12.0], [21.8, 8.6], [24.2, 3.6]], 0.6 * W, GILT);
  // two bells on the dash
  pen.circle([17.0, -3.4], 1.2 * W, GLINT); pen.circle([15.4, -0.8], 1.0 * W, GLINT);
  return { hands: [10.2, -14.4], dash: [17.2, -2.0], rear: [-21.0, 8.0] };
}

// ------------------------------------------------------------------ atlas
// 16 gallop frames (bodies) + 8 bold LOD frames, the head (fine + LOD), the sleigh (fine + LOD)
let ATLAS = null;
function buildAtlas(seed = 31) {
  if (ATLAS) return ATLAS;
  const pad = 4, rw = Math.ceil(RD.uw * D), rh = Math.ceil(RD.vh * D), sw = Math.ceil(SL.uw * D), sh = Math.ceil(SL.vh * D);
  const hb = boxPen(); drawReindeer(hb, 0, mulberry(1), true, 'head');
  const HD = { u0: hb.box[0] - 1, v0: hb.box[1] - 1, uw: hb.box[2] - hb.box[0] + 2, vh: hb.box[3] - hb.box[1] + 2 };
  const hw = Math.ceil(HD.uw * D), hh = Math.ceil(HD.vh * D);
  const cols = 6, nDeer = NF + NFL, rows = Math.ceil(nDeer / cols);
  const W = cols * (rw + pad) + Math.max(sw, hw) + 2 * pad, H = Math.max(rows * (rh + pad) + pad, 2 * (sh + pad) + 2 * (hh + pad) + pad);
  const pen = createPen(W, H, D);
  const cells = [], meta = { frames: [], lod: [] };
  for (let i = 0; i < nDeer; i++) {
    const lod = i >= NF, ph = lod ? (i - NF) / NFL : i / NF;
    const c = { x: pad + (i % cols) * (rw + pad), y: pad + Math.floor(i / cols) * (rh + pad), w: rw, h: rh, u0: RD.u0, v0: RD.v0, box: RD };
    pen.begin(c); const m = drawReindeer(pen, ph, mulberry(seed + i), lod, 'body'); pen.end();
    cells.push(c); (lod ? meta.lod : meta.frames).push(m);
  }
  const x2 = cols * (rw + pad) + pad;
  for (let i = 0; i < 2; i++) {        // sleigh: cells nDeer, nDeer + 1
    const c = { x: x2, y: pad + i * (sh + pad), w: sw, h: sh, u0: SL.u0, v0: SL.v0, box: SL };
    pen.begin(c); const m = drawSleigh(pen, mulberry(seed + 100 + i), i === 1); pen.end();
    cells.push(c); if (i === 0) meta.sleigh = m;
  }
  for (let i = 0; i < 2; i++) {        // heads: cells nDeer + 2, nDeer + 3
    const c = { x: x2, y: pad + 2 * (sh + pad) + i * (hh + pad), w: hw, h: hh, u0: HD.u0, v0: HD.v0, box: HD };
    pen.begin(c); drawReindeer(pen, 0, mulberry(seed + 200 + i), i === 1, 'head'); pen.end();
    cells.push(c);
  }
  ATLAS = { W, H, data: pen.data(), cells, meta, nDeer, HD };
  return ATLAS;
}

// ------------------------------------------------------------------ team layout (units; x forward, y down; sleigh centre at 0,0)
const PAIRS = 4;
const pairPos = j => [58 + 46 * j, -9 - 6.5 * j];
const FAR = [5.5, -3.6];
const TEAM_C = [100, -14], TEAM_LEN = 250;
const NA = 9, NA2 = 4, AS = 26;                  // centre-line samples for the chain (team units apart)

// ------------------------------------------------------------------ shaders
// Each instance (a reindeer, or the sleigh) sits at its own view-space anchor (so the team can follow its path as a
// chain, in perspective), turned to its own heading, mirrored when flying left. The reindeer's head is a second atlas
// tap posed about the base of the neck (it lags the body); the union is shaded, so there is no seam.
const SIL_VS = /* glsl */`
precision highp float;
in vec2 position;                         // 0..1 quad corner
in vec4 aQuad;                            // cell-unit bounds of the quad: u0, v0, u1, v1
in vec4 aAnchor;                          // view-space position of the cell origin, w: view units per cell unit
in vec4 aRot;                             // angle (rad, view plane), flip, body cell, head cell (-1: none)
in vec4 aHead;                            // head pivot now (cell units), head angle, unused
uniform mat4 projectionMatrix; uniform vec2 uLightS; uniform vec2 uNeck;
out vec2 vP; flat out ivec2 vCell; flat out vec2 vLight; flat out vec3 vHead;
void main(){
  vec2 pu = mix(aQuad.xy, aQuad.zw, position);
  vP = pu; vCell = ivec2(floor(aRot.z + .5), floor(aRot.w + .5)); vHead = aHead.xyz;
  float c = cos(aRot.x), s = sin(aRot.x), f = aRot.y;
  vec2 l = vec2(pu.x * f, -pu.y); l = vec2(c * l.x - s * l.y, s * l.x + c * l.y) * aAnchor.w;
  // the light, from screen terms into this instance's (rotated, mirrored) cell space
  vec2 L = vec2(c * uLightS.x + s * uLightS.y, -s * uLightS.x + c * uLightS.y);
  vLight = normalize(vec2(f * L.x, -L.y) + 1e-5);
  gl_Position = projectionMatrix * vec4(aAnchor.xyz + vec3(l, 0.), 1.);
}`;
const SIL_FS = /* glsl */`
uniform vec4 uCellO[30]; uniform vec4 uCellB[30]; uniform vec2 uNeck;
in vec2 vP; flat in ivec2 vCell; flat in vec2 vLight; flat in vec3 vHead; out vec4 fragColor;
#define uLight vLight
vec4 tapc(int i, vec2 p, float lod){
  vec4 o = uCellO[i], b = uCellB[i];
  vec2 uv = o.xy + p * o.zw;
  if (uv.x < b.x || uv.y < b.y || uv.x > b.z || uv.y > b.w) return vec4(0.);
  return textureLod(tAtlas, uv, lod);
}
vec4 S(vec2 p, float lod){
  vec4 b = tapc(vCell.x, p, lod);
  if (vCell.y < 0) return b;
  vec2 d = p - vHead.xy; float c = cos(vHead.z), s = sin(vHead.z);
  vec4 h = tapc(vCell.y, vec2(c * d.x + s * d.y, -s * d.x + c * d.y) + uNeck, lod);
  return b + h * (1. - b.a);
}
`;
const LINE_VS = /* glsl */`
precision highp float;
in vec4 position;                         // view-space x, y, z; w: 0..1 across the line
uniform mat4 projectionMatrix;
out float vX;
void main(){ vX = position.w; gl_Position = projectionMatrix * vec4(position.xyz, 1.); }`;
const LINE_FS = /* glsl */`
precision highp float;
in float vX; out vec4 fragColor;
uniform vec3 uRimColor, uFill; uniform float uRim, uOpacity, uLineA;
void main(){
  float d = abs(vX * 2. - 1.);
  float a = smoothstep(1., .45, d) * uLineA;
  vec3 c = uFill + uRimColor * uRim * .22 * smoothstep(.2, -.6, vX * 2. - 1.);   // lit along its upper edge
  fragColor = vec4(c * a, a) * uOpacity;
}`;
const SPARK_VS = /* glsl */`
precision highp float;
in vec2 position;                         // -1..1 corner
in vec4 aP;                               // xyz position (world or design: x, -y, 0), w: size (m or design units)
in vec2 aA;                               // alpha, twinkle phase
uniform mat4 projectionMatrix, viewMatrix; uniform float uTime, uPxMin, uPersp;
out vec2 vC; out float vA;
void main(){
  vC = position;
  vec4 mv = viewMatrix * vec4(aP.xyz, 1.);
  float z = uPersp > .5 ? max(-mv.z, 1e-3) : 1.;
  float r = max(aP.w, uPxMin * z);
  float tw = .55 + .45 * sin(uTime * 23. + aA.y * 40.) * sin(uTime * 7.3 + aA.y * 13.);
  vA = aA.x * tw * (aP.w * aP.w) / (r * r) * (aA.x > 0. ? 1. : 0.);
  mv.xy += position * r;
  gl_Position = aA.x > 0. ? projectionMatrix * mv : vec4(2., 2., 2., 1.);
}`;
const SPARK_FS = /* glsl */`
precision highp float;
in vec2 vC; in float vA; out vec4 fragColor;
uniform vec3 uSpark; uniform float uOpacity;
void main(){
  float r2 = dot(vC, vC); if (r2 > 1.) discard;
  float core = exp(-r2 * 9.), halo = exp(-r2 * 2.5) * .25;
  float star = (exp(-abs(vC.x) * 26.) + exp(-abs(vC.y) * 26.)) * exp(-r2 * 1.5) * .35;
  float k = (core + halo + star) * vA * uOpacity;
  fragColor = vec4(uSpark * k, 0.);
}`;

// ------------------------------------------------------------------ the object
export function createSleigh(ctx, opts = {}) {
  const { THREE } = ctx;
  const o = { ...SIL_DEFAULTS, rim: 2.2, rimPx: 1.2, softPx: 4, rimClamp: [0.08, 0.4, 0.3, 1.2], wrap: 0.3, mode: 'world', size: 12, gallop: 1.9, sparks: 240, sparkLife: 2.5, sparkRate: 1, lodPx: 26, chain: 1, ...opts };
  const A = buildAtlas(o.seed || 31);
  const tex = atlasTexture(THREE, A.data, A.W, A.H);
  const screen = o.mode === 'screen';
  const U = { ...silUniforms(THREE, tex, o), uCellO: { value: [] }, uCellB: { value: [] }, uLightS: { value: new THREE.Vector2(0.5, 0.8) }, uNeck: { value: new THREE.Vector2(NECK[0], NECK[1]) } };
  U.uTexel.value = D;
  A.cells.forEach(c => {
    U.uCellO.value.push(new THREE.Vector4((c.x - c.u0 * D) / A.W, (c.y - c.v0 * D) / A.H, D / A.W, D / A.H));
    U.uCellB.value.push(new THREE.Vector4(c.x / A.W, c.y / A.H, (c.x + c.w) / A.W, (c.y + c.h) / A.H));
  });
  while (U.uCellO.value.length < 30) { U.uCellO.value.push(new THREE.Vector4()); U.uCellB.value.push(new THREE.Vector4()); }
  const blendPM = { transparent: true, depthWrite: false, depthTest: !screen && o.depthTest !== false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
  const silMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: SIL_VS, uniforms: U, ...blendPM,
    fragmentShader: SIL_HEAD + SIL_FS + SIL_SHADE + `void main(){ fragColor = shade(vP); if (fragColor.a < .002 && dot(fragColor.rgb, vec3(1.)) < .002) discard; }` });

  // ---- silhouette instances: pairs from the lead pair back (far member first), then the sleigh in front
  const NI = PAIRS * 2 + 1;
  const sg = new THREE.InstancedBufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); sg.setIndex([0, 1, 2, 0, 2, 3]);
  const mk = n => new THREE.InstancedBufferAttribute(new Float32Array(NI * n), n);
  const aQuad = mk(4), aAnchor = mk(4).setUsage(THREE.DynamicDrawUsage), aRot = mk(4).setUsage(THREE.DynamicDrawUsage), aHead = mk(4).setUsage(THREE.DynamicDrawUsage);
  sg.setAttribute('aQuad', aQuad); sg.setAttribute('aAnchor', aAnchor); sg.setAttribute('aRot', aRot); sg.setAttribute('aHead', aHead); sg.instanceCount = NI;
  const BS = () => new THREE.Sphere(new THREE.Vector3(), 1e6);
  sg.boundingSphere = BS();
  const silMesh = new THREE.Mesh(sg, silMat); silMesh.frustumCulled = false; silMesh.renderOrder = 2;
  const slots = [];
  for (let j = PAIRS - 1; j >= 0; j--) { slots.push({ j, far: true }); slots.push({ j, far: false }); }
  slots.push({ sleigh: true });
  // each reindeer its own: phase offset (pairs and pair members never in lockstep), size, bob, head carriage
  const vr = mulberry((o.seed || 31) * 7 + 3);
  slots.forEach((sl, i) => {
    const b = sl.sleigh ? SL : RD; aQuad.setXYZW(i, b.u0, b.v0, b.u0 + b.uw, b.v0 + b.vh);
    if (!sl.sleigh) { sl.k = sl.j * 2 + (sl.far ? 1 : 0); sl.ph = sl.j * 0.27 + (sl.far ? 0.12 : 0) + (vr() - 0.5) * 0.08; sl.sz = 0.95 + 0.1 * vr(); sl.bob = 0.85 + 0.3 * vr(); sl.hd = (vr() - 0.5) * 0.08; sl.w = vr() * 6.28; }
    sl.u = sl.sleigh ? [0, 0] : [pairPos(sl.j)[0] + (sl.far ? FAR[0] : 0), pairPos(sl.j)[1] + (sl.far ? FAR[1] : 0)];
  });
  aQuad.needsUpdate = true;

  // ---- harness lines (view space): traces sleigh dash -> pair 0 -> ... -> lead pair, plus the reins from the hands
  const SEG = 10, NL = PAIRS + 1, lineN = NL * SEG;
  const lg = new THREE.BufferGeometry();
  const lpos = new Float32Array(lineN * 4 * 4); const lidx = [];
  for (let i = 0; i < lineN; i++) { const b = i * 4; lidx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  lg.setAttribute('position', new THREE.BufferAttribute(lpos, 4).setUsage(THREE.DynamicDrawUsage)); lg.setIndex(lidx);
  const LU = { uRimColor: U.uRimColor, uFill: U.uFill, uRim: U.uRim, uOpacity: U.uOpacity, uLineA: { value: 1 } };
  const lineMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: LINE_VS, fragmentShader: LINE_FS, uniforms: LU, ...blendPM });
  lg.boundingSphere = BS();
  const lineMesh = new THREE.Mesh(lg, lineMat); lineMesh.frustumCulled = false; lineMesh.renderOrder = 1;

  // ---- sparks
  const NS = Math.max(8, Math.round(o.sparks));
  const pg = new THREE.InstancedBufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2)); pg.setIndex([0, 1, 2, 0, 2, 3]);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(NS * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aA = new THREE.InstancedBufferAttribute(new Float32Array(NS * 2), 2).setUsage(THREE.DynamicDrawUsage);
  pg.setAttribute('aP', aP); pg.setAttribute('aA', aA); pg.instanceCount = NS;
  const PU = { uTime: U.uTime, uPxMin: { value: 0.001 }, uPersp: { value: screen ? 0 : 1 }, uSpark: { value: new THREE.Vector3(4.2, 2.3, 0.75) }, uOpacity: U.uOpacity };
  const sparkMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: SPARK_VS, fragmentShader: SPARK_FS, uniforms: PU,
    transparent: true, depthWrite: false, depthTest: !screen && o.depthTest !== false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  pg.boundingSphere = BS();
  const sparkMesh = new THREE.Mesh(pg, sparkMat); sparkMesh.frustumCulled = false; sparkMesh.renderOrder = 3;
  const sr = mulberry(o.seed || 977), sparkSeed = new Float32Array(NS * 6);
  for (let i = 0; i < NS * 6; i++) sparkSeed[i] = sr();

  const group = new THREE.Group(); group.add(lineMesh, silMesh, sparkMesh);
  const scene = new THREE.Scene(); const dcam = designCamera(THREE, ctx.view);

  // ---- state
  const st = { time: 0, flip: 1, ang: 0, bank: 0, lod: 0, size: o.size, hist: [], pxPerUnit: 1, camera: null, speed: 0, chainW: 0, bend: [0, 0] };
  const angS = new Float64Array(NA), pxS = new Float64Array(NA), pyS = new Float64Array(NA);
  const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3(), camR = new THREE.Vector3(), camU = new THREE.Vector3();

  // a world (or design) point -> view space [x, y, z]
  function toVS(p, camera) { tmpV.set(p[0], screen ? -p[1] : p[1], screen ? 0 : p[2]).applyMatrix4(camera.matrixWorldInverse); return [tmpV.x, tmpV.y, tmpV.z]; }
  // a point -> the screen plane (x right, y up), in view-space metres at unit depth or design units
  function toView(p, camera) { const v = toVS(p, camera); if (screen) return [v[0], v[1]]; const z = Math.max(1e-3, -v[2]); return [v[0] / z, v[1] / z]; }
  // heading in the screen plane from pos + dir (flip given: angle of the path for that facing)
  function heading(pos, dir, camera, flip0) {
    const a = toView(pos, camera), e = 1e-2 * (screen ? 100 : 1);
    const b = toView(screen ? [pos[0] + dir[0] * e, pos[1] + dir[1] * e] : [pos[0] + dir[0] * e, pos[1] + dir[1] * e, pos[2] + dir[2] * e], camera);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const flip = flip0 || (dx < 0 ? -1 : 1);
    return { flip, ang: flip * Math.max(-0.75, Math.min(0.75, Math.atan2(dy, flip * dx + 1e-9))) };
  }
  function offsetToWorld(off, pos, camera) {
    if (screen) return [pos[0] + off[0], pos[1] - off[1], 0];
    camR.setFromMatrixColumn(camera.matrixWorld, 0); camU.setFromMatrixColumn(camera.matrixWorld, 1);
    return [pos[0] + camR.x * off[0] + camU.x * off[1], pos[1] + camR.y * off[0] + camU.y * off[1], pos[2] + camR.z * off[0] + camU.z * off[1]];
  }
  const R2 = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * x - s * y, s * x + c * y]; };
  const phaseOf = (sl, t) => (((t * o.gallop + sl.ph) % 1) + 1) % 1;
  const P2 = (o.path ? t => o.path(t) : null);
  const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0));

  const sleigh = {
    object: group, group, meshes: [silMesh, lineMesh, sparkMesh],
    get size() { return st.size; },
    // time: seconds. pos/dir: world [x,y,z] (or design [x,y], y down, in screen mode). camera: required in world mode.
    // With opts.path = t => ({ pos, dir }), pos/dir may be omitted; then the team follows the path as a chain (each pair
    // where the path was a moment ago) and the spark trail is a pure function of time.
    update(time, pos, dir, camera, size) {
      if (size != null) st.size = size;
      if (screen) { dcam.fit(); camera = dcam; }
      camera = camera || st.camera; st.camera = camera;
      if ((!pos || !dir) && o.path) { const P = o.path(time); pos = P.pos; dir = P.dir; }
      if (!pos || !camera) return sleigh;
      camera.updateMatrixWorld();
      if (time < st.time - 1e-4 || time > st.time + 1.0) st.hist.length = 0;   // a jump: forget the history
      st.time = time; U.uTime.value = time;
      const h = heading(pos, dir, camera);
      const scale = st.size / TEAM_LEN;                                     // metres (design units) per team unit
      // speed along the path (world units / s), its turning (bank) and the sleigh's swing (pendulum)
      let turn = 0, swing = 0, speed = 0;
      if (P2) {
        const a = P2(time - 0.2), b = P2(time + 0.2), m1 = P2(time - 0.05), m2 = P2(time + 0.05);
        turn = (heading(b.pos, b.dir, camera, h.flip).ang - heading(a.pos, a.dir, camera, h.flip).ang) / 0.4;
        speed = dist3(m1.pos, m2.pos) / 0.1;
        // lateral acceleration in the screen plane, in team lengths / s^2: the sleigh hangs back and swings out
        const va = toVS(a.pos, camera), vp = toVS(pos, camera), vb = toVS(b.pos, camera), z = screen ? 1 : Math.max(1e-3, -vp[2]);
        const ax = (va[0] - 2 * vp[0] + vb[0]) / 0.04 / z, ay = (va[1] - 2 * vp[1] + vb[1]) / 0.04 / z;
        const hx = Math.cos(h.ang) * h.flip, hy = Math.sin(h.ang) * h.flip;
        const L = (screen ? st.size : st.size / z);
        swing = Math.max(-0.16, Math.min(0.16, -(ax * -hy + ay * hx) / L * 0.05 * h.flip - (ax * hx + ay * hy) / L * 0.02));
      } else if (st.hist.length) { const q = st.hist[st.hist.length - 1]; if (time - q.t > 1e-3) turn = (h.ang - q.ang) / (time - q.t); }
      st.bank = Math.max(-0.22, Math.min(0.22, turn * 0.35)) + (o.bank || 0);
      st.flip = h.flip; st.ang = h.ang + st.bank * 0.6; st.speed = speed;
      // chain weight: the team follows its path when it is really moving; a crawl (or no path) is a rigid team
      const cw = P2 ? o.chain * Math.max(0, Math.min(1, (speed / Math.max(1e-6, st.size) - 0.35) / 0.4)) : 0; st.chainW = cw;
      const vA = toVS(pos, camera);
      // pixels per unit (for LOD, line width, spark size floor)
      let pxPerUnit;
      if (screen) { pxPerUnit = scale * ctx.gfx.H / ctx.view.h; PU.uPxMin.value = 1.4 * ctx.view.h / ctx.gfx.H; }
      else {
        const fov = (camera.fov || 50) * Math.PI / 180, z = Math.max(1e-3, -vA[2]);
        pxPerUnit = scale / (2 * z * Math.tan(fov / 2)) * ctx.gfx.H;
        PU.uPxMin.value = 1.4 * 2 * Math.tan(fov / 2) / ctx.gfx.H;
      }
      st.pxPerUnit = pxPerUnit;
      const deerPx = 30 * pxPerUnit;
      st.lod = deerPx < o.lodPx ? 1 : deerPx > o.lodPx * 1.25 ? 0 : st.lod;
      if (sleigh._light) { const [lx, ly] = sleigh._light, l = Math.hypot(lx, ly) || 1; U.uLightS.value.set(lx / l, ly / l); }
      // ---- each element: where the path was (or will be) for its place along the team; its own heading
      const E = [];
      const fps = st.lod ? NFL : NF;
      // the team's centre line: headings sampled along it, each where the path is (or was) at that place in the team,
      // integrated from the anchor (so the spacing is kept and the team bends through the turns like a chain)
      for (let k = 0; k < NA; k++) {
        const a = (k - NA2) * AS;
        let dev = 0;
        if (cw > 0 && k !== NA2) { const Q = P2(time + a * scale / Math.max(speed, 1e-6)), hq = heading(Q.pos, Q.dir, camera, st.flip); dev = Math.max(-0.5, Math.min(0.5, hq.ang - h.ang)) * cw * 0.85; }
        angS[k] = st.ang + dev;
      }
      pxS[NA2] = pyS[NA2] = 0;
      for (let k = NA2 + 1; k < NA; k++) { const m = (angS[k - 1] + angS[k]) / 2; pxS[k] = pxS[k - 1] + Math.cos(m) * st.flip * AS * scale; pyS[k] = pyS[k - 1] + Math.sin(m) * st.flip * AS * scale; }
      for (let k = NA2 - 1; k >= 0; k--) { const m = (angS[k + 1] + angS[k]) / 2; pxS[k] = pxS[k + 1] - Math.cos(m) * st.flip * AS * scale; pyS[k] = pyS[k + 1] - Math.sin(m) * st.flip * AS * scale; }
      const along = a => { const f = Math.max(0, Math.min(NA - 1.001, a / AS + NA2)), k = Math.floor(f), w = a / AS + NA2 - k;
        return [lerpN(pxS[k], pxS[k + 1], w), lerpN(pyS[k], pyS[k + 1], w), lerpN(angS[k], angS[k + 1], Math.max(0, Math.min(1, w)))]; };
      slots.forEach((sl, i) => {
        const c = along(sl.u[0] - TEAM_C[0]), ang = c[2];
        const perp = R2(0, -(sl.u[1] - TEAM_C[1]) * scale, ang);
        const vp = [vA[0] + c[0] + perp[0], vA[1] + c[1] + perp[1], vA[2]];
        if (sl.sleigh) {
          // the sleigh hangs from the traces: it swings with the path's accelerations, and with the pull of each stride
          const pull = 0.018 * Math.sin((time * o.gallop + slots[slots.length - 2].ph) * TAU) + 0.012 * Math.sin(time * 1.7 + 0.4);
          const sa = ang + swing * st.flip + pull;
          E.push({ vp, ang: sa, s: scale }); aAnchor.setXYZW(i, vp[0], vp[1], vp[2], scale);
          { const rr = R2(-TEAM_C[0] * st.flip * scale, TEAM_C[1] * scale, st.ang); st.bend = [vp[0] - vA[0] - rr[0], vp[1] - vA[1] - rr[1]]; }
          const c = A.nDeer + st.lod; aRot.setXYZW(i, sa, st.flip, c, -1); aHead.setXYZW(i, 0, 0, 0, 0);
          return;
        }
        const ph = phaseOf(sl, time), fi = Math.floor(ph * fps) % fps, fr = (st.lod ? A.meta.lod : A.meta.frames)[fi];
        // body: highest when the legs gather under it (the suspension), pitching with the stride; a slow drift per deer
        const bob = 1.7 * sl.bob * Math.sin(ph * TAU) + 0.7 * Math.sin(time * 0.9 + sl.w);
        const pit = 0.045 * Math.sin((ph + 0.1) * TAU) + 0.015 * Math.sin(time * 1.3 + sl.w);
        const bo = R2(0, -bob * scale, ang);
        const anc = [vp[0] + bo[0], vp[1] + bo[1], vp[2]], s = scale * sl.sz, ra = ang + pit * st.flip;
        aAnchor.setXYZW(i, anc[0], anc[1], anc[2], s);
        // the head lags the body's pitch (it is carried, not bolted on)
        const lagP = framePitch(ph - 0.13), hang = fr.pitch * 0.25 + lagP * 0.75 - 0.6 * (pit - 0.045 * Math.sin((ph - 0.05) * TAU)) + sl.hd + 0.05 * Math.sin((ph - 0.22) * TAU);
        aRot.setXYZW(i, ra, st.flip, fi + (st.lod ? NF : 0), A.nDeer + 2 + st.lod);
        aHead.setXYZW(i, fr.neck[0], fr.neck[1], hang, 0);
        E.push({ vp: anc, ang: ra, s, fr });
      });
      aAnchor.needsUpdate = true; aRot.needsUpdate = true; aHead.needsUpdate = true;
      // ---- lines: thickness at least ~1.1 px
      const pxV = screen ? ctx.view.h / ctx.gfx.H : 2 * Math.tan((camera.fov || 50) * Math.PI / 360) / ctx.gfx.H;   // view units per px (at unit depth)
      LU.uLineA.value = Math.min(1, pxPerUnit * 0.9 + 0.35);
      const at = (e, p) => { const q = R2(p[0] * st.flip * e.s, -p[1] * e.s, e.ang); return [e.vp[0] + q[0], e.vp[1] + q[1], e.vp[2]]; };
      const sE = E[E.length - 1], dE = j => E[slots.findIndex(q => q.j === j && !q.far)];
      const harness = j => at(dE(j), dE(j).fr.harness);
      const polys = [[at(sE, A.meta.sleigh.dash), harness(0)]];
      for (let j = 1; j < PAIRS; j++) polys.push([harness(j - 1), harness(j)]);
      { const hp = dE(0).fr.harness; polys.push([at(sE, A.meta.sleigh.hands), at(dE(0), [hp[0] - 3, hp[1] - 4])]); }
      let q = 0;
      polys.forEach((pl, li) => {
        const a = pl[0], b = pl[1], sag = (li === PAIRS ? 3.2 : 1.6) * scale;
        const z = screen ? 1 : Math.max(1e-3, -(a[2] + b[2]) / 2), th = Math.max(0.45 * scale, 1.15 * pxV * z);
        for (let k = 0; k < SEG; k++) {
          const t0 = k / SEG, t1 = (k + 1) / SEG;
          const P0 = [lerpN(a[0], b[0], t0), lerpN(a[1], b[1], t0) - sag * 4 * t0 * (1 - t0), lerpN(a[2], b[2], t0)], P1 = [lerpN(a[0], b[0], t1), lerpN(a[1], b[1], t1) - sag * 4 * t1 * (1 - t1), lerpN(a[2], b[2], t1)];
          const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * th / 2, ny = dx / L * th / 2;
          lpos.set([P0[0] + nx, P0[1] + ny, P0[2], 0, P0[0] - nx, P0[1] - ny, P0[2], 1, P1[0] + nx, P1[1] + ny, P1[2], 0, P1[0] - nx, P1[1] - ny, P1[2], 1], q * 16);
          q++;
        }
      });
      lg.attributes.position.needsUpdate = true;
      // remember where we were (for history-based sparks and banking)
      st.hist.push({ t: time, pos: pos.slice(), flip: st.flip, ang: h.ang, fullAng: st.ang, scale });
      while (st.hist.length > 2 && st.hist[0].t < time - o.sparkLife - 0.5) st.hist.shift();
      if (st.hist.length > 600) st.hist.splice(0, st.hist.length - 600);
      updateSparks(time, camera, scale);
      return sleigh;
    },
    render(target = null, camera) {
      camera = camera || (screen ? dcam : st.camera); if (!camera) return;
      if (screen) dcam.fit();
      const parent = group.parent; scene.add(group);
      ctx.gfx.draw(scene, camera, target, { clear: false });
      scene.remove(group); if (parent && parent !== scene) parent.add(group);
    },
    trail(v) { sleigh._trail = v; return sleigh; },
    // ring(t, k): the bells ring at time t (same clock as update): sparks shake loose and fall below (k 0..1; null: none)
    ring(t, k = 1) { sleigh._ring = t == null ? null : { t, k }; return sleigh; },
    dispose() { sg.dispose(); lg.dispose(); pg.dispose(); silMat.dispose(); lineMat.dispose(); sparkMat.dispose(); tex.dispose(); if (group.parent) group.parent.remove(group); },
  };
  sleigh._trail = 1;

  // pose of the sleigh at a past time tb: from the path function (chain: where the path was for the sleigh), or the history
  function poseAt(tb, camera) {
    if (o.path) { const P = o.path(tb), h = heading(P.pos, P.dir, camera, st.flip); return { pos: P.pos, flip: h.flip, ang: h.ang, scale: st.size / TEAM_LEN }; }
    const H = st.hist; if (!H.length || tb < H[0].t || tb > H[H.length - 1].t) return null;
    let i = H.length - 1; while (i > 0 && H[i - 1].t > tb) i--;
    const a = H[Math.max(0, i - 1)], b = H[i], w = b.t > a.t ? (tb - a.t) / (b.t - a.t) : 1;
    return { pos: a.pos.map((v, k) => lerpN(v, b.pos[k], w)), flip: b.flip, ang: lerpN(a.fullAng, b.fullAng, w), scale: lerpN(a.scale, b.scale, w) };
  }
  // team-unit point -> offset in the screen plane from the pose's reference point
  // team-unit point -> offset in the screen plane from the team's centre (plus the sleigh's current bend in the chain)
  function teamOffset(u, pose, bend = 1) {
    const t = [(u[0] - TEAM_C[0]) * pose.flip, -(u[1] - TEAM_C[1])];
    const c = Math.cos(pose.ang), s = Math.sin(pose.ang);
    return [(c * t[0] - s * t[1]) * pose.scale + st.bend[0] * bend, (s * t[0] + c * t[1]) * pose.scale + st.bend[1] * bend];
  }
  function updateSparks(time, camera, scale) {
    const life = o.sparkLife, n = NS, P = life / n;
    const unit = scale;
    const rear = A.meta.sleigh.rear;
    if (!screen) { camR.setFromMatrixColumn(camera.matrixWorld, 0); camU.setFromMatrixColumn(camera.matrixWorld, 1); }
    for (let i = 0; i < n; i++) {
      const tb = Math.floor((time - i * P) / life) * life + i * P, age = time - tb;
      const sd = i * 6;
      let alpha = 0;
      // a ring of the bells (sleigh.ring): a third of the sparks shake loose from the collars and the dash at once and
      // fall away below the team for a couple of seconds, a gold drizzle between the bells and whatever is underneath
      const rg = sleigh._ring, s4 = sparkSeed[sd + 4];
      if (rg && s4 >= 0.12 && s4 < 0.12 + 0.33 * rg.k) {
        const tr = rg.t + sparkSeed[sd + 1] * 0.45, ra = time - tr, RL = 2.6;
        const pz = ra >= 0 && ra < RL ? poseAt(tr, camera) : null;
        if (pz) {
          const bj = Math.floor(sparkSeed[sd] * (PAIRS + 1)), bp = bj < PAIRS ? pairPos(bj) : null;
          const u = bp ? [bp[0] + 13 + sparkSeed[sd + 2] * 2, bp[1] - 1 + sparkSeed[sd + 3] * 3] : [A.meta.sleigh.dash[0], A.meta.sleigh.dash[1]];
          const p0 = offsetToWorld(teamOffset(u, pz, bp ? 0 : 1), pz.pos, camera);
          const v0 = 20 + 34 * sparkSeed[sd + 3], kx = (sparkSeed[sd + 2] - 0.5) * 14;
          const dx = kx * ra * unit, dy = -(v0 * ra + 0.5 * 30 * ra * ra) * unit;
          const drift = screen ? [dx, -dy, 0] : [camR.x * dx + camU.x * dy, camR.y * dx + camU.y * dy, camR.z * dx + camU.z * dy];
          const lk = ra / RL, size = unit * (1.1 + 1.4 * sparkSeed[sd + 5]) * (1 - 0.45 * lk);
          alpha = Math.pow(1 - lk, 1.3) * Math.min(1, ra * 10) * rg.k;
          if (screen) aP.setXYZW(i, p0[0] + drift[0], -(p0[1] + drift[1]), 0, size); else aP.setXYZW(i, p0[0] + drift[0], p0[1] + drift[1], p0[2] + drift[2], size);
          aA.setXY(i, alpha, s4 * 7 + sparkSeed[sd + 2]);
          continue;
        }
      }
      const pose = sleigh._trail > 0 && sparkSeed[sd + 5] < sleigh._trail ? poseAt(tb, camera) : null;
      if (pose) {
        const fromBells = sparkSeed[sd + 4] < 0.12;
        const bj = Math.min(PAIRS - 1, Math.floor(sparkSeed[sd] * PAIRS)), bp = pairPos(bj);
        const u = fromBells ? [bp[0] + 13 + sparkSeed[sd + 1] * 2, bp[1] - 3 + sparkSeed[sd + 1] * 4] : [rear[0] + (sparkSeed[sd] - 0.5) * 10, rear[1] + (sparkSeed[sd + 1] - 0.5) * 5];
        const off = teamOffset(u, pose, fromBells ? 0 : 1);
        const p0 = offsetToWorld(off, pose.pos, camera);
        const kx = (sparkSeed[sd + 2] - 0.5) * 9, ky = (sparkSeed[sd + 3] - 0.3) * 6, fall = 7 + 5 * sparkSeed[sd + 3];
        const dx = kx * age * unit, dy = (ky * age - 0.5 * fall * age * age) * unit;
        const drift = screen ? [dx, -dy, 0] : [camR.x * dx + camU.x * dy, camR.y * dx + camU.y * dy, camR.z * dx + camU.z * dy];
        const x = p0[0] + drift[0], y = p0[1] + drift[1], z = p0[2] + drift[2];
        const lifeK = age / life;
        alpha = Math.pow(1 - lifeK, 1.6) * Math.min(1, age * 12) * (fromBells ? 0.7 : 1);
        const size = unit * (0.9 + 1.3 * sparkSeed[sd + 5]) * (1 - 0.5 * lifeK);
        if (screen) aP.setXYZW(i, x, -y, 0, size); else aP.setXYZW(i, x, y, z, size);
      }
      aA.setXY(i, alpha, sparkSeed[sd + 4] * 7 + sparkSeed[sd + 2]);
    }
    aP.needsUpdate = true; aA.needsUpdate = true;
  }

  silSetters(sleigh, U, () => 1);
  // the light is applied per instance (it depends on each one's heading); keep the requested screen direction
  sleigh.setLight = (x, y) => { sleigh._light = [x, y]; const l = Math.hypot(x, y) || 1; U.uLightS.value.set(x / l, y / l); return sleigh; };
  sleigh.style(o); sleigh.setLight(o.light[0], o.light[1]);
  return sleigh;
}
