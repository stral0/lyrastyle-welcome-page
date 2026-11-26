// Scene 2 — "Ploča": sand on a ringing brass plate draws Chladni figures. Rhythm has a shape.
// State is one thing only: the last strike (from-figure, to-figure, point, age). Everything on screen is a
// function of that plus the timeline, so any beat is addressable and reversible.

// Free square plate, classic family s = cos(n pi x) cos(m pi y) + sg cos(m pi x) cos(n pi y), plus a pinch of a
// second mode (eps) so crossings become the avoided crossings real plates show. tau = how wide the sand line lies.
const FIGS = [
  { n: 0, m: 2, sg: 1, p: 1, q: 2, eps: .06, tau: .024, hz: 5.2, drum: 'kick', bell: 1 / 2 },
  { n: 2, m: 4, sg: 1, p: 1, q: 2, eps: .06, tau: .021, hz: 6.6, drum: 'tom', bell: 2 / 3 },
  { n: 3, m: 5, sg: 1, p: 2, q: 3, eps: .06, tau: .019, hz: 8.1, drum: 'snare', bell: 3 / 4 },
  { n: 4, m: 6, sg: 1, p: 1, q: 2, eps: .06, tau: .017, hz: 9.7, drum: 'rim', bell: 1 },
  { n: 5, m: 7, sg: 1, p: 2, q: 3, eps: .06, tau: .016, hz: 11.3, drum: 'cymbal', bell: 5 / 4 },
];
const NF = FIGS.length;
const T0 = 1.6;            // beat 0: the plate strikes itself
const T1 = 1.8;            // beat 1: second figure
const HOLD0 = 11.2, PERIOD = 6.5; // beat 1 hold: next figure every PERIOD seconds
const SETTLED = 4.3;       // every grain has landed this long after a strike
const DELAYK = .2;         // seconds per plate unit for the strike wave to reach a grain
const DEN = 512;           // sand density map (plate space)
const AUTO_PTS = [[.34, .22], [-.3, .36], [.42, -.3], [-.22, -.4], [.1, .46], [-.44, .05]];

const G_MODE = /* glsl */`
uniform vec4 uMa; uniform vec2 uMb;   // (n, m, sign, eps), (p, q)
float modeS(vec2 p){ vec2 q = (p + 1.) * 1.5707963;
  return .5 * (cos(uMa.x * q.x) * cos(uMa.y * q.y) + uMa.z * cos(uMa.y * q.x) * cos(uMa.x * q.y) + uMa.w * cos(uMb.x * q.x) * cos(uMb.y * q.y)); }
vec3 modeG(vec2 p){ vec2 q = (p + 1.) * 1.5707963;
  float cnx = cos(uMa.x * q.x), cmx = cos(uMa.y * q.x), cny = cos(uMa.x * q.y), cmy = cos(uMa.y * q.y);
  float snx = sin(uMa.x * q.x), smx = sin(uMa.y * q.x), sny = sin(uMa.x * q.y), smy = sin(uMa.y * q.y);
  float s = cnx * cmy + uMa.z * cmx * cny + uMa.w * cos(uMb.x * q.x) * cos(uMb.y * q.y);
  float gx = -uMa.x * snx * cmy - uMa.z * uMa.y * smx * cny - uMa.w * uMb.x * sin(uMb.x * q.x) * cos(uMb.y * q.y);
  float gy = -uMa.y * cnx * smy - uMa.z * uMa.x * cmx * sny - uMa.w * uMb.y * cos(uMb.x * q.x) * sin(uMb.y * q.y);
  return vec3(s * .5, gx * .7853982, gy * .7853982); }
`;
// plate surface: ringing mode shape (gated by the arriving strike wave) + the travelling strike ring
const G_FLEX = /* glsl */`
uniform vec4 uFlex;      // x mode flex (signed, metres of show), y ring amplitude, z ring radius, w 1 / ring width
uniform vec3 uStrike;    // xz of the last strike, z = seconds since
float plateY(vec2 p){
  float d = distance(p, uStrike.xy); float gate = smoothstep(0., .35, uStrike.z - d * ${DELAYK});
  float rr = (d - uFlex.z) * uFlex.w;
  return uFlex.x * gate * modeS(p) + uFlex.y * exp(-rr * rr) * cos(rr * 2.4); }
vec2 plateGrad(vec2 p){
  vec2 dv = p - uStrike.xy; float d = max(length(dv), 1e-4); float gate = smoothstep(0., .35, uStrike.z - d * ${DELAYK});
  float rr = (d - uFlex.z) * uFlex.w; float ex = exp(-rr * rr);
  float dr = uFlex.y * ex * (-2. * rr * cos(rr * 2.4) - 2.4 * sin(rr * 2.4)) * uFlex.w;
  return uFlex.x * gate * modeG(p).yz + dr * dv / d; }
`;
// where one grain is, as a function of time since the strike. The xy drift is mirrored in JS (snapshot()).
const G_PATH = /* glsl */`
in vec2 aFrom; in vec2 aTo; in vec4 aSeed;
uniform vec4 uGr;        // x ring envelope, y hum (hold), z hop height, w jitter
uniform float uTime;
vec2 grainPath(out vec3 g){   // g = (hop height, shake, hop index)
  float tl = uStrike.z - (distance(aFrom, uStrike.xy) * ${DELAYK} + aSeed.x * .3);
  float u = clamp(tl / (1.3 + 1.9 * aSeed.y), 0., 1.);
  float e = u * u * (3. - 2. * u); e = 1. - pow(1. - e, 1.6);
  vec2 dv = aTo - aFrom;
  vec2 p = aFrom + dv * e + vec2(-dv.y, dv.x) * (sin(3.14159265 * e) * (aSeed.z - .5) * .7);
  p = clamp(p, -.985, .985);
  float a = abs(modeS(p));                       // local vibration amplitude: antinodes throw hardest
  float on = step(0., tl), tp = max(tl, 0.);
  float tw = smoothstep(.5, 1., sin(uTime * (.9 + 1.7 * aSeed.w) + aSeed.x * 40.));
  float vib = on * uGr.x * (a * 1.7 + exp(-tp * 3.5) * .55) + uGr.y * tw * smoothstep(.05, .3, a);   // strays keep twitching in the hold
  float f = tp * (8. + 9. * aSeed.w) + aSeed.z * 17.;
  float k = floor(f), fr = f - k;
  float h1 = hash11(k * 7.31 + aSeed.x * 113.7 + aSeed.y * 37.1);
  float sd = aSeed.y * 91. + aSeed.x * 7.;
  vec2 j0 = hash22(vec2(k, sd)) - .5, j1 = hash22(vec2(k + 1., sd)) - .5;
  p += mix(j0, j1, fr * fr * (3. - 2. * fr)) * vib * uGr.w;
  p = clamp(p, -.988, .988);
  g = vec3(vib * 4. * fr * (1. - fr) * (.3 + .7 * h1) * uGr.z, vib, k);
  return p; }
`;
const G_LIGHT = /* glsl */`
uniform vec3 uLk, uLr, uKey, uRim;    // directions to key and rim, their colours
vec3 envRim(vec3 d){     // cool strip light behind the plate
  float az = dot(normalize(d.xz + vec2(1e-5)), normalize(uLr.xz));
  float el = (d.y - uLr.y) / .1;
  return uRim * exp(-el * el) * exp((az - 1.) / .3) * .24; }
vec3 envKey(vec3 d){     // warm key, low at the side, and the dark room
  return uKey * exp((dot(d, uLk) - 1.) / .03) + vec3(.085, .062, .04) * (.25 + .75 * max(d.y, 0.)); }
`;

