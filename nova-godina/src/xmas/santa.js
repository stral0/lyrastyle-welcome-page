// xmas/santa.js — Deda Mraz as a backlit silhouette, plus the shared silhouette kit (atlas pen + rim shader)
// that sleigh.js builds on. See src/xmas/README.md for the API.
//
// How it works: the figure is a 2D cut-out RIG. Each part (legs, coat skirt, torso, head, beard, the stocking cap in
// two segments, the bobble, the near arm in two segments, a gloved hand of six pieces, the far arm, the sack) is
// drawn procedurally with Canvas2D into an RGBA atlas at init (A = coverage, R = fur/hair, G = red cloth,
// B = metal glint). Every frame the parts are posed (forward kinematics, two-bone IK for the reaching arm and the
// legs, damped springs for the overlapping action) and drawn, in one instanced call, into a small figure-space
// composite target (premultiplied "over", mipmapped). The rim shader then reads that composite as one silhouette,
// so the rim, the fur glow and the red reveal are computed on the whole figure: no seams at the joints.
// Secondary motion (skirt hem, beard, both cap segments, bobble) is a deterministic fixed-step simulation: with a
// performance function (santa.perform) it integrates on from its cached state while time runs forward and replays the
// last 2 s from the function after any discontinuity, so any
// time is valid (jump-safe); without one it integrates forward and settles on jumps.

const TAU = Math.PI * 2;
const D = 8.5;                         // atlas texels per figure unit (figure height = 100 units)

// ------------------------------------------------------------------ geometry helpers (figure units)
// Catmull-Rom through points -> dense polyline. pts: [[x,y],...]
export function curve(pts, closed = false, step = 0.3) {
  const n = pts.length, out = [];
  if (n < 2) return pts.slice();
  const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot2 = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
// apply a 2D affine [a,b,c,d,e,f] (x' = a x + c y + e, y' = b x + d y + f) to a point
export const xf = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const xmul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
export const xinv = m => { const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det; return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]; };
export const xrot = (a, cx = 0, cy = 0) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; };
export const xtr = (x, y) => [1, 0, 0, 1, x, y];
export const xsc = (sx, sy, cx = 0, cy = 0) => [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy];

// ------------------------------------------------------------------ the pen: draws coverage + features into two canvases
// feat = { fur, cloth, glint } (0..1). Later shapes overwrite the features of earlier ones; coverage is a union.
export function createPen(W, H, density = D) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cov = mk(), feat = mk();
  const C = cov.getContext('2d', { willReadFrequently: true }), F = feat.getContext('2d', { willReadFrequently: true });
  F.fillStyle = '#000'; F.fillRect(0, 0, W, H);
  const col = f => `rgb(${Math.round((f && f.fur || 0) * 255)},${Math.round((f && f.cloth || 0) * 255)},${Math.round((f && f.glint || 0) * 255)})`;
  const both = fn => { fn(C, '#000'); fn(F, null); };
  let cur = null;
  const pen = {
    W, H, cov, feat,
    // map figure units into a cell: px = ox + (u - ux0) * D ... with an optional affine m applied first
    begin(cell, m) {
      cur = cell;
      for (const g of [C, F]) { g.save(); g.beginPath(); g.rect(cell.x, cell.y, cell.w, cell.h); g.clip(); }
      const Dn = density, M = xmul([Dn, 0, 0, Dn, cell.x - cell.u0 * Dn, cell.y - cell.v0 * Dn], m || [1, 0, 0, 1, 0, 0]);
      for (const g of [C, F]) g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    },
    end() { for (const g of [C, F]) g.restore(); cur = null; },
    poly(pts, f, mode = 'fill', width = 1) {
      both((g, ink) => {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        if (mode === 'fill') { g.closePath(); g.fillStyle = ink || col(f); g.fill(); }
        else { g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ink || col(f); g.stroke(); }
      });
    },
    shape(pts, f, closed = true) { pen.poly(curve(pts, closed), f, 'fill'); },
    line(pts, w, f, smooth = true) { pen.poly(smooth ? curve(pts, false) : pts, f, 'stroke', w); },
    circle(c, r, f) { both((g, ink) => { g.beginPath(); g.arc(c[0], c[1], r, 0, TAU); g.fillStyle = ink || col(f); g.fill(); }); },
    ellipse(c, rx, ry, a, f) { both((g, ink) => { g.beginPath(); g.ellipse(c[0], c[1], rx, ry, a, 0, TAU); g.fillStyle = ink || col(f); g.fill(); }); },
    // tapered capsule a->b, widths wa, wb
    capsule(a, b, wa, wb, f) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      both((g, ink) => {
        g.fillStyle = ink || col(f); g.beginPath();
        g.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2); g.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2);
        g.lineTo(b[0] - nx * wb / 2, b[1] - ny * wb / 2); g.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2); g.closePath(); g.fill();
        g.beginPath(); g.arc(a[0], a[1], wa / 2, 0, TAU); g.fill(); g.beginPath(); g.arc(b[0], b[1], wb / 2, 0, TAU); g.fill();
      });
    },
    // tapered limb along a polyline: widths per point
    limb(pts, ws, f) { for (let i = 0; i + 1 < pts.length; i++) pen.capsule(pts[i], pts[i + 1], ws[i], ws[i + 1], f); },
    // fur / hair along a polyline: short strands leaving the band edge outward
    // o = { width (band), len, lenJ, hw (strand width), spacing, side: 1|-1|0 (both), spread (rad), flow (bias angle), rnd, f }
    hairs(poly, o) {
      const P = curve(poly, !!o.closed, o.spacing || 0.35), rnd = o.rnd || Math.random;
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
        const sides = o.side ? [o.side] : [1, -1];
        for (const sd of sides) {
          if (o.prob && rnd() > o.prob) continue;
          const nx = -ty / L * sd, ny = tx / L * sd;
          const base = [P[i][0] + nx * (o.width || 0) * 0.5 * (0.6 + 0.3 * rnd()), P[i][1] + ny * (o.width || 0) * 0.5 * (0.6 + 0.3 * rnd())];
          const ang = Math.atan2(ny, nx) + (rnd() - 0.5) * 2 * (o.spread || 0.5) + (o.flow || 0) * sd;
          const len = (o.len || 1) * (1 - (o.lenJ || 0.5) * rnd());
          const tip = [base[0] + Math.cos(ang) * len, base[1] + Math.sin(ang) * len];
          const mid = [(base[0] + tip[0]) / 2 + (rnd() - 0.5) * len * 0.3, (base[1] + tip[1]) / 2 + (rnd() - 0.5) * len * 0.3];
          both((g, ink) => {
            g.beginPath(); g.moveTo(base[0] - Math.cos(ang) * len * 0.4, base[1] - Math.sin(ang) * len * 0.4); g.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]);
            g.lineWidth = (o.hw || 0.35) * (0.7 + 0.6 * rnd()); g.lineCap = 'round'; g.strokeStyle = ink || col(o.f); g.stroke();
          });
        }
      }
    },
    // a fur band: thick stroke along a path + fuzzy strands on both edges
    fur(poly, width, rnd, o = {}) {
      const f = o.f || { fur: 1 };
      pen.line(poly, width, f);
      pen.hairs(poly, { width, len: o.len || width * 0.42, lenJ: 0.6, hw: o.hw || 0.34, spacing: o.spacing || 0.22, spread: 0.65, rnd, f, side: o.side || 0 });
    },
    // merge into one RGBA buffer: rgb = features (as drawn: effectively premultiplied by coverage), a = coverage
    data() {
      const a = C.getImageData(0, 0, W, H).data, b = F.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H * 4);
      for (let i = 0; i < out.length; i += 4) { const al = a[i + 3]; out[i] = Math.min(b[i], al); out[i + 1] = Math.min(b[i + 1], al); out[i + 2] = Math.min(b[i + 2], al); out[i + 3] = al; }
      return out;
    },
  };
  return pen;
}

// atlas texture from merged pen data (mipmapped; NPOT is fine in WebGL2)
export function atlasTexture(THREE, data, W, H) {
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false; t.anisotropy = 4; t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true; return t;
}

