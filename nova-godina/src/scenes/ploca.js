// Scene 2 — "Ploča": sand on a ringing brass plate draws Chladni figures. Rhythm has a shape.
// State is one thing only: the last strike (from-figure, to-figure, point, age). Everything on screen is a
// function of that plus the timeline, so any beat is addressable and reversible.

// New Year: a round, turned bronze plate (free edge, clamped at the centre). Its six-fold modes put the sand into
// snowflakes. Each figure is a hexagonally symmetric nodal pattern (arms, side branches, plates, rings) given as
// primitives; grains reach it by a symmetric, locality-preserving transport (see init) and every figure bakes a
// stillness map the shaders use for the plate's flex and the grains' throw. Rising intricacy, rising pitch.
// Sound: each figure is one voice of the same struck bronze disc (ctx.audio.plate, fig = index: D3 F#3 A3 D4 F#4 over a
// shared D2 hum, more inharmonic modes for more intricate figures); shake = how hard the sleigh bells on top are shaken.
import { createSnow } from '../xmas/snow.js';

const FIGS = [
  { name: 'star', wk: .78, hz: 5.2, flex: .026, shake: .2 },
  { name: 'stellar dendrite', wk: .56, hz: 6.6, flex: .022, shake: .45 },
  { name: 'sectored plate', wk: .55, hz: 8.1, flex: .019, shake: .6 },
  { name: 'fern dendrite', wk: .5, hz: 9.7, flex: .016, shake: .8 },
  { name: 'hexagon and ring', wk: .55, hz: 11.3, flex: .014, shake: 1 },
];
const NF = FIGS.length;
const SS = 128;            // stillness map per figure (plate space), stacked in one atlas
const C60 = .5, S60 = Math.sqrt(3) / 2;
// one figure as primitives in plate units (radius 1). seg: sand line a->b, gaussian half-width w0->w1, sand per unit
// area d0->d1 (mass = length x width x d). ring: circle. fill: hexagon (vertices on the arms) filled thinly.
function flake(fi) {
  const L = [];
  const seg = (ax, ay, bx, by, w0, w1 = w0, d0 = 1, d1 = d0) => L.push({ t: 0, ax, ay, bx, by, w0, w1, d0, d1 });
  const ring = (r, w, d = 1) => L.push({ t: 1, r, w, d });
  const fill = (R, d) => L.push({ t: 2, R, d });
  // everything below is drawn for the arm along +x, then turned six times
  const six = fn => { const A = []; fn((ax, ay, bx, by, w0, w1 = w0, d0 = 1, d1 = d0) => A.push([ax, ay, bx, by, w0, w1, d0, d1]));
    for (let k = 0; k < 6; k++) { const c = Math.cos(k * Math.PI / 3), s = Math.sin(k * Math.PI / 3);
      for (const [ax, ay, bx, by, w0, w1, d0, d1] of A) seg(c * ax - s * ay, s * ax + c * ay, c * bx - s * by, s * bx + c * by, w0, w1, d0, d1); } };
  const pair = (S, x0, len, ang, w0, w1 = w0, d0 = 1, d1 = d0, y0 = 0) => { const c = Math.cos(ang), s = Math.sin(ang);
    S(x0, y0, x0 + len * c, y0 + len * s, w0, w1, d0, d1); S(x0, -y0, x0 + len * c, -y0 - len * s, w0, w1, d0, d1); };
  const hexEdge = (S, R, w, d = 1) => S(R, 0, R * C60, R * S60, w, w, d, d);
  const hexAt = (S, cx, R, w, d = 1) => { // a small hexagon centred on the arm at x = cx (its own vertices on the arm axis)
    for (let k = 0; k < 6; k++) { const a0 = k * Math.PI / 3, a1 = a0 + Math.PI / 3; S(cx + R * Math.cos(a0), R * Math.sin(a0), cx + R * Math.cos(a1), R * Math.sin(a1), w, w, d, d); } };
  if (fi === 0) { // simple six-point star: bold tapering arms, an arrowhead near each tip, a small hexagonal heart
    six(S => {
      S(.118, 0, .8, 0, .02, .011, 1, 1.1);
      S(0, 0, .118, 0, .007, .009, .8);
      pair(S, .6, .11, Math.PI / 3, .011, .007);
      pair(S, .69, .06, Math.PI / 3, .008, .006);
      hexEdge(S, .135, .01);
    });
    fill(.135, .16);
  } else if (fi === 1) { // stellar dendrite: long arms with side branches at 60 degrees, longest a third of the way out
    six(S => {
      S(.03, 0, .85, 0, .015, .008);
      const X = [.2, .3, .4, .5, .59, .67, .74, .8], N = [.13, .19, .21, .19, .15, .11, .07, .04];
      X.forEach((x, i) => pair(S, x, N[i], Math.PI / 3, .0095, .005));
      hexEdge(S, .085, .008);
    });
  } else if (fi === 2) { // sectored plate: a broad hexagonal plate with ridges and ribs, arms ending in little plates
    six(S => {
      S(.02, 0, .56, 0, .012, .009);
      hexEdge(S, .56, .01);
      hexEdge(S, .43, .0055, .8);
      hexEdge(S, .29, .0065);
      S(.56, 0, .74, 0, .011, .009);
      pair(S, .62, .07, Math.PI / 3, .007, .005);
      hexAt(S, .8, .065, .006);
      S(.29 * .75, .29 * S60 / 2, .56 * .75, .56 * S60 / 2, .004, .004, .7); // the sector seam on the 30-degree line
    });
    fill(.56, .2);
    L.push({ t: 3, cx: .8, R: .065, d: .9 }); // filled tip plates (six, below)
  } else if (fi === 3) { // fern-like dendrite: dense side branches, each with its own branchlets
    six(S => {
      S(.03, 0, .88, 0, .0115, .0065);
      hexEdge(S, .075, .006);
      for (let x = .13; x < .84; x += .052) {
        const u = (x - .13) / .72, len = Math.min(.6 * x - .02, .175 * (1 - Math.pow(u, 1.5)) + .022);
        pair(S, x, len, Math.PI / 3, .0068, .004);
        if (len < .07) continue;
        for (let v = .045; v < len - .018; v += .042) {
          const bx = x + v * C60, by = v * S60, l3 = .042 * (1 - v / len) + .01;
          S(bx, by, bx + l3, by, .0042, .003); S(bx, -by, bx + l3, -by, .0042, .003);
          S(bx, by, bx - l3 * C60, by + l3 * S60, .0042, .003); S(bx, -by, bx - l3 * C60, -by - l3 * S60, .0042, .003);
        }
      }
    });
  } else { // delicate hexagon with a ring: thin arms, a ring, spokes, a hexagon, and tiny plates at the tips
    ring(.37, .0065);
    six(S => {
      S(.04, 0, .87, 0, .0072, .0045);
      hexEdge(S, .7, .0065);
      hexEdge(S, .12, .0055);
      S(.37 * S60, .37 * .5, .7 * S60 * S60, .7 * S60 * .5, .005, .005); // spoke on the 30-degree line to the edge's midpoint
      pair(S, .7, .07, Math.PI / 3, .0048, .0035);
      pair(S, .37, .06, Math.PI / 3, .0045, .0035);
      hexAt(S, .83, .042, .0042);
      pair(S, .22, .05, Math.PI / 3, .0042, .0032);
    });
  }
  return L;
}
const T0 = 1.6;            // beat 0: the plate strikes itself
const T1 = 1.8;            // beat 1: second figure
const HOLD0 = 11.2, PERIOD = 6.5; // beat 1 hold: next figure every PERIOD seconds
const SETTLED = 4.3;       // every grain has landed this long after a strike
const DELAYK = .2;         // seconds per plate unit for the strike wave to reach a grain
const DEN = 512;           // sand density map (plate space)
const AUTO_PTS = [[.34, .22], [-.3, .36], [.42, -.3], [-.22, -.4], [.1, .46], [-.44, .05]];
const KZONE = .06;         // radius^2 (plate units) of the zone the blow throws sand from
const AUTO_VEL = .8;       // strength of the plate's own strikes