const VS_PLATE = /* glsl */`
precision highp float;
in vec3 position; in vec3 aN; in float aTop;
uniform mat4 uVP;
out vec3 vW; out vec2 vP; out vec3 vN; out float vTop;
HASH MODE FLEX
void main(){
  vec2 p = clamp(position.xz, -1., 1.);
  vec3 w = position; w.y += plateY(p);
  vW = w; vP = position.xz; vN = aN; vTop = aTop;
  gl_Position = uVP * vec4(w, 1.);
}`;
const FS_PLATE = /* glsl */`
precision highp float; precision highp sampler2D;
in vec3 vW; in vec2 vP; in vec3 vN; in float vTop; out vec4 fragColor;
uniform vec3 uCam; uniform sampler2D tDen; uniform vec4 uHover; uniform vec2 uRingL; uniform float uTime, uFan;
HASH NOISE MODE FLEX LIGHT
const vec3 F0 = vec3(.93, .66, .30);
void main(){
  vec3 V = normalize(uCam - vW);
  vec3 col;
  if (vTop > .5) {
    vec2 g = plateGrad(vP);
    float edge = max(abs(vP.x), abs(vP.y));
    float lip = smoothstep(.968, .989, edge);                       // the edge is eased, not cut: it catches the rim
    vec2 outw = abs(vP.x) > abs(vP.y) ? vec2(sign(vP.x), 0.) : vec2(0., sign(vP.y));
    vec3 N = normalize(vec3(-g.x + outw.x * lip * .7, 1., -g.y + outw.y * lip * .7));
    float r = length(vP); vec2 rd = r > 1e-4 ? vP / r : vec2(1., 0.);
    vec3 Bv = vec3(rd.x, 0., rd.y), Tv = vec3(-rd.y, 0., rd.x);
    // lathe grooves: 1D noise along the radius, a little wander around the turn, analytically faded
    float gf = r * 170.; float fw = fwidth(gf);
    float fine = 1. - smoothstep(.35, 1.3, fw), finer = 1. - smoothstep(.12, .45, fw);
    float n1 = vnoise(vec2(gf, 3.7)) - .5, n2 = vnoise(vec2(gf * .21, 9.1)) - .5, n3 = vnoise(vec2(gf * 3.3, 1.3)) - .5;
    float n4 = vnoise(vec2(gf * .5 + rd.x * 2.5, rd.y * 2.5 + 5.)) - .5;
    float groove = n1 * fine + n3 * .7 * finer + n4 * .2 * fine;
    float patina = fbm(vP * 2.3 + 11.) * .6 + fbm(vP * 9. + 3.) * .4;
    vec3 Ng = normalize(N + Bv * groove * .08);
    vec3 Tg = normalize(Tv - Ng * dot(Tv, Ng));
    float nv = max(dot(Ng, V), 0.);
    vec3 F = F0 + (1. - F0) * pow(1. - nv, 5.);
    // mirror-ish sheen, smeared across the grooves
    vec3 sheen = vec3(0.), cool = vec3(0.);
    for (int i = -2; i <= 2; i++) { float t = float(i); vec3 R = reflect(-V, normalize(Ng + Bv * t * .075)); float w = exp(-t * t * .45) * .33; sheen += envKey(R) * w; cool += envRim(R) * w; }
    vec3 Fc = mix(F, vec3(1.), .8);                                     // the lacquer answers the cool light almost untinted
    // sand on the plate: contact shadow thrown away from the key, soft occlusion, a breath of sand glow in the metal
    vec2 uv = vP * .5 + .5; vec2 lk = normalize(uLk.xz) * .5;
    float d0 = textureLod(tDen, uv, 0.).r, dW = textureLod(tDen, uv, 3.).r;
    float s1 = textureLod(tDen, uv + lk * .012, 1.).r, s2 = textureLod(tDen, uv + lk * .034, 2.5).r;
    float sh = 1. - .5 * clamp(max(s1 - .5, 0.) * .45, 0., 1.) - .35 * clamp(max(s2 - .5, 0.) * .5, 0., 1.);
    float ao = 1. - .5 * clamp(dW * .3, 0., 1.);
    // the bow-tie fans of a turned plate: each groove throws light where its tangent is square to the half vector
    float streak = .45 + 1.1 * clamp(n1 * fine * .9 + n3 * finer * .7 + n2 * .2 + .5, 0., 1.4) * (.75 + .5 * patina);
    vec3 fans = vec3(0.);
    { vec3 H = normalize(uLk + V); float ht = dot(H, Tg); fans += uKey * exp(-ht * ht / .007) * pow(max(dot(H, Ng), 0.), 1.5) * sqrt(max(dot(Ng, uLk), 0.)) * sh * .38; }
    { vec3 H = normalize(uLr + V); float ht = dot(H, Tg); fans += uRim * exp(-ht * ht / .010) * pow(max(dot(H, Ng), 0.), 3.) * sqrt(max(dot(Ng, uLr), 0.)) * .30; }
    col = (F * (sheen * (.75 + .5 * streak) * (.5 + .5 * uFan) + fans * streak * uFan) + Fc * cool * (.7 + .6 * streak)) * ao * (.8 + .4 * patina);
    col += F0 * (uKey * max(dot(Ng, uLk), 0.) * sh * .012 + vec3(.0025, .002, .0015)) * ao;            // tired, slightly diffuse alloy
    col += F0 * vec3(.80, .62, .40) * uKey * dW * .006;                                                 // sand glow in the metal
    // strike ring, hover spot, lathe centre
    float rr = (distance(vP, uStrike.xy) - uFlex.z) * uFlex.w;
    col += vec3(1., .78, .5) * exp(-rr * rr) * uRingL.x * (.6 + .8 * streak);
    col += vec3(1., .8, .55) * exp(-dot(vP - uStrike.xy, vP - uStrike.xy) / .012) * uRingL.y;
    vec2 hv = vP - uHover.xy; col += F0 * vec3(1., .85, .6) * exp(-dot(hv, hv) / .03) * uHover.z * (.5 + streak);
    col *= .4 + .6 * smoothstep(.006, .014, r);
    col *= 1. - .25 * smoothstep(.93, 1., edge) * patina;
    col += (uRim * pow(max(dot(N, normalize(uLr + V)), 0.), 60.) * 1.6 + uKey * pow(max(dot(N, normalize(uLk + V)), 0.), 60.) * .8) * lip;
  } else {
    vec3 N = normalize(vN);
    vec3 F = F0 + (1. - F0) * pow(1. - max(dot(N, V), 0.), 5.);
    vec3 R = reflect(-V, N);
    float along = hash12(floor(vW.xz * 260.)) * .5 + .75;
    vec3 Hk = normalize(uLk + V), Hr = normalize(uLr + V);
    col = F * ((envKey(R) + envRim(R)) * .6 + uKey * pow(max(dot(N, Hk), 0.), 24.) * 1.2 + uRim * pow(max(dot(N, Hr), 0.), 24.) * 1.2) * along;
    col += F0 * (uKey * max(dot(N, uLk), 0.) + uRim * max(dot(N, uLr), 0.)) * .035;
    col *= smoothstep(-.06, -.004, vW.y - plateY(clamp(vP, -1., 1.))) * .75 + .25;
  }
  fragColor = vec4(col, 1.);
}`;

