// zica — the hero scene. One string in the dark -> the seven strings of a lyre -> the string field of a concert grand.
// Camera, layout and reveals are pure functions of the timeline state; string excitation is the one integrator.
// New Year: Deda Mraz (a backlit silhouette) plucks the first string, sweeps the lyre, and the hammers quote Jingle Bells.
import { createSanta, POSES, mixParams } from '../xmas/santa.js';
import { createSnow } from '../xmas/snow.js';
const PI = Math.PI;
const LYRE_KEYS = [29, 31, 32, 34, 36, 39, 41];             // D3 E3 F3 G3 A3 C4 D4 as piano key indices (A0 = 0)
const noteHz = n => 27.5 * Math.pow(2, n / 12);
let TEXT_AT1 = 2.9;                                         // beat 1: when the words are in (follows the layout; see textClear)
const NW = 0.0273, US = NW * 0.27;                          // piano note pitch, unison spacing (world units)
const noteX = n => (n - 34) * NW;
const noteLen = n => 0.26 + 3.5 * Math.exp(-n / 24);        // speaking length: the curve of the bridge
const MODES = 12, TW = 5, SEG = 96;
const SB = 0.052, ST = 0.094, LYL = 1.0;                    // lyre: spacing at the bridge, at the yoke, string length
const HAM_Y = 0.3, HF = 0.046;                             // hammer strike line; height of the first string above the lacquer

// ---------------------------------------------------------------- GLSL
const LIGHT_COMMON = /* glsl */`
uniform vec3 uCam; uniform vec3 uLp[2]; uniform vec3 uLc[2];
`;
const STRING_VS = /* glsl */`
precision highp float; precision highp int; precision highp sampler2D;
#define SEG ${SEG}.0
#define PI 3.14159265359
uniform mat4 uVP, uMirror; uniform vec4 uPlane, uPool; uniform vec2 uHalf;
uniform float uP11, uMorph, uFocus, uAper, uSoft, uRadScale, uFog, uFogStart, uFall;
uniform sampler2D tData;
in vec2 position; in vec3 aA0, aB0, aA1, aB1; in vec4 aInfo; in vec2 aTint;
out float vY, vAmp, vGhost, vR, vFw, vU, vS, vAtt, vTint;
out vec3 vP, vT, vD, vSl; flat out vec4 vRow;
const float CT[16] = float[16](1., .9238795, .7071068, .3826834, 0., -.3826834, -.7071068, -.9238795, -1., -.9238795, -.7071068, -.3826834, 0., .3826834, .7071068, .9238795);
// the held string: a triangle whose apex is rounded by the width of a fingertip
float tri(float u, float x0){ float a = u / x0, b = (1. - u) / (1. - x0); const float k = .05; float h = max(k - abs(a - b), 0.) / k; return (min(a, b) - h * h * k * .25) / (1. - k * .25); }
void main(){
  int row = int(aInfo.z + .5);
  vec4 t3 = texelFetch(tData, ivec2(3, row), 0), t4 = texelFetch(tData, ivec2(4, row), 0);
  vRow = vec4(t4.x, t4.y, t4.z, t4.w);
  if (t4.x <= 0.) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec3 A = mix(aA0, aA1, uMorph), B = mix(aB0, aB1, uMorph);
  float radius = mix(aInfo.x, aInfo.y, uMorph) * mix(uRadScale, 1., uMorph);
  vec3 AB = B - A; float Lw = length(AB); vec3 T = AB / Lw; vec3 D = normalize(vec3(T.y, -T.x, 0.));
  float u = position.x, x0 = t3.y, th = t3.z;
  if (t3.x != 0.) { float xa = clamp(floor(x0 * SEG + .5) / SEG, 1. / SEG, 1. - 1. / SEG); u = u < xa ? u * x0 / xa : x0 + (u - xa) * (1. - x0) / (1. - xa); }
  float cen = 0., hw = 0., cs = 0., hs = 0., yv = 0., sv = 0.;
  if (t3.w > 0.) {
    vec4 m0 = texelFetch(tData, ivec2(0, row), 0), m1 = texelFetch(tData, ivec2(1, row), 0), m2 = texelFetch(tData, ivec2(2, row), 0);
    float a[12] = float[12](m0.x, m0.y, m0.z, m0.w, m1.x, m1.y, m1.z, m1.w, m2.x, m2.y, m2.z, m2.w);
    float b[12]; float sl[12];
    for (int n = 0; n < 12; n++){ float ph = float(n + 1) * PI * u; b[n] = a[n] * sin(ph); sl[n] = a[n] * float(n + 1) * PI * cos(ph); }
    // the travel of the string over one period: sample 16 phases of the phase-locked harmonic sum
    float U = -1e9, Lo = 1e9, sU = 0., sLo = 0.;
    for (int k = 0; k < 16; k++){
      float y = 0., sy = 0.;
      for (int n = 0; n < 12; n++){ float c = CT[((n + 1) * k) & 15]; y += b[n] * c; sy += sl[n] * c; }
      if (y > U){ U = y; sU = sy; } if (y < Lo){ Lo = y; sLo = sy; }
    }
    // the slowed (aliased) string the eye can follow
    float c1 = cos(th), cp = 1., cc = c1;
    for (int n = 0; n < 12; n++){ yv += b[n] * cc; sv += sl[n] * cc; float nx = 2. * c1 * cc - cp; cp = cc; cc = nx; }
    if (yv > U){ U = yv; sU = sv; } if (yv < Lo){ Lo = yv; sLo = sv; }
    cen = .5 * (U + Lo); hw = .5 * (U - Lo); cs = .5 * (sU + sLo); hs = .5 * (sU - sLo);
  }
  if (t3.x != 0.) { const float e = .004; float yp = t3.x * tri(u, x0); float sp = t3.x * (tri(min(u + e, 1.), x0) - tri(max(u - e, 0.), x0)) / (2. * e); cen += yp; yv += yp; cs += sp; sv += sp; }
  vec3 P = A + AB * u;
  float dpl = max(dot(P + D * cen, uPlane.xyz) - uPlane.w, 0.);
  vec3 Pm = (uMirror * vec4(P, 1.)).xyz; vec3 Tm = mat3(uMirror) * T, Dm = mat3(uMirror) * D;
  vec4 c4 = uVP * vec4(Pm + Dm * cen, 1.);
  vec4 ct = uVP * vec4(Tm + Dm * (cs / Lw), 0.);
  vec4 cd = uVP * vec4(Dm, 0.);
  float w = max(c4.w, 1e-3);
  vec2 tS = (ct.xy * c4.w - c4.xy * ct.w) * uHalf;
  vec2 nS = normalize(vec2(-tS.y, tS.x) + vec2(1e-9, 0.));
  vec2 dS = (cd.xy * c4.w - c4.xy * cd.w) / (w * w) * uHalf;
  float g = dot(dS, nS);
  float ppu = uP11 * uHalf.y / w;
  float rpx = radius * ppu;
  float blur = uAper * abs(w - uFocus) / w * uHalf.y + uSoft * dpl * ppu;
  float fw = 1. + blur, rr = max(rpx, .5), amp = abs(g) * hw;
  float E = amp * 1.12 + rr + .5 * fw + 1.5;
  vY = position.y * E; vAmp = amp; vGhost = g * (yv - cen); vR = rpx; vFw = fw; vU = u; vS = u * Lw / (radius * 1.5);
  vP = Pm; vT = Tm; vD = Dm; vSl = vec3(cs, hs * (g < 0. ? -1. : 1.), sv) / Lw; vTint = mix(aTint.x, aTint.y, uMorph);
  vec3 dp = P - uPool.xyz;
  vAtt = exp(-uFog * max(0., w - uFogStart)) / (1. + dot(dp, dp) * uPool.w) * exp(-dpl * uFall);
  gl_Position = vec4(c4.xy + nS * (position.y * E) / uHalf * c4.w, c4.z, c4.w);
}`;
const STRING_FS = /* glsl */`
precision highp float;
${LIGHT_COMMON}
uniform float uGhost, uGain, uGlow, uBase; uniform vec4 uShin;
in float vY, vAmp, vGhost, vR, vFw, vU, vS, vAtt, vTint;
in vec3 vP, vT, vD, vSl; flat in vec4 vRow;
out vec4 fragColor;
vec3 F0, base;
// time-averaged position of a point in simple harmonic motion is arcsine distributed, density 1 / (pi sqrt(a^2 - y^2)).
// G is the integral of asin, so Fs is that distribution's CDF box-filtered over the pixel: exact coverage, no singularity.
float Gf(float u){ float a = abs(u); return a < 1. ? u * asin(u) + sqrt(max(0., 1. - u * u)) : 1.5707963 * a; }
float Fs(float y, float a, float w){ return .5 + a / (3.14159265 * w) * (Gf((y + .5 * w) / a) - Gf((y - .5 * w) / a)); }
vec3 shade(float slope){
  vec3 T = normalize(vT + vD * slope), V = normalize(uCam - vP), c = vec3(0.);
  for (int i = 0; i < 2; i++){
    vec3 L = normalize(uLp[i] - vP), H = normalize(L + V);
    float th = dot(T, H), tl = dot(T, L);
    float spec = exp(-th * th * uShin.x) * uShin.z + exp(-th * th * uShin.y) * uShin.w;
    c += uLc[i] * (spec * F0 + sqrt(max(0., 1. - tl * tl)) * base * uBase);
  }
  return c;
}
void main(){
  F0 = mix(vec3(1., .74, .38), vec3(1., .84, .6), vTint); base = mix(vec3(.62, .38, .12), vec3(.6, .44, .24), vTint);
  float rr = max(vR, .5), thin = min(1., vR / rr);
  float a = max(vAmp, .02);
  float band = Fs(vY + rr, a, vFw) - Fs(vY - rr, a, vFw);
  float fwg = vFw + .2 * vAmp;
  float dg = vY - vGhost;
  float ghost = clamp((rr + .5 * fwg - abs(dg)) / fwg, 0., min(1., 2. * rr / fwg));
  float mx = min(1., 2. * rr / vFw), soft = smoothstep(1.3, 2.6, vFw);
  band = mix(band, mx * smoothstep(0., 1., band / mx), soft); ghost = mix(ghost, mx * smoothstep(0., 1., ghost / mx), soft);
  float t = clamp(vY / max(vAmp, 1e-3), -1., 1.);
  float live = smoothstep(.3, 2.5, vAmp / rr);
  // wound-string texture, only where a turn of the winding is wider than a few pixels and the string is nearly still
  float fp = fwidth(vS);
  float wound = (.5 + .5 * cos(6.2831853 * (vS + .22 * dg / rr))) * smoothstep(.42, .16, fp) * (1. - live);
  float cross = 1. + .28 * clamp(dg / rr, -1., 1.) * (1. - live);      // lit from above: one side of the cylinder is brighter
  vec3 cb = shade(vSl.x + t * vSl.y) * band * (1. + uGlow * sqrt(vAmp / rr));
  vec3 cg = shade(vSl.z) * ghost * (1. - .3 * wound) * cross;
  vec3 col = mix(cb, cg, uGhost) * thin;
  // reveal: the string is drawn in along its length, with a hot head
  float uu = (vRow.y > .5 && vRow.y < 1.5) ? 1. - vU : vU, front = vRow.x * 1.09;
  float mask = clamp((front - uu) / .07, 0., 1.);
  float head = exp(-pow((uu - front + .012) / .02, 2.)) * step(vRow.x, .9995);
  col = col * mask * mask + F0 * head * ghost * thin * (vRow.y > 1.5 ? 1.6 : 9.);
  col *= vAtt * uGain * vRow.w * (1. + 1.4 * vRow.z);
  fragColor = vec4(max(col, 0.), 1.);
}`;

const SOLID_VS = /* glsl */`
precision highp float;
uniform mat4 uVP, uMirror;
in vec3 position, normal; in vec4 aMat;
#ifdef HAMMER
in vec4 aInst;
#endif
out vec3 vP, vN, vO; out vec4 vMat; out float vW;
void main(){
  vec3 p = position, n = normal;
  #ifdef HAMMER
  float an = -.14 + aInst.y * .16; float c = cos(an), s = sin(an);
  p.yz = vec2(c * p.y - s * p.z, s * p.y + c * p.z); n.yz = vec2(c * n.y - s * n.z, s * n.y + c * n.z);
  p += vec3(aInst.x, ${(HAM_Y - 0.2).toFixed(3)}, -.06);
  #endif
  vO = p;
  vec4 w = uMirror * vec4(p, 1.); vP = w.xyz; vN = mat3(uMirror) * n; vMat = aMat;
  gl_Position = uVP * w; vW = gl_Position.w;
}`;
const solidFS = (HASH, NOISE) => /* glsl */`
precision highp float;
${LIGHT_COMMON}
uniform float uLit, uFog, uFogStart, uRim, uFall; uniform vec4 uPool, uPlane;
in vec3 vP, vN, vO; in vec4 vMat; in float vW; out vec4 fragColor;
${HASH}${NOISE}
void main(){
  vec3 N = normalize(vN), V = normalize(uCam - vP); if (dot(N, V) < 0.) N = -N;
  float kind = vMat.a; vec3 alb = vMat.rgb;
  if (kind > .5 && kind < 1.5) { // sand-cast gold: break the highlight a little
    float g1 = vnoise(vO.xy * 1400. + vO.z * 900.), g2 = vnoise(vO.yx * 1100. + 9.);
    N = normalize(N + (vec3(g1, g2, g1 * g2) - .5) * .035 * smoothstep(1.4, .4, vW));
  }
  float nv = max(dot(N, V), 0.), fres = pow(1. - nv, 3.);
  vec3 c = vec3(0.);
  for (int i = 0; i < 2; i++){
    vec3 L = normalize(uLp[i] - vP), H = normalize(L + V);
    float nl = dot(N, L), nh = max(dot(N, H), 0.), wrap = smoothstep(-.45, .7, nl);
    vec3 k;
    if (kind < .5) k = alb * (max(nl, 0.) * .9 + .25 * wrap) + vec3(.9, .62, .3) * pow(nh, 38.) * .3 * max(nl, 0.) + vec3(1., .7, .38) * (pow(1. - nv, 1.7) * .5 + fres) * wrap * uRim;
    else if (kind < 1.5) k = alb * (pow(nh, 110.) * 3. + pow(nh, 16.) * .28 + max(nl, 0.) * .05 + fres * wrap * .55);
    else if (kind < 2.5) { float up = N.z * .5 + .5; k = alb * (.1 + .95 * up * up + .35 * pow(max(nl, 0.), 2.)) * (i == 0 ? 1. : .3); }   // felt: soft, top-lit, no sheen
    else k = alb * (pow(nh, 140.) * 5. + max(nl, 0.) * .08);
    c += k * uLc[i];
  }
  vec3 dp = vP - uPool.xyz;
  c *= uLit * exp(-uFog * max(0., vW - uFogStart)) / (1. + dot(dp, dp) * uPool.w) * exp(-max(uPlane.w - dot(vP, uPlane.xyz), 0.) * uFall);
  fragColor = vec4(c, 1.);
}`;