// the ringing mode: stillness map of the current figure (0 on its sand lines, 1 where the plate swings) times a
// hexagonal carrier, so the plate moves in six-fold lobes and rings
const G_MODE = /* glsl */`
uniform sampler2D tStill; uniform vec2 uFig;   // x figure index, y 1 while a figure rings
uniform float uFigP;                           // the previous figure, still ringing out under a fast re-strike
float stillF(vec2 p, float f){ vec2 uv = clamp(p * .5 + .5, 0., 1.);
  return textureLod(tStill, vec2((.5 + uv.x * ${SS - 1}.) / ${SS}., (f * ${SS}. + .5 + uv.y * ${SS - 1}.) / ${SS * NF}.), 0.).r; }
float stillA(vec2 p){ return stillF(p, uFig.x) * uFig.y; }
float carrier(vec2 p){ float r = length(p); float c = r > 1e-4 ? p.x / r : 1.; float c2 = c * c;
  float c6 = ((32. * c2 - 48.) * c2 + 18.) * c2 - 1.;               // cos(6 theta)
  return .42 * cos(r * 7.9 - .6) + .3 * c6 * smoothstep(.05, .4, r) + .28; }
float modeS(vec2 p){ return stillA(p) * carrier(p); }
float modeSP(vec2 p){ return stillF(p, uFigP) * carrier(p); }
vec3 modeG(vec2 p){ const float h = 1.6 / ${SS}.; float s = modeS(p);
  return vec3(s, (modeS(p + vec2(h, 0.)) - s) / h, (modeS(p + vec2(0., h)) - s) / h); }
vec2 modeGP(vec2 p){ const float h = 1.6 / ${SS}.; float s = modeSP(p);
  return vec2((modeSP(p + vec2(h, 0.)) - s) / h, (modeSP(p + vec2(0., h)) - s) / h); }
`;
// plate surface: ringing mode shape (gated by the arriving strike wave) + the travelling strike ring
const G_FLEX = /* glsl */`
uniform vec4 uFlex;      // x mode flex (signed, metres of show), y ring amplitude, z ring radius, w 1 / ring width
uniform vec3 uStrike;    // xz of the last strike, z = seconds since
uniform vec4 uShud;      // the blow itself: x dent under the mallet, y rock about the clamp, z umbrella flap, w previous figure's flex
uniform vec4 uStrikeP;   // the strike before (xz, seconds since, its ring amplitude): overlapping rings under fast re-strikes
uniform vec2 uSdir;      // centre -> strike, unit
const float DENT = .03;
float ringY(vec2 p, vec2 c, float rad, float a){ float rr = (distance(p, c) - rad) * uFlex.w; return a * exp(-rr * rr) * cos(rr * 2.4); }
vec2 ringG(vec2 p, vec2 c, float rad, float a){ vec2 dv = p - c; float d = max(length(dv), 1e-4), rr = (d - rad) * uFlex.w;
  return a * exp(-rr * rr) * (-2. * rr * cos(rr * 2.4) - 2.4 * sin(rr * 2.4)) * uFlex.w * dv / d; }
float plateY(vec2 p){
  float d = distance(p, uStrike.xy); float gate = smoothstep(0., .35, uStrike.z - d * ${DELAYK});
  vec2 dv = p - uStrike.xy;
  return (uFlex.x != 0. ? uFlex.x * gate * modeS(p) : 0.) + (uShud.w != 0. ? uShud.w * modeSP(p) : 0.)
    + ringY(p, uStrike.xy, uFlex.z, uFlex.y) + ringY(p, uStrikeP.xy, uStrikeP.z * 5., uStrikeP.w)
    + uShud.x * exp(-dot(dv, dv) / DENT) + uShud.y * dot(p, uSdir) + uShud.z * dot(p, p); }
vec2 plateGrad(vec2 p){
  vec2 dv = p - uStrike.xy; float d = max(length(dv), 1e-4); float gate = smoothstep(0., .35, uStrike.z - d * ${DELAYK});
  return (uFlex.x != 0. ? uFlex.x * gate * modeG(p).yz : vec2(0.)) + (uShud.w != 0. ? uShud.w * modeGP(p) : vec2(0.))
    + ringG(p, uStrike.xy, uFlex.z, uFlex.y) + ringG(p, uStrikeP.xy, uStrikeP.z * 5., uStrikeP.w)
    + uShud.x * exp(-dot(dv, dv) / DENT) * (-2. / DENT) * dv + uShud.y * uSdir + uShud.z * 2. * p; }
`;
// where one grain is, as a function of time since the strike. The xy drift is mirrored in JS (snapshot()).
const G_PATH = /* glsl */`
in vec2 aFrom; in vec2 aTo; in vec4 aSeed;
uniform vec4 uGr;        // x ring envelope, y hum (hold), z hop height, w jitter
uniform vec4 uKick;      // the blow's own throw: x leap height, y outward throw, z radius^2 of the zone, w previous ring envelope
uniform float uTime;
vec2 grainPath(out vec3 g){   // g = (hop height, shake, hop index)
  float tl = uStrike.z - (distance(aFrom, uStrike.xy) * ${DELAYK} + aSeed.x * .3);
  float u = clamp(tl / (1.3 + 1.9 * aSeed.y), 0., 1.);
  float e = u * u * (3. - 2. * u); e = 1. - pow(1. - e, 1.6);
  vec2 dv = aTo - aFrom;
  vec2 p = aFrom + dv * e + vec2(-dv.y, dv.x) * (sin(3.14159265 * e) * (aSeed.z - .5) * .7);
  // the blow: grains near the mallet leap at once (the closest highest) and are thrown outward; the flow then carries
  // them on to the figure, so the throw fades as they arrive (mirrored in snapshot())
  vec2 kd = aFrom - uStrike.xy; float kl = length(kd), near = exp(-kl * kl / uKick.z);
  float uk = clamp((uStrike.z - kl * .08) / (.22 + .3 * aSeed.w), 0., 1.);
  p += kd / max(kl, 1e-4) * (uKick.y * near * (.3 + .7 * aSeed.z) * (1. - (1. - uk) * (1. - uk)) * (1. - e));
  float leap = uKick.x * near * (.35 + .65 * aSeed.y) * 4. * uk * (1. - uk);
  p *= min(1., .985 / max(length(p), 1e-4));
  float a = stillA(p);   // local vibration amplitude: antinodes throw hardest
  float on = step(0., tl), tp = max(tl, 0.);
  float tw = smoothstep(.5, 1., sin(uTime * (.9 + 1.7 * aSeed.w) + aSeed.x * 40.));
  float vib = on * uGr.x * (a * 1.7 + exp(-tp * 3.5) * .55) + (1. - on) * uKick.w * a * 1.7 + uGr.y * tw * smoothstep(.05, .3, a);   // strays keep twitching in the hold
  float f = tp * (8. + 9. * aSeed.w) + aSeed.z * 17.;
  float k = floor(f), fr = f - k;
  float h1 = hash11(k * 7.31 + aSeed.x * 113.7 + aSeed.y * 37.1);
  float sd = aSeed.y * 91. + aSeed.x * 7.;
  vec2 j0 = hash22(vec2(k, sd)) - .5, j1 = hash22(vec2(k + 1., sd)) - .5;
  p += mix(j0, j1, fr * fr * (3. - 2. * fr)) * vib * uGr.w;
  p *= min(1., .988 / max(length(p), 1e-4));
  g = vec3(vib * 4. * fr * (1. - fr) * (.3 + .7 * h1) * uGr.z + leap, vib, k);
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
  vec2 p = position.xz * min(1., 1. / max(length(position.xz), 1e-4));
  vec3 w = position; w.y += plateY(p);
  vW = w; vP = position.xz; vN = aN; vTop = aTop;
  gl_Position = uVP * vec4(w, 1.);
}`;
const FS_PLATE = /* glsl */`
precision highp float; precision highp sampler2D;
in vec3 vW; in vec2 vP; in vec3 vN; in float vTop; out vec4 fragColor;
uniform vec3 uCam; uniform sampler2D tDen; uniform vec4 uHover; uniform vec4 uRingL; uniform float uTime, uFan;
uniform vec2 uGlint;    // the invitation: x angle (plate space) of a glint running along the near rim, y strength
HASH NOISE MODE FLEX LIGHT
const vec3 F0 = vec3(.93, .66, .30);
void main(){
  vec3 V = normalize(uCam - vW);
  vec3 col;
  if (vTop > .5) {
    vec2 g = plateGrad(vP);
    float r = length(vP); vec2 rd = r > 1e-4 ? vP / r : vec2(1., 0.);
    float edge = r;
    float lip = smoothstep(.968, .989, edge);                       // the edge is eased, not cut: it catches the rim
    vec3 N = normalize(vec3(-g.x + rd.x * lip * .7, 1., -g.y + rd.y * lip * .7));
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
    // the impact: a white-hot point that cools to brass, a halo, and the ring of the blow running out to the rim
    float rr = (distance(vP, uStrike.xy) - uFlex.z) * uFlex.w;
    col += vec3(1., .78, .5) * exp(-rr * rr) * uRingL.x * (.6 + .8 * streak);
    vec2 sd = vP - uStrike.xy; float sd2 = dot(sd, sd);
    col += mix(vec3(1., .62, .3), vec3(1., .93, .8), min(uRingL.y * .3, 1.)) * (exp(-sd2 / .004) + .12 * exp(-sd2 / .035)) * uRingL.y;
    float rp = (distance(vP, uStrikeP.xy) - uStrikeP.z * 5.) * uFlex.w;
    col += vec3(1., .78, .5) * exp(-rp * rp) * uRingL.z * (.6 + .8 * streak);
    vec2 sp = vP - uStrikeP.xy; col += vec3(1., .66, .36) * exp(-dot(sp, sp) / .006) * uRingL.w;
    vec2 hv = vP - uHover.xy; col += F0 * vec3(1., .85, .6) * exp(-dot(hv, hv) / .03) * uHover.z * (.5 + streak);
    col *= .4 + .6 * smoothstep(.006, .014, r);
    col *= 1. - .25 * smoothstep(.93, 1., edge) * patina;
    col += (uRim * pow(max(dot(N, normalize(uLr + V)), 0.), 60.) * 1.6 + uKey * pow(max(dot(N, normalize(uLk + V)), 0.), 60.) * .8) * lip;
    if (uGlint.y > 0.) { float an = atan(vP.y, vP.x) - uGlint.x; an = mod(an + 3.14159265, 6.2831853) - 3.14159265;
      col += vec3(1., .76, .44) * uGlint.y * exp(-an * an / .045) * (lip * 3. + smoothstep(.8, .985, r) * .55 * (.6 + streak * .5)); }
  } else {
    vec3 N = normalize(vN);
    vec3 F = F0 + (1. - F0) * pow(1. - max(dot(N, V), 0.), 5.);
    vec3 R = reflect(-V, N);
    float along = hash12(floor(vW.xz * 260.)) * .5 + .75;
    vec3 Hk = normalize(uLk + V), Hr = normalize(uLr + V);
    col = F * ((envKey(R) + envRim(R)) * .6 + uKey * pow(max(dot(N, Hk), 0.), 24.) * 1.2 + uRim * pow(max(dot(N, Hr), 0.), 24.) * 1.2) * along;
    col += F0 * (uKey * max(dot(N, uLk), 0.) + uRim * max(dot(N, uLr), 0.)) * .035;
    col *= smoothstep(-.06, -.004, vW.y - plateY(vP * min(1., 1. / max(length(vP), 1e-4)))) * .75 + .25;
  }
  fragColor = vec4(col, 1.);
}`;