const VS_GRAIN = /* glsl */`
precision highp float; precision highp sampler2D;
uniform mat4 uVP; uniform vec3 uCam; uniform sampler2D tDen;
uniform vec4 uPt;       // x px per world unit at w = 1, y grain radius, z pile height per unit density, w opacity
uniform vec4 uDof;      // x circle of confusion (px) per unit of relative defocus, y focus distance
out vec4 vCol; out vec3 vPt;
HASH MODE FLEX PATH LIGHT
void main(){
  vec3 g; vec2 p = grainPath(g);
  vec2 uv = p * .5 + .5; const float E = 2. / ${DEN}.;
  float den = textureLod(tDen, uv, 0.).r;
  vec2 gd = vec2(textureLod(tDen, uv + vec2(E, 0.), 0.).r - textureLod(tDen, uv - vec2(E, 0.), 0.).r,
                 textureLod(tDen, uv + vec2(0., E), 0.).r - textureLod(tDen, uv - vec2(0., E), 0.).r) / (4. * E);
  vec3 r3 = hash33(aSeed.xyz * 255. + aSeed.w * 71.3), r4 = hash33(aSeed.wzy * 255. + 19.7);
  float air = clamp(g.x * 90., 0., 1.);
  float pile = max(den - .55, 0.) * uPt.z, hf = .3 + .7 * r3.x;
  vec3 W = vec3(p.x, plateY(p) + uPt.y + pile * hf * (1. - air) + g.x, p.y);
  // matte grain: the slope of the sand ridge it lies on, plus its own random facet
  vec2 sl = clamp(gd * uPt.z, -1.6, 1.6) * (1. - air);
  vec3 Nr = normalize(vec3(-sl.x, 1., -sl.y));
  vec3 n = normalize(Nr * 1.15 + normalize(r4 * 2. - 1.) * .7);
  vec3 alb = mix(vec3(.78, .68, .52), vec3(.36, .26, .16), step(r3.y, .09));
  alb = mix(alb, vec3(.95, .90, .82), step(.87, r3.y)) * (.78 + .44 * r3.z);
  float dk = max(dot(n, uLk), 0.), dr = max(dot(n, uLr), 0.);
  float buried = mix(1., .45 + .55 * hf, clamp((den - 1.) * .5, 0., 1.) * (1. - air));
  vec3 col = alb * (uKey * dk * .5 + uRim * dr * .5 + vec3(.022, .019, .016)) * buried;
  // a share of the grains carry a mirror facet; it tumbles while the grain is in the air
  vec3 V = normalize(uCam - W);
  vec3 fn = normalize(hash33(vec3(aSeed.xy * 255., g.z * step(.03, g.y) + aSeed.z * 31.)) * 2. - 1. + Nr * .7);
  float gl = step(.93, r4.z);
  col += gl * (uKey * pow(max(dot(fn, normalize(uLk + V)), 0.), 160.) + uRim * pow(max(dot(fn, normalize(uLr + V)), 0.), 160.)) * 3.5;
  gl_Position = uVP * vec4(W, 1.);
  float rpx = uPt.y * (.65 + .9 * r4.y * r4.y) * uPt.x / gl_Position.w;
  float coc = uDof.x * abs(gl_Position.w - uDof.y) / gl_Position.w;       // depth of field, the cheap way: wider, fainter
  float rr = max(sqrt(rpx * rpx + coc * coc * .3), .5);
  gl_PointSize = 2. * rr + 1.5;
  vCol = vec4(col, uPt.w * min(1., rpx * rpx / (rr * rr + .083)) * 1.083);
  vPt = vec3(rr, gl_PointSize, 0.);
}`;
const FS_GRAIN = /* glsl */`
precision highp float;
in vec4 vCol; in vec3 vPt; out vec4 fragColor;
uniform vec2 uL2;       // key direction on screen, for the grain's own tiny shading
void main(){
  vec2 q = gl_PointCoord - .5; float d = length(q) * vPt.y;
  float a = clamp(vPt.x - d + .5, 0., 1.) * vCol.a; if (a < .004) discard;
  float sh = 1. + dot(q * vec2(1., -1.), uL2) * vPt.y / vPt.x * .45 * smoothstep(.9, 2.2, vPt.x);
  fragColor = vec4(vCol.rgb * sh * a, a);
}`;
const VS_DEN = /* glsl */`
precision highp float;
uniform float uDenW; out float vWt;
HASH MODE FLEX PATH
void main(){ vec3 g; vec2 p = grainPath(g); gl_Position = vec4(p, 0., 1.); gl_PointSize = 1.; vWt = uDenW / (1. + g.x * 70.); }`;
const FS_DEN = /* glsl */`
precision highp float; in float vWt; out vec4 fragColor; void main(){ fragColor = vec4(vWt); }`;

const VS_BG = /* glsl */`
precision highp float; in vec3 position; out vec2 vNdc;
void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1., 1.); }`;
const FS_BG = /* glsl */`
precision highp float; in vec2 vNdc; out vec4 fragColor;
uniform vec3 uCam, uCx, uCy, uCz, uLk; uniform vec4 uProj; uniform vec3 uGlow; uniform float uFloor;
void main(){
  vec3 d = normalize(uCx * (vNdc.x - uProj.z) * uProj.x + uCy * (vNdc.y - uProj.w) * uProj.y + uCz);
  vec3 col = vec3(0.);
  if (d.y < -1e-3) {       // a black, faintly glossy floor far below: it holds a ghost of the plate
    float t = (-uFloor - uCam.y) / d.y; vec3 f = uCam + d * t;
    vec2 q = f.xz + d.xz * (uFloor / -d.y);
    float blur = .12 + .3 * (1. + d.y);
    vec2 m = 1. - smoothstep(vec2(1. - blur * .6), vec2(1. + blur), abs(q));
    float fres = .25 + .75 * pow(1. + d.y, 3.);
    col = uGlow * m.x * m.y * fres * (.55 + .45 * exp(-dot(q, q) * 1.2));
    // the two lit edges of the plate, smeared in the floor
    float w = .05 + blur * .35; vec2 e = (abs(q) - 1.) / w;
    col += uGlow * 2.2 * fres * (exp(-e.y * e.y) * m.x * max(uLk.z * sign(q.y), 0.) + exp(-e.x * e.x) * m.y * max(uLk.x * sign(q.x), 0.));
  }
  fragColor = vec4(col, 0.);
}`;