const DUST_VS = /* glsl */`
precision highp float;
uniform mat4 uVP; uniform vec3 uCen, uBox, uBo, uBd; uniform vec4 uBeam; uniform vec2 uHalf;
uniform float uP11, uT, uFocus, uAper, uAmb;
in vec2 position; in vec4 aSeed;
out vec2 vQ; out float vI, vRpx, vRing;
void main(){
  vec3 p = aSeed.xyz * uBox + uT * (vec3(.011, -.007, .005) + (aSeed.yzx - .5) * .012) + .03 * sin(uT * (.11 + aSeed.w * .17) + aSeed.zxy * 6.283);
  vec3 rel = fract((p - uCen) / uBox + .5) - .5;
  p = uCen + rel * uBox;
  vec3 e = smoothstep(.5, .38, abs(rel)); float win = e.x * e.y * e.z;
  vec4 c = uVP * vec4(p, 1.);
  float w = max(c.w, .05);
  float coc = uAper * abs(w - uFocus) / w * uHalf.y;
  float rpx = (.0014 + .0026 * aSeed.w * aSeed.w) * uP11 * uHalf.y / w;
  float R = min(max(rpx, .75) + coc, 11.);
  vec3 w0 = p - uBo; float tc = dot(w0, uBd); vec3 dp = w0 - uBd * tc; float sig = max(uBeam.x + uBeam.y * tc, .45 * uBeam.x);
  float lit = exp(-dot(dp, dp) / (sig * sig)) * uBeam.x / sig * uBeam.z;
  float tw = .5 + .5 * sin(uT * (.9 + aSeed.w * 1.7) + aSeed.x * 40.); tw = .25 + .75 * tw * tw;
  vI = (uAmb + lit) * tw * win * min(1., rpx * rpx / (R * R) * 3.) * smoothstep(.12, .45, c.w);
  vQ = position; vRpx = R; vRing = clamp(coc / 5., 0., 1.);
  gl_Position = vec4(c.xy + position * R / uHalf * c.w, c.z, c.w);
}`;
const DUST_FS = /* glsl */`
precision highp float;
uniform vec3 uCol; in vec2 vQ; in float vI, vRpx, vRing; out vec4 fragColor;
void main(){
  float r = length(vQ); float d = smoothstep(1., 1. - min(.95, 2.2 / vRpx), r);
  d *= mix(exp(-r * r * 2.2), .8 + .25 * smoothstep(.5, 1., r), vRing);
  fragColor = vec4(uCol * vI * d, 1.);
}`;


// snow shaken off the strings: a few dozen flakes per string, a pure function of the time since that string was swept
const PUFF_N = 34;
const PUFF_VS = /* glsl */`
precision highp float; precision highp int;
uniform mat4 uVP; uniform vec2 uHalf; uniform float uP11, uFocus, uAper, uScale, uAmb;
uniform vec3 uBo, uBd, uDown, uSide; uniform vec4 uBeam;
uniform vec4 uSA[7], uSB[7];          // string i: A.xyz + contact u, B.xyz + age (s since it was swept; < 0 = none)
uniform float uAmt[7];
in vec2 position; in vec4 aSeed;
out vec2 vQ; out float vI, vR, vRing;
void main(){
  int i = gl_InstanceID / ${PUFF_N};
  vec4 sa = uSA[i], sb = uSB[i]; float age = sb.w;
  if (age < 0. || age > 4.2 || uAmt[i] <= 0.) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec4 r = aSeed;
  vec3 A = sa.xyz, B = sb.xyz, T = normalize(B - A);
  float u = clamp(sa.w + (r.x - .5) * .5 * (.35 + r.y), .03, .97);
  vec3 p0 = mix(A, B, u) + vec3(0., 0., (r.z - .5) * .006 * uScale);
  // shaken loose: a short kick (drag time tau), then a slow, fluttering fall at terminal speed
  float tau = .28, e = 1. - exp(-age / tau);
  vec3 kick = uSide * (r.z - .5) * .2 + T * (r.y - .5) * .06 + vec3(0., 0., (r.w - .5) * .12) - uDown * .07 * r.w;
  float vt = .05 + .055 * r.y;
  vec3 p = p0 + (kick * tau * e + uDown * vt * max(age - tau * e, 0.)) * uScale;
  vec3 fl = uSide * sin(age * (1.7 + 1.9 * r.x) + r.w * 6.28) + vec3(0., 0., cos(age * (1.2 + r.z) + r.x * 6.28));
  p += fl * .011 * uScale * min(age * 1.4, 1.);
  vec4 c = uVP * vec4(p, 1.);
  float w = max(c.w, .05);
  float coc = uAper * abs(w - uFocus) / w * uHalf.y;
  float rpx = (.0015 + .0024 * r.y * r.y) * uScale * uP11 * uHalf.y / w;
  float R = min(max(rpx, .8) + coc, 9.);
  vec3 w0 = p - uBo; float tc = dot(w0, uBd); vec3 dp = w0 - uBd * tc; float sig = max(uBeam.x + uBeam.y * tc, .45 * uBeam.x);
  float lit = exp(-dot(dp, dp) / (sig * sig)) * uBeam.x / sig;
  float fade = smoothstep(0., .07, age) * (1. - smoothstep(1.8 + 1.6 * r.x, 4.2, age));
  float tw = .55 + .45 * sin(age * (5. + 4. * r.w) + r.x * 30.);
  vI = (uAmb + lit) * fade * tw * uAmt[i] * min(1., rpx * rpx / (R * R) * 3.);
  vQ = position; vR = R; vRing = clamp(coc / 5., 0., 1.);
  gl_Position = vec4(c.xy + position * R / uHalf * c.w, c.z, c.w);
}`;

const BG_FS = /* glsl */`
uniform vec3 uCam, uR, uU, uF, uBo, uBd, uBeamCol, uLk, uLkc, uFa1; uniform vec4 uProj, uBeam, uFloor; uniform vec3 uFloorK; uniform float uAmb, uT;
uniform vec4 uHz; uniform vec3 uHzC;     // warm haze behind Deda Mraz: centre (uv), radii (uv); colour (linear, 0 = off)
float beamI(vec3 ro, vec3 rd, float tmax){
  vec3 w0 = ro - uBo; float b = dot(rd, uBd), d = dot(rd, w0), e = dot(uBd, w0);
  float den = max(1. - b * b, .02);
  float sc = (b * e - d) / den, tc = (e - b * d) / den;
  vec3 dp = w0 + rd * sc - uBd * tc; float sig = max(uBeam.x + uBeam.y * tc, .45 * uBeam.x);
  float along = sig / sqrt(den);
  float seg = .5 * (tanh((tmax - sc) / along) + tanh(sc / along));
  float streak = .78 + .44 * vnoise(vec2(dot(dp, uR) / sig * 2.2 + 3., tc * .3 - uT * .012));
  return exp(-dot(dp, dp) / (sig * sig)) * uBeam.x / sig / sqrt(den) * max(seg, 0.) * streak / (1. + tc * tc * uBeam.w) * smoothstep(-2.4, -.2, tc);
}
void main(){
  vec2 n = vUv * 2. - 1.;
  vec3 rd = normalize(uF + uR * ((n.x + uProj.z) * uProj.x) + uU * ((n.y + uProj.w) * uProj.y));
  float asp = uRes.x / uRes.y;
  float hz = fbm(n * vec2(asp, 1.) * 1.1 + vec2(uT * .011, -uT * .006));
  vec3 col = uAmb * vec3(1., .7, .4) * (.25 + .75 * hz) * (1. - .5 * dot(n, n) * .5);
  // the air just behind him holds a little of the light, so his near-black silhouette separates from the black
  if (uHzC.r > 0.) { vec2 q = (vUv - uHz.xy) / uHz.zw; col += uHzC * exp(-1.6 * dot(q, q)) * (.7 + .3 * hz); }
  float tmax = 1e3;
  float dn = dot(rd, uFloor.xyz);
  if (uFloorK.x > 0. && dn < -1e-4) {
    float tf = (uFloor.w - dot(uCam, uFloor.xyz)) / dn;
    if (tf > 0.) {
      tmax = tf; vec3 ph = uCam + rd * tf;
      vec3 a1 = uFa1, a2 = cross(uFloor.xyz, a1); vec2 pc = vec2(dot(ph, a1), dot(ph, a2));
      // lacquer is never optically flat: a slow orange-peel waviness bends what it reflects
      vec2 wv = vec2(vnoise(pc * 9. + 2.), vnoise(pc * 9. + 31.)) - .5;
      vec3 nn = normalize(uFloor.xyz + (a1 * wv.x + a2 * wv.y) * .035);
      vec3 rr = reflect(rd, nn);
      float fr = .1 + .9 * pow(1. - max(dot(-rd, nn), 0.), 5.);
      float far = exp(-tf * uFloorK.z);
      vec3 l = normalize(uLk - ph); float sp = max(dot(rr, l), 0.);
      vec3 refl = uBeamCol * beamI(ph, rr, 1e3) * 1.8 + uLkc * pow(sp, 14.) * .05;
      // dust that settled on the lacquer catches the shaft
      vec3 w0 = ph - uBo; float tc = dot(w0, uBd); vec3 dp = w0 - uBd * tc; float sig = max(uBeam.x + uBeam.y * tc, .45 * uBeam.x);
      float pool = exp(-dot(dp, dp) / (sig * sig * 10.));
      vec2 g = pc * 150.; vec2 gi = floor(g), gf = fract(g) - .5; vec2 hh = hash22(gi);
      float foot = fwidth(g.x) + fwidth(g.y);
      float speck = step(.93, hh.x) * smoothstep(.22, .05, length(gf - (hh - .5) * .5)) * smoothstep(1.2, .3, foot);
      refl += uBeamCol * pool * (speck * 2.2 * hh.y + .012) * uFloorK.y;
      col += refl * fr * far * uFloorK.x;
    }
  }
  col += uBeamCol * beamI(uCam, rd, tmax);
  fragColor = vec4(col, 1.);
}`;