const VS_GRAIN = /* glsl */`
precision highp float; precision highp sampler2D;
uniform mat4 uVP; uniform vec3 uCam; uniform sampler2D tDen;
uniform vec4 uPt;       // x px per world unit at w = 1, y grain radius, z pile height per unit density, w opacity
uniform vec4 uDof;      // x circle of confusion (px) per unit of relative defocus, y focus distance
uniform vec2 uFrost;    // x frost sparkle strength
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
  // frost: the finest grains carry an icy facet that answers only the cool rim, and twinkles a little
  float fine = (1. - smoothstep(.18, .42, r4.y)) * step(.55, r3.z);
  vec3 fq = normalize(hash33(vec3(aSeed.zw * 255., 7.1)) * 2. - 1. + Nr * .35);
  float tw2 = .55 + .45 * sin(uTime * (1.3 + 2.1 * r3.x) + r4.x * 50.);
  col += fine * uFrost.x * vec3(.74, .84, 1.) * (uRim * (pow(max(dot(fq, normalize(uLr + V)), 0.), 24.) * 3. + pow(max(dot(fq, normalize(uLr + V)), 0.), 220.) * 30.) + uRim * .05) * tw2 * (1. - air);
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
    float rq = length(q); vec2 qd = q / max(rq, 1e-4);
    float m = 1. - smoothstep(1. - blur * .6, 1. + blur, rq);
    float fres = .25 + .75 * pow(1. + d.y, 3.);
    col = uGlow * m * fres * (.55 + .45 * exp(-dot(q, q) * 1.2));
    // the lit side of the rim, smeared in the floor
    float w = .05 + blur * .35, e = (rq - 1.) / w;
    col += uGlow * 2.2 * fres * exp(-e * e) * pow(max(dot(normalize(uLk.xz), qd), 0.), 1.5);
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
  // textAt: seconds into the beat when every word (and the hint) is fully in; mirrors the windows in apply() (TXT)
  beats: [
    { dur: 8, copy: ['ploca.b1.h', 'ploca.b1.p', 'ploca.hint'], textAt: 3.5 },
    { dur: 9, copy: ['ploca.b2.h', 'ploca.b2.p'], textAt: 2.3 },
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
      tStill: { value: null }, uFig: { value: new THREE.Vector2() }, uFrost: { value: new THREE.Vector2(1, 0) }, uFigP: { value: 0 },
      uShud: { value: V4() }, uStrikeP: { value: V4(0, 0, 99, 0) }, uSdir: { value: new THREE.Vector2(1, 0) }, uKick: { value: V4(0, 0, KZONE, 0) },
      uFlex: { value: V4(0, 0, 0, 8) }, uStrike: { value: V3(0, 0, 99) }, uGr: { value: V4() },
      uLk: { value: V3(1, 0, 0) }, uLr: { value: V3(0, 1, 0) }, uKey: { value: V3() }, uRim: { value: V3() },
      tDen: { value: null }, uPt: { value: V4() }, uL2: { value: new THREE.Vector2(1, 0) }, uDenW: { value: 1 },
      uDof: { value: V4() }, uHover: { value: V4() }, uRingL: { value: V4() }, uFan: { value: 1 }, uGlint: { value: new THREE.Vector2() },
      uCx: { value: V3() }, uCy: { value: V3() }, uCz: { value: V3() }, uProj: { value: V4() }, uGlow: { value: V3() }, uFloor: { value: .32 },
    };
    const mat = (vs, fs, o = {}) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: glsl(vs), fragmentShader: glsl(fs), uniforms: U, ...o });

    // ---------------- targets and passes ----------------
    const hdr = gfx.target({ depth: true, samples: 4 });
    const denRaw = gfx.target({ w: DEN, h: DEN }), denTmp = gfx.target({ w: DEN, h: DEN }), den = gfx.target({ w: DEN, h: DEN, mips: true });
    const blur = gfx.pass(FS_BLUR, { tSrc: null, uDir: new THREE.Vector2() });
    U.tDen.value = den.texture;
    const stillData = new Uint8Array(SS * SS * NF);
    const still = new THREE.DataTexture(stillData, SS, SS * NF, THREE.RedFormat, THREE.UnsignedByteType);
    still.minFilter = still.magFilter = THREE.LinearFilter; still.generateMipmaps = false; still.needsUpdate = true;
    U.tStill.value = still;

    // ---------------- world ----------------
    const world = new THREE.Scene(), denScene = new THREE.Scene(), back = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(26, 1, .5, 60); cam.matrixAutoUpdate = false;
    const denCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      const m = new THREE.Mesh(g, mat(VS_BG, FS_BG, { depthTest: false, depthWrite: false })); m.frustumCulled = false; m.renderOrder = -2; back.add(m);
    }
    { // the plate: a turned disc. Displaced polar top, a chamfer that catches the rim light, a thin side
      const NR = 76, NS = 288, CH = .011, TH = .03, a = 1 - CH;
      const pos = [], nor = [], top = [], idx = [];
      for (let j = 0; j <= NR; j++) { const rr = a * Math.pow(j / NR, .85);
        for (let i = 0; i <= NS; i++) { const t = i / NS * 2 * Math.PI; pos.push(rr * Math.cos(t), 0, rr * Math.sin(t)); nor.push(0, 1, 0); top.push(1); } }
      for (let j = 0; j < NR; j++) for (let i = 0; i < NS; i++) { const k = j * (NS + 1) + i; idx.push(k, k + 1, k + NS + 1, k + 1, k + NS + 2, k + NS + 1); }
      const band = (r0, y0, r1, y1, nr, ny) => {
        const b = pos.length / 3;
        for (let i = 0; i <= NS; i++) { const t = i / NS * 2 * Math.PI, c = Math.cos(t), sn = Math.sin(t);
          pos.push(r0 * c, y0, r0 * sn, r1 * c, y1, r1 * sn); nor.push(nr * c, ny, nr * sn, nr * c, ny, nr * sn); top.push(0, 0); }
        for (let i = 0; i < NS; i++) { const k = b + i * 2; idx.push(k, k + 2, k + 1, k + 2, k + 3, k + 1); }
      };
      band(a, 0, 1, -CH, .7071, .7071); band(1, -CH, 1, -TH, 1, 0);
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

    // ---------------- snow: a sparse far veil behind the plate, a few near soft flakes in front ----------------
    const snowBack = createSnow(ctx, { mode: 'screen', count: 380, size: 2.6, fall: 30, wind: [10, 0, 0], sway: .35, aperture: 0, layers: 2.6, brightness: .65, color: [.36, .48, .9], seed: 31 });
    const snowFront = createSnow(ctx, { mode: 'screen', count: 120, size: 3.4, fall: 44, wind: [14, 0, 0], sway: .45, aperture: .35, layers: .9, brightness: .42, color: [.36, .48, .9], seed: 1231 });

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
    const st = { from: -1, to: -1, age: 99, sx: 0, sz: 0, snap: false, nextAuto: Infinity, nAuto: 0, user: false, userAge: 99, vel: AUTO_VEL, pos: .4, mo: 1,
      prev: { fig: -1, age: 99, sx: 0, sz: 0, vel: 0, gone: 99 } };   // prev: the strike before, ringing out (gone = seconds since it was struck over)
    const last = { beat: 0, bt: 0 }; let stepped = false, hintA = 0, hoverA = 0, hoverOn = false, count = NMAX, denDirty = true, shim = 0;
    const camB = { r: V3(1, 0, 0), u: V3(0, 1, 0), d: V3(0, 0, 1), pos: V3(), p00: 1, p11: 1, shx: 0, shy: 0 };
    const figAttr = k => k < 0 ? aScatter : aFig[k];
    const figArr = k => k < 0 ? scatter : figPos[k];

    function setState(from, to, age) {
      st.from = from; st.to = to; st.age = age; st.snap = false; st.vel = AUTO_VEL; st.prev.fig = -1; st.prev.gone = 99;
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
      const src = st.snap ? snap : figArr(st.from), k = st.snap ? 1 : 1 / 32767, dst = figArr(st.to), age = st.age, sx = st.sx, sz = st.sz, KT = kickThrow();
      for (let i = 0; i < NMAX; i++) {
        const fx = src[i * 2] * k, fy = src[i * 2 + 1] * k, dx = dst[i * 2] / 32767 - fx, dy = dst[i * 2 + 1] / 32767 - fy;
        const kx = fx - sx, ky = fy - sz, kl = Math.hypot(kx, ky);
        const tl = age - (kl * DELAYK + seeds[i * 4] / 255 * .3);
        const u = clamp(tl / (1.3 + 1.9 * seeds[i * 4 + 1] / 255));
        let e = u * u * (3 - 2 * u); e = 1 - Math.pow(1 - e, 1.6);
        const c = Math.sin(Math.PI * e) * (seeds[i * 4 + 2] / 255 - .5) * .7;
        let px = fx + dx * e - dy * c, py = fy + dy * e + dx * c;
        if (KT > 0) { const uk = clamp((age - kl * .08) / (.22 + .3 * seeds[i * 4 + 3] / 255)), th = KT * Math.exp(-kl * kl / KZONE) * (.3 + .7 * seeds[i * 4 + 2] / 255) * (1 - (1 - uk) * (1 - uk)) * (1 - e) / Math.max(kl, 1e-4);
          px += kx * th; py += ky * th; }
        const l = Math.hypot(px, py); if (l > .985) { px *= .985 / l; py *= .985 / l; }
        snap[i * 2] = px; snap[i * 2 + 1] = py;
      }
      aSnap.needsUpdate = true;
    }
    // the blow's outward throw (plate units) for the current strike; shared by the shader (uKick.y) and snapshot()
    const kickThrow = () => .055 * st.vel * st.mo;
    // o: { to, user, pan, vel 0..1 (how hard), sound }. Sound goes first, on the very event that struck, so nothing
    // (the snapshot of 220k grains included) stands between the press and the blow.
    function strike(x, z, o = {}) {
      const cur = st.to, next = o.to != null ? o.to : (cur + 1) % NF;
      x = clamp(x, -.97, .97); z = clamp(z, -.97, .97);
      const vel = clamp(o.vel != null ? o.vel : AUTO_VEL, .2, 1), pos = clamp(Math.hypot(x, z) / .97, 0, 1);
      if (o.sound !== false) {
        const F = FIGS[next], pan = clamp(o.pan || 0, -.7, .7), v = o.user ? 1 : .85;
        // the bronze disc: weight + the figure's note + a long beating tail; where it is hit and how hard set the timbre
        if (ctx.audio.plate) ctx.audio.plate({ fig: next, pos, vel, gain: v, pan: pan * .7 });
        // sleigh bells on the mallet: a light sparkle on top, a breath late, never the main voice
        ctx.sfx('jingle', { shake: F.shake * (.5 + .5 * vel), gain: .3 * v * (.55 + .45 * vel), pan: pan * .9, delay: .045 + .02 * Math.random() });
        // the sand thrown off it: a spray at the blow, then patter that thins as the grains land
        ctx.sfx('sand', { gain: .8 * v * (.55 + .45 * vel), pan, delay: .012 });
      }
      // the strike before keeps ringing out (its ring, its flex) under this one, so fast strikes overlap instead of cutting
      const P = st.prev;
      if (cur >= 0 && st.age < 2.5) { P.fig = cur; P.age = st.age; P.sx = st.sx; P.sz = st.sz; P.vel = st.vel; P.gone = 0; } else { P.fig = -1; P.gone = 99; }
      if (st.from !== st.to && st.age < SETTLED) { snapshot(); st.snap = true; geo.setAttribute('aFrom', aSnap); }
      else { st.snap = false; geo.setAttribute('aFrom', figAttr(cur)); }
      geo.setAttribute('aTo', figAttr(next));
      st.from = cur; st.to = next; st.age = 0; st.sx = x; st.sz = z; st.vel = vel; st.pos = pos; denDirty = true;
      if (o.user) { st.user = true; st.userAge = 0; }
    }
    // pointer -> plate
    function pick(nx, ny, out) {
      const c = camB, dx = (nx - c.shx) / c.p00, dy = (ny - c.shy) / c.p11;
      const rx = c.r.x * dx + c.u.x * dy - c.d.x, ry = c.r.y * dx + c.u.y * dy - c.d.y, rz = c.r.z * dx + c.u.z * dy - c.d.z;
      if (ry > -1e-4) return false; const t = -c.pos.y / ry; out.x = c.pos.x + rx * t; out.z = c.pos.z + rz * t;
      return Math.hypot(out.x, out.z) <= 1.02;
    }
    const hit = { x: 0, z: 0 }, canvas = gfx.renderer.domElement;
    // strike strength from the hand: how fast the pointer was travelling into the press (mouse/pen), how far out on the
    // disc it lands (touch has no approach), a touch of chance, and a little softer when strikes come very fast
    const trail = []; let lastBlow = -1e9;
    function strength(e, pos) {
      const now = performance.now(); let v;
      while (trail.length && now - trail[0].t > 90) trail.shift();
      if (e.pointerType === 'touch' || trail.length < 2) v = .7 + .18 * pos;
      else { const a = trail[0], b = trail[trail.length - 1], dt = Math.max(16, b.t - a.t); v = .56 + .1 * pos + .38 * clamp(Math.hypot(b.x - a.x, b.y - a.y) / dt * 1000 / 1700); }
      const gap = (now - lastBlow) / 1000; lastBlow = now;
      if (gap < .32) v *= .86 + .14 * gap / .32;
      return clamp(v + (Math.random() - .5) * .07, .3, 1);
    }

    // ---------------- camera ----------------
    const YAW0 = -.62, PITCH0 = .52, YAW1 = -.16, PITCH1 = 1.3;
    const CORNERS = Array.from({ length: 24 }, (_, i) => [Math.cos(i * Math.PI / 12), Math.sin(i * Math.PI / 12)]);  // the rim
    const RIM = Array.from({ length: 72 }, (_, i) => [Math.cos(i * Math.PI / 36), Math.sin(i * Math.PI / 36)]);
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
      // TXT: words land while the picture is still moving, so a step never leaves a wordless frame. Beat 0 arrives with
      // the 2.9 s pluck transition: the headline condenses with the plate (1.8 s), the paragraph and the hint follow it.
      // Beat 1: the old words leave in 0.45 s, the new headline starts at 0.5 s and reads by ~1.4 s. Keep textAt in sync.
      const out0 = Math.max(s.k(1, 0, .45), s.exit * 1.6), out1 = s.exit * 1.6;
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
      // the hint lives right under the plate's near edge (placed after the camera, below); keep room for it in beat 0
      hint.size = port ? 46 : 38; hint.opt('align', 'center');
      const hintH = hgt(hint, port ? 62 : 50), HG = port ? 26 : 22, hres = (hintH + HG + 8) * (1 - k1);
      const ps2 = Math.min(fit(lines[0] || '', 'text', ps, 34, colW), fit(lines[1] || '', 'textMed', ps, 34, colW)), g2 = ps2 * .2;
      const H0 = hgt(h1, hs * 2.1) + gap + hgt(p1, ps * 2.6);
      const H1 = hgt(h2, hs * 2.7) + gap + hgt(p2a, ps2 * 1.3) + g2 + hgt(p2b, ps2 * 1.3);
      if (port) {
        const bottom = bot - 24 - hres;
        const yTop = Math.min(lerp(y0a + H0, y0b + H1, kT) + 54, bottom - 300);
        const yc = lerp(yTop, bottom, lerp(.46, .5, k1)), hh = Math.min(yc - yTop, bottom - yc);
        goal.cx = 0; goal.hw = 1 - 2 * Math.max(54, L * .6) / V.w; goal.cy = 1 - 2 * yc / V.h; goal.hh = Math.max(.1, 2 * hh / V.h);
      } else {
        y0a = Math.max(top, top + (bot - top - H0) * .5); y0b = Math.max(top, top + (bot - top - H1) * .5);
        const x0 = L + colW + 50, x1 = V.w - 70, cx = Math.min((x0 + x1) / 2, V.w * .685), hw = Math.min(cx - x0, x1 - cx, 690);
        goal.cx = cx / V.w * 2 - 1; goal.hw = hw / V.w * 2; goal.cy = 1 - (top + bot - hres) / V.h; goal.hh = Math.min(lerp(.7, .68, k1), (bot - hres - top) / V.h - .035);
      }
      { const a = snapRect ? 1 : 1 - Math.exp(-6 * s.dt); for (const k in goal) rect[k] += (goal[k] - rect[k]) * a; snapRect = false; }
      h1.size = hs; h1.wrap = colW; h1.x = L; h1.y = y0a;
      p1.size = ps; p1.wrap = Math.min(colW, 760); p1.x = L + 3; p1.y = h1.y + hgt(h1, hs * 2.1) + gap;
      h2.size = hs * (port ? .92 : .87); h2.wrap = colW; h2.x = L; h2.y = y0b;
      p2a.size = p2b.size = ps2; p2a.wrap = p2b.wrap = Math.min(colW, 760); p2a.x = p2b.x = L + 3;
      p2a.y = h2.y + hgt(h2, hs * 2.7) + gap; p2b.y = p2a.y + hgt(p2a, ps2 * 1.3) + g2;
      h1.show(s.k(0, 1.8, 2.8), { style: 'blur', by: 'word', q: out0 });
      p1.show(s.k(0, 2.4, 3.5), { style: 'rise', by: 'word', q: out0, stagger: .5 });
      h2.show(s.k(1, .5, 1.45), { style: 'blur', by: 'word', q: out1 });
      p2a.show(s.k(1, 1.05, 1.95), { style: 'rise', by: 'word', q: out1, stagger: .5 });
      p2b.show(s.k(1, 1.4, 2.3), { style: 'rise', by: 'word', q: out1, stagger: .5 });
      hintA = damp(hintA, st.user || s.beat > 0 ? 0 : 1, 5, s.dt);
      const hintIn = s.k(0, 2.6, 3.2);
      hint.alpha = hintA * (.9 + .1 * Math.sin(t * 1.7)); hint.show(hintIn, { style: 'rise', by: 'word', q: out0, stagger: .3 });

      // ---- camera: three-quarter, then up to read the figure as a picture ----
      const drift0 = 1 - Math.exp(-s.since(0) / 26), drift1 = 1 - Math.exp(-s.since(1) / 30);
      const calm = 1 - Math.sin(Math.PI * clamp(s.k(1, 0, 4.4))) * .85;
      let yaw = lerp(YAW0 + .16 * drift0 * mo, YAW1 + .2 * drift1 * mo, k1), pitch = lerp(PITCH0 - .03 * drift0 * mo, PITCH1, k1);
      yaw += (.013 * Math.sin(t * .21) + .008 * Math.sin(t * .134 + 1.3)) * mo + s.mouse.x * .034 * calm * mo;
      pitch += (.007 * Math.sin(t * .17 + 2.1) + .004 * Math.sin(t * .29)) * mo - s.mouse.y * .016 * calm * mo;
      let zoom = (1 + .035 * lerp(drift0, drift1, k1) * mo + .004 * Math.sin(t * .11) * mo) * lerp(.9, 1, s.k(0, 0, 3.2, 'outCubic'));
      // the blow reaches the camera: a small damped push and dip (none under reduced motion)
      if (st.to >= 0 && st.age < 1.2 && mo >= 1) {
        const a = st.age, v = st.vel, n = Math.exp(-a / .11) * Math.sin(6.2832 * 7 * a);
        pitch -= .0042 * v * n; yaw += .0024 * v * n * Math.sign(st.sx - st.sz || 1);
        zoom *= 1 + .007 * v * Math.exp(-a / .2) * (1 - Math.exp(-a / .025));
      }
      frameCamera(yaw, clamp(pitch, .2, 1.42), zoom);
      // the hint: centred under the plate's near edge (its projected rim, side included), whatever the aspect
      {
        const m = U.uVP.value.elements; let yMax = -1e9, xa = 1e9, xb = -1e9;
        for (const c of RIM) for (let yy = 0; yy >= -.03; yy -= .03) {
          const w = m[3] * c[0] + m[7] * yy + m[11] * c[1] + m[15];
          const sx = ((m[0] * c[0] + m[4] * yy + m[8] * c[1] + m[12]) / w + 1) * .5 * V.w, sy = (1 - (m[1] * c[0] + m[5] * yy + m[9] * c[1] + m[13]) / w) * .5 * V.h;
          if (sy > yMax) yMax = sy; if (sx < xa) xa = sx; if (sx > xb) xb = sx;
        }
        const hw2 = (hint.width || 300) / 2;
        hint.x = clamp((xa + xb) / 2, V.safeSide + hw2, V.w - V.safeSide - hw2); hint.y = Math.min(yMax + HG, bot - hintH);
      }
      // a one-time glint runs along the near rim as the hint arrives (the plate itself says "strike me")
      {
        const gk = s.k(0, 2.5, 4.1), near = Math.atan2(Math.cos(yaw), Math.sin(yaw));
        U.uGlint.value.set(near - (gk - .5) * 2.6, gk > 0 && gk < 1 ? Math.pow(Math.sin(Math.PI * gk), 2) * 3.2 * hintA * (1 - s.exit) : 0);
      }

      // ---- light: low raking warm key, cool rim strip behind; both breathe ----
      const up = lerp(.3, 1, s.k(0, .1, 1.5, 'outCubic')), br = 1 + .05 * Math.sin(t * .63) * mo;
      const age = st.age, vel = st.vel, P = st.prev, ageP = P.age + P.gone, hasP = P.fig >= 0 && ageP < 3;
      // the light pulse of the blow (and of the one before, if it is still lit)
      const lit = Math.max(st.to >= 0 ? (.4 + .6 * vel) * Math.exp(-age * 4.5) : 0, hasP ? (.4 + .6 * P.vel) * Math.exp(-ageP * 4.5) * .5 : 0);
      dirAE(U.uLk.value, YAW0 + 1.22 + .05 * Math.sin(t * .23) * mo, .23 + .012 * Math.sin(t * .31) * mo);
      dirAE(U.uLr.value, YAW0 + Math.PI - .34 + .03 * Math.sin(t * .19 + 1) * mo, lerp(.33, .5, k1));
      U.uKey.value.set(1, .76, .47).multiplyScalar(7.5 * up * br * (1 + .15 * lit));
      U.uFan.value = lerp(1, .5, k1);
      U.uRim.value.set(.42, .62, 1).multiplyScalar(lerp(2.6, 1.9, k1) * lerp(.5, 1, up) * (2 - br));
      { const lk = U.uLk.value, x = lk.dot(camB.r), y = lk.dot(camB.u), l = Math.hypot(x, y) || 1; U.uL2.value.set(x / l, y / l); }
      U.uGlow.value.set(.85, .6, .33).multiplyScalar(.065 * up * (1 + 2.4 * lit));

      // ---- the plate and the sand, from the last strike ----
      const F = st.to >= 0 ? FIGS[st.to] : null;
      U.uFig.value.set(F ? st.to : 0, F ? 1 : 0);
      const ring = F ? Math.exp(-age / 1.15) * Math.min(1, age / .04) : 0;
      const flexA = F ? F.flex : 0;
      const vf = .55 + .45 * vel;
      U.uFlex.value.set(F && age < 7 ? flexA * vf * Math.exp(-age / 1.3) * Math.cos(6.2832 * F.hz * age) * mo : 0, F ? .02 * vf * Math.exp(-age / .3) * mo : 0, 5 * age, 1 / .13);
      U.uStrike.value.set(st.sx, st.sz, F ? age : 99);
      // the shudder of the blow: a dent under the mallet that springs back, the disc rocking on its clamp (harder from the rim),
      // the rim flapping (harder from the middle); and the previous figure's flex ringing out, damped by the new blow
      { const sl = Math.hypot(st.sx, st.sz) || 1; U.uSdir.value.set(st.sx / sl, st.sz / sl); }
      const on = F && age < 1.5 ? 1 : 0, pos = st.pos;
      const FP = hasP ? FIGS[P.fig] : null;
      U.uShud.value.set(
        on * -.009 * vel * Math.exp(-age / .05) * Math.cos(6.2832 * 15 * age) * mo,
        on * .0045 * vel * (.35 + .65 * pos) * Math.exp(-age / .28) * Math.sin(6.2832 * 4.6 * age) * mo,
        on * -.004 * vel * (1 - .6 * pos) * Math.exp(-age / .22) * Math.sin(6.2832 * 6.3 * age) * mo,
        FP ? FP.flex * (.55 + .45 * P.vel) * Math.exp(-ageP / 1.3) * Math.cos(6.2832 * FP.hz * ageP) * Math.exp(-P.gone / .12) * mo : 0);
      U.uFigP.value = hasP ? P.fig : 0;
      const fadeP = Math.exp(-P.gone / .1);                                  // the old ring is overtaken by the new blow
      U.uStrikeP.value.set(P.sx, P.sz, hasP ? ageP : 99, hasP ? .02 * (.55 + .45 * P.vel) * Math.exp(-ageP / .3) * fadeP * mo : 0);
      U.uGr.value.set(ring, .2 * mo, .046 * mo, .05 * (.25 + .75 * mo));
      st.mo = mo;
      U.uKick.value.set(F ? .085 * vel * mo : 0, F ? kickThrow() : 0, KZONE, hasP ? Math.exp(-ageP / 1.15) * Math.exp(-P.gone / .25) : 0);
      U.uRingL.value.set(F ? (.45 + .6 * vel) * Math.exp(-age / .3) : 0, F ? (1.2 + 2 * vel) * Math.exp(-age / .07) : 0,
        hasP ? (.45 + .6 * P.vel) * Math.exp(-ageP / .3) * (.4 + .6 * fadeP) : 0, hasP ? (1.2 + 2 * P.vel) * Math.exp(-ageP / .07) : 0);
      U.uTime.value = t;
      // quality: fewer, slightly larger grains
      const frac = lerp(.3, 1, clamp((s.q - .35) / .65)); count = Math.max(60000, Math.round(NMAX * frac));
      const r = R0 * Math.sqrt(NMAX / count); geo.setDrawRange(0, count);
      U.uPt.value.y = r; U.uPt.value.z = .0021; U.uPt.value.w = .96;
      U.uDenW.value = Math.PI * r * r * .97 * DEN * DEN / 4;
      // depth of field: focus a little in front of the centre; vanishes as the camera goes overhead
      U.uDof.value.set(20 * gfx.H / 900, camB.D - .2, 0, 0);
      hoverA = damp(hoverA, hoverOn ? 1 : 0, 7, s.dt); U.uHover.value.z = .09 * hoverA;
      U.uFrost.value.x = lerp(.8, 1.2, k1);
      // snow: warm where it crosses the key light's beam (from the key's side of the screen, through the plate)
      {
        const pcx = (rect.cx + 1) / 2 * V.w, pcy = (1 - rect.cy) / 2 * V.h, L2 = U.uL2.value, rad = rect.hw * V.w / 2;
        const sh = { origin: [pcx + L2.x * 1800, pcy - L2.y * 1800], dir: [-L2.x, L2.y], radius: rad * .75, color: [1.7, .85, .32] };
        const tS = s.time * (mo < 1 ? .2 : 1), b = lerp(.35, 1, up) * (1 - .3 * k1);
        snowBack.quality(s.q).set({ shaft: sh, brightness: .65 * b }).update(tS);
        snowFront.quality(s.q).set({ shaft: sh, brightness: .42 * b }).update(tS);
      }
      // grade follows the strike
      grade.exposure = 1.02 * (1 + .13 * lit) * lerp(.94, 1, k1); grade.bloom = .5 + .3 * lit; grade.threshold = lerp(1.5, 1.6, k1) - .22 * lit; grade.vignette = lerp(.36, .3, k1) * (1 - .25 * lit);
      const sh = clamp(ring * .5 * (.6 + .4 * vel), 0, 1) * (1 - s.exit);
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
        const R = rng(1989), lump = new Float32Array(4096); for (let i = 0; i < 4096; i++) lump[i] = R();
        const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let tx = x - ix, ty = y - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          const a = (ix & 63) + (iy & 63) * 64, b = ((ix + 1) & 63) + (iy & 63) * 64, c = (ix & 63) + ((iy + 1) & 63) * 64, d = ((ix + 1) & 63) + ((iy + 1) & 63) * 64;
          return lerp(lerp(lump[a], lump[b], tx), lerp(lump[c], lump[d], tx), ty); };
        // hand-sprinkled, not printed: broad unevenness, and fine drifts with bare metal between them
        const sprinkle = (x, y) => { const f = vn(x * 31 + 3, y * 31 + 9) * .5 + vn(x * 73 + 20, y * 73 + 7) * .5;
          return (.55 + .45 * vn(x * 2.6 + 30, y * 2.6 + 40)) * (.16 + .84 * smoothstep(.38, .62, f)); };
        for (let i = 0; i < NMAX; i++) {
          let x, y; do { x = R() * 1.95 - .975; y = R() * 1.95 - .975; } while (x * x + y * y > .975 * .975 || R() > sprinkle(x, y));
          scatter[i * 2] = Math.round(x * 32767); scatter[i * 2 + 1] = Math.round(y * 32767);
          for (let c = 0; c < 4; c++) seeds[i * 4 + c] = Math.floor(R() * 256);
        }
        // ---- each grain's resting place in every figure ----
        // A symmetric, locality-preserving transport: fold the plate into one of its twelve mirror wedges, match
        // radial quantiles (the ring a grain lives in maps to the ring it rests in), then angular quantiles inside the
        // grain's own wedge. Neighbouring grains part toward the nearest lines, every wedge draws the same flake, and
        // the lines hold exactly as much sand as the figure asks for. Strays keep near where they fell.
        const NB = 112, W6 = Math.PI / 3, W12 = Math.PI / 6, SH = 1048576, TWO_PI = 2 * Math.PI;
        const foldW = (x, y) => { let t = Math.atan2(y, x); if (t < 0) t += TWO_PI; const k = Math.min(5, Math.floor(t / W6)); let f = t - k * W6; const m = f > W12 ? 1 : 0; if (m) f = W6 - f; return k * 2 + m + Math.min(f / W12, .999999); };
        const gW = new Uint8Array(NMAX), gB = new Uint16Array(NMAX), gV = new Float32Array(NMAX);
        {
          const key = new Float64Array(NMAX), fw = new Float32Array(NMAX);
          for (let i = 0; i < NMAX; i++) { const x = scatter[i * 2] / 32767, y = scatter[i * 2 + 1] / 32767; key[i] = Math.floor(Math.hypot(x, y) * 1e6) * SH + i; const w = foldW(x, y); gW[i] = Math.floor(w); fw[i] = w - gW[i]; }
          key.sort();
          for (let k = 0; k < NMAX; k++) { const i = key[k] % SH; gB[i] = Math.floor(k * NB / NMAX); }
          for (let i = 0; i < NMAX; i++) key[i] = ((gB[i] * 12 + gW[i]) * 1e6 + Math.floor(fw[i] * 999999)) * SH + i;
          key.sort();
          for (let k0 = 0; k0 < NMAX;) {
            const g = Math.floor(key[k0] / SH / 1e6); let k1 = k0; while (k1 < NMAX && Math.floor(key[k1] / SH / 1e6) === g) k1++;
            for (let k = k0; k < k1; k++) gV[key[k] % SH] = (k - k0 + .5) / (k1 - k0);
            k0 = k1;
          }
        }
        const M = NMAX, tx = new Float32Array(M), ty = new Float32Array(M), tR = new Float32Array(M), tF = new Float32Array(M), tkey = new Float64Array(M), tpos = new Int32Array(M);
        const grid = new Float32Array(SS * SS), grid2 = new Float32Array(SS * SS);
        const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(TWO_PI * r());
        const inHex = (x, y, R) => { const ap = R * S60; return Math.abs(y) <= ap && Math.abs(S60 * x + .5 * y) <= ap && Math.abs(S60 * x - .5 * y) <= ap; };
        for (let fi = 0; fi < NF; fi++) {
          const P = flake(fi), out = figPos[fi], r = rng(77 + fi * 13), WK = FIGS[fi].wk;
          // masses -> cumulative table
          const cum = new Float64Array(P.length); let tot = 0;
          P.forEach((q, k) => {
            let m;
            if (q.t === 0) m = Math.hypot(q.bx - q.ax, q.by - q.ay) * (q.w0 * q.d0 + q.w1 * q.d1) / 2;
            else if (q.t === 1) m = TWO_PI * q.r * q.w * q.d;
            else if (q.t === 2) m = 1.5 * Math.sqrt(3) * q.R * q.R * q.d / 2.5;
            else m = 6 * 1.5 * Math.sqrt(3) * q.R * q.R * q.d / 2.5;
            tot += m; cum[k] = tot; });
          for (let j = 0; j < M; j++) {
            const u = r() * tot; let lo = 0, hi = P.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
            const q = P[lo], haze = (r() < .04 ? 2.4 : 1) * WK; let x, y;
            if (q.t === 0) {
              const m0 = q.w0 * q.d0, m1 = q.w1 * q.d1, v = r();
              const t = Math.abs(m1 - m0) < 1e-9 ? v : (-m0 + Math.sqrt(m0 * m0 + (m1 * m1 - m0 * m0) * v)) / (m1 - m0);
              const dx = q.bx - q.ax, dy = q.by - q.ay, l = Math.hypot(dx, dy) || 1, w = lerp(q.w0, q.w1, t);
              const a = gauss(r) * w * haze, b = gauss(r) * w * WK * .45;
              x = q.ax + dx * t - dy / l * a + dx / l * b; y = q.ay + dy * t + dx / l * a + dy / l * b;
            } else if (q.t === 1) {
              const th = r() * TWO_PI, rr = q.r + gauss(r) * q.w * haze; x = rr * Math.cos(th); y = rr * Math.sin(th);
            } else {
              const cx = q.t === 3 ? q.cx : 0, k = q.t === 3 ? Math.floor(r() * 6) : 0;
              let hx, hy; do { hx = (r() * 2 - 1) * q.R; hy = (r() * 2 - 1) * q.R; } while (!inHex(hx, hy, q.R));
              const c = Math.cos(k * W6), sn = Math.sin(k * W6); x = c * (cx + hx) - sn * hy; y = sn * (cx + hx) + c * hy;
            }
            const l = Math.hypot(x, y); if (l > .972) { x *= .972 / l; y *= .972 / l; }
            tx[j] = x; ty[j] = y; tR[j] = Math.hypot(x, y); const w = foldW(x, y); tF[j] = w - Math.floor(w);
            tkey[j] = Math.floor(tR[j] * 1e6) * SH + j;
          }
          tkey.sort();
          for (let k = 0; k < M; k++) { const j = tkey[k] % SH, b = Math.floor(k * NB / M); tpos[k] = b; }
          for (let k = 0; k < M; k++) { const j = tkey[k] % SH; tkey[k] = (tpos[k] * 1e6 + Math.floor(tF[j] * 999999)) * SH + j; }
          tkey.sort();
          for (let k = 0; k < M; k++) tpos[k] = tkey[k] % SH;
          for (let i = 0; i < NMAX; i++) {
            const b = gB[i], s0 = Math.ceil(b * M / NB - 1e-9), s1 = Math.ceil((b + 1) * M / NB - 1e-9), n = s1 - s0;
            const j = tpos[s0 + Math.min(n - 1, Math.floor(gV[i] * n))];
            const w = gW[i], k = w >> 1, f = (w & 1) ? W6 - tF[j] * W12 : tF[j] * W12, th = k * W6 + f;
            let x = tR[j] * Math.cos(th), y = tR[j] * Math.sin(th);
            if (r() < .016) { const sx = scatter[i * 2] / 32767, sy = scatter[i * 2 + 1] / 32767, e = .1 + .25 * r(); x = lerp(sx, x, e) + (r() - .5) * .01; y = lerp(sy, y, e) + (r() - .5) * .01; }
            const l = Math.hypot(x, y); if (l > .975) { x *= .975 / l; y *= .975 / l; }
            out[i * 2] = Math.round(x * 32767); out[i * 2 + 1] = Math.round(y * 32767);
          }
          // stillness map: where the figure puts its sand the plate stands still
          grid.fill(0);
          for (let j = 0; j < M; j++) { const gx = Math.min(SS - 1, Math.max(0, Math.round((tx[j] + 1) * .5 * (SS - 1)))), gy = Math.min(SS - 1, Math.max(0, Math.round((ty[j] + 1) * .5 * (SS - 1)))); grid[gy * SS + gx]++; }
          const K = [.06, .24, .4, .24, .06];
          for (let pass = 0; pass < 2; pass++) {
            for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) { let a = 0; for (let d = -2; d <= 2; d++) a += grid[y * SS + Math.min(SS - 1, Math.max(0, x + d))] * K[d + 2]; grid2[y * SS + x] = a; }
            for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) { let a = 0; for (let d = -2; d <= 2; d++) a += grid2[Math.min(SS - 1, Math.max(0, y + d)) * SS + x] * K[d + 2]; grid[y * SS + x] = a; }
          }
          const mean = M / (Math.PI * SS * SS / 4);
          for (let k = 0; k < SS * SS; k++) stillData[fi * SS * SS + k] = Math.round(255 * Math.exp(-grid[k] / (mean * 1.4)));
          await new Promise(res => setTimeout(res, 0));
        }
        still.needsUpdate = true;
        // warm-up: compile every program once
        const fake = { t: 0, dt: 0, time: 0, beat: 0, bt: 0, q: 1, motion: 1, enter: 1, exit: 0, mouse: { x: 0, y: 0 }, k: () => 0, since: () => 0, at: () => 0 };
        const tmp = gfx.target({ w: 64, h: 64, hdr: false });
        setState(-1, 0, 1); apply(fake); renderDensity(); gfx.draw(back, cam, hdr); snowBack.render(hdr); gfx.draw(world, cam, hdr, { clear: false }); snowFront.render(hdr); gfx.post(hdr, tmp, grade); ui.render(tmp);
        gfx.free(tmp); setState(-1, -1, 99);
        // one buffer per item, so the warm-up pump spreads the work between frames; first figures first
        if (ctx.audio.warm) ctx.audio.warm([...FIGS.flatMap((_, k) => [0, 1, 2].map(part => ({ plate: k, part }))), { sfx: 'sand' }, { sfx: 'jingle' }, { layer: 'shimmer' }]);
      },
      enter(s) { hintA = 0; hoverA = 0; hoverOn = false; shim = -1; snapRect = true; trail.length = 0; sync(s); },
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
        st.age += s.dt; st.userAge += s.dt; st.prev.gone += s.dt;
        apply(s);
      },
      render(target) {
        if (denDirty || st.age < SETTLED + .6 || count !== lastCount) { renderDensity(); denDirty = false; lastCount = count; }
        gfx.draw(back, cam, hdr);
        snowBack.render(hdr);
        gfx.draw(world, cam, hdr, { clear: false });
        snowFront.render(hdr);
        gfx.post(hdr, target, grade);
        ui.render(target);
      },
      pointer(e, s) {
        if (e.type === 'leave') { hoverOn = false; canvas.style.cursor = ''; return false; }
        const on = pick(e.nx, e.ny, hit);
        if (e.type === 'move') { trail.push({ x: e.x, y: e.y, t: performance.now() }); if (trail.length > 12) trail.shift();
          hoverOn = on && e.pointerType !== 'touch'; if (on) U.uHover.value.set(hit.x, hit.z, U.uHover.value.z, 0); canvas.style.cursor = on ? 'pointer' : ''; return false; }
        // every pointer strikes on PRESS (no tap wait). A finger's press is not consumed, so a swipe that starts on the
        // plate still turns the page (it just rings the plate on its way).
        if (e.type !== 'down' || !on) return false;
        const touch = e.pointerType === 'touch', pos = clamp(Math.hypot(hit.x, hit.z) / .97, 0, 1);
        strike(hit.x, hit.z, { user: true, pan: e.nx * .6, vel: strength(e, pos) });
        if (s.beat === 1) st.nextAuto = s.motion < 1 ? Infinity : Math.max(s.bt + PERIOD, HOLD0);
        return !touch;
      },
      key(e) { // keyboard strike: U (udari) — digits belong to the deck
        if (e.key === 'u' || e.key === 'U') { const a = AUTO_PTS[(st.nAuto++) % AUTO_PTS.length]; strike(a[0], a[1], { user: true, pan: a[0] * .4, vel: .82 + (Math.random() - .5) * .08 }); if (last.beat === 1) st.nextAuto = Math.max(last.bt + PERIOD, HOLD0); return true; }
        return false;
      },
    };
  },
};