const FS_BLUR = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir;
void main(){ vec3 s = texture(tSrc, vUv).rgb * .2270270;
  s += (texture(tSrc, vUv + uDir * 1.3846154).rgb + texture(tSrc, vUv - uDir * 1.3846154).rgb) * .3162162;
  s += (texture(tSrc, vUv + uDir * 3.2307692).rgb + texture(tSrc, vUv - uDir * 3.2307692).rgb) * .0702703;
  fragColor = vec4(s, 1.); }`;
export default {
  id: 'ploca', enterWith: 'pluck',
  beats: [
    { dur: 8, copy: ['ploca.b1.h', 'ploca.b1.p', 'ploca.hint'] },
    { dur: 9, copy: ['ploca.b2.h', 'ploca.b2.p'] },
  ],
  create(ctx) {
    const { gfx, THREE, view } = ctx;
    const { clamp, lerp, damp, smoothstep, rng } = ctx.util;
    const glsl = src => src.replace(/\bHASH\b/, ctx.GLSL.HASH).replace(/\bNOISE\b/, ctx.GLSL.NOISE).replace(/\bMODE\b/, G_MODE).replace(/\bFLEX\b/, G_FLEX).replace(/\bPATH\b/, G_PATH).replace(/\bLIGHT\b/, G_LIGHT);

    const NMAX = view.touch || Math.min(view.cssW, view.cssH) < 520 ? 140000 : 220000;
    const R0 = .0015 * Math.sqrt(220000 / NMAX);          // grain radius (plate half-width = 1)

    // ---------------- shared uniforms ----------------
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), V4 = (x = 0, y = 0, z = 0, w = 0) => new THREE.Vector4(x, y, z, w);
    const U = {
      uVP: { value: new THREE.Matrix4() }, uCam: { value: V3() }, uTime: { value: 0 },
      uMa: { value: V4() }, uMb: { value: new THREE.Vector2(1, 2) },
      uFlex: { value: V4(0, 0, 0, 8) }, uStrike: { value: V3(0, 0, 99) }, uGr: { value: V4() },
      uLk: { value: V3(1, 0, 0) }, uLr: { value: V3(0, 1, 0) }, uKey: { value: V3() }, uRim: { value: V3() },
      tDen: { value: null }, uPt: { value: V4() }, uL2: { value: new THREE.Vector2(1, 0) }, uDenW: { value: 1 },
      uDof: { value: V4() }, uHover: { value: V4() }, uRingL: { value: new THREE.Vector2() }, uFan: { value: 1 },
      uCx: { value: V3() }, uCy: { value: V3() }, uCz: { value: V3() }, uProj: { value: V4() }, uGlow: { value: V3() }, uFloor: { value: .32 },
    };
    const mat = (vs, fs, o = {}) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: glsl(vs), fragmentShader: glsl(fs), uniforms: U, ...o });

    // ---------------- targets and passes ----------------
    const hdr = gfx.target({ depth: true, samples: 4 });
    const denRaw = gfx.target({ w: DEN, h: DEN }), denTmp = gfx.target({ w: DEN, h: DEN }), den = gfx.target({ w: DEN, h: DEN, mips: true });
    const blur = gfx.pass(FS_BLUR, { tSrc: null, uDir: new THREE.Vector2() });
    U.tDen.value = den.texture;

    // ---------------- world ----------------
    const world = new THREE.Scene(), denScene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(26, 1, .5, 60); cam.matrixAutoUpdate = false;
    const denCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      const m = new THREE.Mesh(g, mat(VS_BG, FS_BG, { depthTest: false, depthWrite: false })); m.frustumCulled = false; m.renderOrder = -2; world.add(m);
    }
    { // the plate: a displaced top grid, a chamfer that catches the rim light, thin sides
      const G = 112, CH = .011, TH = .03, a = 1 - CH;
      const pos = [], nor = [], top = [], idx = [];
      for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) { pos.push(lerp(-a, a, i / G), 0, lerp(-a, a, j / G)); nor.push(0, 1, 0); top.push(1); }
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const k = j * (G + 1) + i; idx.push(k, k + G + 1, k + 1, k + 1, k + G + 1, k + G + 2); }
      const strip = (ax, sg, r0, y0, r1, y1, n) => { // a band along one edge; ax 0: edge at x = sg, runs along z
        const b = pos.length / 3;
        for (let i = 0; i <= G; i++) {
          const t = i / G * 2 - 1;
          for (const [r, y] of [[r0, y0], [r1, y1]]) { const u = t * r; if (ax === 0) pos.push(sg * r, y, u); else pos.push(u, y, sg * r); nor.push(ax === 0 ? sg * n[0] : 0, n[1], ax === 0 ? 0 : sg * n[0]); top.push(0); }
        }
        for (let i = 0; i < G; i++) { const k = b + i * 2; idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3); }
      };
      for (const ax of [0, 1]) for (const sg of [-1, 1]) { strip(ax, sg, a, 0, 1, -CH, [.7071, .7071]); strip(ax, sg, 1, -CH, 1, -TH, [1, 0]); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('aN', new THREE.BufferAttribute(new Float32Array(nor), 3));
      g.setAttribute('aTop', new THREE.BufferAttribute(new Float32Array(top), 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat(VS_PLATE, FS_PLATE, { side: THREE.DoubleSide })); m.frustumCulled = false; m.renderOrder = -1; world.add(m);
    }
    // sand
    const geo = new THREE.BufferGeometry();
    const seeds = new Uint8Array(NMAX * 4), scatter = new Int16Array(NMAX * 2), figPos = FIGS.map(() => new Int16Array(NMAX * 2)), snap = new Float32Array(NMAX * 2);
    const aScatter = new THREE.BufferAttribute(scatter, 2, true), aFig = figPos.map(a => new THREE.BufferAttribute(a, 2, true));
    const aSnap = new THREE.BufferAttribute(snap, 2); aSnap.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4, true)); geo.setAttribute('aFrom', aScatter); geo.setAttribute('aTo', aScatter);
    geo.setAttribute('position', aScatter); // three takes the draw count from 'position'; the shaders never read it
    geo.boundingSphere = new THREE.Sphere(V3(), 2);
    const grains = new THREE.Points(geo, mat(VS_GRAIN, FS_GRAIN, {
      depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // premultiplied
    }));
    grains.frustumCulled = false; grains.renderOrder = 2; world.add(grains);
    const denPts = new THREE.Points(geo, mat(VS_DEN, FS_DEN, { depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    denPts.frustumCulled = false; denScene.add(denPts);

    // ---------------- text ----------------
    const ui = ctx.overlay();
    const h1 = ui.text('ploca.b1.h', { size: 120, font: 'display', width: 560, leading: 1.04 });
    const p1 = ui.text('ploca.b1.p', { size: 38, font: 'text', width: 520, color: '#b9ad97', leading: 1.36 });
    const hint = ui.text('ploca.hint', { size: 32, font: 'displayItalic', color: '#d8a548' });
    const h2 = ui.text('ploca.b2.h', { size: 104, font: 'display', width: 560, leading: 1.05 });
    // 'ploca.b2.p' is two short lines: the fact, then the claim, which carries a little more weight
    const p2a = ui.text('', { size: 38, font: 'text', width: 520, color: '#b9ad97', leading: 1.36 });
    const p2b = ui.text('', { size: 38, font: 'textMed', width: 520, color: '#f4ead8', leading: 1.36 });
    const fitCache = {};
    const fit = (str, font, size, min, maxW) => { // largest size in [min, size] at which the line stays on one line, if there is one
      const key = [str, font, size, view.cssW, view.w].join('|'); let w = fitCache[key];
      if (w == null) w = fitCache[key] = ui.measure(str, { size, font }).w;
      return w > maxW ? Math.max(min, size * maxW / w * .99) : size; };

    // ---------------- state ----------------
    const st = { from: -1, to: -1, age: 99, sx: 0, sz: 0, snap: false, nextAuto: Infinity, nAuto: 0, user: false, userAge: 99 };
    const last = { beat: 0, bt: 0 }; let stepped = false, hintA = 0, hoverA = 0, hoverOn = false, count = NMAX, denDirty = true, shim = 0;
    const camB = { r: V3(1, 0, 0), u: V3(0, 1, 0), d: V3(0, 0, 1), pos: V3(), p00: 1, p11: 1, shx: 0, shy: 0 };
    const figAttr = k => k < 0 ? aScatter : aFig[k];
    const figArr = k => k < 0 ? scatter : figPos[k];

    function setState(from, to, age) {
      st.from = from; st.to = to; st.age = age; st.snap = false;
      geo.setAttribute('aFrom', figAttr(from)); geo.setAttribute('aTo', figAttr(to)); denDirty = true;
    }
    // the timeline with nobody touching anything, as a pure function of (beat, seconds)
    function sync(s) {
      const b = s.beat, bt = s.bt; st.user = false; st.userAge = 99; st.nextAuto = Infinity; st.nAuto = 0;
      const calm = s.motion < 1;
      if (b === 0) {
        if (bt < T0) setState(-1, -1, 99); else { setState(-1, 0, calm ? 99 : bt - T0); st.nAuto = 1; }
        st.sx = AUTO_PTS[0][0]; st.sz = AUTO_PTS[0][1];
      } else if (bt < T1) { setState(-1, 0, 99); st.nextAuto = T1; st.nAuto = 1; st.sx = AUTO_PTS[0][0]; st.sz = AUTO_PTS[0][1]; }
      else {
        const k = bt < HOLD0 ? 0 : 1 + Math.floor((bt - HOLD0) / PERIOD);
        const t0 = k === 0 ? T1 : HOLD0 + (k - 1) * PERIOD;
        setState(k % NF, (k + 1) % NF, calm ? 99 : bt - t0); st.nAuto = k + 2;
        const a = AUTO_PTS[(k + 1) % AUTO_PTS.length]; st.sx = a[0]; st.sz = a[1];
        st.nextAuto = k === 0 ? HOLD0 : t0 + PERIOD;
      }
      if (calm) st.nextAuto = Infinity;
      last.beat = b; last.bt = bt; stepped = false; snapRect = true;
    }
    // where every grain is right now (xy only), so a strike can interrupt a figure that is still forming
    function snapshot() {
      const src = st.snap ? snap : figArr(st.from), k = st.snap ? 1 : 1 / 32767, dst = figArr(st.to), age = st.age, sx = st.sx, sz = st.sz;
      for (let i = 0; i < NMAX; i++) {
        const fx = src[i * 2] * k, fy = src[i * 2 + 1] * k, dx = dst[i * 2] / 32767 - fx, dy = dst[i * 2 + 1] / 32767 - fy;
        const tl = age - (Math.hypot(fx - sx, fy - sz) * DELAYK + seeds[i * 4] / 255 * .3);
        const u = clamp(tl / (1.3 + 1.9 * seeds[i * 4 + 1] / 255));
        let e = u * u * (3 - 2 * u); e = 1 - Math.pow(1 - e, 1.6);
        const c = Math.sin(Math.PI * e) * (seeds[i * 4 + 2] / 255 - .5) * .7;
        snap[i * 2] = clamp(fx + dx * e - dy * c, -.985, .985); snap[i * 2 + 1] = clamp(fy + dy * e + dx * c, -.985, .985);
      }
      aSnap.needsUpdate = true;
    }
    function strike(x, z, o = {}) {
      const cur = st.to, next = o.to != null ? o.to : (cur + 1) % NF;
      if (st.from !== st.to && st.age < SETTLED) { snapshot(); st.snap = true; geo.setAttribute('aFrom', aSnap); }
      else { st.snap = false; geo.setAttribute('aFrom', figAttr(cur)); }
      geo.setAttribute('aTo', figAttr(next));
      st.from = cur; st.to = next; st.age = 0; st.sx = clamp(x, -.97, .97); st.sz = clamp(z, -.97, .97); denDirty = true;
      if (o.user) { st.user = true; st.userAge = 0; }
      if (o.sound !== false) {
        const F = FIGS[next], pan = clamp(o.pan || 0, -.7, .7), v = o.user ? 1 : .85;
        ctx.audio.drum(F.drum, { gain: (F.drum === 'cymbal' ? .5 : .78) * v, pan, pitch: 1 });
        ctx.sfx('bell', { gain: .34 * v, pitch: F.bell, pan: pan * .6 });
        ctx.sfx('grain', { gain: .62 * v, pan });
        ctx.sfx('grain', { gain: .3 * v, pan: -pan * .5, pitch: .8, delay: .55 });
      }
    }
    // pointer -> plate
    function pick(nx, ny, out) {
      const c = camB, dx = (nx - c.shx) / c.p00, dy = (ny - c.shy) / c.p11;
      const rx = c.r.x * dx + c.u.x * dy - c.d.x, ry = c.r.y * dx + c.u.y * dy - c.d.y, rz = c.r.z * dx + c.u.z * dy - c.d.z;
      if (ry > -1e-4) return false; const t = -c.pos.y / ry; out.x = c.pos.x + rx * t; out.z = c.pos.z + rz * t;
      return Math.abs(out.x) <= 1.02 && Math.abs(out.z) <= 1.02;
    }
    const hit = { x: 0, z: 0 }, canvas = gfx.renderer.domElement; let tap = null;

    // ---------------- camera ----------------
    const YAW0 = -.62, PITCH0 = .52, YAW1 = -.16, PITCH1 = 1.3;
    const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const rect = { cx: 0, cy: 0, hw: 1, hh: 1 }, goal = { cx: 0, cy: 0, hw: 1, hh: 1 }; let snapRect = true;
    function frameCamera(yaw, pitch, zoom) {
      const aspect = gfx.W / gfx.H, half = 13 * Math.PI / 180;
      const tanY = aspect >= 1 ? Math.tan(half) : Math.tan(half) / aspect;
      const p11 = 1 / tanY, p00 = p11 / aspect;
      const cp = Math.cos(pitch), sp = Math.sin(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw);
      const d = camB.d.set(sy * cp, sp, cy * cp), r = camB.r.set(cy, 0, -sy), u = camB.u.crossVectors(d, r);
      const cs = CORNERS.map(c => [c[0] * r.x + c[1] * r.z, c[0] * u.x + c[1] * u.z, c[0] * d.x + c[1] * d.z]);
      let D = 0; for (const c of cs) D = Math.max(D, c[2] + Math.max(p00 * Math.abs(c[0]) / rect.hw, p11 * Math.abs(c[1]) / rect.hh));
      let x0, x1, y0, y1;
      for (let it = 0; it < 3; it++) {
        x0 = y0 = 1e9; x1 = y1 = -1e9;
        for (const c of cs) { const w = D - c[2], x = p00 * c[0] / w, y = p11 * c[1] / w; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        if (it < 2) D *= Math.max((x1 - x0) / 2 / rect.hw, (y1 - y0) / 2 / rect.hh);
      }
      D /= zoom;
      const shx = rect.cx - (x0 + x1) / 2 * zoom, shy = rect.cy - (y0 + y1) / 2 * zoom;
      camB.pos.copy(d).multiplyScalar(D); camB.p00 = p00; camB.p11 = p11; camB.shx = shx; camB.shy = shy; camB.D = D;
      cam.matrix.makeBasis(r, u, d).setPosition(camB.pos); cam.matrixWorld.copy(cam.matrix); cam.matrixWorldInverse.copy(cam.matrix).invert();
      const n = .5, f = 60, e = cam.projectionMatrix.elements; e.fill(0);
      e[0] = p00; e[5] = p11; e[8] = -shx; e[9] = -shy; e[10] = -(f + n) / (f - n); e[11] = -1; e[14] = -2 * f * n / (f - n);
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      U.uVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      U.uCam.value.copy(camB.pos); U.uCx.value.copy(r); U.uCy.value.copy(u); U.uCz.value.copy(d).multiplyScalar(-1); U.uProj.value.set(1 / p00, 1 / p11, shx, shy);
      U.uPt.value.x = p11 * gfx.H / 2;
    }
    const dirAE = (v, az, el) => v.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const grade = { exposure: 1, bloom: .5, threshold: 1.5, knee: .7, radius: 1.15, tone: 'aces', contrast: 1.06, saturation: 1.04, vignette: .36, grain: .03, halation: .5, lift: [.0015, .0012, .0009], gain: [1, 1, 1], fade: 1 };

    function apply(s) {
      const t = s.time, mo = s.motion, V = view, port = V.portrait;
      const k1 = s.k(1, 0, 4.4, 'inOutCubic');
      // ---- layout (design units), from the real text boxes and the deck's safe area ----
      const out0 = Math.max(s.k(1, 0, .7), s.exit * 1.6), out1 = s.exit * 1.6;
      const top = V.safeTop, bot = V.h - V.safeBottom, kT = s.k(1, 0, 3, 'inOutCubic');
      const lines = ctx.t('ploca.b2.p').split('\n'); p2a.set(lines[0] || ''); p2b.set(lines.slice(1).join(' '));
      const hgt = (T, est) => T.height || est;
      let L, colW, hs, ps, y0a, y0b, gap;
      if (port) {
        const sc = clamp(V.h / 1900, .8, 1);
        L = V.safeSide; colW = V.w - 2 * L; hs = Math.max(96, 118 * sc); ps = Math.max(34, 40 * sc); gap = 26; y0a = y0b = top + 8;
      } else {
        L = Math.max(V.safeSide + 10, V.w * .068); colW = clamp(V.w * .3, 420, 600); hs = clamp(colW / 4.5, 96, 128); ps = 38; gap = 38;
      }
      const ps2 = Math.min(fit(lines[0] || '', 'text', ps, 34, colW), fit(lines[1] || '', 'textMed', ps, 34, colW)), g2 = ps2 * .2;
      const H0 = hgt(h1, hs * 2.1) + gap + hgt(p1, ps * 2.6) + (port ? 0 : 46 + hgt(hint, 40));
      const H1 = hgt(h2, hs * 2.7) + gap + hgt(p2a, ps2 * 1.3) + g2 + hgt(p2b, ps2 * 1.3);
      if (port) {
        const hintY = bot - hgt(hint, 44) - 14, bottom = hintY - 40;
        const yTop = Math.min(lerp(y0a + H0, y0b + H1, kT) + 54, bottom - 300);
        const yc = lerp(yTop, bottom, lerp(.46, .5, k1)), hh = Math.min(yc - yTop, bottom - yc);
        goal.cx = 0; goal.hw = 1 - 2 * Math.max(54, L * .6) / V.w; goal.cy = 1 - 2 * yc / V.h; goal.hh = Math.max(.1, 2 * hh / V.h);
        hint.opt('align', 'center'); hint.x = V.w / 2; hint.y = hintY;
      } else {
        y0a = Math.max(top, top + (bot - top - H0) * .5); y0b = Math.max(top, top + (bot - top - H1) * .5);
        const x0 = L + colW + 50, x1 = V.w - 70, cx = Math.min((x0 + x1) / 2, V.w * .685), hw = Math.min(cx - x0, x1 - cx, 690);
        goal.cx = cx / V.w * 2 - 1; goal.hw = hw / V.w * 2; goal.cy = 1 - (top + bot) / V.h; goal.hh = Math.min(lerp(.7, .68, k1), (bot - top) / V.h - .035);
      }
      { const a = snapRect ? 1 : 1 - Math.exp(-6 * s.dt); for (const k in goal) rect[k] += (goal[k] - rect[k]) * a; snapRect = false; }
      h1.size = hs; h1.wrap = colW; h1.x = L; h1.y = y0a;
      p1.size = ps; p1.wrap = Math.min(colW, 760); p1.x = L + 3; p1.y = h1.y + hgt(h1, hs * 2.1) + gap;
      h2.size = hs * (port ? .92 : .87); h2.wrap = colW; h2.x = L; h2.y = y0b;
      p2a.size = p2b.size = ps2; p2a.wrap = p2b.wrap = Math.min(colW, 760); p2a.x = p2b.x = L + 3;
      p2a.y = h2.y + hgt(h2, hs * 2.7) + gap; p2b.y = p2a.y + hgt(p2a, ps2 * 1.3) + g2;
      h1.show(s.k(0, 3.0, 4.5), { style: 'blur', by: 'word', q: out0 });
      p1.show(s.k(0, 4.3, 5.7), { style: 'rise', by: 'word', q: out0, stagger: .5 });
      h2.show(s.k(1, 4.3, 5.8), { style: 'blur', by: 'word', q: out1 });
      p2a.show(s.k(1, 5.5, 6.7), { style: 'rise', by: 'word', q: out1, stagger: .5 });
      p2b.show(s.k(1, 6.3, 7.5), { style: 'rise', by: 'word', q: out1, stagger: .5 });
      hintA = damp(hintA, st.user || s.beat > 0 ? 0 : 1, 5, s.dt);
      if (!port) { hint.opt('align', 'left'); hint.x = L + 3; hint.y = p1.y + hgt(p1, ps * 2.6) + 46; }
      hint.alpha = hintA * (.75 + .25 * Math.sin(t * 1.7)); hint.show(s.k(0, 5.4, 6.6), { style: 'fade', q: out0 });

      // ---- camera: three-quarter, then up to read the figure as a picture ----
      const drift0 = 1 - Math.exp(-s.since(0) / 26), drift1 = 1 - Math.exp(-s.since(1) / 30);
      const calm = 1 - Math.sin(Math.PI * clamp(s.k(1, 0, 4.4))) * .85;
      let yaw = lerp(YAW0 + .16 * drift0 * mo, YAW1 + .2 * drift1 * mo, k1), pitch = lerp(PITCH0 - .03 * drift0 * mo, PITCH1, k1);
      yaw += (.013 * Math.sin(t * .21) + .008 * Math.sin(t * .134 + 1.3)) * mo + s.mouse.x * .034 * calm * mo;
      pitch += (.007 * Math.sin(t * .17 + 2.1) + .004 * Math.sin(t * .29)) * mo - s.mouse.y * .016 * calm * mo;
      const zoom = (1 + .035 * lerp(drift0, drift1, k1) * mo + .004 * Math.sin(t * .11) * mo) * lerp(.9, 1, s.k(0, 0, 3.2, 'outCubic'));
      frameCamera(yaw, clamp(pitch, .2, 1.42), zoom);

      // ---- light: low raking warm key, cool rim strip behind; both breathe ----
      const up = lerp(.3, 1, s.k(0, .1, 1.5, 'outCubic')), br = 1 + .05 * Math.sin(t * .63) * mo;
      const age = st.age, lit = st.to >= 0 ? Math.exp(-age * 4.5) : 0;
      dirAE(U.uLk.value, YAW0 + 1.22 + .05 * Math.sin(t * .23) * mo, .23 + .012 * Math.sin(t * .31) * mo);
      dirAE(U.uLr.value, YAW0 + Math.PI - .34 + .03 * Math.sin(t * .19 + 1) * mo, lerp(.33, .5, k1));
      U.uKey.value.set(1, .76, .47).multiplyScalar(7.5 * up * br * (1 + .1 * lit));
      U.uFan.value = lerp(1, .5, k1);
      U.uRim.value.set(.42, .62, 1).multiplyScalar(lerp(2.6, 1.9, k1) * lerp(.5, 1, up) * (2 - br));
      { const lk = U.uLk.value, x = lk.dot(camB.r), y = lk.dot(camB.u), l = Math.hypot(x, y) || 1; U.uL2.value.set(x / l, y / l); }
      U.uGlow.value.set(.85, .6, .33).multiplyScalar(.065 * up * (1 + 1.2 * lit));

      // ---- the plate and the sand, from the last strike ----
      const F = st.to >= 0 ? FIGS[st.to] : null;
      if (F) { U.uMa.value.set(F.n, F.m, F.sg, F.eps); U.uMb.value.set(F.p, F.q); } else U.uMa.value.set(0, 0, 0, 0);
      const ring = F ? Math.exp(-age / 1.15) * Math.min(1, age / .04) : 0;
      const flexA = F ? .034 / (1 + .13 * (F.n + F.m)) : 0;
      U.uFlex.value.set(F ? flexA * Math.exp(-age / 1.3) * Math.cos(6.2832 * F.hz * age) * mo : 0, F ? .022 * Math.exp(-age / .3) * mo : 0, 5 * age, 1 / .13);
      U.uStrike.value.set(st.sx, st.sz, F ? age : 99);
      U.uGr.value.set(ring, .2 * mo, .046 * mo, .05 * (.25 + .75 * mo));
      U.uRingL.value.set(F ? .5 * Math.exp(-age / .28) : 0, F ? 1.1 * Math.exp(-age / .09) : 0);
      U.uTime.value = t;
      // quality: fewer, slightly larger grains
      const frac = lerp(.3, 1, clamp((s.q - .35) / .65)); count = Math.max(60000, Math.round(NMAX * frac));
      const r = R0 * Math.sqrt(NMAX / count); geo.setDrawRange(0, count);
      U.uPt.value.y = r; U.uPt.value.z = .0021; U.uPt.value.w = .96;
      U.uDenW.value = Math.PI * r * r * .97 * DEN * DEN / 4;
      // depth of field: focus a little in front of the centre; vanishes as the camera goes overhead
      U.uDof.value.set(20 * gfx.H / 900, camB.D - .2, 0, 0);
      hoverA = damp(hoverA, hoverOn ? 1 : 0, 7, s.dt); U.uHover.value.z = .09 * hoverA;
      // grade follows the strike
      grade.exposure = 1.02 * (1 + .06 * lit) * lerp(.94, 1, k1); grade.bloom = .5 + .16 * lit; grade.threshold = lerp(1.5, 1.6, k1); grade.vignette = lerp(.36, .3, k1);
      const sh = clamp(ring * .55, 0, 1) * (1 - s.exit);
      if (Math.abs(sh - shim) > .01) { shim = sh; ctx.audio.layer('shimmer', sh); }
    }

    function renderDensity() {
      gfx.draw(denScene, denCam, denRaw);
      blur.u.tSrc.value = denRaw.texture; blur.u.uDir.value.set(1 / DEN, 0); blur.render(denTmp);
      blur.u.tSrc.value = denTmp.texture; blur.u.uDir.value.set(0, 1 / DEN); blur.render(den);
    }
    let lastCount = 0;

    return {
      async init() {
        // each grain's resting place for every figure: from its own random seed position, damped Newton steps
        // toward the level set s = (small gaussian value), so lines get natural width where the gradient is weak
        const R = rng(1989), lump = new Float32Array(4096); for (let i = 0; i < 4096; i++) lump[i] = R();
        const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let tx = x - ix, ty = y - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          const a = (ix & 63) + (iy & 63) * 64, b = ((ix + 1) & 63) + (iy & 63) * 64, c = (ix & 63) + ((iy + 1) & 63) * 64, d = ((ix + 1) & 63) + ((iy + 1) & 63) * 64;
          return lerp(lerp(lump[a], lump[b], tx), lerp(lump[c], lump[d], tx), ty); };
        // hand-sprinkled, not printed: broad unevenness, and fine drifts with bare metal between them
        const sprinkle = (x, y) => { const f = vn(x * 31 + 3, y * 31 + 9) * .5 + vn(x * 73 + 20, y * 73 + 7) * .5;
          return (.55 + .45 * vn(x * 2.6 + 30, y * 2.6 + 40)) * (.16 + .84 * smoothstep(.38, .62, f)); };
        for (let i = 0; i < NMAX; i++) {
          let x, y; do { x = R() * 1.95 - .975; y = R() * 1.95 - .975; } while (R() > sprinkle(x, y));
          scatter[i * 2] = Math.round(x * 32767); scatter[i * 2 + 1] = Math.round(y * 32767);
          for (let c = 0; c < 4; c++) seeds[i * 4 + c] = Math.floor(R() * 256);
        }
        const TAB = 8192, HP = Math.PI / 2, tab = k => { const c = new Float32Array(TAB + 1), s = new Float32Array(TAB + 1); for (let i = 0; i <= TAB; i++) { c[i] = Math.cos(k * Math.PI * i / TAB); s[i] = Math.sin(k * Math.PI * i / TAB); } return [c, s]; };
        for (let fi = 0; fi < NF; fi++) {
          const F = FIGS[fi], out = figPos[fi], r = rng(77 + fi * 13);
          const [cn, sn] = tab(F.n), [cm, sm] = tab(F.m), [cp, sp] = tab(F.p), [cq, sq] = tab(F.q);
          for (let i = 0; i < NMAX; i++) {
            let x = scatter[i * 2] / 32767, y = scatter[i * 2 + 1] / 32767;
            const kind = r(), gauss = Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2831853 * r());
            const target = gauss * (kind < .08 ? F.tau * 2.4 : F.tau * .8), iters = kind > .986 ? 2 : 11;
            for (let k = 0; k < iters; k++) {
              const ix = Math.round((x + 1) * .5 * TAB), iy = Math.round((y + 1) * .5 * TAB);
              const s = .5 * (cn[ix] * cm[iy] + F.sg * cm[ix] * cn[iy] + F.eps * cp[ix] * cq[iy]);
              const gx = HP * .5 * (-F.n * sn[ix] * cm[iy] - F.sg * F.m * sm[ix] * cn[iy] - F.eps * F.p * sp[ix] * cq[iy]);
              const gy = HP * .5 * (-F.m * cn[ix] * sm[iy] - F.sg * F.n * cm[ix] * sn[iy] - F.eps * F.q * cp[ix] * sq[iy]);
              const stp = -(s - target) / (gx * gx + gy * gy + .15) * .75; let dx = gx * stp, dy = gy * stp; const l = Math.hypot(dx, dy);
              if (l > .1) { dx *= .1 / l; dy *= .1 / l; }
              const nz = Math.abs(s - target) * .07 + .0015;
              x = clamp(x + dx + (r() - .5) * nz, -.978, .978); y = clamp(y + dy + (r() - .5) * nz, -.978, .978);
            }
            out[i * 2] = Math.round(x * 32767); out[i * 2 + 1] = Math.round(y * 32767);
          }
          await new Promise(res => setTimeout(res, 0));
        }
        // warm-up: compile every program once
        const fake = { t: 0, dt: 0, time: 0, beat: 0, bt: 0, q: 1, motion: 1, enter: 1, exit: 0, mouse: { x: 0, y: 0 }, k: () => 0, since: () => 0, at: () => 0 };
        const tmp = gfx.target({ w: 64, h: 64, hdr: false });
        setState(-1, 0, 1); apply(fake); renderDensity(); gfx.draw(world, cam, hdr); gfx.post(hdr, tmp, grade); ui.render(tmp);
        gfx.free(tmp); setState(-1, -1, 99);
        if (ctx.audio.warm) ctx.audio.warm([{ drum: 'kick' }, { sfx: 'bell' }, { sfx: 'grain' }, { drum: 'tom' }, { drum: 'snare' }, { drum: 'rim' }, { drum: 'cymbal' }, { layer: 'shimmer' }]);
      },
      enter(s) { hintA = 0; hoverA = 0; hoverOn = false; shim = -1; snapRect = true; tap = null; sync(s); },
      resize() { snapRect = true; },
      exit() { canvas.style.cursor = ''; hoverOn = false; shim = 0; ctx.audio.layer('shimmer', 0); },
      beat(s) { if (s.bt > .5) sync(s); else { stepped = true; } },
      update(s) {
        // the deck may jump (back a beat, deep link, seek): then fall back to the untouched timeline
        if (s.beat !== last.beat) {
          if (!stepped) sync(s); else { st.nextAuto = s.motion < 1 ? Infinity : T1; stepped = false; }
        } else if (Math.abs(s.bt - (last.bt + s.dt)) > 1e-3) sync(s);
        else if (s.dt > 0 && s.motion >= 1) {
          if (s.beat === 0 && st.to < 0 && last.bt < T0 && s.bt >= T0) { const a = AUTO_PTS[0]; strike(a[0], a[1], { sound: s.exit === 0 }); st.nAuto = 1; }
          else if (s.beat === 1 && s.bt >= st.nextAuto) {
            const a = AUTO_PTS[st.nAuto % AUTO_PTS.length]; st.nAuto++;
            strike(a[0], a[1], { to: st.to < 0 ? 1 : null, sound: s.exit === 0 });
            st.nextAuto = s.bt < HOLD0 ? HOLD0 : s.bt + PERIOD;
          }
        }
        last.beat = s.beat; last.bt = s.bt;
        st.age += s.dt; st.userAge += s.dt;
        apply(s);
      },
      render(target) {
        if (denDirty || st.age < SETTLED + .6 || count !== lastCount) { renderDensity(); denDirty = false; lastCount = count; }
        gfx.draw(world, cam, hdr);
        gfx.post(hdr, target, grade);
        ui.render(target);
      },
      pointer(e, s) {
        if (e.type === 'leave') { hoverOn = false; canvas.style.cursor = ''; return false; }
        const on = pick(e.nx, e.ny, hit);
        if (e.type === 'move') { hoverOn = on && e.pointerType !== 'touch'; if (on) U.uHover.value.set(hit.x, hit.z, U.uHover.value.z, 0); canvas.style.cursor = on ? 'pointer' : ''; return false; }
        // mouse strikes on press; a finger strikes on a tap, so a swipe across the plate still turns the page
        const mouse = e.pointerType === 'mouse' || e.pointerType === undefined;
        if (e.type === 'down') { tap = on && !mouse ? { x: e.x, y: e.y, t: s.time } : null; if (!on || !mouse) return false; }
        else if (e.type === 'up') { const ok = tap && on && Math.hypot(e.x - tap.x, e.y - tap.y) < 40 && s.time - tap.t < .7; tap = null; if (!ok) return false; }
        else return false;
        strike(hit.x, hit.z, { user: true, pan: e.nx * .6 });
        if (s.beat === 1) st.nextAuto = s.motion < 1 ? Infinity : Math.max(s.bt + PERIOD, HOLD0);
        return true;
      },
      key(e) { // keyboard strike: U (udari) — digits belong to the deck
        if (e.key === 'u' || e.key === 'U') { const a = AUTO_PTS[(st.nAuto++) % AUTO_PTS.length]; strike(a[0], a[1], { user: true, pan: a[0] * .4 }); if (last.beat === 1) st.nextAuto = Math.max(last.bt + PERIOD, HOLD0); return true; }
        return false;
      },
    };
  },
};