// ------------------------------------------------------------------ shared silhouette shader
// The including module defines: vec4 S(vec2 p, float lod) -> (features premultiplied, coverage) at figure point p.
// Figure space: units, x forward (facing right), y down. shade(p) returns premultiplied HDR colour + alpha.
export const SIL_HEAD = /* glsl */`
precision highp float; precision highp sampler2D;
uniform sampler2D tAtlas;
uniform vec2 uLight;          // unit vector toward the light, figure space (y down)
uniform vec3 uRimColor, uFill, uRed, uFurCol;
uniform float uRim, uRimPx, uSoftPx, uWrap, uFur, uGlint, uOpacity, uBlur, uTexel, uTime, uSoftEdge;
uniform float uFace;          // 0: legacy (fur glows all round); 1: every edge term is weighted by how much it faces the light
uniform vec4 uRimClamp;        // min/max depth (figure units) of the crisp rim, then of the soft rim
`;
export const SIL_SHADE = /* glsl */`
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), u.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), u.x), u.y); }
vec4 shade(vec2 p){
  vec2 fw = fwidth(p); float px = max(max(fw.x, fw.y), 1e-5);           // figure units per screen pixel
  float lod = max(0., log2(px * uTexel)) + uBlur;
  vec4 c = S(p, lod);
  float a = c.a;
  float aw = max(fwidth(a), 1e-3);
  float soft = clamp(uBlur * .6 + uSoftEdge, 0., 1.);
  float A = mix(clamp((a - .5) / aw + .5, 0., 1.), a, soft);
  A = max(A, a * step(.5, aw));                                          // tiny on screen: keep the mip's coverage
  vec3 f = clamp(c.rgb / max(a, 1e-3), 0., 1.);
  float fur = f.r, cloth = f.g, glint = f.b;
  float grow = exp2(uBlur);
  float w1 = clamp(uRimPx * px, uRimClamp.x, uRimClamp.y) * grow;      // crisp rim depth (units)
  float w2 = clamp(uSoftPx * px, uRimClamp.z, uRimClamp.w) * grow;      // soft wrap depth
  vec2 L = uLight, Lp = vec2(L.x * .5 - L.y * .866, L.x * .866 + L.y * .5), Lm = vec2(L.x * .5 + L.y * .866, -L.x * .866 + L.y * .5);
  // directional coverage differences: > 0 only on edges whose outward normal faces the light
  float c1 = S(p - L * w1, lod).a - S(p + L * w1, lod).a;
  float c0 = S(p - L * w1 * .4, lod).a - S(p + L * w1 * .4, lod).a;
  float c2 = S(p - L * w2, lod + 1.2).a - S(p + L * w2, lod + 1.2).a;
  float cp = S(p - Lp * w1, lod).a - S(p + Lp * w1, lod).a;
  float cm = S(p - Lm * w1, lod).a - S(p + Lm * w1, lod).a;
  // small on screen (few pixels per unit): keep only a thin crisp edge, or thin parts flood with light
  float big = smoothstep(.45, 2.2, 1. / px);
  float crisp = A * clamp(.55 * c0 + .45 * c1, 0., 1.) * mix(.7, 1., big);
  float wide = A * clamp(c2, 0., 1.) * big;
  float wrap = A * clamp(max(cp, cm), 0., 1.) * (1. - clamp(c1, 0., 1.)) * big;
  // how much this edge faces the light: the outward normal of the blurred silhouette against L (backlight falls
  // on the edges that face it; the far side of the figure stays dark). Only evaluated in face mode.
  float fR = 1., fG = 1.;
  if (uFace > 0.) {
    float e = max(w2 * .6, .7), ln = lod + 1.6;
    vec2 g = vec2(S(p + vec2(e, 0.), ln).a - S(p - vec2(e, 0.), ln).a, S(p + vec2(0., e), ln).a - S(p - vec2(0., e), ln).a);
    float gl = length(g), fc = gl > 1e-3 ? dot(-g / gl, L) : 0.;
    fR = mix(1., smoothstep(-.35, .75, fc), uFace);                      // the crisp rim (grazing edges keep a faint line)
    fG = mix(1., mix(.06, 1., smoothstep(-.2, .75, fc)), uFace);        // fur glow, side wrap, red reveal
    crisp *= fR; wrap *= fG;
  }
  // fur texture: legacy, a fine noise; face mode, only a slow swell along the band (a fine noise speckles the fur
  // into isolated lit dots once the figure is small or the edges are short)
  float fuzz = mix(1., mix(.35 + 1.3 * vn(p * 2.6), .8 + .4 * vn(p * .45), uFace), fur);
  // face mode: fur glows only on the OUTER silhouette (within ~6 px of the background), never on bands inside it
  float outer = 1.;
  if (uFace > 0.) outer = mix(1., smoothstep(.97, .72, S(p, lod + 2.6).a), uFace);
  // backlit hair scatters light round its outline (legacy: omnidirectional; face mode: mostly on the lit side)
  float halo = A * clamp((1. - S(p, lod + 2.2).a) * 2.2, 0., 1.) * fG;
  vec3 rimC = uRimColor * uRim;
  float cl = cloth * (1. - fur);
  vec3 col = uFill * A * mix(vec3(1.), vec3(1.5, .75, .65), cl * .5);
  float edge = (1. - fur);
  // cloth: the thin edge stays warm gold (sheen of the nap), slightly dimmed; the deep red is only the light
  // soaking into the fabric just inside it (uRed is that reveal's colour in linear light, scaled by uRim / 3).
  // Face mode: the red never exceeds uRed and lives only just inside the lit rim, on edges that face the light.
  float rr = uRim / 3.;
  float redK = mix((crisp * 1.4 + wide * 1.1) * rr, clamp(crisp * .6 + wide, 0., 1.) * fG * min(rr, 1.), uFace);
  col += rimC * crisp * edge * (1. - .38 * cl) * mix(vec3(1.), vec3(1., .78, .62), cl);
  col += (uRed * cl * redK + rimC * (1. - cl) * vec3(.07) * wide * fG) * edge;
  col += rimC * wrap * .22 * uWrap * edge * (1. - .6 * cl);
  col += rimC * uFurCol * fur * uFur * fuzz * outer * (crisp * .7 + wide * .3 * fG + wrap * .35 * uWrap + halo * .22);
  float tw = .6 + .4 * sin(uTime * 7. + h12(floor(p * .8)) * 40.);
  col += rimC * glint * uGlint * (crisp * 3. * tw + wide * .6);
  return vec4(col, A) * uOpacity;
}
`;
export const SIL_DEFAULTS = {
  light: [-0.6, 0.8], rimColor: [1.0, 0.62, 0.27], rim: 3.0, rimPx: 1.7, softPx: 8, wrap: 0.6, fur: 1.2, glint: 1,
  fill: [0.0035, 0.003, 0.0028], red: [0.16, 0.012, 0.016], furColor: [1.0, 0.93, 0.82], opacity: 1, blur: 0, softEdge: 0, rimClamp: [0.12, 1.4, 0.6, 5],
};
export function silUniforms(THREE, tex, o) {
  const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
  return {
    tAtlas: { value: tex }, uFace: { value: o.face || 0 }, uLight: { value: new THREE.Vector2(0, -1) }, uRimColor: { value: v3(o.rimColor) }, uFill: { value: v3(o.fill) },
    uRed: { value: v3(o.red) }, uFurCol: { value: v3(o.furColor) }, uRim: { value: o.rim }, uRimPx: { value: o.rimPx }, uSoftPx: { value: o.softPx },
    uWrap: { value: o.wrap }, uFur: { value: o.fur }, uGlint: { value: o.glint }, uOpacity: { value: o.opacity }, uBlur: { value: o.blur },
    uTexel: { value: D }, uTime: { value: 0 }, uSoftEdge: { value: o.softEdge }, uRimClamp: { value: new THREE.Vector4(...o.rimClamp) },
  };
}
// shared setters for any silhouette object (light given in screen terms: x right, y UP)
export function silSetters(obj, U, getFlip) {
  const set3 = (u, v) => { if (v) u.value.set(v[0], v[1], v[2]); };
  obj.setLight = (x, y) => { obj._light = [x, y]; const f = getFlip(), l = Math.hypot(x, y) || 1; U.uLight.value.set(f * x / l, -y / l); return obj; };
  obj.setRim = (color, intensity) => { set3(U.uRimColor, color); if (intensity != null) U.uRim.value = intensity; return obj; };
  obj.style = o => {
    if (!o) return obj;
    if (o.light) obj.setLight(o.light[0], o.light[1]);
    if (o.rimClamp) U.uRimClamp.value.set(...o.rimClamp);
    if (o.rimColor) set3(U.uRimColor, o.rimColor); if (o.fill) set3(U.uFill, o.fill); if (o.red) set3(U.uRed, o.red); if (o.furColor) set3(U.uFurCol, o.furColor);
    const n = { face: 'uFace', rim: 'uRim', rimPx: 'uRimPx', softPx: 'uSoftPx', wrap: 'uWrap', fur: 'uFur', glint: 'uGlint', opacity: 'uOpacity', blur: 'uBlur', softEdge: 'uSoftEdge' };
    for (const k in n) if (o[k] != null) U[n[k]].value = o[k];
    return obj;
  };
  Object.defineProperty(obj, 'opacity', { get: () => U.uOpacity.value, set: v => { U.uOpacity.value = v; } });
  Object.defineProperty(obj, 'blur', { get: () => U.uBlur.value, set: v => { U.uBlur.value = v; } });
}

