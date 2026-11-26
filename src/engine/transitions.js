// Transition table. { dur, create(ctx) -> { render({A,B,p,out,time,from,to,sa,sb}) } }
// A and B hold finished sRGB frames of both scenes. Blend in linear light.
// Every entry: p<=0 copies A, p>=1 copies B; every effect amplitude is zero at both ends, so the
// first and last frames are continuous with the plain pictures. All geometry is derived from uRes.

// encode + triangular dither (amt ramps in/out with p so the very first/last frame equals the copy)
const OUT = /* glsl */`
uniform float uD;
vec3 outc(vec3 lin){ vec3 c = toSRGB(lin);
  float a = hash12(gl_FragCoord.xy + fract(uTime) * vec2(37.3, 91.7)), b = hash12(gl_FragCoord.yx + fract(uTime * 1.31) * vec2(71.1, 13.9) + 19.19);
  return c + (a + b - 1.) * uD / 255.; }
`;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const edge = p => Math.min(1, 14 * Math.min(p, 1 - p));
// forward threshold crossings of p -> cues (audio is a no-op while muted)
const cues = list => { let prev = 0; return p => { if (p < prev) prev = 0; for (const [at, fn] of list) if (prev < at && p >= at) fn(); prev = p; }; };
// compile a pass's program now (create() time) instead of on the first transition frame
const warm = (gfx, ...passes) => { const t = gfx.target({ w: 2, h: 2, hdr: false }); for (const p of passes) p.render(t); gfx.free(t); };

// ---------------------------------------------------------------------------------------------
const fade = {
  dur: 1.7,
  create(ctx) {
    const pass = ctx.gfx.pass(OUT + `
      uniform sampler2D tA, tB; uniform float uP;
      void main(){ vec3 a = toLinear(texture(tA, vUv).rgb), b = toLinear(texture(tB, vUv).rgb);
        float p = uP * uP * (3. - 2. * uP);
        // dip slightly through black so the cut breathes
        float d = 1. - .35 * sin(3.14159 * p);
        fragColor = vec4(outc(mix(a, b, p) * d), 1.); }`, { tA: null, tB: null, uP: 0, uD: 0 });
    return { render({ A, B, p, out }) { if (p <= 0) return ctx.gfx.copy(A, out); if (p >= 1) return ctx.gfx.copy(B, out); pass.u.tA.value = A.texture; pass.u.tB.value = B.texture; pass.u.uP.value = p; pass.u.uD.value = edge(p); pass.render(out); } };
  },
};