// ---------------------------------------------------------------- scene
export default {
  id: 'zica', enterWith: 'fade',
  beats: [
    { dur: 7, copy: ['zica.b1.h', 'zica.b1.p', 'zica.hint'], textAt: 5.2 },
    { dur: 7, copy: ['zica.b2.h', 'zica.b2.p'], get textAt() { return TEXT_AT1; } },
    { dur: 8, copy: ['zica.b3.h', 'zica.b3.p'], textAt: 3.0 },
  ],
  create(ctx) {
    const { THREE, gfx, view } = ctx;
    const { clamp, lerp, damp, smoothstep, rng } = ctx.util;
    const V3 = THREE.Vector3, M4 = THREE.Matrix4;
    const v3 = (x = 0, y = 0, z = 0) => new V3(x, y, z);
    const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
    const rand = rng(1989);

    // ------------------------------------------------------------ strings (CPU state)
    const strings = [], lyre = [], byNote = [];
    {
      let row = 7;
      for (let n = 0; n < 88; n++) {
        const c = n < 8 ? 1 : n < 20 ? 2 : 3, li = LYRE_KEYS.indexOf(n); byNote[n] = [];
        for (let j = 0; j < c; j++) {
          const x = noteX(n) + (j - (c - 1) / 2) * US, len = noteLen(n) * (1 + (j - 1) * .004);
          const isL = li >= 0 && j === 1;
          const st = {
            row: isL ? li : row++, note: n, li: isL ? li : -1, x,
            A1: [x, 0, 0], B1: [x, len, 0], r1: 0.00052 + 0.0011 * Math.exp(-n / 15), t1: n < 20 ? 0 : 1,
            a: new Float32Array(MODES), rate: new Float32Array(MODES), phase: 0, pull: 0, pullT: 0, x0: .5, held: false, live: false, energy: 0, glow: 0,
            rev: 0, revDir: 0, gain: 1, order: Math.abs(x - 0.03),
          };
          if (isL) {
            st.A0 = [(li - 3) * SB, 0, 0]; st.B0 = [(li - 3) * ST, LYL, 0]; st.r0 = 0.0025 - li * 0.00014; st.t0 = 0;
            const dx = st.B0[0] - st.A0[0], L = Math.hypot(dx, LYL);
            st.len = L; st.T = [dx / L, LYL / L]; st.D = [LYL / L, -dx / L]; st.hz = noteHz(n);
            lyre[li] = st;
          } else { st.A0 = st.A1; st.B0 = st.B1; st.r0 = st.r1; st.t0 = st.t1; }
          const tau = isL ? 2.6 - li * .13 : 1.9, beta = isL ? .045 : .07;
          for (let m = 0; m < MODES; m++) st.rate[m] = (1 + beta * ((m + 1) * (m + 1) - 1)) / tau;
          st.fvis = 2.3 * Math.pow(noteHz(n) / 146.83, .3);
          strings.push(st); byNote[n].push(st);
        }
      }
    }
    const N = strings.length;
    const maxOrder = Math.max(...strings.map(s => s.order));
    const data = new Float32Array(N * TW * 4);
    const dataTex = new THREE.DataTexture(data, TW, N, THREE.RGBAFormat, THREE.FloatType);
    dataTex.minFilter = dataTex.magFilter = THREE.NearestFilter; dataTex.generateMipmaps = false; dataTex.needsUpdate = true;

    const hero = lyre[0];
    const A0 = v3(...hero.A0), T0 = v3(hero.T[0], hero.T[1], 0), U0 = v3(hero.D[0], hero.D[1], 0), Z = v3(0, 0, 1);
    const Cs = A0.clone().addScaledVector(T0, hero.len * .5);

    // ------------------------------------------------------------ geometry helpers
    const tagMat = (geo, rgb, kind) => {
      const g = geo.index ? geo.toNonIndexed() : geo; const n = g.attributes.position.count, m = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { m[i * 4] = rgb[0]; m[i * 4 + 1] = rgb[1]; m[i * 4 + 2] = rgb[2]; m[i * 4 + 3] = kind; }
      g.setAttribute('aMat', new THREE.BufferAttribute(m, 4)); g.deleteAttribute('uv'); return g;
    };
    const merge = list => {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), Mt = new Float32Array(n * 4); let o = 0;
      for (const g of list) { P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); Mt.set(g.attributes.aMat.array, o * 4); o += g.attributes.position.count; g.dispose(); }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); out.setAttribute('aMat', new THREE.BufferAttribute(Mt, 4));
      return out;
    };
    const place = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => g.applyMatrix4(new M4().compose(v3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), v3(sx, sy, sz)));
    // tube along a curve with a radius that varies along it
    const tube = (pts, radius, segs = 64, radial = 12) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => v3(...p)), false, 'centripetal');
      const g = new THREE.TubeGeometry(curve, segs, 1, radial, false); const pos = g.attributes.position, c = v3();
      for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, c); const r = radius(i / segs); for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * r, c.y + (pos.getY(k) - c.y) * r, c.z + (pos.getZ(k) - c.z) * r); } }
      return g;
    };
    // closed 2D profile (a,b) with smooth normals, extruded along the third axis, capped
    const prism = (prof, depth) => {
      const n = prof.length, P = [], Nn = [], h = depth / 2;
      const nrm = prof.map((p, i) => { const a = prof[(i + n - 1) % n], b = prof[(i + 1) % n]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; });
      let cx = 0, cy = 0; for (const p of prof) { cx += p[0] / n; cy += p[1] / n; }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, p = prof[i], q = prof[j], np = nrm[i], nq = nrm[j];
        P.push(p[0], p[1], -h, q[0], q[1], -h, q[0], q[1], h, p[0], p[1], -h, q[0], q[1], h, p[0], p[1], h);
        Nn.push(np[0], np[1], 0, nq[0], nq[1], 0, nq[0], nq[1], 0, np[0], np[1], 0, nq[0], nq[1], 0, np[0], np[1], 0);
        P.push(cx, cy, h, p[0], p[1], h, q[0], q[1], h, cx, cy, -h, q[0], q[1], -h, p[0], p[1], -h);
        Nn.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(Nn), 3)); return g;
    };
    const roundRect = (w, h, r, k = 5) => { const pts = []; const cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]]; for (const c of cs) for (let i = 0; i <= k; i++) { const a = (c[2] + i / k) * PI / 2; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return pts; };

    const WOOD = [0.04, 0.024, 0.012], GOLD = [0.78, 0.5, 0.16], FELT = lin('#9c2233'), STEEL = [0.8, 0.74, 0.62];

    // ------------------------------------------------------------ lyre: arms, yoke, soundbox (mostly silhouette)
    const lyreGeo = (() => {
      const parts = [];
      for (const sd of [-1, 1]) {
        const pts = [[.2, -.15, -.05], [.272, .1, -.022], [.352, .42, -.006], [.368, .7, 0], [.335, .92, .002], [.322, 1.02, .004], [.345, 1.12, .012], [.41, 1.2, .022]].map(p => [p[0] * sd, p[1], p[2]]);
        parts.push(tagMat(tube(pts, t => t < .82 ? lerp(.04, .021, smoothstep(0, .82, t)) : lerp(.021, .008, smoothstep(.82, 1, t)), 84, 12), WOOD, 0));
        parts.push(tagMat(place(new THREE.SphereGeometry(.0235, 16, 12), .452 * sd, 1.0, -.014), GOLD, 1));
      }
      parts.push(tagMat(place(new THREE.CylinderGeometry(.0155, .0155, .9, 14, 1), 0, 1.0, -.014, 0, 0, PI / 2), WOOD, 0));
      for (let i = 0; i < 7; i++) parts.push(tagMat(place(new THREE.CylinderGeometry(.0185, .0185, .013, 14, 1), (i - 3) * ST, 1.0, -.014, 0, 0, PI / 2), GOLD, 1));
      parts.push(tagMat(place(new THREE.SphereGeometry(1, 44, 30), 0, -.175, -.094, 0, 0, 0, .3, .225, .09), WOOD, 0));
      parts.push(tagMat(place(new THREE.CylinderGeometry(.0075, .0075, .4, 10, 1), 0, -.004, -.0085, 0, 0, PI / 2), WOOD, 0));
      return merge(parts);
    })();

    // ------------------------------------------------------------ piano: gold frame + hammers
    const frameGeo = (() => {
      const parts = [];
      parts.push(tagMat(place(new THREE.CylinderGeometry(.0085, .0085, 3.2, 12, 1), .26, -.008, .003, 0, 0, PI / 2), GOLD, 1));                    // agraffe rail
      const prof = roundRect(.03, .04, .011);
      for (const [x, splay, len] of [[-.455, -.05, 5.3], [.53, .035, 3.5], [-.86, -.1, 5.3], [1.0, .08, 3.2]]) {
        const g = prism(prof, len); // profile in (x, z'), extruded along local z -> rotate so it runs along +Y
        place(g, 0, 0, 0, -PI / 2, 0, 0); place(g, x + splay * (len * .5 - 2), len * .5 - 2.03, .058, 0, 0, -splay);
        parts.push(tagMat(g, GOLD, 1));
      }
      const rim = []; for (let n = -4; n <= 92; n += 4) rim.push([noteX(n), noteLen(Math.max(n, 0)) + .075 + (n < 0 ? -n * .02 : 0), .014]);
      parts.push(tagMat(tube(rim, () => .017, 96, 10), GOLD, 1));
      return merge(parts);
    })();
    const hammerGeo = (() => {
      const gF = place(new THREE.SphereGeometry(1, 20, 14), 0, .2, .031, 0, 0, 0, .0072, .0135, .0195);   // felt nose: an egg, no flat faces
      const shank = tagMat(place(new THREE.BoxGeometry(.0052, .2, .0052), 0, .1, -.012), [.05, .03, .015], 2);
      { const P = shank.attributes.position, Mt = shank.attributes.aMat; for (let i = 0; i < P.count; i++) { const f = smoothstep(.05, .2, P.getY(i)); Mt.setXYZ(i, Mt.getX(i) * f, Mt.getY(i) * f, Mt.getZ(i) * f); } }
      const base = merge([
        tagMat(gF, FELT.map(c => c * .8), 2),
        tagMat(place(new THREE.BoxGeometry(.0092, .015, .05), 0, .2, -.004), [.1, .058, .03], 2),
        shank,
      ]);
      const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', base.attributes.position); g.setAttribute('normal', base.attributes.normal); g.setAttribute('aMat', base.attributes.aMat);
      return g;
    })();
    const hamInst = new Float32Array(88 * 4); for (let n = 0; n < 88; n++) hamInst[n * 4] = noteX(n);
    const hamAttr = new THREE.InstancedBufferAttribute(hamInst, 4); hamAttr.setUsage(THREE.DynamicDrawUsage);
    hammerGeo.setAttribute('aInst', hamAttr); hammerGeo.instanceCount = 88;

    // ------------------------------------------------------------ materials
    const lightsS = { uCam: { value: v3() }, uLp: { value: [v3(), v3()] }, uLc: { value: [v3(), v3()] } };  // strings
    const lightsM = { uCam: lightsS.uCam, uLp: { value: [v3(), v3()] }, uLc: { value: [v3(), v3()] } };     // solids
    const shared = { uVP: { value: new M4() }, uHalf: { value: new THREE.Vector2(1, 1) }, uP11: { value: 1 }, uPool: { value: new THREE.Vector4(0, 0, 0, 0) }, uFog: { value: 0 }, uFogStart: { value: 0 } };
    const IDENT = new M4();
    const stringMat = mirror => new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: STRING_VS, fragmentShader: STRING_FS, depthTest: true, depthWrite: false, transparent: true, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      uniforms: {
        ...shared, ...lightsS, tData: { value: dataTex }, uMirror: { value: mirror ? new M4() : IDENT }, uPlane: { value: new THREE.Vector4(0, 0, 0, 0) },
        uMorph: { value: 0 }, uFocus: { value: 1 }, uAper: { value: 0 }, uSoft: { value: 0 }, uFall: { value: 0 }, uRadScale: { value: 1 },
        uGhost: { value: .45 }, uGain: { value: 1 }, uGlow: { value: .35 }, uBase: { value: .12 }, uShin: { value: new THREE.Vector4(520, 22, 2.8, .5) },
      },
    });
    const solidMat = (defs, mirror) => new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: SOLID_VS, fragmentShader: solidFS(ctx.GLSL.HASH, ctx.GLSL.NOISE), defines: defs, side: THREE.DoubleSide,
      uniforms: { ...shared, ...lightsM, uMirror: { value: mirror ? new M4() : IDENT }, uLit: { value: 1 }, uRim: { value: 1 }, uFall: { value: 0 }, uPlane: { value: new THREE.Vector4(0, 0, 0, 0) } },
    });
    const stringGeo = (() => {
      const g = new THREE.InstancedBufferGeometry(); const pos = new Float32Array((SEG + 1) * 4), idx = [];
      for (let i = 0; i <= SEG; i++) { pos.set([i / SEG, -1, i / SEG, 1], i * 4); if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 2)); g.setIndex(idx);
      const f = (k, n) => { const a = new Float32Array(N * n); strings.forEach((s, i) => a.set(k(s), i * n)); return new THREE.InstancedBufferAttribute(a, n); };
      g.setAttribute('aA0', f(s => s.A0, 3)); g.setAttribute('aB0', f(s => s.B0, 3)); g.setAttribute('aA1', f(s => s.A1, 3)); g.setAttribute('aB1', f(s => s.B1, 3));
      g.setAttribute('aInfo', f(s => [s.r0, s.r1, s.row, 0], 4)); g.setAttribute('aTint', f(s => [s.t0, s.t1], 2));
      g.instanceCount = N; g.boundingSphere = new THREE.Sphere(v3(), 1e3); return g;
    })();

    const world = new THREE.Scene(), dummyCam = new THREE.Camera();
    const add = (geo, mat, order) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = order; world.add(m); return m; };
    const mStrRef = add(stringGeo, stringMat(true), 1), mStr = add(stringGeo, stringMat(false), 3);
    const mLyreRef = add(lyreGeo, solidMat({}, true), 0), mLyre = add(lyreGeo, solidMat({}, false), 0);
    const mFrame = add(frameGeo, solidMat({}, false), 0), mHam = add(hammerGeo, solidMat({ HAMMER: 1 }, false), 0);
    mHam.material.uniforms.uPool = { value: new THREE.Vector4(.03, HAM_Y, 0, 0) };   // the felt is lit in a tighter pool: red stays an accent

    // dust
    const DUSTN = 900;
    const dustGeo = (() => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), 2));
      const a = new Float32Array(DUSTN * 4), r = rng(77); for (let i = 0; i < a.length; i++) a[i] = r();
      g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = DUSTN; g.boundingSphere = new THREE.Sphere(v3(), 1e3); return g;
    })();
    const beamU = { uBo: { value: v3() }, uBd: { value: v3(0, -1, 0) }, uBeam: { value: new THREE.Vector4(.1, .1, 1, 0) } };
    const dustMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: DUST_VS, fragmentShader: DUST_FS, depthTest: true, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      uniforms: { uVP: shared.uVP, uHalf: shared.uHalf, uP11: shared.uP11, ...beamU, uCen: { value: v3() }, uBox: { value: v3(5, 5, 5) }, uT: { value: 0 }, uFocus: { value: 1 }, uAper: { value: .008 }, uAmb: { value: .02 }, uCol: { value: v3(1, .78, .5) } },
    });
    const mDust = add(dustGeo, dustMat, 4);

    // snow shaken off the strings (one instanced draw)
    const puffGeo = (() => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), 2));
      const a = new Float32Array(7 * PUFF_N * 4), r = rng(1857); for (let i = 0; i < a.length; i++) a[i] = r();
      g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = 7 * PUFF_N; g.boundingSphere = new THREE.Sphere(v3(), 1e3); return g;
    })();
    const puffU = {
      uVP: shared.uVP, uHalf: shared.uHalf, uP11: shared.uP11, ...beamU, uFocus: { value: 1 }, uAper: { value: .01 }, uScale: { value: 1 }, uAmb: { value: .5 },
      uDown: { value: v3(0, -1, 0) }, uSide: { value: v3(1, 0, 0) }, uCol: { value: v3(1, .86, .68) },
      uSA: { value: Array.from({ length: 7 }, () => new THREE.Vector4()) }, uSB: { value: Array.from({ length: 7 }, () => new THREE.Vector4(0, 0, 0, -1)) }, uAmt: { value: new Array(7).fill(0) },
    };
    const puffMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: PUFF_VS, fragmentShader: DUST_FS.replace('in float vI, vRpx, vRing;', 'in float vI, vR, vRing;').replace(/vRpx/g, 'vR'), depthTest: true, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, uniforms: puffU,
    });
    const mPuff = add(puffGeo, puffMat, 5);

    // ------------------------------------------------------------ Deda Mraz + snow (src/xmas kit)
    const santa = createSanta(ctx, { light: [-0.55, 0.84], depthTest: false, rim: 2.6, seed: 7 });
    const FR = santa.pose('reach').armTarget(null).motion(0, 0).update(0).fingertip.slice();     // natural fingertip, 'reach'
    const LO = santa.pose('sweep1').update(0).reachLength;                                       // arm length, open hand
    const SH = santa.shoulder.slice();
    santa.pose('stand').motion(1, 1);
    if (ctx.headless && typeof window !== 'undefined') window.__santa = santa, window.__zFG = () => FG, window.__zLB = () => LB, window.__zLA = () => LA, window.__zClear = () => [tClear1, TEXT_AT1, _tb.slice()], window.__zLyre = () => lyre.map(st => +(st.energy + (st.held ? 1 : 0)).toFixed(4));
    const snow = createSnow(ctx, { mode: 'screen', count: 640, size: 2.6, fall: 24, wind: [9, 0, 0], sway: .45, aperture: 1, layers: .75, seed: 1857,
      color: [.03, .034, .045], brightness: 1, shaft: { origin: [0, 0], dir: [.4, .9], radius: 150, color: [1, .62, .3] } });

    const hdr = gfx.target({ depth: true, samples: 4 });
    const bg = gfx.pass(BG_FS, {
      uCam: lightsS.uCam.value, uR: v3(), uU: v3(), uF: v3(), uProj: new THREE.Vector4(), uBo: beamU.uBo.value, uBd: beamU.uBd.value, uBeam: beamU.uBeam.value, uBeamCol: v3(),
      uLk: v3(), uLkc: v3(), uFloor: new THREE.Vector4(0, 1, 0, 0), uFa1: v3(1, 0, 0), uFloorK: v3(0, 1, .3), uAmb: .002, uT: 0,
      uHz: new THREE.Vector4(.5, .5, .2, .3), uHzC: v3(),
    });

    // ------------------------------------------------------------ text
    const ui = ctx.overlay();
    const PAPER = '#f4ead8', DIM = '#b9ab92';
    const h1 = ui.text('zica.b1.h', { size: 160, font: 'display', align: 'center', valign: 'top', color: PAPER, tracking: -.012, leading: 1.04 });
    const p1a = ui.text('Lyra Style', { size: 52, font: 'display', align: 'center', valign: 'top', color: PAPER });                 // the name
    const p1b = ui.text('', { size: 34, font: 'text', align: 'center', valign: 'top', color: DIM, width: 760, leading: 1.32 });      // the quieter descriptor
    const mcache = new Map(); let k3 = 1;
    const measureW = (str, size, font, tracking = 0) => {
      const k = str + '|' + size + '|' + font + '|' + view.cssW + '|' + view.w.toFixed(1); let w = mcache.get(k);
      if (w === undefined) { if (mcache.size > 80) mcache.clear(); w = ui.measure(str, { size, font, tracking }).w; mcache.set(k, w); }
      return w;
    };
    // wrap width that splits a line into balanced rows instead of leaving one word alone
    const balance = (full, maxW) => full <= maxW ? maxW : Math.min(maxW, full / Math.ceil(full / maxW) * 1.3);
    const hint = ui.text('zica.hint', { size: 28, font: 'text', align: 'center', valign: 'middle', color: '#d8a548' });
    const h2 = ui.text('zica.b2.h', { size: 124, font: 'display', align: 'left', valign: 'bottom', color: PAPER, width: 700, leading: 1.04, tracking: -.012 });
    const p2 = ui.text('zica.b2.p', { size: 38, font: 'text', align: 'left', valign: 'top', color: DIM, width: 600, leading: 1.32 });
    const h3 = ui.text('zica.b3.h', { size: 104, font: 'display', align: 'left', valign: 'top', color: PAPER, width: 900, leading: 1.05, tracking: -.012 });
    const p3 = ui.text('zica.b3.p', { size: 36, font: 'text', align: 'left', valign: 'top', color: DIM, width: 720, leading: 1.32 });

    // ------------------------------------------------------------ camera
    const cam = { pos: v3(), right: v3(), up: v3(), fwd: v3(), view: new M4(), proj: new M4(), vp: new M4(), p00: 1, p11: 1, m8: 0, m9: 0, fov: 30 };
    function setCam(pos, tgt, up, fov, sx, sy) {
      const asp = view.w / view.h, t = Math.tan(fov * PI / 360), r = cam.right, u = cam.up, f = cam.fwd;
      cam.pos.copy(pos); f.subVectors(tgt, pos).normalize(); r.crossVectors(f, up).normalize(); u.crossVectors(r, f);
      cam.view.set(r.x, r.y, r.z, -r.dot(pos), u.x, u.y, u.z, -u.dot(pos), -f.x, -f.y, -f.z, f.dot(pos), 0, 0, 0, 1);
      const n = .02, fa = 80; cam.p00 = 1 / (t * asp); cam.p11 = 1 / t; cam.m8 = -sx; cam.m9 = -sy; cam.fov = fov;
      cam.proj.set(cam.p00, 0, cam.m8, 0, 0, cam.p11, cam.m9, 0, 0, 0, -(fa + n) / (fa - n), -2 * fa * n / (fa - n), 0, 0, -1, 0);
      cam.vp.multiplyMatrices(cam.proj, cam.view);
    }
    const _q = new THREE.Vector4();
    const toScreen = P => { _q.set(P.x, P.y, P.z, 1).applyMatrix4(cam.vp); return { x: (_q.x / _q.w * .5 + .5) * view.w, y: (.5 - _q.y / _q.w * .5) * view.h, nx: _q.x / _q.w, w: _q.w }; };
    const _rd = v3();
    function rayPlane(nx, ny) { // pointer -> the plane of the strings (z = 0)
      _rd.copy(cam.fwd).addScaledVector(cam.right, (nx + cam.m8) / cam.p00).addScaledVector(cam.up, (ny + cam.m9) / cam.p11);
      if (Math.abs(_rd.z) < 1e-5) return null; const t = -cam.pos.z / _rd.z; if (t <= 0) return null;
      return { x: cam.pos.x + _rd.x * t, y: cam.pos.y + _rd.y * t, w: t };
    }
    const gp = () => ({ A: v3(), T: v3(), s: .5, q: v3() });
    const mk = () => ({ g0: gp(), g1: gp(), pos: v3(), tgt: v3(), up: v3(), fov: 30, sx: 0, sy: 0, dist: 1, lk: v3(), lc: v3(), bo: v3(), bd: v3(), sig: .1, spread: .1, bI: 1, mk: v3(), mc: v3() });
    const PA = mk(), PB = mk(), PC = mk(), PX = mk();
    const mixPose = (o, a, b, t) => {
      o.pos.lerpVectors(a.pos, b.pos, t); o.tgt.lerpVectors(a.tgt, b.tgt, t); o.up.lerpVectors(a.up, b.up, t).normalize();
      o.lk.lerpVectors(a.lk, b.lk, t); o.lc.lerpVectors(a.lc, b.lc, t); o.bo.lerpVectors(a.bo, b.bo, t); o.bd.lerpVectors(a.bd, b.bd, t).normalize();
      o.mk.lerpVectors(a.mk, b.mk, t); o.mc.lerpVectors(a.mc, b.mc, t);
      for (const g of ['g0', 'g1']) { o[g].A.lerpVectors(a[g].A, b[g].A, t); o[g].T.lerpVectors(a[g].T, b[g].T, t).normalize(); o[g].q.lerpVectors(a[g].q, b[g].q, t); o[g].s = lerp(a[g].s, b[g].s, t); }
      for (const k of ['fov', 'sx', 'sy', 'dist', 'sig', 'spread', 'bI']) o[k] = lerp(a[k], b[k], t);
    };
    // where must a light sit for a straight string A + T*s to glint at s = sStar? (a cylinder mirrors about its own axis)
    const _a = v3(), _b = v3();
    function glintLight(out, A, T, sStar, q, camPos) {
      _a.subVectors(camPos, A); const sC = _a.dot(T); _b.copy(_a).addScaledVector(T, -sC); const dC = _b.length(), dL = q.length();
      const sL = (sStar * (dL + dC) - sC * dL) / dC;
      return out.copy(A).addScaledVector(T, sL).add(q);
    }
    const YUP = v3(0, 1, 0), lyC = v3(0, .37, 0);
    const G0 = A0.clone().addScaledVector(T0, hero.len * .69);
    let poseKey = '';
    function buildPoses() {
      const key = view.w + '|' + view.h + '|' + view.portrait + '|' + view.safeTop;    // the poses depend on the view only
      if (key === poseKey) return; poseKey = key;
      const asp = view.w / view.h, port = view.portrait;
      // A: one string, across the full width
      const tA = Math.tan(15 * PI / 180), D0 = .47 * hero.len / (tA * asp), phi = .2;
      PA.pos.copy(Cs).addScaledVector(Z, Math.cos(phi) * D0).addScaledVector(U0, Math.sin(phi) * D0); PA.tgt.copy(Cs); PA.up.copy(U0);
      PA.fov = 30; PA.sx = 0; PA.sy = port ? -.26 : -.25 - .12 * clamp(((view.safeTop || 110) - 110) / 70); PA.dist = D0;
      PA.g0.A.copy(A0); PA.g0.T.copy(T0); PA.g0.s = hero.len * .69; PA.g0.q.copy(U0).multiplyScalar(.75).addScaledVector(Z, -.6);
      PA.g1.A.copy(A0); PA.g1.T.copy(T0); PA.g1.s = hero.len * .2; PA.g1.q.copy(U0).multiplyScalar(.5).addScaledVector(Z, .9);
      PA.bd.copy(U0).multiplyScalar(-1).addScaledVector(T0, port ? -.62 : -.9).addScaledVector(Z, .4).normalize(); PA.bo.copy(G0).addScaledVector(PA.bd, -1.7);
      PA.sig = .03; PA.spread = .034; PA.bI = 2.3;
      PA.mk.set(0, 0, 3); PA.mc.set(0, 0, 3);
      // B: the lyre
      const sTop = view.safeTop || 110, Hh = view.h;
      const tB = Math.tan(13 * PI / 180), fracH = port ? .56 : Math.min(.72, (Hh - sTop - 150) / Hh), fracW = port ? .68 : .5;
      const D1 = Math.max(1.64 / fracH / (2 * tB), .94 / fracW / (2 * tB * asp)), yaw = port ? -.1 : -.2, pit = -.05;
      PB.pos.set(Math.sin(yaw) * Math.cos(pit), Math.sin(pit), Math.cos(yaw) * Math.cos(pit)).multiplyScalar(D1).add(lyC); PB.tgt.copy(lyC); PB.up.copy(YUP);
      PB.fov = 26; PB.sx = port ? 0 : clamp(.34 - (asp - 1.6) * .06, .2, .36); PB.sy = port ? -.2 : 1 - 2 * Math.max(.465, (sTop + 16) / Hh + fracH * .5); PB.dist = D1;
      const mid = lyre[3], Am = v3(...mid.A0), Tm = v3(mid.T[0], mid.T[1], 0);
      PB.g0.A.copy(Am); PB.g0.T.copy(Tm); PB.g0.s = .74; PB.g0.q.set(.55, 0, 1.5); PB.g1.A.copy(Am); PB.g1.T.copy(Tm); PB.g1.s = .27; PB.g1.q.set(-.9, 0, 1.1);
      PB.bd.set(-.52, -1, .5).normalize(); PB.bo.set(.08, .78, 0).addScaledVector(PB.bd, -2.6); PB.sig = .1; PB.spread = .09; PB.bI = 2.;
      PB.mk.set(1.9, 1.5, -1.5); PB.mc.set(-1.7, .9, 2.4);
      // C: inside the grand
      const k = port ? 1.5 : 1, hc = .2 * k, yc = -.68 * k, xc = .03;
      PC.pos.set(xc, yc, hc); PC.tgt.set(xc, yc + 1, hc); PC.up.copy(Z); PC.fov = port ? 46 : 40; PC.sx = 0; PC.sy = port ? .06 : .07; PC.dist = .6;
      const Ap = v3(0, 0, 0);
      PC.g0.A.copy(Ap); PC.g0.T.copy(YUP); PC.g0.s = .7; PC.g0.q.set(.7, 0, .8); PC.g1.A.copy(Ap); PC.g1.T.copy(YUP); PC.g1.s = .2; PC.g1.q.set(-.9, 0, .55);
      glintLight(PC.lk, Ap, YUP, .7, PC.g0.q, PC.pos);
      PC.bd.set(-.24, -.6, -.75).normalize(); PC.bo.set(.1, .5, 0).addScaledVector(PC.bd, -2.4); PC.sig = .09; PC.spread = .1; PC.bI = .85;
      PC.mk.copy(PC.lk); PC.mc.set(-1.0, -.7, .9);
    }

    // ------------------------------------------------------------ excitation (the one integrator)
    let touched = false, hintA = 0, now = 0, shimT = 0, lastNote = -1, lastStrike = -9, motion = 1, kMorph = 0, k1cam = 0;
    const finger = { has: false, down: false, grab: false, x: 0, y: 0, pend: null, sx: 0, sy: 0, st: 0 };
    const hamT = new Float32Array(88).fill(-99), hamV = new Float32Array(88), pending = [];
    const cueT = {};
    const cue = (key, t, at, s, fn) => { const p = cueT[key]; cueT[key] = t; if (p !== undefined && p < at && t >= at && s.dt > 0 && t - p < .5) fn(); };
    let reactT = -99, auto = false;                           // the visitor's last pluck (Deda Mraz glances at it)
    function resetAll() {
      for (const st of strings) { st.a.fill(0); st.pull = st.pullT = 0; st.held = st.live = false; st.santa = false; st.energy = 0; st.glow = 0; st.phase = 0; }
      hamT.fill(-99); pending.length = 0; finger.has = finger.down = false; finger.pend = null; lastNote = -1; lastStrike = -9; shimT = 0; reactT = -99;
      for (const k in cueT) delete cueT[k];
    }
    function excite(st, amp, x0) { // release from a triangle of height amp at x0: mode n gets 2A sin(n pi x0) / (n^2 pi^2 x0 (1 - x0))
      const k = 2 * amp / (PI * PI * x0 * (1 - x0));
      for (let n = 1; n <= MODES; n++) st.a[n - 1] = k * Math.sin(n * PI * x0) / (n * n);
      st.phase = 0; st.live = true; st.energy = Math.abs(amp);
    }
    function shimmer(st, amp) { if (st.held || st.energy > amp) return; st.a.fill(0); st.a[0] = amp * .8; st.a[1] = amp * .35; st.a[2] = amp * .12; st.phase = rand() * 6.28; st.live = true; st.energy = amp; }
    const _p = v3();
    function pluck(st, amp, x0, sound = true, gainMul = 1) {
      x0 = clamp(x0, .05, .95); excite(st, amp, x0); st.pull = st.pullT = 0; st.held = false; st.santa = false; if (!auto) reactT = now; st.glow = Math.max(st.glow, .3 * Math.min(1, Math.abs(amp) / .05));
      const i = st.li;
      if (lyre[i - 1]) shimmer(lyre[i - 1], Math.abs(amp) * .07); if (lyre[i + 1]) shimmer(lyre[i + 1], Math.abs(amp) * .07);
      if (i === 0) shimmer(lyre[6], Math.abs(amp) * .11); if (i === 6) shimmer(lyre[0], Math.abs(amp) * .09);
      if (sound) {
        _p.set(st.A0[0] + st.T[0] * st.len * x0, st.A0[1] + st.T[1] * st.len * x0, 0); const sc = toScreen(_p);
        const g = Math.pow(clamp(Math.abs(amp) / .06), .75);
        ctx.audio.pluck(st.hz, { gain: (.12 + .8 * g) * gainMul, pan: clamp(sc.nx * .8, -.9, .9), bright: clamp(.18 + .82 * (1 - Math.sin(PI * x0)), 0, 1), body: 'lyre', tag: 'zica' + i });
      }
    }
    function strike(n, vel) { if (n < 0 || n > 87) return; hamT[n] = now; hamV[n] = vel; pending.push({ n, t: now + .07, vel }); }
    function landStrike(h) {
      const n = h.n, L = noteLen(n);
      for (const st of byNote[n]) { excite(st, (.0016 + .0042 * h.vel) * (.85 + .3 * rand()), clamp(HAM_Y / L, .05, .3)); st.phase = rand() * .6; st.glow = Math.max(st.glow, .5 + .9 * h.vel); }
      for (const d of [-12, -1, 1, 7, 12]) if (byNote[n + d]) for (const st of byNote[n + d]) shimmer(st, (.0005 + .0009 * h.vel) * (Math.abs(d) === 1 ? .6 : 1));
      ctx.audio.key(noteHz(n), { gain: .16 + .5 * h.vel, pan: clamp((noteX(n) - .03) * 2.2, -.8, .8), dur: 2.6 });
    }
    function stepStrings(dt) {
      for (const st of strings) {
        if (st.held) { st.pull = damp(st.pull, st.pullT, 48, dt); if (st.live) { let e = 0; for (let m = 0; m < MODES; m++) { st.a[m] *= Math.exp(-dt * 28); e += Math.abs(st.a[m]); } if (e < 1e-6) { st.a.fill(0); st.live = false; } st.energy = e; } }
        else if (st.live) {
          let e = 0; for (let m = 0; m < MODES; m++) { st.a[m] *= Math.exp(-dt * st.rate[m]); e += Math.abs(st.a[m]); }
          st.energy = e; st.phase += dt * 2 * PI * st.fvis * (motion < 1 ? 0 : 1);
          if (e < 2e-5) { st.a.fill(0); st.live = false; st.energy = 0; }
        }
        if (st.glow > 0) st.glow = Math.max(0, st.glow - dt * (st.glow * 1.6 + .05));
      }
    }
    // string state -> the data texture; uploaded only when something changed (a still string field costs nothing)
    let dataN = 0;
    const put = (o, v) => { if (data[o] !== v) { data[o] = v; dataN++; } };
    function writeData() {
      dataN = 0;
      for (const st of strings) {
        const o = st.row * TW * 4;
        if (st.live || st.held || data[o + 15] !== 0) for (let m = 0; m < MODES; m++) put(o + m, Math.fround(st.a[m]));
        put(o + 12, Math.fround(st.pull)); put(o + 13, Math.fround(st.x0)); put(o + 14, Math.fround(st.phase)); put(o + 15, Math.fround(st.live ? Math.max(st.energy, 1e-6) : 0));
        put(o + 16, Math.fround(st.rev)); put(o + 17, st.revDir); put(o + 18, Math.fround(st.glow)); put(o + 19, Math.fround(st.gain));
      }
      if (dataN) dataTex.needsUpdate = true;
    }

    // ------------------------------------------------------------ playing
    const playable = st => st.rev > .97 && kMorph < .01;
    const limit = (st, x0, sign) => { const base = (st === hero && sign < 0) ? lerp(HF - .009, .056, k1cam) : (st === hero ? .064 : .056); return base * (.5 + .5 * Math.sqrt(Math.sin(PI * clamp(x0, .04, .96)))); };
    const rel = (st, p) => { const rx = p.x - st.A0[0], ry = p.y - st.A0[1]; return [(rx * st.T[0] + ry * st.T[1]) / st.len, rx * st.D[0] + ry * st.D[1]]; };
    function releaseAll() { let any = false; for (const st of lyre) if (st.held && !st.santa) { const a = Math.abs(st.pull) < .006 ? .011 * (st.pull < 0 ? -1 : 1) : st.pull; pluck(st, a, st.x0); any = true; } return any; }
    // hold string st at the plane point p (the finger has it)
    function grabAt(st, p) { const [u, d] = rel(st, p); st.held = true; st.x0 = clamp(u, .05, .95); st.pullT = d; touched = true; finger.grab = true; finger.pend = null; }
    function lyrePointer(e, beat) {
      if (e.type === 'leave') { finger.has = false; finger.pend = null; return false; }
      const p = rayPlane(e.nx, e.ny);
      if (!p) { finger.has = false; finger.pend = null; return releaseAll(); }
      const touch = e.pointerType !== 'mouse';
      const wpu = p.w / (cam.p11 * view.h / 2), grab = (touch ? 30 : 40) * wpu;
      let used = false;
      if (e.type === 'down') {
        finger.down = true; finger.grab = false; finger.pend = null; let best = null, bd = grab;
        for (const st of lyre) { if (!playable(st) || st.santa) continue; const [u, d] = rel(st, p); if (u > .02 && u < .98 && Math.abs(d) < bd) { bd = Math.abs(d); best = st; } }
        if (best) {
          // mouse, and the single string of beat 0 (a horizontal string pulled up or down, as the hint invites): a press
          // on a string holds it at once. The lyre by touch: never claim the press, so a swipe always turns the page;
          // the string is taken only once the finger's first move is mostly sideways (across the strings), or after
          // a press held still on it.
          if (!touch || beat === 0) { grabAt(best, p); used = true; }
          else { finger.pend = best; finger.sx = e.x; finger.sy = e.y; finger.st = performance.now(); }
        }
      } else if (e.type === 'move') {
        if (finger.pend && finger.down) {
          const k = (view.cssW || view.w) / view.w, dx = (e.x - finger.sx) * k, dy = (e.y - finger.sy) * k, dist = Math.hypot(dx, dy);   // CSS px
          if (dist > 10) { if (Math.abs(dx) > 1.5 * Math.abs(dy)) grabAt(finger.pend, p); else finger.pend = null; }      // sideways: play; else: a swipe
          else if (dist < 6 && performance.now() - finger.st > 280) grabAt(finger.pend, p);                             // a press held still
        }
        for (const st of lyre) {
          if (!playable(st) || st.santa) continue; const [u, d] = rel(st, p);
          if (st.held) {
            const x0 = clamp(u, .05, .95), lim = limit(st, x0, d < 0 ? -1 : 1); st.x0 = x0; used = true;
            if (Math.abs(d) > lim * 1.04 || u < 0 || u > 1) { st.pull = damp(st.pull, Math.sign(d) * lim, 400, .02); pluck(st, st.pull, x0); }
            else st.pullT = d;
          } else if (finger.has) {
            const [u1, d1] = rel(st, finger); const um = (u + u1) * .5;
            if (d1 * d < 0 && um > .02 && um < .98) {
              touched = true;
              if (finger.down && finger.grab) { st.held = true; st.x0 = clamp(u, .05, .95); st.pull = 0; st.pullT = d; used = true; }
              else pluck(st, clamp(.004 + .5 * Math.abs(d - d1), .005, .015) * Math.sign(d), um);
            }
          }
        }
      } else if (e.type === 'up') { finger.down = false; finger.grab = false; finger.pend = null; releaseAll(); }
      finger.has = true; finger.x = p.x; finger.y = p.y;
      return used;
    }
    function pianoPointer(e, s) {
      if (e.type === 'leave' || e.type === 'up' || s.at(2) < 3.2) { if (e.type !== 'move') lastNote = -1; return false; }
      const p = rayPlane(e.nx, e.ny); if (!p || p.w > 6) return false;
      const n = Math.round(p.x / NW + 34); if (n < 0 || n > 87 || p.y < -.12 || p.y > noteLen(n) + .25) return false;
      // the field is all strings: a touch plays but is never consumed, so a swipe still turns the page
      if (e.type === 'down') { strike(n, .8); lastNote = n; lastStrike = now; touched = true; return e.pointerType === 'mouse'; }
      if (n !== lastNote && now - lastStrike > .075) { strike(n, .3); lastNote = n; lastStrike = now; }
      return false;
    }

    // ------------------------------------------------------------ per-frame
    const grade = { exposure: 1, bloom: .9, threshold: 1.25, knee: .6, radius: 1.1, tone: 'aces', contrast: 1.06, saturation: 1.02, vignette: .35, grain: .03, halation: .3, lift: [0, 0, 0], gain: [1, .985, .96], fade: 1 };
    const mir = new M4(), _n = v3(), _c = v3(), _upv = v3();
    const setMirror = (n, d) => { mir.set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x, -2 * n.x * n.y, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y, -2 * n.x * n.z, -2 * n.y * n.z, 1 - 2 * n.z * n.z, 2 * d * n.z, 0, 0, 0, 1); };
    // Jingle Bells (Pierpont, 1857), opening phrase in D major: (quarter-note offset, piano key index, A0 = 0)
    const JB = [[0, 45], [1, 45], [2, 45], [4, 45], [5, 45], [6, 45], [8, 45], [9, 48], [10, 41], [11.5, 43], [12, 45]], JQ = .3, JT0 = 4.4;
    const JARP = [29, 33, 36, 41, 45, 48, 53], JEND = JT0 + 12 * JQ;          // then a soft D-major arpeggio

    // ------------------------------------------------------------ Deda Mraz: choreography (pure functions of the beat clock)
    // The rig (src/xmas/santa.js) takes a performance function: params for any time. Everything he does is keyed to
    // the beat clock: anticipation before each action, arcs and eases, overshoot and settle after; the springs of the
    // rig (beard, cap, bobble, coat hem) are re-simulated from it, so deep links and backward jumps are exact.
    const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
    const win = (x, a, b, c, d) => sm((x - a) / (b - a)) * (1 - sm((x - c) / (d - c)));      // up over a..b, down over c..d
    const ring = (t, w, z) => t <= 0 ? 0 : Math.exp(-z * t) * Math.sin(w * t);                // a damped oscillation keyed at t = 0
    let SX0 = .67;                                                             // where he plucks the first string (its left third on screen; further in on a phone)
    const tPl = n => n <= 0 ? 1.6 : 1.6 + 7 * n + .7 * Math.sin(n * 2.1 + .5);   // beat 0: plucks, then every ~6-8 s
    const tGl = k => k <= 0 ? 4.0 : 4.0 + 8 * k + .6 * Math.sin(k * 1.9 + .3);   // beat 1: glissandi
    const glDur = k => k <= 0 ? 1.0 : 1.45;
    // the glissando: the fingertip runs one continuous arc, accelerating all the way (u' = .25 -> 1.75), then glides
    // on past the last string and slows (follow-through). glX inverts it, so each string sounds as the finger crosses it.
    const glU = x => x <= 0 ? .25 * x : x <= 1 ? .25 * x + .75 * x * x : 1 + .2 * (1 - Math.exp(-8.75 * (x - 1)));
    const glX = u => (-.25 + Math.sqrt(.0625 + 3 * u)) / 1.5;
    // beat 1: the walk to the lyre. He sets off at once (a brisk start, a long gentle arrival: the pace peaks early, so
    // he is out of the words' way soon); walkK = covered fraction, walkV = its rate (1/s), walkT = the inverse.
    const W0 = .08, W1 = 2.5, WP = .75;
    const walkK = t => { const x = clamp((t - W0) / (W1 - W0)); return .5 - .5 * Math.cos(PI * Math.pow(x, WP)); };
    const walkV = t => { const x = (t - W0) / (W1 - W0); return x <= 0 || x >= 1 ? 0 : .5 * PI * Math.sin(PI * Math.pow(x, WP)) * WP * Math.pow(x, WP - 1) / (W1 - W0); };
    const walkT = k => W0 + (W1 - W0) * Math.pow(Math.acos(1 - 2 * clamp(k)) / PI, 1 / WP);
    // beat 1: the words wait until his figure is clear of them. The figure's box (design units) is linear in the walk
    // fraction k (he moves from LA to LB); the text box is the union of h2 and p2. Returns the beat time after which
    // the two never meet again (0 when they never meet).
    const tbox = (T, al, va, o) => {
      const w = T.width || 0, h = T.height || 0, x0 = al === 'center' ? T.x - w / 2 : T.x, y0 = va === 'bottom' ? T.y - h : T.y;
      o[0] = Math.min(o[0], x0); o[1] = Math.min(o[1], y0); o[2] = Math.max(o[2], x0 + w); o[3] = Math.max(o[3], y0 + h); return o;
    };
    const _tb = [0, 0, 0, 0];
    function textClear(a, b, k0) {
      _tb[0] = _tb[1] = 1e9; _tb[2] = _tb[3] = -1e9;
      tbox(h2, view.portrait ? 'center' : 'left', view.portrait ? 'top' : 'bottom', _tb); tbox(p2, view.portrait ? 'center' : 'left', 'top', _tb);
      if (!(h2.width > 0)) return 1.2;
      const M = 18;
      for (let i = 64; i >= 0; i--) {
        const k = Math.max(k0, i / 64), x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k), h = lerp(a.h, b.h, k);
        const fx0 = x - .2 * h, fx1 = x + .23 * h, fy0 = y - 1.05 * h;
        if (fx1 > _tb[0] - M && fx0 < _tb[2] + M && y > _tb[1] - M && fy0 < _tb[3] + M) return k >= 1 ? W1 : walkT(Math.min(1, (i + 1) / 64));
        if (k <= k0) break;
      }
      return 0;
    }
    let tClear1 = 1.2;
    const LA = { x: 0, y: 0, h: 1 }, LB = { x: 0, y: 0, h: 1, R: 1, R1: 1, T: 0, th0: 0, th1: 0, ps: [0, 0], pe: [0, 0], s0: [0, 0], si: new Float32Array(7), ui: new Float32Array(7) };
    const _s = v3(), _t = v3();
    const heroPt = (x0, pull, out) => out.set(hero.A0[0] + hero.T[0] * hero.len * x0 + hero.D[0] * pull, hero.A0[1] + hero.T[1] * hero.len * x0 + hero.D[1] * pull, 0);
    const lyrePt = (st, u, out) => out.set(st.A0[0] + st.T[0] * st.len * u, st.A0[1] + st.T[1] * st.len * u, 0);
    // beat 0: he stands in the shaft; his natural 'reach' fingertip lands on the string's rest point
    function layoutA() {
      const W = view.w, H = view.h;
      const h = view.portrait ? Math.min(H * .25, W * .56) : Math.min(H * .62, W * .4);
      SX0 = .67;
      if (view.portrait) {      // a phone: he plucks further along the string, so the whole figure (back, bobble) is in frame
        const want = Math.max(view.safeSide || 90, 70) * .55 + (FR[0] + 24) * h / 100;
        let a = .55, b = .9, xa = toScreen(heroPt(a, 0, _s)).x, xb = toScreen(heroPt(b, 0, _s)).x;
        for (let i = 0; i < 3 && Math.abs(xb - xa) > 1e-3; i++) { const nb = clamp(b + (want - xb) * (b - a) / (xb - xa), .5, .9); a = b; xa = xb; b = nb; xb = toScreen(heroPt(b, 0, _s)).x; }
        SX0 = clamp(b, .5, .9);
      }
      const c = toScreen(heroPt(SX0, 0, _s));
      LA.h = h; LA.x = c.x - FR[0] * h / 100; LA.y = c.y + (100 - FR[1]) * h / 100;
    }
    // beat 1: the glissando. He stands in front of the lyre (nearer the camera than its floor, so he may stand lower on
    // screen and larger), his arm raised high with the hand on the first string; the fingertip then swings down and
    // forward about his shoulder while he lunges in (a step, his weight, a lean), crossing all seven strings. The path is
    // built from that body plan, so the hand can really get there; the plucks are timed where it crosses each string.
    // A0D: the hand's start angle about the shoulder. Fairly open (not overhead), so he stands well left of the lyre: his
    // back and coat against the haze and the dark, only the hand over the strings; the lunge carries him in for the sweep.
    // Where that would put his back out of the frame (or into the words), the arm is raised step by step toward -70 deg.
    const A0DS = [-54, -58, -62, -66, -70].map(d => d * PI / 180), KR = .93;
    const arcPt = (u, o) => {               // design units: shoulder (travelling in) + radius at the swing angle
      const w = clamp(u), th = LB.th0 + (LB.th1 - LB.th0) * u, r = LB.R + (LB.R1 - LB.R) * w;
      o[0] = LB.s0[0] + LB.T * w + r * Math.cos(th); o[1] = LB.s0[1] + r * Math.sin(th); return o;
    };
    const _ap = [0, 0];
    function layoutB() {
      const fl = toScreen(_s.set(-.5, -.41, .12)).y, Hh = view.h;
      const txR = view.portrait ? -1e9 : Math.max(h2.x + (h2.width || 0), p2.x + (p2.width || 0)) + 30;
      const kR = KR * LO / 100, margin = (view.safeSide || 90) * .45;
      let A0D = A0DS[0], cA = 1, sA = 0;
      for (const ang of A0DS) {
        A0D = ang; cA = Math.cos(ang); sA = Math.sin(ang);
        const foot = -kR * sA + (100 - SH[1]) / 100;
        let clear = false;
        for (const u0 of [.6, .54, .48, .42, .36]) {
          const a = toScreen(lyrePt(lyre[0], u0, _s)), b = toScreen(lyrePt(lyre[6], u0 - .22, _t));
          const ex = b.x - a.x, ey = b.y - a.y;
          LB.ps[0] = a.x - ex * .08; LB.ps[1] = a.y - ey * .08; LB.pe[0] = b.x + ex * .05; LB.pe[1] = b.y + ey * .05;
          // big enough that the sweep is a lunge, not a run (span ~ 74 figure units); never smaller than standing on the floor;
          // his feet stay (about) in the frame
          const span = Math.hypot(LB.pe[0] - LB.ps[0], LB.pe[1] - LB.ps[1]);
          const hF = Math.max(40, (fl - LB.ps[1]) / foot), hMax = (Hh * 1.03 - LB.ps[1]) / foot;
          const h = Math.max(hF, Math.min(span * 100 / 74, hMax));
          LB.h = h; LB.R = kR * h;
          if (LB.ps[0] - (kR * cA + (SH[0] + 34) / 100) * h >= txR) { clear = true; break; }
        }
        // his back (the coat, about 17 figure units behind the feet) stays inside the frame
        if (clear && LB.ps[0] - (kR * cA + (SH[0] + 17) / 100) * LB.h >= margin) break;
      }
      const h = LB.h, R = LB.R;
      LB.s0[0] = LB.ps[0] - R * cA; LB.s0[1] = LB.ps[1] - R * sA;
      // the body travels in by T (design units) so that the end of the sweep is within the same radius
      const dx = LB.pe[0] - LB.s0[0], dy = LB.pe[1] - LB.s0[1];
      LB.T = Math.max(0, dx - Math.sqrt(Math.max(0, R * R - dy * dy)) * .98);
      LB.th0 = A0D; LB.th1 = Math.atan2(dy, dx - LB.T); LB.R1 = Math.hypot(dx - LB.T, dy);
      for (let i = 0; i < 7; i++) {        // where the path crosses string i (first sign change of the side), and how far along the string
        const p0 = toScreen(lyrePt(lyre[i], 0, _s)), p1 = toScreen(lyrePt(lyre[i], 1, _t));
        const Fx = p1.x - p0.x, Fy = p1.y - p0.y, Fl = Math.hypot(Fx, Fy) || 1;
        const side = u => { arcPt(u, _ap); return (Fx * (_ap[1] - p0.y) - Fy * (_ap[0] - p0.x)) / Fl; };
        let sa = side(-.3), uc = 1.3;
        for (let u = -.29; u <= 1.3; u += .01) { const sb = side(u); if (sa * sb <= 0) { uc = u - .01 + .01 * sa / (sa - sb || 1e-6); break; } sa = sb; }
        arcPt(uc, _ap); LB.si[i] = uc; LB.ui[i] = clamp(((_ap[0] - p0.x) * Fx + (_ap[1] - p0.y) * Fy) / (Fl * Fl), .05, .95);
      }
      LB.x = LB.s0[0] - SH[0] * h / 100; LB.y = LB.s0[1] + (100 - SH[1]) * h / 100;       // at rest: in front of the lyre
    }
    const puffAge = new Float32Array(7), puffUc = new Float32Array(7), puffAmt = new Float32Array(7);
    const _lb = { x: 0, y: 0, h: 1 }, LAc = { x: 0, y: 0, h: 1, sx0: .67 }, LBc = { x: 0, y: 0, h: 1, tc: 1.2 }; let fixKey = '';
    const sv = { x: 0, y: 0, h: 1, op: 0, rim: 2.6, lx: -.55, ly: .84, blur: 0 };
    // figure-unit targets for this frame (constant over the springs' 2 s window)
    const FG = { gs: [0, 0], g: [0, 0], ps: [0, 0], arc: u => [0, 0], D: 0, stride: 18, step: 0, walk: false, mot: 1, react: -99, b: 0, pullPt: null };
    const SP = {}, PA_ = {};
    const fig = (x, y) => santa.toFigure(x, y);
    const arcFig = u => { arcPt(u, _ap); return fig(_ap[0], _ap[1]); };
    // ---- beat 0: the pluck. tau = time from the pluck (the release).
    function perf0(t, full) {
      let n = 0; while (n < 400 && tPl(n + 1) - 1.5 <= t) n++;
      const tau = t - tPl(n), first = n === 0, amp = first ? .02 : .011;
      const fR = sm((tau + 1.12) / .62), pk = sm((tau + .42) / .4), fb = sm((tau - .5) / 1.35);
      if (tau < -.42) mixParams(SP, POSES.stand, POSES.reach, fR);
      else if (tau < .1) mixParams(SP, POSES.reach, POSES.pluck, pk);
      else mixParams(SP, POSES.pluck, POSES.stand, fb);
      // the finger leads the arm out (it straightens early) and lags it home (it relaxes late)
      if (tau < -.42) { const hf = sm((tau + 1.25) / .45); for (const k of ['i1', 'i2', 'f1', 'f2', 'th']) SP[k] = lerp(POSES.stand[k], POSES.reach[k], hf); }
      else if (tau > .1) { const hf = sm((tau - .75) / 1.2); for (const k of ['i1', 'i2', 'f1', 'f2', 'th']) SP[k] = lerp(POSES.pluck[k], POSES.stand[k], hf); }
      // the arm comes home with a little overshoot and settles against the belly
      SP.a1 += .07 * ring(tau - 1.65, 8, 4) - .03 * win(tau, -1.2, -1, -.95, -.75);
      // body: a small gather (back) before he reaches, the weight comes forward with the reach, he braces against the
      // pull, recoils at the release and settles; the head tips to listen
      SP.lean += -.014 * win(tau, -1.55, -1.3, -1.25, -1.0) - .014 * pk * (1 - sm(tau / .06)) + .02 * ring(tau, 10, 4.2);
      SP.shiftX = 1.6 * win(tau, -1.25, -.55, .5, 2.0) - .5 * win(tau, -1.55, -1.3, -1.25, -1.0);
      SP.bend = .03 * win(tau, -1.1, -.5, .5, 1.9);
      SP.head = .08 * win(tau, .05, .35, 1.2, 2.2) + .03 * ring(tau, 9, 5);
      // eyes first: he looks at the string before the hand moves, follows the ringing along it, then half-watches it
      SP.gazeX = FG.gs[0] + 22 * win(tau, .1, .7, 1.3, 2.6); SP.gazeY = FG.gs[1];
      SP.gazeW = .45 + .55 * win(tau, -1.85, -1.15, 1.6, 2.9);
      if (FG.react > -50) { const x = t - FG.react; if (x > 0 && x < 4) SP.lean += .03 * (1 - Math.exp(-x * 5)) * Math.exp(-x * 1.2); }
      SP.idle = 1; SP.travelX = 0;
      if (!full) return SP;
      // the fingertip: comes up under the string and settles onto it, hooks and pulls it, then flicks through
      if (tau < 0) {
        SP.tw = sm((tau + .85) / .42);
        const up = 3.2 * (1 - sm((tau + .78) / .36)) - .6 * ring(tau + .42, 14, 9);
        const pt = toScreen(heroPt(SX0, amp * pk, _s)), g = fig(pt.x, pt.y);
        SP.tx = g[0] - .5 * up; SP.ty = g[1] + up;                  // from just below: the finger hooks under it
      } else {
        const ft = sm(tau / .3);
        SP.tw = 1 - sm((tau - .25) / .85);
        // the finger slips off the string at the release point and flicks on a little (follow-through), then relaxes
        const pt = toScreen(heroPt(SX0, amp, _s)), g = fig(pt.x, pt.y);
        SP.tx = g[0] + 1.6 * ft + 1.2 * ring(tau, 7, 5); SP.ty = g[1] - 3.2 * ft * (1 - .45 * sm((tau - .3) / .5));
      }
      return SP;
    }
    // ---- beat 1: walk to the lyre, then the glissandi. t: seconds into beat 1.
    function perf1(t, full) {
      mixParams(SP, POSES.stand, POSES.stand, 0);
      // the walk: a gather, whole strides at an eased pace (slow in, slow out), an overshoot in the settle
      const wk = walkK(t), d = FG.D * wk, x = clamp((t - W0) / (W1 - W0)), v = FG.D * walkV(t);
      if (FG.walk) { SP.walkD = d; SP.walkS = FG.stride; SP.walkW = 1; SP.walkV = v; SP.travelX = d; }
      const go = Math.sin(PI * Math.pow(x, WP)) * (x > 0 && x < 1 ? 1 : 0);
      SP.lean += .045 * go - .016 * win(t, -.1, .04, .06, .22) + .022 * ring(t - W1, 6.5, 3.2);
      SP.bend = .02 * go; SP.head = -.04 * go;
      // the near hand leaves the belly and swings a little with the stride, opposite the far arm
      const sw = go * Math.min(1, v / 26);
      if (FG.walk) { const ph = (.5 + d / (2 * FG.stride)) * PI * 2; SP.a1 += -.25 * sw * Math.sin(ph + .3) - .12 * sw; SP.a2 += .25 * sw; }
      SP.gazeX = FG.ps[0]; SP.gazeY = FG.ps[1]; SP.gazeW = .5 * sm((t - 2.2) / 1.2);
      // the glissandi
      let k = -1; if (FG.mot && t >= tGl(0) - 1.2) { k = 0; while (k < 400 && tGl(k + 1) - 1.2 <= t) k++; }
      if (k >= 0) {
        const tg = tGl(k), dur = glDur(k), tau = t - tg, xx = tau / dur, step = FG.step;
        const fA = sm((tau + 1.05) / .7), fB = sm((tau - dur - .25) / 1.3);
        if (tau < dur) mixParams(PA_, POSES.stand, POSES.sweep0, fA); else mixParams(PA_, POSES.sweep2, POSES.stand, fB);
        for (const kk of ['a1', 'a2', 'wr', 'th', 'i1', 'i2', 'f1', 'f2']) SP[kk] = PA_[kk];
        // the lunge: the near foot steps in as the hand comes down onto the strings, the hips follow it, he leans the rest
        // of the way; after the follow-through he steps back to where he stood
        if (step > 0) {
          const sIn = clamp((tau + .12) / .5), sOut = clamp((tau - dur - .95) / .5);
          const o = step * (sm(sIn) - sm(sOut)), lift = 2.4 * (Math.sin(PI * sIn) + Math.sin(PI * sOut));
          SP.nX += o; SP.nL = lift; SP.nA = .25 * Math.sin(PI * sIn) * (sIn < .5 ? 1 : -.6) + .25 * Math.sin(PI * sOut) * (sOut < .5 ? 1 : -.6);
          SP.shiftX += o * .5 * (sm((tau + .05) / (dur * .8)) - sm((tau - dur - .95) / .6));
        }
        // wind-up (back), then he leans into the swing and lets it carry him; a settle at the end
        const sg = xx > 0 ? clamp(glU(Math.min(xx, 1))) : 0, rest = clamp((FG.T - step * .5) / 75, 0, .12);
        SP.lean += -.018 * win(tau, -.9, -.45, -.25, .05) + rest * sg * (1 - sm((tau - dur - .5) / 1.4)) + .015 * ring(tau - dur - .3, 7, 3.5);
        SP.bend += .06 * sg * (1 - sm((tau - dur - .4) / 1.5));
        SP.head += .05 * win(tau, -.2, .3, 1.4, 2.4);
        // head leads the hand: on the start before the arm moves, ahead of the fingertip through the sweep
        const ga = FG.arc(Math.min(1.1, (xx > 0 ? glU(Math.min(xx, 1.3)) : 0) + .22 * sm((tau + .2) / .3)));
        SP.gazeX = ga[0]; SP.gazeY = ga[1]; SP.gazeW = Math.max(SP.gazeW, win(tau, -1.4, -1.0, dur + .6, dur + 1.6));
        if (full) {
          if (tau < 0) {                                  // the hand rises above and behind the first string, then swings down onto it
            SP.tw = sm((tau + .85) / .6);
            const back = .22 * (1 - sm((tau + .3) / .3)) + .04 * ring(tau + .3, 9, 6);
            const a = FG.arc(-back); SP.tx = a[0]; SP.ty = a[1] - 4 * (1 - sm((tau + .25) / .25));
          } else {
            SP.tw = 1 - sm((tau - dur - .2) / .9);
            const a = FG.arc(glU(xx)); SP.tx = a[0]; SP.ty = a[1] + 3 * sm((tau - dur) / .4);
          }
          SP.ha = 0; SP.haW = 0;
        }
      }
      if (FG.react > -50) { const y = t - FG.react; if (y > 0 && y < 4) SP.lean += .03 * (1 - Math.exp(-y * 5)) * Math.exp(-y * 1.2); }
      SP.idle = 1;
      return SP;
    }
    // ---- beat 2: a bow (the weight back a touch, then forward from the hips, the head down, the hand to the belly)
    function perf2(t) {
      mixParams(SP, POSES.stand, POSES.stand, 0);
      const bw = win(t, .05, .6, 1.1, 1.8);
      SP.lean += -.012 * win(t, 0, .12, .15, .35) + .1 * bw; SP.bend = .22 * bw; SP.head = .25 * win(t, .15, .65, 1.0, 1.8);
      SP.a1 += -.25 * bw; SP.a2 += -.3 * bw; SP.fa1 += .35 * bw;
      SP.gazeX = 60; SP.gazeY = 80; SP.gazeW = .3 * bw; SP.idle = 1;
      return SP;
    }
    // the performances handed to the rig: fixed functions (no per-frame closures) of the global clock T, keyed by the
    // beat, its clock offset and the viewport, so the rig integrates its springs on from the last frame while time
    // runs normally and replays its window only after a jump (seek, back step, deep link, fast-forward, resize)
    let tb0 = 0, tb1 = 0, tb2 = 0;
    const perf0T = (T, full) => perf0(T - tb0, full), perf1T = (T, full) => perf1(T - tb1, full), perf2T = (T, full) => perf2(T - tb2, full);
    const perfRM0 = () => { mixParams(SP, POSES.reach, POSES.reach, 0); SP.tx = FG.gs[0]; SP.ty = FG.gs[1]; SP.tw = 1; SP.gazeX = FG.gs[0]; SP.gazeY = FG.gs[1]; SP.gazeW = 1; SP.idle = 0; return SP; };
    const perfRM1 = () => { mixParams(SP, POSES.stand, POSES.stand, 0); SP.gazeX = FG.ps[0]; SP.gazeY = FG.ps[1]; SP.gazeW = .6; SP.idle = 0; return SP; };
    const perfKey = (b, tb) => [b, tb, view.w, view.h];
    const rmKey = id => [id, view.w, view.h];
    function santaFrame(s, b) {
      const mot = s.motion < 1 ? 0 : 1, t0 = s.at(0), t1 = s.at(1);
      puffAge.fill(-1); puffAmt.fill(0);
      if (b === 0) layoutA();
      else {
        // the layouts under the fixed cameras A and B depend only on the view and the text blocks: computed once
        const key = view.w + '|' + view.h + '|' + view.safeTop + '|' + view.safeSide + '|' + mot + '|' + h2.x + '|' + h2.y + '|' + h2.width + '|' + h2.height + '|' + p2.x + '|' + p2.y + '|' + p2.width + '|' + p2.height;
        if (key !== fixKey) {
          fixKey = key;
          setCam(PA.pos, PA.tgt, PA.up, PA.fov, PA.sx, PA.sy); layoutA(); LAc.x = LA.x; LAc.y = LA.y; LAc.h = LA.h; LAc.sx0 = SX0;
          setCam(PB.pos, PB.tgt, PB.up, PB.fov, PB.sx, PB.sy); layoutB(); LBc.x = LB.x; LBc.y = LB.y; LBc.h = LB.h;
          LBc.tc = textClear(LA, LBc, mot ? 0 : 1);
        }
        LA.x = LAc.x; LA.y = LAc.y; LA.h = LAc.h; SX0 = LAc.sx0;
        const kl = b === 1 ? sm((t1 - 2.9) / 1.1) : 1;                 // walk toward where the lyre will be; settle on it as the camera arrives
        if (b === 1) { _lb.x = LBc.x; _lb.y = LBc.y; _lb.h = LBc.h; tClear1 = LBc.tc; }
        setCam(PX.pos, PX.tgt, PX.up, PX.fov, PX.sx, PX.sy); layoutB();
        if (kl < 1) { LB.x = lerp(_lb.x, LB.x, kl); LB.y = lerp(_lb.y, LB.y, kl); LB.h = lerp(_lb.h, LB.h, kl); }
      }
      sv.op = 1; sv.rim = 2.6; sv.lx = -.55; sv.ly = .84; sv.blur = 0;
      FG.mot = mot; FG.b = b; FG.react = mot && b < 2 ? reactT - (now - (b === 0 ? t0 : t1)) : -99;
      if (b === 0) {
        sv.x = LA.x; sv.y = LA.y; sv.h = LA.h;
        santa.place(sv.x, sv.y, sv.h);
        const c = toScreen(heroPt(SX0, 0, _s)); FG.gs = fig(c.x, c.y);
        // the string is held by him while he pulls it (side effects at the present only)
        let n = 0; if (mot) while (n < 400 && tPl(n + 1) - 1.5 <= t0) n++;
        const first = n === 0, tau = t0 - tPl(n), amp = first ? .02 : .011, mine = !(hero.held && !hero.santa);
        if (mot && tau < 0 && tau >= -.42 && mine) { hero.held = true; hero.santa = true; hero.x0 = SX0; hero.pull = hero.pullT = amp * sm((tau + .42) / .4); }
        cue('sp', t0, tPl(n), s, () => { if (hero.santa) { auto = true; pluck(hero, amp, SX0, true, first ? .75 : .42); auto = false; } });
        if (hero.santa && (tau >= 0 || tau < -.42 || !mot)) { hero.held = false; hero.santa = false; hero.pull = hero.pullT = 0; }   // jumps: let go quietly
        if (mot) { const ag = tau >= 0 ? tau : n > 0 ? t0 - tPl(n - 1) : -1; puffAge[0] = ag; puffUc[0] = SX0; puffAmt[0] = first || tau < 0 && n === 1 ? .55 : .3; }
        if (!mot) {                                                   // reduced motion: he simply holds his finger on the string
          santa.perform(perfRM0, rmKey('rm0'));
        } else { tb0 = s.time - t0; santa.perform(perf0T, perfKey(0, tb0)); }
      } else {
        // beat 1: he walks from the first string to the lyre while the camera pulls back, then sweeps it
        const kM = mot ? walkK(t1) : 1;
        // mid-walk the string plane turns under him: his path dips a little, so his boots stay below the strings
        sv.x = lerp(LA.x, LB.x, kM); sv.y = lerp(LA.y, LB.y, kM) + 36 * Math.sin(PI * kM); sv.h = lerp(LA.h, LB.h, kM);
        sv.rim = 2.6 * (1 - .55 * Math.sin(PI * kM)); sv.lx = lerp(-.55, .5, kM); sv.ly = lerp(.84, .86, kM);
        // beat 2: the camera dives into the piano past him; he takes a small bow as he passes out of frame
        // beat 2: the camera dives past him: he is near the lens, so he grows, slides out of the frame away from its
        // centre (and down), and goes out of focus; he only fades in the last 0.3 s, when he is nearly out of frame
        if (b === 2) {
          const kf = s.k(2, 0, 1.4, 'inQuad'), h0 = sv.h, W = view.w, H = view.h;
          let dx = sv.x - W * .5, dy = sv.y - .5 * h0 - H * .42; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
          sv.h = h0 * (1 + 1.5 * kf); sv.x += dx * (W * .55 + h0 * .6) * kf; sv.y += (Math.max(dy, .2) * H * .3 + h0 * 1.3) * kf;
          sv.blur = 1.8 * kf; sv.rim *= 1 - .5 * kf; sv.op = 1 - s.k(2, 1.1, 1.4, 'inQuad');
        }
        santa.place(sv.x, sv.y, sv.h);
        // walk: whole strides (so it starts and ends in the standing stance) over the distance he covers on screen
        const hm = (LA.h + LB.h) / 2, dist = (LB.x - LA.x) / (hm / 100);
        FG.walk = dist > 6; const cyc = Math.max(1, Math.round(dist * .8 / 38)); FG.D = FG.walk ? cyc * 2 * clamp(dist * .85 / (2 * cyc), 6, 21) : 0; FG.stride = FG.D / (2 * cyc) || 18;
        FG.ps = fig(LB.ps[0], LB.ps[1]);
        FG.arc = arcFig;
        // the lunge that carries the shoulder in by T: a step of the near foot, the hips over it, the rest a lean
        const Tf = LB.T * 100 / LB.h; FG.T = Tf; FG.step = clamp(Tf * .7, 0, 23);
        let k = -1; if (mot && t1 >= tGl(0) - 1) { k = 0; while (k < 400 && tGl(k + 1) - 1 <= t1) k++; }
        if (k >= 0) {
          const tg = tGl(k), dur = glDur(k), soft = k > 0;
          for (let i = 0; i < 7; i++) {
            const ti = tg + dur * glX(Math.max(0, LB.si[i])), ui = LB.ui[i];
            cue('g' + i, t1, ti, s, () => { auto = true; pluck(lyre[i], (soft ? .011 : .019) - i * .0006, ui, true, soft ? .36 : .6); auto = false; });
            let ag = t1 - ti, am = soft ? .55 : 1;
            if (ag < 0 && k > 0) { ag = t1 - (tGl(k - 1) + glDur(k - 1) * glX(Math.max(0, LB.si[i]))); am = k > 1 ? .55 : 1; }
            if (b === 1) { puffAge[i] = ag; puffUc[i] = ui; puffAmt[i] = am; }
          }
        }
        if (!mot) {
          santa.perform(perfRM1, rmKey('rm1'));
        } else if (b === 2) { tb2 = s.time - s.at(2); santa.perform(perf2T, perfKey(2, tb2)); }
        else { tb1 = s.time - t1; santa.perform(perf1T, perfKey(1, tb1)); }
      }
      if (sv.op > .003) santa.motion(mot, mot).update(mot ? s.time : 0);          // gone (beat 2, out of frame): no posing
      santa.setLight(sv.lx, sv.ly).setRim(null, sv.rim); santa.opacity = sv.op; santa.blur = sv.blur;
    }
    const shaftS = { o: [0, 0], d: [0, 1], r: 100 };
    const HZ_AT = [1, 46], _hz = [0, 0];
    const snowShaft = { origin: [0, 0], dir: [0, 1], radius: 100, color: [1, .6, .28] }, snowSet = { aperture: 1, brightness: 1, shaft: snowShaft };
    function shaftScreen(k1, k2) {
      const tc = lerp(lerp(1.7, 2.6, k1), 2.4, k2);
      _s.copy(PX.bo).addScaledVector(PX.bd, tc); _t.copy(PX.bo).addScaledVector(PX.bd, tc - .7);
      const a = toScreen(_s), b = toScreen(_t);
      if (a.w > .05 && b.w > .05) {
        const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1;
        shaftS.d[0] = dx / l; shaftS.d[1] = dy / l; shaftS.o[0] = b.x - shaftS.d[0] * 4000; shaftS.o[1] = b.y - shaftS.d[1] * 4000;
        shaftS.r = (PX.sig + PX.spread * tc) * (cam.p11 * view.h / 2) / a.w * 1.15;
      }
      return shaftS;
    }

    function update(s) {
      motion = s.motion; now = s.t; const dt = s.dt;
      const port = view.portrait, W = view.w, H = view.h;
      buildPoses();
      // ---- timeline
      const k1 = s.k(1, 0, 4.6, 'inOutCubic'), k2 = s.k(2, 0, 4.8, 'inOutCubic'), k2l = k2 * k2 * k2;
      k1cam = k1;
      const b = s.beat, moving = b === 1 ? Math.sin(PI * s.k(1, 0, 4.6)) : b === 2 ? Math.sin(PI * s.k(2, 0, 4.8)) : 0;
      mixPose(PX, PA, PB, k1); if (k2 > 0) mixPose(PX, PX, PC, k2);
      glintLight(PX.lk, PX.g0.A, PX.g0.T, PX.g0.s, PX.g0.q, PX.pos); glintLight(PX.lc, PX.g1.A, PX.g1.T, PX.g1.s, PX.g1.q, PX.pos);
      // hold: slow asymptotic push-in + incommensurate sway + restrained parallax
      const since = s.since(b), moveDur = b === 0 ? 2 : b === 1 ? 4.6 : 4.8, t = s.time;
      const drift = 1 - Math.exp(-Math.max(0, since - moveDur) / 28);
      _n.subVectors(PX.tgt, PX.pos).normalize(); _c.crossVectors(_n, PX.up).normalize(); const upv = _upv.crossVectors(_c, _n);
      const sw = PX.dist * .0045 * motion, par = (1 - moving) * motion * PX.dist * (b === 0 ? .012 : .03);
      PX.pos.addScaledVector(_n, drift * PX.dist * (b === 0 ? .035 : .07) * (motion < 1 ? 0 : 1))
        .addScaledVector(_c, sw * (Math.sin(t * .131) + .6 * Math.sin(t * .317 + 1.3)) + par * s.mouse.x)
        .addScaledVector(upv, sw * (Math.sin(t * .173 + .4) + .5 * Math.sin(t * .229 + 2.1)) + par * .5 * s.mouse.y);
      if (b === 2) PX.tgt.addScaledVector(_c, sw * (Math.sin(t * .131) + .6 * Math.sin(t * .317 + 1.3)) + par * s.mouse.x * .6);
      setCam(PX.pos, PX.tgt, PX.up, PX.fov, PX.sx, PX.sy);

      // ---- reveals
      hero.rev = s.k(0, .35, 1.55, 'inOutCubic'); hero.revDir = 1;
      for (let i = 1; i < 7; i++) { lyre[i].rev = s.k(1, .9 + i * .27, 2.3 + i * .27, 'inOutCubic'); lyre[i].revDir = 0; }
      const kP = s.k(2, 3.0, 5.4), morph = s.k(2, .4, 3.2, 'inOutCubic'); kMorph = morph;
      for (const st of strings) if (st.li < 0) { st.rev = clamp(kP * 1.9 - st.order / maxOrder * .9); st.rev = st.rev * st.rev * (3 - 2 * st.rev); st.revDir = 2; st.gain = .82 + .18 * Math.sin(st.row * 12.9898) ; }
      const lyreLit = s.k(1, 1.5, 4.6, 'inOutCubic') * (1 - s.k(2, 0, 1.5, 'inOutCubic')), pianoLit = s.k(2, 3.1, 5.4, 'inOutCubic');

      // ---- cues (forward crossings only)
      santaFrame(s, b);                                                 // Deda Mraz plucks (beat 0) and sweeps the lyre (beat 1)
      const t2 = s.at(2);
      JB.forEach(([q, n], j) => cue('jb' + j, t2, JT0 + q * JQ, s, () => strike(n, j === 0 || j === 3 || j === 6 ? .6 : j === 10 ? .56 : .46)));
      cue('jbell', t2, JEND + .4, s, () => ctx.sfx('jingle', { shake: .5, gain: .7, pan: .12 }));
      JARP.forEach((n, j) => cue('ja' + j, t2, JEND + 1.45 + j * .17, s, () => strike(n, .22 + .025 * j)));
      for (let i = pending.length - 1; i >= 0; i--) if (now >= pending[i].t) { landStrike(pending[i]); pending.splice(i, 1); }
      // sympathetic shimmer in the holds
      if (dt > 0 && since > moveDur + 1.5 && b > 0) {
        shimT -= dt;
        if (shimT <= 0) {
          if (b === 1) { shimmer(lyre[(rand() * 7) | 0], .0014 + rand() * .0014); shimT = 1.6 + rand() * 2.2; }
          else { const n = 22 + ((rand() * 26) | 0); for (const st of byNote[n]) shimmer(st, .0007 + rand() * .0008); shimT = .5 + rand() * 1.1; }
        }
      }
      stepStrings(dt);
      let hamN = 0;
      for (let n = 0; n < 88; n++) { // hammer: accelerate up, strike, fall back with a damped bounce
        const tt = now - hamT[n]; let l = 0;
        if (tt >= 0 && tt < 2) l = tt < .07 ? Math.pow(tt / .07, 2) : Math.max(0, Math.exp(-(tt - .07) * 10) * Math.cos((tt - .07) * 17));
        if (hamInst[n * 4 + 1] !== Math.fround(l)) { hamInst[n * 4 + 1] = l; hamN++; }
      }
      if (hamN) hamAttr.needsUpdate = true;
      writeData();

      // ---- uniforms
      shared.uVP.value.copy(cam.vp); shared.uHalf.value.set(hdr.width / 2, hdr.height / 2); shared.uP11.value = cam.p11;
      lightsS.uCam.value.copy(cam.pos);
      const open = s.k(0, 0, 2, 'outCubic');
      lightsS.uLp.value[0].copy(PX.lk); lightsS.uLp.value[1].copy(PX.lc);
      lightsS.uLc.value[0].set(1, lerp(.8, .72, k2), lerp(.56, .42, k2)).multiplyScalar(lerp(1.5, 1.3, k2)); lightsS.uLc.value[1].set(.74, .83, 1).multiplyScalar(lerp(.3, .42, k2));
      lightsM.uLp.value[0].copy(PX.mk); lightsM.uLp.value[1].copy(PX.mc);
      lightsM.uLc.value[0].set(1, .78, .5).multiplyScalar(lerp(1.5, 1.5, k2)); lightsM.uLc.value[1].set(lerp(.74, 1, k2), lerp(.83, .8, k2), lerp(1, .6, k2)).multiplyScalar(lerp(.5, .2, k2));
      shared.uFog.value = .55 * k2l; shared.uFogStart.value = .8; shared.uPool.value.set(.06, .6, 0, 1.5 * k2l);
      const us = mStr.material.uniforms, ur = mStrRef.material.uniforms;
      us.uGain.value = lerp(1, .66, k2);
      for (const u of [us, ur]) { u.uMorph.value = morph; u.uRadScale.value = lerp(port ? 1.9 : 1, 1, k1); u.uGhost.value = motion < 1 ? 0 : .45; u.uFocus.value = lerp(PX.dist, 1.05, k2); u.uAper.value = .019 * k2 * k2; u.uBase.value = lerp(lerp(.12, .3, k1), .022, k2l); u.uShin.value.set(lerp(520, 700, k2), lerp(22, 80, k2), lerp(2.8, 4.2, k2), lerp(.5, .2, k2)); u.uGlow.value = lerp(.13, .5, k2); }
      // lacquer: beneath the first string in beat 0; beneath the lyre in beat 1
      const floorA = b === 0 || (b === 1 && s.at(1) < 1.7);
      const kF = floorA ? 1 - s.k(1, 0, 1.6, 'inOutCubic') : s.k(1, 2.6, 5, 'inOutCubic') * (1 - s.k(2, 0, 1.4, 'inOutCubic'));
      let fd;
      if (floorA) { _n.copy(U0); fd = Cs.dot(U0) - HF; bg.u.uFa1.value.copy(T0); } else { _n.set(0, 1, 0); fd = -.41; bg.u.uFa1.value.set(1, 0, 0); }
      setMirror(_n, fd); ur.uMirror.value.copy(mir); mLyreRef.material.uniforms.uMirror.value.copy(mir);
      ur.uPlane.value.set(_n.x, _n.y, _n.z, fd); ur.uSoft.value = floorA ? .1 : .012; ur.uFall.value = floorA ? 5 : 1.1; ur.uGain.value = kF * (floorA ? .3 : .2);
      mStrRef.visible = kF > .002; mLyreRef.visible = !floorA && kF > .002 && lyreLit > .002;
      mLyreRef.material.uniforms.uLit.value = lyreLit * kF * .3; mLyreRef.material.uniforms.uPlane.value.set(_n.x, _n.y, _n.z, fd); mLyreRef.material.uniforms.uFall.value = 7;
      mLyre.visible = lyreLit > .002; mLyre.material.uniforms.uLit.value = lyreLit;
      mFrame.visible = mHam.visible = pianoLit > .002; mFrame.material.uniforms.uLit.value = pianoLit; mHam.material.uniforms.uLit.value = pianoLit * .78; mHam.material.uniforms.uPool.value.w = 5.5 * k2l;
      // beam + dust + background
      beamU.uBo.value.copy(PX.bo); beamU.uBd.value.copy(PX.bd); beamU.uBeam.value.set(PX.sig, PX.spread, 1, .05);
      const du = dustMat.uniforms; du.uT.value = s.time * (motion < 1 ? .2 : 1); du.uCen.value.copy(cam.pos).addScaledVector(cam.fwd, 2.1);
      du.uFocus.value = lerp(PX.dist, .7, k2); du.uAper.value = lerp(.012, .016, k2); du.uAmb.value = .06; du.uCol.value.set(1, .78, .5).multiplyScalar(3.2 * open);
      dustGeo.instanceCount = Math.round(DUSTN * clamp(s.q, .35, 1));
      // snow shaken off the strings
      mPuff.visible = b < 2 && puffAmt.some(v => v > 0);
      for (let i = 0; i < 7; i++) { const st = lyre[i]; puffU.uSA.value[i].set(st.A0[0], st.A0[1], 0, puffUc[i]); puffU.uSB.value[i].set(st.B0[0], st.B0[1], 0, puffAge[i]); puffU.uAmt.value[i] = puffAmt[i]; }
      puffU.uDown.value.copy(cam.up).multiplyScalar(-1); puffU.uSide.value.copy(cam.right); puffU.uScale.value = lerp(.55, 1, k1);
      puffU.uFocus.value = PX.dist; puffU.uAper.value = .006; puffU.uAmb.value = .35; puffU.uCol.value.set(1, .86, .68).multiplyScalar(3.4 * open);
      // snow: very sparse and mostly soft in the first two beats, a gentle fall through the shaft inside the piano
      const sh = shaftScreen(k1, k2);
      snow.density(lerp(.36, .5, k2)).quality(s.q);
      const kc = lerp(2.2, 2.4, k2); snowShaft.origin = sh.o; snowShaft.dir = sh.d; snowShaft.radius = sh.r * lerp(1, .42, k2); snowShaft.color[0] = kc; snowShaft.color[1] = .6 * kc; snowShaft.color[2] = .28 * kc;
      snowSet.aperture = lerp(1, .6, k2); snowSet.brightness = open * lerp(.9, .7, k2); snow.set(snowSet);
      snow.update(s.time * (motion < 1 ? .1 : 1));
      const bu = bg.u; bu.uR.value.copy(cam.right); bu.uU.value.copy(cam.up); bu.uF.value.copy(cam.fwd); bu.uProj.value.set(1 / cam.p00, 1 / cam.p11, cam.m8, cam.m9);
      bu.uBeamCol.value.set(1, .62, .3).multiplyScalar(.09 * PX.bI * open); bu.uLk.value.copy(PX.lk); bu.uLkc.value.set(1, .8, .56).multiplyScalar(.5 * open);
      bu.uFloor.value.set(_n.x, _n.y, _n.z, fd); bu.uFloorK.value.set(kF, 1, floorA ? .22 : .1); bu.uAmb.value = .0016 * open; bu.uT.value = s.time;
      // a faint warm haze behind Deda Mraz (centred on his chest, a little toward the light): the shaft already lights
      // the air behind him at the first string; at the lyre his back would otherwise melt into the black
      const hzK = (b === 0 ? .5 : lerp(.5, 1, s.k(1, .3, 2.6, 'inOutCubic'))) * (1 - s.k(2, 0, .8, 'inOutCubic')) * sv.op * open;
      if (hzK > .002) {
        santa.toDesign(HZ_AT, _hz);
        bu.uHz.value.set(_hz[0] / W + sv.lx * .03 * sv.h / W, 1 - _hz[1] / H + .02 * sv.h / H, .5 * sv.h / W, .62 * sv.h / H);
        bu.uHzC.value.set(1, .6, .3).multiplyScalar(.032 * hzK);
      } else bu.uHzC.value.set(0, 0, 0);

      // ---- grade follows the story
      grade.exposure = lerp(0, 1.12, open) * lerp(1, 1.06, k2); grade.bloom = lerp(.6, .8, k2); grade.threshold = lerp(1.25, 1.1, k2);
      grade.fade = 1;

      // ---- text (everything inside view.safe*, laid out from measured sizes)
      const out1 = s.k(1, 0, .7), out2 = s.k(2, 0, .7), ex = s.exit;
      const sT = view.safeTop || 110, sB = view.safeBottom || 130, sS = view.safeSide || 90, availW = W - 2 * sS;
      const ys = H * (.5 - PA.sy * .5);                               // where the lens shift puts the first string
      // beat 0: headline, then the name and its descriptor, in the calm dark above the string
      const str1 = ctx.t('zica.b1.h'), parts = ctx.t('zica.b1.p').split('\n');
      const desc = parts.slice(1).join(' '); p1a.set(parts[0] || ''); p1b.set(desc);
      const r1 = measureW(str1, 100, 'display', -.012) / 100;
      const top0 = sT + 14, bot0 = ys - 152, hR = bot0 - top0;        // the pulled string never reaches the words
      let size1 = Math.min(port ? 160 : 168, availW * .84 / r1), two = false;
      if (size1 < 124) { two = true; size1 = Math.min(156, availW * .94 / (r1 * .62)); }
      p1a.size = clamp(size1 * .34, 46, 58);
      const nameH = p1a.height || 70, descH = p1b.height || 50, fixed = 30 + nameH + 6 + descH;
      size1 = Math.max(84, Math.min(size1, (hR - fixed) / ((two ? 2.04 : 1) + .26)));
      h1.size = Math.round(size1); h1.wrap = two ? r1 * h1.size * .65 : 0;
      const h1H = h1.height || h1.size * ((two ? 2.04 : 1) + .26), blockH = h1H + fixed;
      h1.x = W / 2; h1.y = port ? Math.max(top0 + 10, Math.min(H * .13, bot0 - blockH)) : top0 + Math.max(0, hR - blockH) * .5;
      h1.show(s.k(0, 2.2, 4.0), { style: 'blur', by: 'glyph', q: out1, stagger: .7 });
      p1a.x = W / 2; p1a.y = h1.y + h1H + 30; p1a.show(s.k(0, 3.4, 4.6), { style: 'blur', by: 'glyph', q: out1, stagger: .6 });
      p1b.wrap = balance(measureW(desc, 34, 'text'), Math.min(760, availW)); p1b.x = W / 2; p1b.y = p1a.y + nameH + 6;
      p1b.show(s.k(0, 3.9, 5.2), { style: 'rise', by: 'word', q: out1 });
      const wantHint = b === 0 && s.at(0) > 4.2 && !touched ? 1 : 0; hintA = damp(hintA, wantHint, wantHint ? 1.6 : 5, dt || 1 / 60);
      hint.x = W / 2; hint.y = ys + 74; hint.alpha = hintA * (1 - out1) * .9; hint.show(1, { style: 'fade', by: 'line' });
      if (port) {
        const y0 = Math.max(sT + 24, H * .085);
        h2.opt('align', 'center').opt('valign', 'top'); h2.size = 112; h2.wrap = Math.min(640, availW); h2.x = W / 2; h2.y = y0;
        p2.opt('align', 'center'); p2.wrap = balance(measureW(ctx.t('zica.b2.p'), 38, 'text'), Math.min(760, availW)); p2.x = W / 2; p2.y = h2.y + (h2.height || 260) + 40;
        h3.opt('align', 'center'); h3.size = 98; h3.wrap = Math.min(880, availW); h3.x = W / 2; h3.y = y0;
        p3.opt('align', 'center'); p3.wrap = balance(measureW(ctx.t('zica.b3.p'), 36, 'text'), Math.min(760, availW)); p3.x = W / 2; p3.y = h3.y + (h3.height || 240) + 40;
      } else {
        const colW = clamp(W * .5 - 150 - (sS - 90), 480, 760), x0 = sS + 20;
        h2.opt('align', 'left').opt('valign', 'bottom'); h2.size = clamp(colW * .19, 96, 132); h2.wrap = Math.min(colW, h2.size * 5.3); h2.x = x0;
        p2.opt('align', 'left'); p2.wrap = Math.min(colW, 640); p2.x = x0 + 4;
        // the pair is centred on the lyre's height, and never leaves the safe band
        const hh = h2.height || h2.size * 2.3, ph = p2.height || 150, pair = hh + 40 + ph;
        h2.y = clamp(H * .5 - pair * .5 + hh + 10, sT + 10 + hh, H - sB - 40 - ph); p2.y = h2.y + 40;
        h3.opt('align', 'left'); h3.size = Math.round(clamp(W * .058, 92, 112) * k3); h3.wrap = Math.min(W * .5, 900); h3.x = x0; h3.y = sT + 28;
        p3.opt('align', 'left'); p3.wrap = clamp(W * .27, 380, 520); p3.x = W - sS - 20 - p3.wrap; p3.y = h3.y + 16;
        h3.wrap = Math.min(h3.wrap, p3.x - 80 - h3.x);                                       // at least 80 units of gutter
        if (h3.height > 0 && h3.y + h3.height > H * .46 && k3 > .7) k3 *= .96;                // short windows: stay above the strings
      }
      // beat 1: the words arrive as soon as Deda Mraz has walked clear of them (never drawn over him)
      const tw = Math.max(.7, tClear1); TEXT_AT1 = tw + 1.35;
      h2.show(s.k(1, tw, tw + .95), { style: 'blur', by: 'glyph', q: out2, stagger: .7 }); p2.show(s.k(1, tw + .4, tw + 1.35), { style: 'rise', by: 'word', q: out2 });
      h3.show(s.k(2, 1.0, 2.1), { style: 'blur', by: 'glyph', q: ex, stagger: .7 }); p3.show(s.k(2, 1.9, 3.0), { style: 'rise', by: 'word', q: ex });
    }

    const api = {
      async init() {
        buildPoses(); setCam(PB.pos, PB.tgt, PB.up, PB.fov, 0, 0);
        try { gfx.renderer.compile(world, dummyCam); } catch (e) { /* compiled lazily instead */ }
        const au = ctx.audio;
        if (au.warm) au.warm([...lyre.map(st => ({ pluck: st.hz, body: 'lyre', bright: .5 })), { pluck: hero.hz, body: 'lyre', bright: .25 }, { pluck: hero.hz, body: 'lyre', bright: .75 }, ...[...new Set([...JB.map(j => j[1]), ...JARP])].map(n => ({ key: noteHz(n) })), { sfx: 'jingle' }]);
        santa.update(0); snow.update(0);
      },
      enter(s) {
        resetAll(); touched = false; hintA = 0; santa.reset();
        ctx.audio.layer('room', .4); ctx.audio.layer('air', .12);
      },
      exit() { for (const st of lyre) { st.held = false; st.santa = false; st.pull = st.pullT = 0; } ctx.audio.layer('room', 0); ctx.audio.layer('air', 0); },
      resize() { k3 = 1; mcache.clear(); },
      update,
      render(target) {
        bg.render(hdr);
        // the instruments and the air around them (dust, snow shaken off the strings, falling snow), then Deda Mraz in
        // front of all of it: he stands nearest the lens, so no lit flake or mote ever lands on his silhouette
        gfx.draw(world, dummyCam, hdr, { clear: false });
        snow.render(hdr);
        if (santa.opacity > .003) santa.render(hdr);
        gfx.post(hdr, target, grade);
        ui.render(target);
      },
      pointer(e, s) { return s.beat === 2 ? pianoPointer(e, s) : lyrePointer(e, s.beat); },
    };
    // test browser only: main-thread cost of update() and render() (window.__zPerf = { u, r, n } ms totals / frames)
    if (ctx.headless && typeof window !== 'undefined' && typeof performance !== 'undefined') {
      const P = window.__zPerf = { u: 0, r: 0, n: 0 }, u0 = api.update, r0 = api.render;
      api.update = s => { const t = performance.now(); u0(s); P.u += performance.now() - t; P.n++; };
      api.render = (tg, s) => { const t = performance.now(); r0(tg, s); P.r += performance.now() - t; };
    }
    return api;
  },
};