// design-space orthographic camera: x right, y DOWN (design units); objects are placed at (x, -y)
export function designCamera(THREE, view) {
  const cam = new THREE.OrthographicCamera(0, view.w, 0, -view.h, -1000, 1000);
  cam.position.set(0, 0, 10); cam.updateMatrixWorld();
  cam.fit = () => { if (cam.right !== view.w || cam.bottom !== -view.h) { cam.right = view.w; cam.bottom = -view.h; cam.updateProjectionMatrix(); } };
  return cam;
}

// ------------------------------------------------------------------ Deda Mraz: the rig
const FUR = { fur: 1 }, CLOTH = { cloth: 1 }, DARK = {}, GLINT = { glint: 1 }, HAIR = { fur: 0.85 };
export const SHOULDER = [1.0, 28.0];  // near-arm pivot, body units (rest pose)
const sm01 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
const lerpN = (a, b, t) => a + (b - a) * t;

// the stocking cap: one centre curve with widths, split into the base (part of the head) and two hanging segments
// (shorter and heavier than a gnome's stocking cap: the tail hangs to the ear, not to the shoulder)
const CAP_C = [[1.2, 7.6], [0.0, 2.8], [-2.6, -0.5], [-6.4, -1.1], [-9.6, 0.9], [-11.2, 4.0], [-11.8, 7.4]];
const CAP_W = [13.0, 10.6, 8.3, 6.7, 5.7, 4.9, 4.3];
const CAP = (() => {
  const cc = curve(CAP_C, false, 0.6);
  const cw = cc.map((_, i) => { const t = i / (cc.length - 1) * (CAP_W.length - 1), k = Math.min(CAP_W.length - 2, Math.floor(t)); return CAP_W[k] + (CAP_W[k + 1] - CAP_W[k]) * (t - k); });
  const near = q => { let bi = 0, bd = 1e9; cc.forEach((p, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const k1 = near([-3.2, -0.5]), k2 = near([-9.5, 0.8]);
  const end = cc[cc.length - 1], bob = [end[0] - 0.6, end[1] + 3.6];   // the bobble hangs just below the tip
  return { cc, cw, k1, k2, bob };
})();

// rest-pose joints (body units: feet centre at (0, 100), x forward, y down)
const J = {
  waist: [0.5, 55], hem: [0.5, 52.5], hipN: [3.5, 61], hipF: [-4.5, 61], shN: SHOULDER, shF: [-2.4, 27.4], neck: [1.2, 21.5], jaw: [2.0, 17.0],
  crown: CAP.cc[CAP.k1], tipMid: CAP.cc[CAP.k2], tipEnd: CAP.cc[CAP.cc.length - 1],
};
const LEG = { th: 15.5, sh: 19.5 }, ARM = { up: 13.0, fo: 12.2 }, FARM = { up: 12.4, fo: 11.4 };
const ANK = { n: [7.4, 95], f: [-8.2, 95] };            // rest ankles (the sole is 5 below the ankle)
const TOE = [8.6, 5.0], HEEL = [-4.2, 5.0];                // foot pivots on the ground, ankle-relative
// hand frame (origin at the wrist, x along the hand, y = palm side): pivots of the pieces
const HAND = { thumb: [0.6, -1.7], idx: [4.6, -0.7], fin: [4.8, 1.0], i1: 2.7, i2: 3.55, f1: 2.5 };

// ---- part drawings (each in its own local frame; body-space parts use body units directly)
function drawSkull(pen, rnd) {
  pen.capsule([0.2, 18.5], [0.0, 25.0], 8.4, 8.0, DARK);                     // neck (hidden in the collar; no gap when he nods)
  pen.shape([[-6.4, 9.6], [-7.2, 14.6], [-6.0, 19.4], [-2.4, 22.4], [3, 22.6], [7.0, 20.6], [9.4, 18.6], [11.0, 18.3], [12.2, 17.4], [12.3, 16.1],
    [11.4, 15.0], [9.9, 13.9], [8.6, 13.2], [8.8, 11.0], [3, 7.4], [-3, 7.6]], DARK);
  // the cap's base (the hanging part is its own two segments)
  const { cc, cw, k1 } = CAP; pen.limb(cc.slice(0, k1 + 2), cw.slice(0, k1 + 2), CLOTH);
  const brimTop = [[-7.0, 7.8], [-3.6, 6.6], [1.6, 6.2], [6.6, 6.8], [10.4, 8.4]], brimBot = [[10.9, 11.6], [8.8, 12.0], [4.0, 11.2], [-1.4, 10.8], [-6.2, 11.4]];
  pen.shape([...brimTop, ...brimBot], FUR);
  for (const pl of [brimTop, brimBot, [[10.4, 8.4], [11.2, 10.0], [10.9, 11.6]], [[-6.2, 11.4], [-7.3, 9.6], [-7.0, 7.8]]])
    pen.hairs(pl, { width: 0, len: 0.9, lenJ: 0.6, hw: 0.3, spacing: 0.2, spread: 0.6, rnd, f: FUR, side: -1 });
  // moustache: a full wave that sweeps forward and ends in a small drooping tip
  pen.shape([[9.6, 18.2], [12.0, 18.4], [14.0, 19.0], [15.4, 20.2], [16.0, 21.8], [15.2, 22.6], [14.4, 21.8], [13.0, 21.6], [11.0, 21.4], [9.2, 20.6]], HAIR);
  pen.hairs([[12.0, 18.4], [14.0, 19.0], [15.4, 20.2], [16.0, 21.8]], { width: 0.3, len: 0.9, hw: 0.22, spacing: 0.2, spread: 0.4, flow: 0.5, rnd, f: HAIR, side: 1 });
}
function drawBeard(pen, rnd) {
  const beard = [[-1.6, 13.4], [3.0, 15.4], [7.4, 18.2], [10.4, 19.6], [13.8, 22.6], [16.4, 25.6], [18.2, 29.6], [17.8, 31.8], [19.0, 34.8],
    [18.2, 37.6], [18.6, 40.4], [17.4, 42.6], [15.8, 45.8], [14.6, 46.0], [13.0, 44.2], [11.2, 40.6], [9.4, 36.2], [7.0, 31.4], [3.8, 27.2], [0.6, 23.0], [-1.8, 18.6]];
  pen.shape(beard, HAIR);
  const locks = [[[13.2, 22.0], [16.4, 25.8], [17.8, 30.0]], [[15.6, 27.4], [18.4, 31.6], [18.6, 36.0]], [[16.4, 33.0], [18.4, 37.4], [17.6, 42.4]],
    [[15.6, 37.8], [16.4, 42.6], [15.4, 46.8]], [[12.8, 37.4], [13.8, 42.2], [13.6, 46.0]], [[10.4, 34.4], [11.2, 39.4], [11.0, 43.4]]];
  for (const L of locks) { const c = curve(L, false, 1.0); pen.limb(c, c.map((_, i, a) => 2.8 * (1 - i / a.length) + 0.45), HAIR); }
  pen.hairs([[13.8, 22.6], [16.4, 25.6], [18.2, 29.6], [17.8, 31.8], [19.0, 34.8], [18.2, 37.6], [18.6, 40.4], [17.4, 42.6], [15.8, 45.8], [14.6, 46.4], [13.0, 44.4]],
    { width: 0.5, len: 1.5, lenJ: 0.6, hw: 0.24, spacing: 0.15, spread: 0.4, flow: 0.7, rnd, f: HAIR, side: 1 });
}
function drawTorso(pen, rnd) {
  // coat from the collar to just below the belt: broad sloping shoulders, straight back, chest set back under the beard
  pen.shape([[-4.0, 22.2], [-10.0, 23.6], [-13.6, 27.0], [-15.0, 33], [-15.2, 40], [-14.8, 47], [-14.6, 52.4], [-15.0, 57.6], [-6, 58.8], [8, 58.8], [17.9, 58.2],
    [17.6, 55.0], [16.2, 50.4], [13.8, 46.6], [11.8, 43.0], [10.2, 38.6], [8.9, 33.0], [7.6, 28.0], [5.4, 23.6]], CLOTH);
  pen.shape([[-14.8, 51.4], [-8, 51.6], [8, 51.8], [14, 51.8], [18.2, 51.8], [18.5, 53.8], [18.2, 56.0], [14, 56.2], [8, 56.2], [-8, 56.1], [-15.4, 55.9], [-15.2, 53.6]], DARK);
  pen.shape([[17.2, 50.9], [19.6, 51.0], [19.9, 53.8], [19.6, 56.7], [17.2, 56.8]], GLINT);
  pen.fur([[-10.4, 23.8], [-7.0, 22.2], [-3, 21.6]], 1.7, rnd, { side: -1, len: 0.7 });
}
function drawSkirt(pen, rnd) {
  pen.shape([[-14.7, 50.2], [-14.6, 52.4], [-15.6, 58], [-16.8, 64], [-18.0, 69.6], [-8, 71.0], [4, 71.4], [12, 70.8], [16.4, 69.4], [17.0, 64.4], [17.8, 59.6],
    [17.6, 55.0], [16.9, 51.4], [6, 50.4], [-6, 50.4]], CLOTH);
  pen.fur([[-18.4, 69.4], [-10, 70.8], [2, 71.2], [11, 70.8], [16.9, 69.2]], 2.0, rnd, { len: 0.8 });
  pen.fur([[17.0, 69.4], [17.4, 64.6], [18.0, 59.6], [18.3, 56.2]], 1.3, rnd, { side: 1, len: 0.55 });
}
function drawBobble(pen, rnd) {
  const c = CAP.bob, r = 2.8;
  pen.circle(c, r, FUR);
  const ring = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; ring.push([c[0] + Math.cos(a) * r * 0.82, c[1] + Math.sin(a) * r * 0.82]); }
  pen.hairs(ring, { width: r * 0.36, len: r * 0.55, lenJ: 0.7, hw: 0.36, spacing: 0.2, spread: 0.7, rnd, f: FUR, side: -1 });
}
function drawSack(pen, rnd) {     // a sack slung over the far shoulder, its gathered neck above the shoulder
  pen.shape([[-8, 24.6], [-13, 21.4], [-19.6, 21.6], [-25.2, 25.6], [-28.6, 32.6], [-29.6, 40.6], [-28.4, 47.6], [-24.8, 52.4], [-19.8, 53.6], [-16.0, 50.0], [-15.0, 42], [-13.8, 32]], DARK);
  pen.limb([[-9, 24.0], [-7.0, 20.8], [-5.8, 18.6]], [4.2, 3.2, 3.4], DARK);
  pen.ellipse([-5.4, 18.0], 2.4, 2.8, 0.4, DARK);
  pen.hairs([[-13, 21.4], [-19.6, 21.6], [-25.2, 25.6]], { width: 0.4, len: 0.8, hw: 0.4, spacing: 0.7, spread: 0.3, rnd, f: DARK, side: -1, prob: 0.4 });
}
const capSeg = (a, b) => pen => { const { cc, cw } = CAP; pen.limb(cc.slice(a, b), cw.slice(a, b), CLOTH); };
const shin = pen => {
  pen.limb([[0, -1.5], [0, 8.4]], [8.8, 7.8], CLOTH);
  pen.shape([[-4.0, 6.4], [-4.3, 13], [-4.5, 19.6], [-4.4, 21.2], [4.2, 21.2], [4.1, 19.6], [3.9, 13], [4.0, 6.2]], DARK);
  pen.line([[-4.7, 6.7], [0, 5.7], [4.7, 6.4]], 2.2, DARK);
};
const foot = pen => pen.shape([[-4.2, -3.2], [-4.6, 2.4], [-4.4, 4.8], [2, 5.1], [8.2, 5.1], [9.8, 3.9], [8.8, 2.0], [5.4, 0.4], [3.6, -2.2], [3.4, -3.6]], DARK);
// parts in draw order (back to front). frame: which pose transform carries the part.
const PARTS = [
  { id: 'sack', fr: 'chest', draw: drawSack, opt: 'sack' },
  { id: 'farU', fr: 'farU', draw: (p, r) => { p.circle([0, 0], 4.5, CLOTH); p.limb([[0, 0], [FARM.up * 0.5, 0], [FARM.up, 0]], [8.6, 8.0, 7.4], CLOTH); } },
  { id: 'farF', fr: 'farF', draw: (p, r) => { p.limb([[0, 0], [FARM.fo * 0.86, 0]], [7.4, 7.6], CLOTH); p.fur([[FARM.fo - 1.6, -4.1], [FARM.fo - 1.6, 4.1]], 2.2, r, { len: 0.8 }); } },
  { id: 'farH', fr: 'farH', draw: p => { p.ellipse([2.4, 0.5], 3.3, 2.9, 0, DARK); p.capsule([0.6, -1.6], [3.6, -2.1], 2.0, 1.7, DARK); p.ellipse([5.0, 1.2], 1.7, 1.9, 0, DARK); } },
  { id: 'thF', fr: 'thF', draw: p => p.limb([[0, 0], [0, LEG.th]], [9.8, 8.4], CLOTH) },
  { id: 'shF', fr: 'shF', draw: shin },
  { id: 'ftF', fr: 'ftF', draw: foot },
  { id: 'thN', fr: 'thN', draw: p => p.limb([[0, 0], [0, LEG.th]], [10.4, 8.8], CLOTH) },
  { id: 'shN', fr: 'shN', draw: shin },
  { id: 'ftN', fr: 'ftN', draw: foot },
  { id: 'skirt', fr: 'skirt', draw: drawSkirt },
  { id: 'torso', fr: 'chest', draw: drawTorso },
  { id: 'hat1', fr: 'hat1', draw: capSeg(CAP.k1 - 1, CAP.k2 + 2) },
  { id: 'hat2', fr: 'hat2', draw: capSeg(CAP.k2 - 1, CAP.cc.length) },
  { id: 'bob', fr: 'bob', draw: drawBobble },
  { id: 'head', fr: 'head', draw: drawSkull },
  { id: 'beard', fr: 'beard', draw: drawBeard },
  { id: 'arm1', fr: 'arm1', draw: p => { p.circle([0, 0], 5.2, CLOTH); p.limb([[0, 0], [ARM.up * 0.55, 0], [ARM.up, 0]], [9.6, 8.8, 8.0], CLOTH); } },
  { id: 'arm2', fr: 'arm2', draw: (p, r) => { p.limb([[0, 0], [ARM.fo * 0.5, 0], [ARM.fo * 0.84, 0]], [8.0, 7.4, 7.8], CLOTH); p.fur([[ARM.fo - 1.8, -4.5], [ARM.fo - 1.8, 4.5]], 2.3, r, { len: 0.85 }); } },
  { id: 'fin1', fr: 'fin1', draw: p => p.capsule([0, 0], [HAND.f1, 0], 2.7, 2.5, DARK) },
  { id: 'fin2', fr: 'fin2', draw: p => p.capsule([0, 0], [2.2, 0], 2.5, 2.1, DARK) },
  { id: 'palm', fr: 'hand', draw: p => { p.ellipse([2.4, 0.3], 3.5, 2.9, 0, DARK); p.capsule([-0.6, 0], [4.4, 0.2], 4.6, 4.0, DARK); } },
  { id: 'idx1', fr: 'idx1', draw: p => p.capsule([0, 0], [HAND.i1, 0], 1.9, 1.75, DARK) },
  { id: 'idx2', fr: 'idx2', draw: p => p.capsule([0, 0], [2.9, 0], 1.75, 1.45, DARK) },
  { id: 'thumb', fr: 'thumb', draw: p => p.capsule([0, 0], [3.3, -0.2], 2.1, 1.8, DARK) },
];

// a pen that only measures (bounding box of everything drawn, in the part's own units)
export function boxPen() {
  const b = [1e9, 1e9, -1e9, -1e9];
  const tr = (p, r = 0) => { b[0] = Math.min(b[0], p[0] - r); b[1] = Math.min(b[1], p[1] - r); b[2] = Math.max(b[2], p[0] + r); b[3] = Math.max(b[3], p[1] + r); };
  const pen = {
    box: b,
    poly(pts, f, mode = 'fill', w = 1) { for (const p of pts) tr(p, mode === 'fill' ? 0 : w / 2); },
    shape(pts, f, closed = true) { pen.poly(curve(pts, closed)); },
    line(pts, w, f, smooth = true) { pen.poly(smooth ? curve(pts, false) : pts, f, 'stroke', w); },
    circle(c, r) { tr(c, r); }, ellipse(c, rx, ry) { tr(c, Math.max(rx, ry)); },
    capsule(a, b2, wa, wb) { tr(a, wa / 2); tr(b2, wb / 2); },
    limb(pts, ws) { pts.forEach((p, i) => tr(p, ws[i] / 2)); },
    hairs(poly, o) { for (const p of curve(poly, !!o.closed, 0.5)) tr(p, (o.width || 0) / 2 + (o.len || 1) * 1.35 + (o.hw || 0.35)); },
    fur(poly, width, rnd, o = {}) { pen.line(poly, width); pen.hairs(poly, { width, len: o.len || width * 0.42, hw: o.hw || 0.34 }); },
  };
  return pen;
}

// ------------------------------------------------------------------ atlas (one cell per part, shelf-packed)
let ATLAS = null;
export function buildSantaAtlas(seed = 7) {
  if (ATLAS) return ATLAS;
  const pad = 6, M = 1.2, maxW = 2048;
  const cells = PARTS.map(P => {
    const bp = boxPen(); P.draw(bp, mulberry(1)); const b = bp.box;
    const u0 = b[0] - M, v0 = b[1] - M, uw = b[2] - b[0] + 2 * M, vh = b[3] - b[1] + 2 * M;
    return { id: P.id, u0, v0, uw, vh, w: Math.ceil(uw * D), h: Math.ceil(vh * D) };
  });
  const order = cells.map((c, i) => i).sort((a, b) => cells[b].h - cells[a].h);
  let x = pad, y = pad, rowH = 0, W = 0;
  for (const i of order) { const c = cells[i]; if (x + c.w + pad > maxW) { x = pad; y += rowH + pad; rowH = 0; } c.x = x; c.y = y; x += c.w + pad; rowH = Math.max(rowH, c.h); W = Math.max(W, x); }
  const H = y + rowH + pad;
  const pen = createPen(W, H);
  PARTS.forEach((P, i) => { pen.begin(cells[i]); P.draw(pen, mulberry(seed + 17 * i)); pen.end(); });
  ATLAS = { W, H, data: pen.data(), cells };
  return ATLAS;
}
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ pose parameters
// A pose is a flat set of numbers (so poses interpolate as motion, never as a cross-dissolve of images):
// lean (whole body about the feet, + forward), bend (chest at the waist, + forward), shiftX/shiftY (pelvis over the feet),
// head (pitch, + nods down), gazeX/gazeY/gazeW (a figure point the head turns toward, and how much),
// a1/a2/wr (near arm: shoulder angle and elbow angle relative to the chest / upper arm, hand angle relative to the
// forearm; radians, 0 = forward, + = down), th/i1/i2/f1/f2 (thumb, index and the other fingers' two knuckles; + curls),
// fa1/fa2 (far arm), tx/ty/tw (fingertip target in figure units and its weight 0..1), ha/haW (absolute hand angle
// while targeting, and its weight), nX/nL/nA, fX/fL/fA (near / far ankle x, lift above the floor, foot pitch),
// walkD/walkS/walkW/walkV (distance walked, stride, weight, speed: planted feet, see walkFeet), travelX/travelY (root
// motion in figure units, for the springs' inertia only), idle (micro-motion), breathe, sway.
const P0 = {
  lean: 0, bend: 0, shiftX: 0, shiftY: 0, head: 0, gazeX: 0, gazeY: 0, gazeW: 0,
  a1: 1.708, a2: -0.984, wr: 0.25, th: 0.1, i1: 0.55, i2: 0.6, f1: 0.75, f2: 0.8, fa1: 1.72, fa2: -0.35,
  tx: 0, ty: 0, tw: 0, ha: 0, haW: 0,
  nX: ANK.n[0], nL: 0, nA: 0, fX: ANK.f[0], fL: 0, fA: 0, walkD: 0, walkS: 18, walkW: 0, walkV: 0, travelX: 0, travelY: 0,
  idle: 1, breathe: 1, sway: 1,
};
export const PARAMS = Object.keys(P0);
const HANDS = {
  rest: { th: 0.1, i1: 0.55, i2: 0.6, f1: 0.75, f2: 0.8 },
  point: { th: 0.0, i1: 0.04, i2: 0.14, f1: 1.45, f2: 1.5 },
  hook: { th: 0.12, i1: 0.55, i2: 1.2, f1: 1.5, f2: 1.5 },
  open: { th: 0.05, i1: 0.06, i2: 0.08, f1: 0.1, f2: 0.12 },
};
// the legacy named poses (arm angles from the old drawn frames)
export const POSES = {
  stand:  { ...HANDS.rest, a1: 1.708, a2: -0.984, wr: 0.25, lean: 0 },
  reach:  { ...HANDS.point, a1: 0.42, a2: -0.43, wr: 0.04, lean: 0.035 },
  pluck:  { ...HANDS.hook, a1: 0.53, a2: -0.35, wr: 0.16, lean: 0.03 },
  sweep0: { ...HANDS.open, a1: 0.0, a2: -0.36, wr: 0.06, lean: 0.02 },
  sweep1: { ...HANDS.open, a1: 0.25, a2: -0.36, wr: 0.06, lean: 0.035 },
  sweep2: { ...HANDS.open, a1: 0.52, a2: -0.36, wr: 0.06, lean: 0.045 },
  sweep3: { ...HANDS.open, a1: 0.78, a2: -0.36, wr: 0.06, lean: 0.035 },
  wave:   { ...HANDS.open, th: -0.4, a1: -0.1, a2: -1.18, wr: -0.05, lean: -0.01 },
};
export const POSE_NAMES = Object.keys(POSES);
export const HAND_POSES = HANDS;
export function poseParams(out, name) { Object.assign(out, P0, POSES[name] || {}); return out; }
export function mixParams(out, a, b, t) { for (const k of PARAMS) out[k] = (a[k] ?? P0[k]) + ((b[k] ?? P0[k]) - (a[k] ?? P0[k])) * t; return out; }

// ------------------------------------------------------------------ walk: planted feet as a pure function of distance
// d: figure units walked (the caller moves the figure by the same amount); stride: one step. A cycle is two steps; the
// gait starts and (after whole cycles) ends in the standing stance, far foot first. Stance 60 %, swing 40 % of a cycle.
// Returns ankle x (figure units, relative to the figure), lift and foot pitch for both feet, and the cycle phase.
export function walkFeet(d, stride, out = {}) {
  const C = 2 * stride, ph = 0.5 + d / C;
  const foot = (o, rest, startX) => {
    const c0 = rest - startX * stride;                                 // per-foot offset: the walk starts in the standing stance
    const u = ph - o, n = Math.floor(u), q = u - n;
    const G = k => (k + o + 0.4 - 0.5) * C + 0.6 * stride + c0;      // ground x of the plant of cycle k
    let x, lift = 0, ang = 0;
    if (q < 0.4) {                                                    // swing: an arc from the last plant to the next
      const s = q / 0.4, e = s * s * (3 - 2 * s);
      x = G(n - 1) + (G(n) - G(n - 1)) * e - d;
      lift = stride * 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 1.2);
      ang = 0.42 * (1 - s) * (1 - s) - 0.24 * sm01((s - 0.45) / 0.4) * (1 - sm01((s - 0.86) / 0.14));
    } else {                                                          // stance: planted; the heel rises at the end (toe-off)
      x = G(n) - d;
      ang = 0.42 * sm01((q - 0.84) / 0.16);
    }
    return [x, lift, ang];
  };
  out.n = foot(0, ANK.n[0], 0.4); out.f = foot(0.5, ANK.f[0], -0.6); out.phase = ph;
  return out;
}

// ------------------------------------------------------------------ forward kinematics helpers
const Rp = (m, p) => xf(m, p);
const angOf = m => Math.atan2(m[1], m[0]);
const rotAt = (a, p) => xrot(a, p[0], p[1]);
const seg = (p, a, s = 1) => xmul(xtr(p[0], p[1]), s === 1 ? xrot(a) : xmul(xrot(a), xsc(s, 1)));
// two-bone IK: root r, goal g, lengths l1 l2, bend +1 (elbow toward +90° of the reach direction) or -1
function ik2(r, g, l1, l2, bend) {
  const dx = g[0] - r[0], dy = g[1] - r[1], d0 = Math.hypot(dx, dy) || 1e-6;
  const d = clampN(d0, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const base = Math.atan2(dy, dx), ca = clampN((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a1 = base + bend * Math.acos(ca);
  const e = [r[0] + Math.cos(a1) * l1, r[1] + Math.sin(a1) * l1];
  return { a1, a2: Math.atan2(g[1] - e[1], g[0] - e[0]), e, reach: d0 / (l1 + l2) };
}
// pose of the fingertip in the hand frame for given curls (index finger chain)
function tipInHand(P) {
  const m = xmul(xmul(xtr(HAND.idx[0], HAND.idx[1]), xrot(P.i1)), xmul(xtr(HAND.i1, 0), xrot(P.i2)));
  return xf(m, [HAND.i2, 0]);
}

// trunk: lean about the feet, pelvis shift and the drop the legs need, chest bend + breathing, head (with gaze).
// idle micro-motion is part of it (a pure function of time): sway, weight shifts, small head drift.
function trunk(P, time, o) {
  const id = P.idle, sw = P.sway * id;
  const br = 0.0065 * Math.sin(time * TAU / 4.4) * P.breathe;
  const sway = (0.0045 * Math.sin(time * 0.71 + 1.3) + 0.0025 * Math.sin(time * 1.37 + 0.4)) * sw;
  const ws = 1.3 * Math.tanh(2.2 * Math.sin(time * TAU / 9.3 + 0.7)) * id * P.sway;       // slow weight shifts, foot to foot
  const lean = P.lean + sway - 0.004 * ws;
  // feet: explicit, or from the walk (blended by walkW)
  let nX = P.nX, nL = P.nL, nA = P.nA, fX = P.fX, fL = P.fL, fA = P.fA, phase = 0;
  if (P.walkW > 0) {
    const w = walkFeet(P.walkD, P.walkS, o.wk || (o.wk = {})), k = P.walkW;
    nX = lerpN(nX, w.n[0], k); nL = lerpN(nL, w.n[1], k); nA = lerpN(nA, w.n[2], k);
    fX = lerpN(fX, w.f[0], k); fL = lerpN(fL, w.f[1], k); fA = lerpN(fA, w.f[2], k); phase = w.phase;
  }
  const ankle = (x, lift, ang) => {           // toe-off pivots on the toe, heel strike on the heel
    const piv = ang > 0 ? TOE : HEEL, r = rot2(piv, ang);
    return [[x + piv[0] - r[0], 95 - lift + piv[1] - r[1]], ang];
  };
  o.ankN = ankle(nX, nL, nA); o.ankF = ankle(fX, fL, fA); o.phase = phase;
  const Mr = xrot(lean, 0, 100);
  let Mp = xmul(Mr, xtr(P.shiftX + ws * 0.55, P.shiftY));
  // the pelvis comes down as far as the stance legs need (the walk's bob, the dip of a step, a weight shift)
  const Lmax = (LEG.th + LEG.sh) * 0.985;
  let drop = 0;
  for (const [hip, ank] of [[J.hipN, o.ankN[0]], [J.hipF, o.ankF[0]]]) {
    const h = xf(Mp, hip), dx = ank[0] - h[0], dy = ank[1] - h[1];
    if (Math.hypot(dx, dy) > Lmax) drop = Math.max(drop, dy - Math.sqrt(Math.max(1, Lmax * Lmax - dx * dx)));
  }
  drop += 0.35 * P.walkW * Math.min(1, P.walkV / 30) * (1 - Math.cos(phase * 2 * TAU)) * 0.5;   // a little extra give in the knees
  Mp = xmul(xtr(0, drop), Mp);
  const chestA = P.bend + br * 0.6;
  const Mc = xmul(Mp, xmul(rotAt(chestA, J.waist), xsc(1 + br * 0.5, 1 + br, J.waist[0], J.waist[1])));
  const cAng = lean + chestA;
  // head: its own pitch, drawn toward the gaze point, plus a slow drift
  const nk = xf(Mc, J.neck), hp = [nk[0] + 6, nk[1] - 5];
  let rel = P.head + (0.025 * Math.sin(time * 0.53 + 0.2) + 0.018 * Math.sin(time * 1.13 + 2.0)) * id;
  if (P.gazeW > 0) { const ga = clampN(Math.atan2(P.gazeY - hp[1], P.gazeX - hp[0]) + 0.12, -0.5, 0.6); rel = lerpN(rel, ga - cAng, P.gazeW); }
  rel = clampN(rel, -0.42, 0.5);
  const Mh = xmul(Mc, rotAt(rel, J.neck));
  o.Mr = Mr; o.Mp = Mp; o.Mc = Mc; o.Mh = Mh; o.lean = lean; o.cAng = cAng; o.drop = drop;
  return o;
}

// ------------------------------------------------------------------ secondary motion: damped springs
// Each element hangs from a pivot on its parent; it is driven by the parent's turning and the pivot's acceleration
// (inertia), by gravity (relative to the rest pose) and pulled back to its drawn angle by its own stiffness.
const G = 560;                              // gravity in figure units / s^2 (100 units ~ 1.75 m)
const SPR = [
  { id: 'skirt', par: 'Mp', piv: J.hem, com: [0.5, 63], w: 9, z: 0.42, gw: 0.0, inert: 0.55, lim: 0.1 },
  { id: 'beard', par: 'Mh', piv: J.jaw, com: [11, 31], w: 12, z: 0.38, gw: 0.12, inert: 0.6, lim: 0.12 },
  { id: 'hat1', par: 'Mh', piv: J.crown, com: [-6.4, -0.8], w: 13, z: 0.45, gw: 0.25, inert: 0.5, lim: 0.22 },
  { id: 'hat2', par: 'hat1', piv: J.tipMid, com: [-11.0, 4.0], w: 12, z: 0.4, gw: 0.45, inert: 0.55, lim: 0.32 },
  { id: 'bob', par: 'hat2', piv: J.tipEnd, com: CAP.bob, w: 6, z: 0.3, gw: 1, inert: 0.6, lim: 0.5 },
];
for (const e of SPR) {
  const dx = e.com[0] - e.piv[0], dy = e.com[1] - e.piv[1];
  e.L = Math.hypot(dx, dy); e.rest = Math.atan2(dy, dx); e.k = e.w * e.w;
  e.c = 2 * e.z * Math.sqrt(e.k + e.gw * G / e.L * Math.abs(Math.sin(e.rest)));
}
const SH = 1 / 120;                         // spring time step (s)
// performance keys: equal strings, numbers within 1e-6 (a float clock offset survives rounding drift), or arrays of those
const keyEq = (a, b) => {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) { for (let i = 0; i < a.length; i++) if (!keyEq(a[i], b[i])) return false; return true; }
  return false;
};
function springState() { return SPR.map(() => ({ a: 0, v: 0, p1: null, p2: null, t1: 0, t2: 0 })); }
// one step: frames from the trunk; writes the posed frames of the spring elements into F
function springStep(S, T, h, F) {
  F.Mp = T.Mp; F.Mh = T.Mh;
  SPR.forEach((e, i) => {
    const s = S[i], Mpar = F[e.par], piv = xf(Mpar, e.piv), th = angOf(Mpar);
    let ax = 0, ay = 0, thdd = 0;
    if (s.p2) { ax = (piv[0] - 2 * s.p1[0] + s.p2[0]) / (h * h); ay = (piv[1] - 2 * s.p1[1] + s.p2[1]) / (h * h); thdd = (th - 2 * s.t1 + s.t2) / (h * h); }
    else if (!s.p1) { s.t1 = th; s.p1 = piv; }
    const lim = 4000; ax = clampN(ax, -lim, lim); ay = clampN(ay, -lim, lim); thdd = clampN(thdd, -400, 400);
    const ph = th + e.rest + s.a, dx = Math.cos(ph), dy = Math.sin(ph);
    const grav = e.gw * G / e.L * (Math.cos(ph) - Math.cos(e.rest));
    const inert = e.inert * (dy * ax - dx * ay) / e.L;
    const acc = -e.k * s.a - e.c * s.v + grav + inert - thdd * e.inert;
    s.v += acc * h; s.a += s.v * h;
    if (s.a > e.lim) { s.a = e.lim; s.v = Math.min(0, s.v); } else if (s.a < -e.lim) { s.a = -e.lim; s.v = Math.max(0, s.v); }
    s.p2 = s.p1; s.p1 = piv; s.t2 = s.t1; s.t1 = th;
    F[e.id] = xmul(Mpar, rotAt(s.a, e.piv));
  });
}

// ------------------------------------------------------------------ shaders
const VS = /* glsl */`
precision highp float;
in vec2 position;
uniform mat4 projectionMatrix, modelViewMatrix;
uniform float uScale, uFlip, uBill;
out vec2 vP;
void main(){
  vP = position;
  vec2 l = vec2(position.x * uFlip, 100. - position.y) * uScale;
  vec4 mv = uBill > .5 ? modelViewMatrix * vec4(0., 0., 0., 1.) + vec4(l, 0., 0.) : modelViewMatrix * vec4(l, 0., 1.);
  gl_Position = projectionMatrix * mv;
}`;
const FS = /* glsl */`
uniform vec4 uQ;              // composite bounds: x0, y0, 1/w, 1/h (figure units)
in vec2 vP; out vec4 fragColor;
vec4 S(vec2 p, float lod){
  vec2 uv = (p - uQ.xy) * uQ.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec4(0.);
  return textureLod(tAtlas, uv, lod);
}
`;
// parts -> composite (figure space); premultiplied "over"
const PART_VS = /* glsl */`
precision highp float;
in vec2 position; in vec4 aRect; in vec4 aM; in vec2 aT; in vec4 aCell;
uniform vec4 uQ;
out vec2 vUv;
void main(){
  vec2 l = mix(aRect.xy, aRect.zw, position);
  vUv = aCell.xy + l * aCell.zw;
  vec2 f = vec2(aM.x * l.x + aM.z * l.y + aT.x, aM.y * l.x + aM.w * l.y + aT.y);
  gl_Position = vec4((f - uQ.xy) * uQ.zw * 2. - 1., 0., 1.);
}`;
const PART_FS = /* glsl */`
precision highp float; precision highp sampler2D;
uniform sampler2D tParts; in vec2 vUv; out vec4 fragColor;
void main(){ fragColor = texture(tParts, vUv); }`;

// ------------------------------------------------------------------ the object
export function createSanta(ctx, opts = {}) {
  const { THREE } = ctx, gl = ctx.gfx.renderer;
  // Deda Mraz: true backlight (edges facing away stay dark), half the fur glow of the shared default, a deeper red
  const o = { ...SIL_DEFAULTS, face: 1, fur: 0.6, red: [0.105, 0.0075, 0.012], ...opts };
  const A = buildSantaAtlas(o.seed || 7);
  const tex = atlasTexture(THREE, A.data, A.W, A.H);
  // composite: figure-space bounds (the arm can reach up, forward and down; the walk moves the feet)
  const QX0 = -44, QX1 = 70, QY0 = -28, QY1 = 108, CD = 8;
  const comp = new THREE.WebGLRenderTarget(Math.round((QX1 - QX0) * CD), Math.round((QY1 - QY0) * CD), {
    type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, colorSpace: THREE.NoColorSpace });
  comp.texture.colorSpace = THREE.NoColorSpace;
  const uQ = { value: new THREE.Vector4(QX0, QY0, 1 / (QX1 - QX0), 1 / (QY1 - QY0)) };
  const U = { ...silUniforms(THREE, comp.texture, o), uScale: { value: 1 }, uFlip: { value: 1 }, uBill: { value: 0 }, uQ };
  U.uTexel.value = CD;
  const PM = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS,
    fragmentShader: SIL_HEAD + FS + SIL_SHADE + `void main(){ fragColor = shade(vP); if (fragColor.a < .002 && dot(fragColor.rgb, vec3(1.)) < .002) discard; }`,
    uniforms: U, depthTest: o.depthTest !== false, side: THREE.DoubleSide, ...PM,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([QX0, QY0, QX1, QY0, QX1, QY1, QX0, QY1]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e5);
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); const cam = designCamera(THREE, ctx.view);
  // the part instances (one instanced draw into the composite)
  const NP = PARTS.length;
  const pg = new THREE.InstancedBufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); pg.setIndex([0, 1, 2, 0, 2, 3]);
  const aRect = new THREE.InstancedBufferAttribute(new Float32Array(NP * 4), 4), aCell = new THREE.InstancedBufferAttribute(new Float32Array(NP * 4), 4);
  const aM = new THREE.InstancedBufferAttribute(new Float32Array(NP * 4), 4).setUsage(THREE.DynamicDrawUsage), aT = new THREE.InstancedBufferAttribute(new Float32Array(NP * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const showSack = !!o.sack;
  A.cells.forEach((c, i) => {
    const on = PARTS[i].opt !== 'sack' || showSack;
    aRect.setXYZW(i, c.u0, c.v0, on ? c.u0 + c.uw : c.u0, on ? c.v0 + c.vh : c.v0);
    aCell.setXYZW(i, (c.x - c.u0 * D) / A.W, (c.y - c.v0 * D) / A.H, D / A.W, D / A.H);
  });
  pg.setAttribute('aRect', aRect); pg.setAttribute('aCell', aCell); pg.setAttribute('aM', aM); pg.setAttribute('aT', aT); pg.instanceCount = NP;
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const pmat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: PART_VS, fragmentShader: PART_FS, uniforms: { tParts: { value: tex }, uQ }, depthTest: false, side: THREE.DoubleSide, ...PM });
  const pmesh = new THREE.Mesh(pg, pmat); pmesh.frustumCulled = false;
  const pscene = new THREE.Scene(); pscene.add(pmesh);
  const pcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---- state
  const st = { P: poseParams({}, 'stand'), Pa: 'stand', Pb: 'stand', f: 0, target: null, flip: o.flip ? -1 : 1, lean: 0, breathe: 1, sway: 1,
    fn: null, key: undefined, springs: springState(), sT: null, dirty: true, idle: 1, stats: { replays: 0, steps: 0 } };
  const scratch = { A: {}, B: {}, T: {}, F: {} };
  const legacyParams = () => {
    const P = mixParams(scratch.A, POSES[st.Pa], POSES[st.Pb], sm01(st.f));
    P.lean += st.lean; P.breathe = st.breathe; P.sway = st.sway; P.idle = Math.min(st.breathe, st.sway) > 0 ? 1 : 0;
    if (st.target) { P.tx = st.target[0]; P.ty = st.target[1]; P.tw = 1; }
    return P;
  };
  // run the springs: from the performance function (pure in time), or forward from the last update (legacy).
  // Performance mode keeps the integrated state: while time moves forward (by up to the 2 s window) under the same
  // performance key, it only integrates the new fixed steps (usually 1-3 per frame). A discontinuity (time going back,
  // a jump past the window, a new key, reset()) replays the whole 2 s window from rest, so any frame is still the same
  // function of time whichever way it was reached (the window is long enough for every spring to have settled).
  const NW = Math.round(2.0 / SH), PC = { S: null, K: 0, a0: new Float64Array(SPR.length), key: undefined, fn: null };
  const out = SPR.map(() => ({ a: 0 }));
  const stepFn = (S, k) => { const tk = k * SH; trunk(fillTo(fullS, st.fn(tk, false)), tk, scratch.T); springStep(S, scratch.T, SH, scratch.F); };
  function runSprings(time, P) {
    if (st.fn) {
      const g1 = Math.floor(time / SH);
      const same = PC.S && (st.key !== undefined ? keyEq(st.key, PC.key) : st.fn === PC.fn);
      if (!same || g1 < PC.K - 1 || g1 + 1 - PC.K > NW) {                    // discontinuity: replay the window
        PC.S = springState(); PC.K = g1 - NW - 1;
        st.stats.replays++;
      }
      PC.key = st.key; PC.fn = st.fn;
      const S = PC.S;
      if (g1 + 1 > PC.K) {
        for (let k = PC.K + 1; k <= g1 + 1; k++) {
          if (k === g1 + 1) for (let i = 0; i < S.length; i++) PC.a0[i] = S[i].a;    // the state after step g1
          stepFn(S, k); st.stats.steps++;
        }
        PC.K = g1 + 1;
      }
      // render between the states after steps g1 and g1 + 1 (PC.K - 1 === g1 here, or g1 === PC.K - 1 unchanged)
      const w = time / SH - g1;
      for (let i = 0; i < S.length; i++) out[i].a = lerpN(PC.a0[i], S[i].a, w);
      return out;
    } else {
      const T = scratch.T, F = scratch.F, g1 = Math.floor(time / SH);
      if (st.sT == null || g1 < st.sT || g1 - st.sT > 30) { st.springs = springState(); st.sT = g1; }
      for (let k = st.sT + 1; k <= g1; k++) { trunk(P, k * SH, T); springStep(st.springs, T, SH, F); }
      st.sT = g1;
    }
    return st.springs;
  }
  const full = {}, fullS = {};
  const fillTo = (o2, p) => { for (const k of PARAMS) o2[k] = p[k] ?? P0[k]; return o2; };
  const fill = p => fillTo(full, p);

  // pose everything for params P at time t -> part transforms
  const pose = {};
  function solve(P, time) {
    const T = trunk(P, time, {});
    const S = runSprings(time, P);
    // primary chain with the springs' angles
    const fr = { Mp: T.Mp, Mh: T.Mh };
    SPR.forEach((e, i) => { fr[e.id] = xmul(fr[e.par], rotAt(S[i].a, e.piv)); });
    // near arm: forward kinematics, then (weighted) IK onto the target fingertip
    let Tt = T, cA = T.cAng;
    const handM = (wrist, ang) => xmul(xtr(wrist[0], wrist[1]), xrot(ang));
    const tipH = tipInHand(P);
    let sh = xf(T.Mc, J.shN);
    let a1 = cA + P.a1, a2 = a1 + P.a2, ha = a2 + P.wr, stretch = 1;
    if (P.tw > 0) {
      const el = [sh[0] + Math.cos(a1) * ARM.up, sh[1] + Math.sin(a1) * ARM.up], wr = [el[0] + Math.cos(a2) * ARM.fo, el[1] + Math.sin(a2) * ARM.fo];
      const nat = xf(handM(wr, ha), tipH);
      const goal = [lerpN(nat[0], P.tx, P.tw), lerpN(nat[1], P.ty, P.tw)];
      // the hand turns so that its fingertip (pointing or hooked) leads along the reach
      let hA = lerpN(ha, Math.atan2(goal[1] - sh[1], goal[0] - sh[0]) - 0.75 * Math.atan2(tipH[1], tipH[0]) + P.wr * 0.6, P.tw);
      if (P.haW > 0) hA = lerpN(hA, P.ha, P.haW);
      // out of reach: he leans in (then bends at the waist)
      let lean = P.lean, bend = P.bend;
      for (let it = 0; it < 6; it++) {
        const W = (() => { const r = rot2(tipH, hA); return [goal[0] - r[0], goal[1] - r[1]]; })();
        const d = Math.hypot(W[0] - sh[0], W[1] - sh[1]), miss = d - (ARM.up + ARM.fo) * 0.985;
        if (miss <= 0.05 || it === 5) {
          const s = ik2(sh, W, ARM.up, ARM.fo, 1); stretch = Math.min(1.08, Math.max(1, s.reach / 0.985 * (miss > 0 ? 1 : 0) || 1));
          a1 = s.a1; a2 = Math.atan2(W[1] - s.e[1], W[0] - s.e[0]); ha = hA; break;
        }
        const lk = Math.min(0.12, lean + miss / 70), dl = lk - lean; lean = lk; if (dl < 1e-4) bend = Math.min(0.2, bend + miss / 30);
        Tt = trunk({ ...P, lean, bend }, time, {}); sh = xf(Tt.Mc, J.shN);
      }
      if (Tt !== T) { fr.Mp = Tt.Mp; fr.Mh = Tt.Mh; SPR.forEach((e, i) => { fr[e.id] = xmul(fr[e.par], rotAt(S[i].a, e.piv)); }); }
    }
    const L1 = ARM.up * stretch, L2 = ARM.fo * stretch;
    const el = [sh[0] + Math.cos(a1) * L1, sh[1] + Math.sin(a1) * L1], wrist = [el[0] + Math.cos(a2) * L2, el[1] + Math.sin(a2) * L2];
    fr.chest = Tt.Mc; fr.head = fr.Mh; fr.skirt = fr.skirt; fr.arm1 = seg(sh, a1, stretch); fr.arm2 = seg(el, a2, stretch);
    const H = fr.hand = handM(wrist, ha);
    fr.thumb = xmul(H, xmul(xtr(HAND.thumb[0], HAND.thumb[1]), xrot(-0.12 + P.th)));
    fr.idx1 = xmul(H, xmul(xtr(HAND.idx[0], HAND.idx[1]), xrot(P.i1))); fr.idx2 = xmul(fr.idx1, xmul(xtr(HAND.i1, 0), xrot(P.i2)));
    fr.fin1 = xmul(H, xmul(xtr(HAND.fin[0], HAND.fin[1]), xrot(P.f1))); fr.fin2 = xmul(fr.fin1, xmul(xtr(HAND.f1, 0), xrot(P.f2)));
    santa.fingertip = xf(fr.idx2, [HAND.i2, 0]); santa.shoulder = sh; santa.reachLength = Math.hypot(santa.fingertip[0] - sh[0], santa.fingertip[1] - sh[1]);
    santa.wrist = wrist; santa.handAngle = ha;
    // far arm (hangs behind; the walk swings it), its hand
    const swing = P.walkW * Math.min(1, P.walkV / 26) * 0.34 * Math.sin(T.phase * TAU + 0.3);
    const sf = xf(Tt.Mc, J.shF), f1 = Tt.cAng + P.fa1 - swing, f2 = f1 + P.fa2 - 0.4 * Math.max(0, -swing);
    const ef = [sf[0] + Math.cos(f1) * FARM.up, sf[1] + Math.sin(f1) * FARM.up], wf = [ef[0] + Math.cos(f2) * FARM.fo, ef[1] + Math.sin(f2) * FARM.fo];
    fr.farU = seg(sf, f1); fr.farF = seg(ef, f2); fr.farH = seg(wf, f2 + 0.3);
    // legs: two-bone IK from the hips to the ankles, knees forward
    for (const [k, hip, ank] of [['N', J.hipN, Tt.ankN || T.ankN], ['F', J.hipF, Tt.ankF || T.ankF]]) {
      const hp = xf(Tt.Mp, hip), s = ik2(hp, ank[0], LEG.th, LEG.sh, -1);
      fr['th' + k] = seg(hp, s.a1 - Math.PI / 2); fr['sh' + k] = seg(s.e, s.a2 - Math.PI / 2); fr['ft' + k] = seg(ank[0], ank[1]);
    }
    // instances
    PARTS.forEach((pt, i) => { const m = fr[pt.fr]; aM.setXYZW(i, m[0], m[1], m[2], m[3]); aT.setXY(i, m[4], m[5]); });
    aM.needsUpdate = true; aT.needsUpdate = true;
    pose.fr = fr; pose.trunk = Tt; santa.debug = { lean: Tt.lean, cAng: Tt.cAng, drop: Tt.drop, stretch, tip: santa.fingertip, sh, spr: S.map(q => q.a) };
  }

  const santa = {
    mesh, object: mesh, poses: POSE_NAMES, atlas: A,
    get flip() { return st.flip < 0; }, set flip(v) { st.flip = v ? -1 : 1; U.uFlip.value = st.flip; if (santa._light) santa.setLight(santa._light[0], santa._light[1]); },
    // legacy: pose(a, b = a, f = 0) blends the named poses' parameters (a motion, not a cross-dissolve)
    pose(a, b, f = 0) {
      const nm = x => typeof x === 'number' ? POSE_NAMES[Math.max(0, Math.min(POSE_NAMES.length - 1, Math.round(x)))] : (POSES[x] ? x : 'stand');
      st.Pa = nm(a); st.Pb = nm(b == null ? a : b); st.f = Math.max(0, Math.min(1, f)); st.fn = null; st.key = undefined; return santa;
    },
    poseIndex(x) { const i = Math.floor(x); return santa.pose(i, i + 1, x - i); },
    armTarget(p) { st.target = p ? [p[0], p[1]] : null; return santa; },
    lean(v) { st.lean = v || 0; return santa; },
    motion(breathe = 1, sway = 1) { st.breathe = breathe; st.sway = sway; return santa; },
    // performance: fn(time, full) -> params (see PARAMS); must be a pure function of time. full = false: only the
    // trunk is needed (lean, bend, shift, head, gaze, feet / walk, travel, idle...), evaluated over the last 2 s
    // key (optional, string or number): identifies the performance. While it stays the same and time moves forward,
    // the springs integrate on from the cached state (cheap); a new key (or, without keys, a new fn) replays the 2 s
    // window. Pass one when you hand in a fresh closure every frame: e.g. the clock offset and anything else the
    // performance depends on.
    perform(fn, key) { st.fn = fn; st.key = key; return santa; },
    // forget the integrated springs (call from a scene's enter(); jumps are detected anyway)
    reset() { st.springs = springState(); st.sT = null; PC.S = null; return santa; },
    // springs: { replays, steps } since creation (performance mode; for profiling)
    get springStats() { return st.stats; },
    place(x, y, h) { st.sx = x; st.sy = y; st.sh = h; mesh.position.set(x, -y, 0); U.uScale.value = h / 100; U.uBill.value = 0; mesh.updateMatrixWorld(); return santa; },
    placeWorld(pos, height, billboard = true) { mesh.position.set(pos[0], pos[1], pos[2]); U.uScale.value = height / 100; U.uBill.value = billboard ? 1 : 0; mesh.updateMatrixWorld(); return santa; },
    toFigure(x, y) { const s = st.sh / 100; return [(x - st.sx) / s * st.flip, 100 + (y - st.sy) / s]; },
    toDesign(p, out = [0, 0]) { const s = st.sh / 100; out[0] = st.sx + p[0] * st.flip * s; out[1] = st.sy + (p[1] - 100) * s; return out; },
    armTargetDesign(x, y) { return santa.armTarget(santa.toFigure(x, y)); },
    fingertip: [0, 0], shoulder: [0, 0], reachLength: 0, wrist: [0, 0], handAngle: 0,
    // the parameters used by the last update (read-only)
    get params() { return full; },
    update(time) {
      U.uTime.value = time;
      const P = st.fn ? fill(st.fn(time, true)) : fill(legacyParams());
      solve(P, time); st.dirty = true;
      return santa;
    },
    // draw the parts into the figure-space composite (render() does this when needed)
    composite() {
      if (!st.dirty) return santa;
      const ac = gl.autoClear, cc = gl.getClearColor(new THREE.Color()), ca = gl.getClearAlpha();
      gl.setRenderTarget(comp); gl.setClearColor(0x000000, 0); gl.clear(true, false, false);
      gl.autoClear = false; gl.render(pscene, pcam); gl.autoClear = ac;
      gl.setClearColor(cc, ca); st.dirty = false;
      return santa;
    },
    render(target = null, camera) {
      santa.composite();
      cam.fit();
      const parent = mesh.parent; scene.add(mesh);
      ctx.gfx.draw(scene, camera || cam, target, { clear: false });
      scene.remove(mesh); if (parent && parent !== scene) parent.add(mesh);
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose(); pg.dispose(); pmat.dispose(); comp.dispose(); if (mesh.parent) mesh.parent.remove(mesh); },
  };
  silSetters(santa, U, () => st.flip);
  santa.style(o); santa.setLight(o.light[0], o.light[1]);
  U.uFlip.value = st.flip;
  santa.place(0, 0, 100).update(0);
  return santa;
}