// ---------------------------------------------------------------------------------------------
// pluck — the outgoing picture is a field of strings. One of them is pulled and let go; its motion
// spreads to every row. Rows become threads of light (horizontal smear, rendered as the time-average
// of a vibrating string: an arcsine band, pinched at the frame edges, bright at the limits of travel),
// change colour to B along their length, then thicken and settle (damped cosine) into B.
// 2 passes: a 1/12-width, full-height horizontal smear of A/B (the one lazy helper target), then the composite.
const pluck = {
  dur: 2.9,
  create(ctx) {
    const { gfx } = ctx, D = 2.4, T_REL = .38;
    const FIELD = /* glsl */`
      uniform vec2 uFull; uniform float uPitch, uY0, uX0, uPull, uHero, uAmp, uSlow, uRelax, uSig, uR, uSoft;
      float shapeX(float x){ x = (x + .08) / 1.16; float a = x / uX0, b = (1. - x) / (1. - uX0); const float k = .22; float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
        float tri = mix(b, a, h) - k * h * (1. - h); return mix(tri, sin(3.14159265 * x), uRelax); }
      float gY(float y){ float d = (y - uY0) / uSig; return exp(-d * d); }
      float envY(float y){ float e = clamp((uR - abs(y - uY0)) / uSoft, 0., 1.); return e * e * (3. - 2. * e); }
    `;
    const fieldU = { uFull: new ctx.THREE.Vector2(2, 2), uPitch: 18, uY0: 0, uX0: .3, uPull: 0, uHero: 0, uAmp: 0, uSlow: 0, uRelax: 0, uSig: 1, uR: 0, uSoft: 1 };
    const smear = gfx.pass(FIELD + `
      uniform sampler2D tA, tB; uniform float uSmear, uM;
      void main(){
        float idx = floor(vUv.y * uFull.y / uPitch); float h = hash11(idx * 1.37 + 5.1);
        float E = envY((idx + .5) * uPitch);
        float r = max(uSmear * E * (.5 + h), 1.5 / uRes.x);   // half-window in uv; taps stay <= ~1.6 helper texels apart
        float m = clamp(uM * 2.4 - abs(vUv.x - uX0) * .9 - h * .5, 0., 1.); m = m * m * (3. - 2. * m);
        vec3 a = vec3(0.), b = vec3(0.); float ws = 0.; float j = hash12(gl_FragCoord.xy * 1.37 + 7.7);
        for (int i = 0; i < 32; i++) {
          float f = (float(i) + j) / 16. - 1.; float w = 1. - f * f;
          float x = abs(vUv.x + f * r); x = 1. - abs(1. - x);
          if (m < .999) a += toLinear(textureLod(tA, vec2(x, vUv.y), 0.).rgb) * w;
          if (m > .001) b += toLinear(textureLod(tB, vec2(x, vUv.y), 0.).rgb) * w;
          ws += w;
        }
        fragColor = vec4(sqrt(mix(a, b, m) / ws), 1.); }`, { ...fieldU, tA: null, tB: null, uSmear: 0, uM: 0 });
    const comp = gfx.pass(FIELD + OUT + `
      uniform sampler2D tS, tH; uniform float uThin, uT, uGlow, uHeroA, uHeroS, uHw, uSlide;
      const vec3 BRASS = vec3(1., .62, .2);
      float Fa(float u){ return asin(clamp(u, -1., 1.)) * .318309886 + .5; }   // CDF of a point on a vibrating string
      vec3 shoulder(vec3 c){ vec3 x = max(c - .6, 0.); return min(c, vec3(.6)) + .4 * (1. - exp(-x / .4)); }
      void main(){
        float x = vUv.x, y = gl_FragCoord.y, sx = shapeX(x), E = envY(y), G = gY(y);
        float T = smoothstep(.05, .55, E * uT);
        vec3 col = vec3(0.);
        if (T < .999) {   // the picture itself: displaced, and averaged over one period of the vibration
          float c = sx * (uSlow * E - uPull * G), a = sx * (uHero * G + uAmp * E);
          vec3 s = vec3(0.);
          if (a < .3) s = toLinear(textureLod(tS, vec2(x, (y - c) / uFull.y), 0.).rgb);
          else { float j = ign(gl_FragCoord.xy);
            for (int i = 0; i < 8; i++) { float th = 3.14159265 * (float(i) + j) / 8.; s += toLinear(textureLod(tS, vec2(x, (y - c - a * cos(th)) / uFull.y), 0.).rgb); }
            s /= 8.; }
          col = s * (1. - T);
        }
        if (T > .001) {   // threads: each row band is one string
          float base = floor(y / uPitch); vec3 th = vec3(0.);
          for (int j = -4; j <= 4; j++) {
            float idx = base + float(j); float h = hash11(idx * 1.37 + 5.1), h2 = hash11(idx * 2.71 + 1.3);
            float y0 = (idx + .5) * uPitch; float Ej = envY(y0), Gj = gY(y0);
            float thin = clamp(uThin * Ej * (.7 + .6 * h2), 0., 1.);
            float w = uPitch * .5 * mix(1., .05 + .24 * h2 * h2, thin);
            float a = min(sx * (uHero * Gj + uAmp * Ej * (.55 + .9 * h)), 4.4 * uPitch - w);
            float dy = y - y0 - (h - .5) * uPitch * .84 * thin - sx * (uSlow * Ej - uPull * Gj);
            if (abs(dy) > a + w + 1.) continue;
            float s = max(a, .6);
            float K = (Fa((dy + w) / s) - Fa((dy - w) / s)) * pow(uPitch / (2. * w), .82);
            vec2 uv = vec2(abs(x + (hash11(idx * 3.17 + 9.4) - .5) * uSlide * thin * thin), (y0 + clamp(dy, -w, w)) / uFull.y); uv.x = 1. - abs(1. - uv.x);
            vec3 C = textureLod(tH, uv, 0.).rgb; C *= C;
            th += (C + BRASS * uGlow * thin * (.4 + h)) * K;
          }
          col += shoulder(th) * T;
        }
        // the plucked string itself
        float dh = y - uY0 - sx * (uSlow - uPull), ah = sx * uHeroS, sh = max(ah, .6);
        float Kh = Fa((dh + uHw) / sh) - Fa((dh - uHw) / sh);
        float halo = exp(-max(abs(dh) - ah, 0.) / (uHw * 5.)) * uHw / (uHw + ah * .25);
        col += BRASS * uHeroA * (Kh * 3. + halo * .22);
        fragColor = vec4(outc(col), 1.); }`, { ...fieldU, tS: null, tH: null, uThin: 0, uT: 0, uGlow: .012, uHeroA: 0, uHeroS: 0, uHw: 1.5, uSlide: 0, uD: 0 });
    warm(gfx, smear, comp);
    let H = null, hw = 0, hh = 0;
    const helper = () => { const w = Math.max(48, Math.round(gfx.W / 12)), h = gfx.H; if (!H || hw !== w || hh !== h) { gfx.free(H); H = gfx.target({ w, h }); hw = w; hh = h; } return H; };
    const cue = cues([[T_REL / D, () => { ctx.audio.pluck(82.41, { gain: .5, decay: 2.4, bright: .55 }); ctx.audio.pluck(123.47, { gain: .22, decay: 1.8, bright: .4, pan: .2 }); }]]);
    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out); if (p >= 1) return gfx.copy(B, out);
        cue(p);
        const t = p * D, tau = Math.max(0, t - T_REL), U = Math.min(gfx.W, gfx.H), end = 1 - ss(.86, 1, p);
        const rel = Math.min(1, tau / .05), pitch = Math.max(8, U * 18 / 1080), y0 = gfx.H * .46, AP = .05 * U;
        const soft = .2 * U, Rmax = Math.max(y0, gfx.H - y0) + soft;
        const f = {
          uPitch: pitch, uY0: y0, uX0: .3, uSig: .13 * U, uSoft: soft,
          uPull: AP * (t < T_REL ? .5 - .5 * Math.cos(Math.PI * t / T_REL) : 1 - rel),
          uHero: AP * rel * Math.exp(-2.2 * tau) * end,
          uAmp: .042 * U * ss(0, .4, tau) * Math.exp(-2.5 * Math.max(0, tau - .4)) * end,
          uSlow: .03 * U * Math.exp(-1.3 * tau) * Math.sin(2 * Math.PI * 2.2 * tau) * end,   // damped cosine about rest
          uRelax: ss(0, .5, tau),
          uR: Rmax * (.5 - .5 * Math.cos(Math.PI * Math.min(1, tau / .62))),
        };
        const mixAB = ss(.55, 1.05, tau);
        for (const pass of [smear, comp]) { for (const k in f) pass.u[k].value = f[k]; pass.u.uFull.value.set(gfx.W, gfx.H); }
        const u = comp.u;
        u.uThin.value = ss(0, .28, tau) * (1 - ss(1., 1.4, tau));
        u.uT.value = 1 - ss(1.25, 1.6, tau);
        u.uHeroA.value = ss(.02, .2, t) * (1 - ss(1., 1.7, tau));
        const sm = ss(.08, .8, tau) * (1 - ss(.85, 1.35, tau));   // how far the rows have come apart
        u.uSlide.value = .5 * sm;
        u.uHeroS.value = AP * rel * Math.exp(-1.3 * tau) * end;
        u.uHw.value = Math.max(1, U * 1.4 / 1080);
        u.uD.value = edge(p);
        u.tS.value = (mixAB < .5 ? A : B).texture;
        if (u.uT.value > 0 && tau > 0) {
          const h = helper();
          smear.u.tA.value = A.texture; smear.u.tB.value = B.texture; smear.u.uM.value = mixAB;
          smear.u.uSmear.value = .14 * sm;
          smear.render(h); u.tH.value = h.texture;
        }
        comp.render(out);
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// grain — the outgoing picture turns to sand. A is quantised into grains; a wavy front sweeps the
// frame (bottom-left to top-right) and grains let go behind it: dark ones first, bright ones last.
// Released grains hop, then fall and blow away in five sheets with different dynamics (parallax);
// bright grains warm up and glint while B's own lights glint in grain-sized quanta just behind the front.
// The motion of every sheet is a steady pattern in the frame of the wave, so each pixel finds the grain
// that covers it in closed form (one quadratic) — no particles, no search. 1 pass.
const grain = {
  dur: 3.35,
  create(ctx) {
    const { gfx } = ctx, D = 2.8;
    const pass = gfx.pass(OUT + `
      uniform sampler2D tA, tB; uniform float uTm, uGran, uKill, uTw, uC, uT0;
      const int K = 6; const vec2 N = vec2(.5, .8660254); const float LAG = .45; const vec3 WARM = vec3(1., .66, .3);
      // grains sit on a brick lattice; each belongs to one of 6 sheets: 3 brightness classes (dark lets go first) x 2 temperaments
      vec2 cellOf(vec2 h, float s){ float r = floor(h.y / s); return vec2(floor(h.x / s + .5 * mod(r, 2.)), r); }
      vec2 centreOf(vec2 c, float s){ return vec2(c.x + .5 - .5 * mod(c.y, 2.), c.y + .5) * s; }
      float sheetOf(float la, vec2 gh){ return floor(clamp(.25 * gh.x + .78 * smoothstep(.08, .8, la), 0., .999) * 3.) * 2. + step(.5, fract(gh.x * 7.31)); }
      // position of sheet k's release front along N, in px, as this pixel sees it
      float frontOf(float kf, vec2 qu, float tl){ return uC * (tl - uT0 - LAG * pow(floor(kf * .5) * .5, 1.2) - mod(kf, 2.) * .07 - (vnoise(qu * 5.1 + kf * 9.7) - .5) * .12); }
      void main(){
        vec2 q = gl_FragCoord.xy; float U = min(uRes.x, uRes.y), s = max(3., U * .0044); vec2 qu = q / U;
        float tl = uTm - (vnoise(qu * 2.7 + 3.1) - .5) * .30 - (vnoise(qu * 8.3 + 11.) - .5) * .10;
        // ---- the grain that lives here
        vec2 cell = cellOf(q, s), hc = centreOf(cell, s), gh = hash22(cell + 17.);
        vec3 a = toLinear(textureLod(tA, mix(q, hc, uGran) / uRes, 0.).rgb); float la = sqrt(luma(a));
        float Qh = frontOf(sheetOf(la, gh), qu, tl) - dot(hc, N) + (gh.y - .5) * .1 * uC * step(la, .35);
        float spk = pow(.5 + .5 * sin(uTm * (8. + 14. * gh.x) + 6.2832 * gh.y), 6.);
        vec3 col;
        if (Qh < 0.) {
          float dc = length(q - hc) / s;
          float bead = mix(1., (.78 + .34 * smoothstep(.62, .2, dc)) * (.7 + .6 * gh.y), uGran);
          float pre = smoothstep(-.35 * uC, 0., Qh);
          col = a * bead * (1. + pre * 1.4 * spk * la);
        } else {
          vec3 b = toLinear(textureLod(tB, vUv, 0.).rgb);
          float trev = (uC * (tl - uT0) - dot(q, N)) / uC;
          float lb = smoothstep(.25, .8, sqrt(luma(b)));
          col = b * (1. + 1.6 * lb * (spk - .3) * exp(-max(trev, 0.) * 2.2) * uTw);
        }
        // ---- grains in flight
        for (int k = 0; k < K; k++) {
          float kf = float(k), f = floor(kf * .5) * .5; vec2 hk = hash22(vec2(kf * 7.3 + 1.7, 3.9));
          float fr = frontOf(kf, qu, tl); float Q = fr - dot(q, N); if (Q <= 0.) continue;
          vec2 v = U * vec2((hk.x - .6) * .34, .2 + .2 * hk.y);
          vec2 g = U * vec2(-(.5 + .8 * hk.y), -(2.9 - 1.5 * f) * (.75 + .5 * hk.x));
          float Bq = uC - dot(v, N), be = -.5 * dot(g, N);
          float tau = 2. * Q / (Bq + sqrt(Bq * Bq + 4. * be * Q));
          vec2 h = q - (v * tau + .5 * g * tau * tau);
          vec2 c2 = cellOf(h, s), hc2 = centreOf(c2, s);
          float Qc = fr - dot(hc2, N); if (Qc <= 0.) continue;
          float tc = Qc / uC; vec2 gg = hash22(c2 + 17.);
          float life = (.5 + .65 * f) * (.7 + .6 * gg.y);
          float al = (1. - smoothstep(life * .5, life, tc)) * uKill; if (al <= 0.) continue;
          vec2 qc = hc2 + v * tc + .5 * g * tc * tc + s * .45 * smoothstep(0., .3, tc) * vec2(sin(tc * (7. + 9. * gg.x) + 6.2832 * gg.y), cos(tc * (6. + 8. * gg.y) + 6.2832 * gg.x));
          float rad = s * (.36 + .16 * gg.x);
          float m = smoothstep(rad + .6, rad - .6, length(q - qc)) * al; if (m <= 0.) continue;
          vec3 ac = toLinear(textureLod(tA, hc2 / uRes, 0.).rgb); float lc = sqrt(luma(ac));
          if (sheetOf(lc, gg) != kf) continue;
          float wk = smoothstep(.45, .9, lc);
          float sp2 = pow(.5 + .5 * sin(tc * (10. + 16. * gg.x) + 6.2832 * gg.y), 5.);
          vec3 gc = ac * (1.1 + .5 * gg.y);
          gc = mix(gc, WARM * (.5 + lc) * 1.3, wk * smoothstep(.05, .5, tc) * .75);
          gc *= 1. + 1.8 * sp2 * (.3 + wk);
          col = mix(col, gc, m * mix(.4, 1., smoothstep(.1, .4, lc)));
        }
        // ---- a few bright grains pass close to the lens: soft warm discs, the same size and colour as lit windows
        { float s3 = s * 3.4; float fr = frontOf(4., qu, tl); float Q = fr - dot(q, N);
          if (Q > 0.) {
            vec2 v = U * vec2(-.1, .36), g = U * vec2(-1.5, -3.3);
            float Bq = uC - dot(v, N), be = -.5 * dot(g, N), tau = 2. * Q / (Bq + sqrt(Bq * Bq + 4. * be * Q));
            vec2 c3 = floor((q - (v * tau + .5 * g * tau * tau)) / s3), g3 = hash22(c3 + 41.), hc3 = (c3 + .3 + .4 * g3) * s3;
            float Qc = fr - dot(hc3, N);
            if (Qc > 0. && fract(g3.x * 13.7) < .3) {
              float tc = Qc / uC; vec2 qc = hc3 + v * tc + .5 * g * tc * tc;
              float rad = s3 * (.12 + .16 * smoothstep(0., .8, tc));
              float m = smoothstep(rad, rad * .4, length(q - qc)) * smoothstep(0., .12, tc) * (1. - smoothstep(.45, 1.1, tc)) * uKill;
              if (m > 0.) { vec3 ac = toLinear(textureLod(tA, hc3 / uRes, 0.).rgb); float lc = sqrt(luma(ac));
                col += mix(ac, WARM * lc, .6) * smoothstep(.4, .8, lc) * m * .5; }
            }
          }
        }
        fragColor = vec4(outc(col), 1.); }`, { tA: null, tB: null, uTm: 0, uGran: 0, uKill: 1, uTw: 1, uC: 1000, uT0: .48, uD: 0 });
    warm(gfx, pass);
    const cue = cues([[.09, () => ctx.sfx('grain', { gain: .4 })], [.4, () => ctx.sfx('grain', { gain: .22, pitch: 1.3, pan: .3 })]]);
    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out); if (p >= 1) return gfx.copy(B, out);
        cue(p);
        const u = pass.u; u.tA.value = A.texture; u.tB.value = B.texture;
        u.uTm.value = p * D; u.uGran.value = ss(0, .14, p); u.uKill.value = 1 - ss(.76, .97, p); u.uTw.value = 1 - ss(.8, 1, p);
        u.uC.value = (gfx.W * .5 + gfx.H * .8660254) / .92; u.uD.value = edge(p);
        pass.render(out);
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// tilt — a camera tilting up. A and B are two frames on one sphere, B's axis pitched above A's so that
// A's top 30% and B's bottom 30% are the same band of sky. The pass re-projects both for the current
// pitch (a true rotation: keystone and all), averages along the motion for a shutter-length blur,
// and blends across a wide seam that drifts down through the shared band. Below B's lower edge there is
// nothing to blend with, so A's ground simply dims as the seam passes: it is the last of A to go. 1 pass.
const tilt = {
  dur: 3.6,
  create(ctx) {
    const { gfx } = ctx, D = 3.0, HALF = 20 * Math.PI / 180, OV = .3, SHUTTER = 1 / 24;
    const F = 1 / Math.tan(HALF), AT = HALF + Math.atan((1 - 2 * OV) * Math.tan(HALF));
    const pass = gfx.pass(OUT + `
      uniform sampler2D tA, tB; uniform float uAl, uDA, uAT, uF, uSeam, uHW, uZoom;
      vec2 mir(vec2 u){ u = abs(u); return 1. - abs(1. - u); }
      void main(){
        float asp = uRes.x / uRes.y; vec2 sc = (vUv * 2. - 1.) * vec2(asp, 1.) / uZoom;
        float j = ign(gl_FragCoord.xy); vec3 acc = vec3(0.);
        for (int i = 0; i < 14; i++) {
          float al = uAl + uDA * ((float(i) + j) / 7. - 1.);
          float ca = cos(al), sa = sin(al), yr = sc.y * ca + uF * sa, zr = uF * ca - sc.y * sa;
          float m = smoothstep(uSeam - uHW, uSeam + uHW, atan(yr, zr));   // elevation above A's axis
          if (m < .999) acc += toLinear(textureLod(tA, mir(vec2(sc.x * uF / zr / asp, uF * yr / zr) * .5 + .5), 0.).rgb) * (1. - m);
          if (m > .001) { float bl = al - uAT, cb = cos(bl), sb = sin(bl), yb = sc.y * cb + uF * sb, zb = uF * cb - sc.y * sb;
            vec2 ub = vec2(sc.x * uF / zb / asp, uF * yb / zb) * .5 + .5;
            acc += toLinear(textureLod(tB, mir(ub), 0.).rgb) * m * smoothstep(-.45, 0., ub.y); }
        }
        fragColor = vec4(outc(acc / 14.), 1.); }`, { tA: null, tB: null, uAl: 0, uDA: 0, uAT: AT, uF: F, uSeam: 0, uHW: 1, uZoom: 1, uD: 0 });
    warm(gfx, pass);
    // the city's sound falls away as the lens leaves it; the master low-pass is back to fully open before B settles
    const lp = v => { if (ctx.audio.param) ctx.audio.param('lowpass', v); };
    const cue = cues([[.1, () => ctx.sfx('rise', { gain: .3 })], [.22, () => lp(.72)], [.74, () => lp(1)]]);
    return {
      render({ A, B, p, out }) {
        cue(p);   // before the guards: the low-pass must be reopened even if the last frame lands exactly on 1
        if (p <= 0) return gfx.copy(A, out); if (p >= 1) return gfx.copy(B, out);
        const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, de = p < .5 ? 12 * p * p : 12 * (1 - p) * (1 - p);
        const hw = (2 * HALF - AT) / 2, u = pass.u;
        u.tA.value = A.texture; u.tB.value = B.texture;
        u.uAl.value = AT * e; u.uDA.value = AT * de / D * SHUTTER / 2;
        u.uHW.value = hw; u.uSeam.value = (HALF + hw) + ((AT - HALF - hw) - (HALF + hw)) * e;
        u.uZoom.value = 1 + .03 * Math.pow(Math.sin(Math.PI * p), 2); u.uD.value = edge(p);
        pass.render(out);
      },
    };
  },
};

export const transitions = { fade, pluck, grain, tilt };
