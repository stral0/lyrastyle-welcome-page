var LyraAudio = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/engine/audio.js
  var audio_exports = {};
  __export(audio_exports, {
    createAudio: () => createAudio
  });
  var TAU = Math.PI * 2;
  var D2 = 73.416;
  var MAX_VOICES = 24;
  var clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  var num = (v, d) => typeof v === "number" && isFinite(v) ? v : d;
  function prng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function addMode(out, sr, f, amp, sigma, phase, n0, floor) {
    if (!(f > 0) || f >= sr * 0.48 || amp === 0) return;
    const w = TAU * f / sr, r = Math.exp(-sigma / sr), k = 2 * r * Math.cos(w), r2 = r * r;
    let end = out.length;
    if (sigma > 0 && floor > 0) {
      const a = Math.abs(amp);
      if (a <= floor) return;
      end = Math.min(end, n0 + Math.ceil(Math.log(a / floor) / sigma * sr));
    }
    let y1 = amp / r * Math.cos(phase - w), y2 = amp / r2 * Math.cos(phase - 2 * w);
    for (let i = n0; i < end; i++) {
      const y = k * y1 - r2 * y2;
      out[i] += y;
      y2 = y1;
      y1 = y;
    }
  }
  function addModes(out, sr, list, floor) {
    const M = [], N = out.length;
    for (let i = 0; i < list.length; i += 4) {
      const f = list[i], amp = list[i + 1], sg = list[i + 2], ph = list[i + 3];
      if (!(f > 0) || f >= sr * 0.48 || amp === 0) continue;
      let end = N;
      if (sg > 0 && floor > 0) {
        const a = Math.abs(amp);
        if (a <= floor) continue;
        end = Math.min(N, Math.ceil(Math.log(a / floor) / sg * sr));
      }
      const w = TAU * f / sr, r = Math.exp(-sg / sr);
      M.push({ end, k: 2 * r * Math.cos(w), r2: r * r, y1: amp / r * Math.cos(ph - w), y2: amp / (r * r) * Math.cos(ph - 2 * w) });
    }
    M.sort((a, b) => b.end - a.end);
    const tail = (m, n0) => {
      const k = m.k, r2 = m.r2;
      let y1 = m.y1, y2 = m.y2;
      for (let i = n0; i < m.end; i++) {
        const y = k * y1 - r2 * y2;
        out[i] += y;
        y2 = y1;
        y1 = y;
      }
    };
    let g = 0;
    for (; g + 4 <= M.length; g += 4) {
      const A = M[g], B = M[g + 1], C = M[g + 2], D = M[g + 3], n = D.end;
      const ka = A.k, ra = A.r2, kb = B.k, rb = B.r2, kc = C.k, rc = C.r2, kd = D.k, rd = D.r2;
      let a1 = A.y1, a2 = A.y2, b1 = B.y1, b2 = B.y2, c1 = C.y1, c2 = C.y2, d1 = D.y1, d2 = D.y2;
      for (let i = 0; i < n; i++) {
        const ya = ka * a1 - ra * a2, yb = kb * b1 - rb * b2, yc = kc * c1 - rc * c2, yd = kd * d1 - rd * d2;
        out[i] += ya + yb + (yc + yd);
        a2 = a1;
        a1 = ya;
        b2 = b1;
        b1 = yb;
        c2 = c1;
        c1 = yc;
        d2 = d1;
        d1 = yd;
      }
      A.y1 = a1;
      A.y2 = a2;
      B.y1 = b1;
      B.y2 = b2;
      C.y1 = c1;
      C.y2 = c2;
      tail(A, n);
      tail(B, n);
      tail(C, n);
    }
    for (; g < M.length; g++) tail(M[g], 0);
  }
  function addGlide(out, sr, f, amp, sigma, glide, gTau, at) {
    const n0 = Math.floor((at || 0) * sr), n = Math.min(out.length - n0, Math.ceil(11 / sigma * sr)), dt = 1 / sr;
    let ph = 0;
    const gk = Math.exp(-dt / gTau), dk = Math.exp(-sigma * dt);
    let g = glide, e = amp;
    for (let i = 0; i < n; i++) {
      out[n0 + i] += e * Math.sin(ph);
      ph += TAU * f * (1 + g) * dt;
      g *= gk;
      e *= dk;
    }
  }
  function svf(x, sr, fc, q, mode) {
    const vary = typeof fc === "function", k = 1 / q;
    let ic1 = 0, ic2 = 0, g = 0, a1 = 0, a2 = 0, a3 = 0;
    const set = (f) => {
      g = Math.tan(Math.PI * clamp(f / sr, 1e-5, 0.49));
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    };
    set(vary ? fc(0) : fc);
    for (let i = 0, n = x.length; i < n; i++) {
      if (vary && (i & 15) === 0) set(fc(i / sr));
      const v0 = x[i], v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      x[i] = mode === 0 ? v2 : mode === 1 ? v1 * k : v0 - k * v1 - v2;
    }
    return x;
  }
  function fadeIn(x, n) {
    n = Math.min(n | 0, x.length);
    for (let i = 0; i < n; i++) x[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / n);
  }
  function fadeOut(x, n) {
    n = Math.min(n | 0, x.length);
    const L = x.length;
    for (let i = 0; i < n; i++) x[L - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / n);
  }
  function peakOf(x) {
    let p = 0;
    for (let i = 0; i < x.length; i++) {
      const a = x[i] < 0 ? -x[i] : x[i];
      if (a > p) p = a;
    }
    return p;
  }
  function scale(x, g) {
    for (let i = 0; i < x.length; i++) x[i] *= g;
    return x;
  }
  function normalise(x, peak) {
    const p = peakOf(x);
    return p > 0 ? scale(x, peak / p) : x;
  }
  function burst(out, sr, rnd, o) {
    const n0 = Math.floor((o.at || 0) * sr), att = Math.max(1, (o.attack || 4e-4) * sr);
    const n = Math.min(out.length - n0, Math.ceil((o.len || (o.attack || 0) + o.tau * 9) * sr));
    if (n <= 2) return;
    const tmp = new Float32Array(n), dk = Math.exp(-1 / (o.tau * sr));
    let e = 1;
    for (let i = 0; i < n; i++) {
      tmp[i] = (rnd() * 2 - 1) * e * (i < att ? 0.5 - 0.5 * Math.cos(Math.PI * i / att) : 1);
      if (i >= att) e *= dk;
    }
    if (o.hp) svf(tmp, sr, o.hp, o.q || 0.707, 2);
    if (o.lp) svf(tmp, sr, o.lp, o.q || 0.707, 0);
    if (o.bp) svf(tmp, sr, o.bp, o.q || 1, 1);
    fadeOut(tmp, n >> 2);
    for (let i = 0; i < n; i++) out[n0 + i] += tmp[i] * o.amp;
  }
  function aWeight(f) {
    const f2 = f * f;
    return 1.2589 * 148693636 * f2 * f2 / ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148693636));
  }
  var BODIES = {
    lyre: {
      pos: 0.21,
      alpha: 0.98,
      fc: 3600,
      B: 7e-5,
      bx: 1,
      t60: 5.5,
      tx: 0.37,
      d1: 1.9,
      d2: 0.6,
      eps: 45e-5,
      lo: 185,
      modes: [[262, 10, 0.9], [455, 12, 0.75], [790, 9, 0.5], [1480, 6, 0.3]],
      thump: 0.2,
      noise: 0.5,
      att: 22e-4
    },
    guitar: {
      pos: 0.17,
      alpha: 0.95,
      fc: 4e3,
      B: 5e-5,
      bx: 1,
      t60: 5.9,
      tx: 0.36,
      d1: 1.6,
      d2: 0.45,
      eps: 35e-5,
      lo: 92,
      modes: [[104, 14, 1], [205, 16, 0.85], [392, 12, 0.5], [720, 7, 0.3]],
      thump: 0.26,
      noise: 0.4,
      att: 18e-4
    },
    piano: {
      pos: 0.122,
      alpha: 0.92,
      fc: 2e3,
      B: 11e-5,
      bx: 1.4,
      t60: 6.2,
      tx: 0.3,
      d1: 1.2,
      d2: 0.5,
      eps: 55e-5,
      lo: 70,
      modes: [[92, 5, 0.5], [182, 6, 0.5], [345, 5, 0.35], [610, 4, 0.25]],
      thump: 0.15,
      noise: 0.9,
      att: 36e-4,
      struck: true
    },
    harp: {
      pos: 0.4,
      alpha: 1.08,
      fc: 3100,
      B: 4e-5,
      bx: 1,
      t60: 6.1,
      tx: 0.35,
      d1: 1.5,
      d2: 0.5,
      eps: 3e-4,
      lo: 110,
      modes: [[128, 8, 0.8], [236, 10, 0.7], [420, 8, 0.4]],
      thump: 0.14,
      noise: 0.3,
      att: 34e-4
    }
  };
  function renderString(sr, f0, bodyName, bright, decay) {
    const b = BODIES[bodyName] || BODIES.lyre, m = (a, c) => a + (c - a) * bright;
    const seed = Math.round(f0 * 64) * 2654435761 + bodyName.length * 97 + Math.round(bright * 8) * 131 >>> 0, rnd = prng(seed);
    const pos = clamp(b.pos * m(1.3, 0.78), 0.04, 0.5);
    const alpha = b.alpha + m(0.55, -0.1);
    const fc = b.fc * Math.pow(2, m(-1.4, 1.2)) * Math.pow(f0 / 146.83, 0.3);
    const B = clamp(b.B * Math.pow(f0 / 146.83, b.bx), 0, 5e-3);
    const dmp = m(1.4, 0.78), fmax = Math.min(sr * 0.45, 15e3);
    const T = clamp(b.t60 * Math.pow(D2 / f0, b.tx), 1.3, 6.4) * decay;
    const H = [0, 0, 0];
    const body = (f) => {
      let re = 1, im = 0, g = 0;
      for (let i = 0; i < b.modes.length; i++) {
        const md = b.modes[i], x = md[1] * (f / md[0] - md[0] / f), d = md[2] / (1 + x * x);
        re += d;
        im -= d * x;
        g += md[2] / Math.sqrt(1 + x * x);
      }
      H[0] = re;
      H[1] = im;
      H[2] = g;
    };
    const lowCut = (f) => Math.sqrt((f * f + 0.07 * b.lo * b.lo) / (f * f + b.lo * b.lo));
    const P = [];
    let amax = 0;
    const raw = [];
    for (let n = 1; n <= 110; n++) {
      const f = n * f0 * Math.sqrt((1 + B * n * n) / (1 + B));
      if (f > fmax) break;
      body(f);
      const x = f / fc;
      const a = Math.sin(n * Math.PI * pos) / Math.pow(n, alpha) / Math.sqrt(1 + x * x * x * x) * Math.hypot(H[0], H[1]) * lowCut(f);
      raw.push([n, f, a, H[2], Math.atan2(H[1], H[0]) + (rnd() - 0.5) * 1.1 * Math.min(1, f / 1200)]);
      if (Math.abs(a) > amax) amax = Math.abs(a);
    }
    for (let i = 0; i < raw.length; i++) {
      const n = raw[i][0], f = raw[i][1], a = raw[i][2], r = raw[i][3], ph = raw[i][4];
      if (Math.abs(a) < amax * 2e-4) continue;
      const fk = f / 1e3, base = (b.d1 * fk + b.d2 * fk * fk) * dmp, c = 1 + 0.5 * r;
      const e = b.eps * (0.8 + 0.4 * rnd());
      if (n > 14) {
        P.push([f, a, base, c, ph]);
        continue;
      }
      if (b.struck) {
        P.push([f, a * 0.5, base, c * 1.28, ph], [f * (1 + e), a * 0.3, base, c * 0.6, ph], [f * (1 - e * (0.6 + 0.5 * rnd())), a * 0.2, base, c * 0.74, ph]);
      } else {
        P.push([f * (1 - 0.28 * e), a * 0.72, base, c * 1.18, ph], [f * (1 + 0.72 * e), a * 0.28, base, c * 0.58, ph]);
      }
    }
    let e0 = 0;
    for (let i = 0; i < P.length; i++) e0 += P[i][1] * P[i][1];
    const energyAt = (s02, kb2) => {
      let e = 0;
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        e += p[1] * p[1] * Math.exp(-2 * (s02 + p[2] * kb2) * p[3] * T);
      }
      return e / e0;
    };
    let s0 = 0.03, kb = 1;
    if (energyAt(s0, 1) > 1e-6) {
      let lo = s0, hi = 80;
      for (let i = 0; i < 40; i++) {
        const md = (lo + hi) / 2;
        if (energyAt(md, 1) > 1e-6) lo = md;
        else hi = md;
      }
      s0 = (lo + hi) / 2;
    } else if (decay > 1) {
      let lo = 0.02, hi = 1;
      for (let i = 0; i < 30; i++) {
        const md = (lo + hi) / 2;
        if (energyAt(s0, md) > 1e-6) hi = md;
        else lo = md;
      }
      kb = (lo + hi) / 2;
    }
    let loud = 0;
    for (let i = 0; i < P.length; i++) loud += P[i][1] * P[i][1] * aWeight(P[i][0]);
    const ref = Math.sqrt(e0), len = Math.ceil(sr * Math.min(9.5, T * 1.22 + 0.2)), out = new Float32Array(len), bank = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      bank.push(p[0], p[1], (s0 + p[2] * kb) * p[3], p[4]);
    }
    addModes(out, sr, bank, ref * 1e-4);
    fadeIn(out, sr * b.att * m(1.9, 0.6));
    for (let i = 0; i < b.modes.length; i++) {
      const md = b.modes[i];
      addMode(out, sr, md[0], ref * b.thump * md[2] * (0.6 + 0.6 * bright), Math.PI * md[0] / md[1], -Math.PI / 2, 0, ref * 1e-4);
    }
    if (b.struck) {
      burst(out, sr, rnd, { attack: 2e-3, tau: 0.012, amp: ref * 0.5 * b.noise, lp: 700 + 900 * bright, q: 0.6 });
    } else {
      burst(out, sr, rnd, { attack: 12e-4, tau: m(8e-3, 45e-4), amp: ref * b.noise * m(0.16, 0.5), bp: m(1300, 3400), q: 0.8 });
    }
    fadeOut(out, len * 0.14);
    scale(out, 0.34 / Math.sqrt(loud));
    const pk = peakOf(out);
    if (pk > 0.92) scale(out, 0.92 / pk);
    if (Math.round(12 * Math.log2(f0 / D2)) & 1) scale(out, -1);
    return out;
  }
  function renderKey(sr, f0) {
    const rnd = prng(Math.round(f0 * 32) * 40503 >>> 0), T = clamp(4.6 * Math.pow(146.83 / f0, 0.28), 1.8, 5.2);
    const len = Math.ceil(sr * (T * 1.15 + 0.2)), out = new Float32Array(len), bank = [];
    const hi = clamp(Math.log2(f0 / 146.83) / 3, 0, 1);
    const I0 = 1.7 - 0.95 * hi, I1 = 0.62 - 0.38 * hi, sa = 6.91 / T, sb = 1 / 0.16, sc = 1 / 1.3;
    const voice = (f, g, ph) => {
      bank.push(f, g, sa, ph, f, -g * 0.22 * I0, sa + sb * 1.4, ph);
      bank.push(2 * f, g * 0.5 * I0, sa + sb, ph, 2 * f, g * 0.5 * I1, sa + sc, ph);
      bank.push(3 * f, g * 0.13 * I0 * I0, sa + 2 * sb, ph, 3 * f, g * 0.13 * I1 * I1, sa + 2 * sc, ph);
      bank.push(4 * f, g * 0.022 * I0 * I0 * I0, sa + 3 * sb, ph, 5 * f, g * 4e-3 * I0 * I0 * I0 * I0, sa + 4 * sb, ph);
    };
    voice(f0, 0.66, -Math.PI / 2);
    voice(f0 * 1.0009, 0.34, -Math.PI / 2 + 1.1);
    bank.push(Math.min(f0 * 7.11, 7200), 0.05 * (1 - 0.5 * hi), 1 / 0.035, -Math.PI / 2, f0 * 2.002, 0.05, sa * 2.2, -Math.PI / 2);
    addModes(out, sr, bank, 2e-5);
    fadeIn(out, sr * 4e-3);
    burst(out, sr, rnd, { attack: 2e-3, tau: 9e-3, amp: 0.2, lp: 520, q: 0.6 });
    fadeOut(out, len * 0.15);
    const loud = aWeight(f0) + 0.4 * aWeight(2 * f0) + 0.1 * aWeight(3 * f0);
    scale(out, 0.4 / Math.sqrt(loud));
    const pk = peakOf(out);
    if (pk > 0.92) scale(out, 0.92 / pk);
    return out;
  }
  var HEAD = [1, 1.593, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501];
  var DRUMS = {
    kick(sr, v) {
      const o = new Float32Array(Math.ceil(sr * 0.95)), r = prng(11 + v), f = 55.06;
      const amp = [1, 0.5, 0.26, 0.2, 0.11, 0.09], t60 = [0.46, 0.24, 0.17, 0.15, 0.11, 0.1];
      for (let i = 0; i < 6; i++) addGlide(o, sr, f * HEAD[i], amp[i], 6.91 / t60[i], 0.2, 0.016 + 4e-3 * i);
      addGlide(o, sr, 146.8, 0.1, 6.91 / 0.12, 0.02, 0.02);
      burst(o, sr, r, { attack: 15e-4, tau: 0.011, amp: 0.9, lp: 320, q: 0.6 });
      burst(o, sr, r, { attack: 6e-4, tau: 4e-3, amp: 0.22, bp: 2300, q: 0.9 });
      fadeOut(o, sr * 0.1);
      return normalise(o, 0.9);
    },
    tom(sr, v) {
      const o = new Float32Array(Math.ceil(sr * 1.25)), r = prng(23 + v), f = 146.83;
      const amp = [1, 0.55, 0.3, 0.22, 0.14, 0.1, 0.08, 0.06], t60 = [0.9, 0.5, 0.32, 0.28, 0.2, 0.18, 0.15, 0.12];
      for (let i = 0; i < 8; i++) addGlide(o, sr, f * HEAD[i], amp[i], 6.91 / t60[i], 0.07, 0.03);
      burst(o, sr, r, { attack: 6e-4, tau: 4e-3, amp: 0.4, bp: 3e3, q: 0.8 });
      burst(o, sr, r, { attack: 1e-3, tau: 0.01, amp: 0.5, lp: 600, q: 0.6 });
      fadeOut(o, sr * 0.15);
      return normalise(o, 0.9);
    },
    snare(sr, v) {
      const n = Math.ceil(sr * 0.62), o = new Float32Array(n), r = prng(37 + v * 101);
      const f = [185, 293.7, 396, 428, 545], amp = [1, 0.62, 0.3, 0.22, 0.18], t60 = [0.26, 0.2, 0.15, 0.13, 0.11];
      for (let i = 0; i < 5; i++) addGlide(o, sr, f[i], amp[i], 6.91 / t60[i], 0.05, 0.02);
      const w = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sr, e = (1 - Math.exp(-t / 25e-4)) * (0.72 * Math.exp(-t / 0.05) + 0.28 * Math.exp(-t / 0.13));
        w[i] = (r() * 2 - 1) * e * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 185 * t)));
      }
      svf(w, sr, 1500, 0.6, 2);
      svf(w, sr, 8200, 0.6, 0);
      for (let i = 0; i < n; i++) o[i] += w[i] * 1.5;
      burst(o, sr, r, { attack: 4e-4, tau: 2e-3, amp: 0.7, bp: 4200, q: 0.7 });
      fadeOut(o, sr * 0.1);
      return normalise(o, 0.9);
    },
    hat(sr, v) {
      const o = new Float32Array(Math.ceil(sr * 0.3)), r = prng(53 + v * 211);
      const bank = [];
      for (let i = 0; i < 34; i++) {
        const u = (i + r()) / 34, f = 2700 * Math.pow(5.2, u);
        bank.push(f, (0.4 + 0.6 * r()) * (1 - 0.5 * u), 6.91 / (0.16 - 0.1 * u) * (0.8 + 0.4 * r()), r() * TAU);
      }
      addModes(o, sr, bank, 1e-4);
      burst(o, sr, r, { attack: 5e-4, tau: 0.022, amp: 2.2, hp: 7e3, q: 0.7 });
      fadeIn(o, sr * 6e-4);
      fadeOut(o, sr * 0.06);
      return normalise(o, 0.9);
    },
    cymbal(sr, v) {
      const o = new Float32Array(Math.ceil(sr * 4.8)), r = prng(71 + v), bank = [];
      for (let i = 0; i < 88; i++) {
        const u = (i + 0.9 * r()) / 88, f = 330 * Math.pow(42, Math.pow(u, 0.7)) * (1 + 0.012 * (r() - 0.5));
        const lf = Math.log2(f / 330) / Math.log2(42);
        const a = (0.35 + 0.65 * r()) * Math.exp(-3.5 * (lf - 0.7) * (lf - 0.7));
        const t60 = (4.6 - 2.9 * lf) * (0.75 + 0.5 * r());
        const ph = r() * TAU;
        bank.push(f, a, 6.91 / t60, ph, f, -a, 1 / (4e-3 + 0.07 * lf * r()), ph);
      }
      const ping = [523, 794, 1178, 1630];
      for (let i = 0; i < 4; i++) bank.push(ping[i], 0.9 - 0.15 * i, 6.91 / (1.1 - 0.2 * i), -Math.PI / 2);
      addModes(o, sr, bank, 15e-5);
      const n = Math.ceil(sr * 3), w = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        w[i] = (r() * 2 - 1) * (1 - Math.exp(-t / 0.03)) * Math.exp(-t / 0.5);
      }
      svf(w, sr, 5200, 0.6, 2);
      for (let i = 0; i < n; i++) o[i] += w[i] * 1.6;
      burst(o, sr, r, { attack: 4e-4, tau: 3e-3, amp: 2.5, bp: 5200, q: 0.6 });
      fadeIn(o, sr * 8e-4);
      fadeOut(o, sr * 0.9);
      return normalise(o, 0.9);
    },
    rim(sr, v) {
      const o = new Float32Array(Math.ceil(sr * 0.2)), r = prng(89 + v * 17);
      const f = [587.3, 1101, 1762, 2640], amp = [1, 0.7, 0.45, 0.25], t60 = [0.07, 0.075, 0.05, 0.035];
      for (let i = 0; i < 4; i++) addMode(o, sr, f[i] * (1 + 4e-3 * v), amp[i], 6.91 / t60[i], -Math.PI / 2, 0, 1e-4);
      burst(o, sr, r, { attack: 3e-4, tau: 15e-4, amp: 0.8, bp: 3600, q: 0.7 });
      fadeOut(o, sr * 0.04);
      return normalise(o, 0.9);
    }
  };
  var DRUM_LEVEL = { kick: 1, snare: 0.7, hat: 0.32, tom: 0.85, cymbal: 0.42, rim: 0.5 };
  var DRUM_TAU = { kick: 0.08, snare: 0.05, hat: 0.02, tom: 0.14, cymbal: 0.7, rim: 0.012 };
  var DRUM_VARIANTS = { snare: 2, hat: 2, rim: 2 };
  var SFX = {
    whoosh(sr) {
      const n = Math.ceil(sr * 1.15), o = new Float32Array(n), r = prng(101), L = n / sr;
      for (let i = 0; i < n; i++) {
        const u = i / n, s = Math.sin(Math.PI * Math.pow(u, 0.72));
        o[i] = (r() * 2 - 1) * s * s;
      }
      const hi = new Float32Array(o);
      svf(o, sr, (t) => 260 * Math.pow(9, Math.pow(Math.sin(Math.PI * Math.pow(t / L, 0.72)), 2)), 1.1, 1);
      svf(hi, sr, (t) => 2400 + 3800 * (t / L), 0.6, 2);
      for (let i = 0; i < n; i++) o[i] += hi[i] * 0.07;
      fadeOut(o, n * 0.2);
      return normalise(o, 0.9);
    },
    tick(sr, v) {
      const o = new Float32Array(Math.ceil(sr * 0.22)), r = prng(113 + v * 7), f = 587.33 * (v ? 0.985 : 1);
      addMode(o, sr, f, 1, 6.91 / 0.1, -Math.PI / 2, 0, 1e-4);
      addMode(o, sr, f * 3.93, 0.22 + 0.06 * v, 6.91 / 0.04, -Math.PI / 2, 0, 1e-4);
      addMode(o, sr, f * 9.2, 0.05, 6.91 / 0.018, -Math.PI / 2, 0, 1e-4);
      burst(o, sr, r, { attack: 5e-4, tau: 3e-3, amp: 0.35, lp: 1800, q: 0.6 });
      fadeIn(o, sr * 7e-4);
      fadeOut(o, sr * 0.05);
      return normalise(o, 0.9);
    },
    click(sr) {
      const o = new Float32Array(Math.ceil(sr * 0.05)), r = prng(127);
      addMode(o, sr, 1958, 0.6, 1 / 4e-3, -Math.PI / 2, 0, 1e-4);
      burst(o, sr, r, { attack: 3e-4, tau: 18e-4, amp: 0.8, bp: 3300, q: 0.8 });
      fadeOut(o, sr * 0.01);
      return normalise(o, 0.9);
    },
    rise(sr) {
      const n = Math.ceil(sr * 1.9), o = new Float32Array(n), r = prng(131), w = new Float32Array(n), L = n / sr;
      let p = 0, q = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n, f = 146.83 * Math.pow(2, u * u), e = u * u * (0.6 + 0.4 * u);
        o[i] = e * (0.5 * Math.sin(p) + 0.2 * Math.sin(q) + 0.12 * Math.sin(2 * p));
        p += TAU * f / sr;
        q += TAU * f * 1.5 / sr;
        w[i] = (r() * 2 - 1) * e;
      }
      svf(w, sr, (t) => 380 * Math.pow(14, Math.pow(t / L, 1.5)), 1.4, 1);
      for (let i = 0; i < n; i++) o[i] += w[i] * 0.9;
      fadeOut(o, sr * 0.11);
      return normalise(o, 0.9);
    },
    bell(sr) {
      const o = new Float32Array(Math.ceil(sr * 3.8)), r = prng(137), f = 1174.66;
      const pr = [[0.5, 0.5, 3.4], [1, 1, 2.6], [1.25, 0.42, 1.7], [1.5, 0.3, 1.3], [2, 0.5, 1.05], [2.51, 0.2, 0.62], [3.01, 0.18, 0.46], [4.17, 0.1, 0.28], [5.43, 0.07, 0.18]];
      const bank = [];
      for (let i = 0; i < pr.length; i++) {
        const fp = f * pr[i][0], s = 6.91 / pr[i][2], d = (0.45 + 0.9 * r()) / fp;
        bank.push(fp * (1 - d), pr[i][1] * 0.64, s, -Math.PI / 2, fp * (1 + d), pr[i][1] * 0.36, s * 0.85, -Math.PI / 2 + r());
      }
      addModes(o, sr, bank, 2e-5);
      burst(o, sr, r, { attack: 3e-4, tau: 2e-3, amp: 0.25, hp: 3e3, q: 0.7 });
      fadeIn(o, sr * 1e-3);
      fadeOut(o, sr * 0.6);
      return normalise(o, 0.9);
    },
    grain(sr, v) {
      const n = Math.ceil(sr * 0.5), o = new Float32Array(n), r = prng(149 + v * 313);
      for (let g = 0; g < 70; g++) {
        const t0 = 4e-3 + 0.4 * Math.pow(r(), 1.9), gl = Math.ceil(sr * (6e-4 + 28e-4 * r())), a = (0.25 + 0.75 * r()) * (1 - t0 / 0.5);
        const i0 = Math.floor(t0 * sr), f = 2200 * Math.pow(4.5, r()), ph = r() * TAU, mix = r();
        for (let i = 0; i < gl && i0 + i < n; i++) {
          const e = 0.5 - 0.5 * Math.cos(TAU * i / gl);
          o[i0 + i] += a * e * (mix * Math.sin(ph + TAU * f * i / sr) + (1 - mix) * (r() * 2 - 1));
        }
      }
      svf(o, sr, 1700, 0.7, 2);
      fadeOut(o, sr * 0.05);
      return normalise(o, 0.9);
    },
    thud(sr) {
      const o = new Float32Array(Math.ceil(sr * 0.6)), r = prng(151);
      addGlide(o, sr, 61.2, 1, 6.91 / 0.34, 0.45, 0.028);
      addGlide(o, sr, 110.1, 0.3, 6.91 / 0.16, 0.2, 0.02);
      burst(o, sr, r, { attack: 2e-3, tau: 0.02, amp: 0.9, lp: 260, q: 0.6 });
      fadeOut(o, sr * 0.1);
      return normalise(o, 0.9);
    },
    select(sr) {
      const o = new Float32Array(Math.ceil(sr * 0.62)), notes = [[1174.66, 0, 1], [1761.99, 0.078, 0.8]];
      for (let k = 0; k < 2; k++) {
        const f = notes[k][0], n0 = Math.floor(notes[k][1] * sr), a = notes[k][2];
        const tmp = new Float32Array(o.length - n0);
        addMode(tmp, sr, f, a, 6.91 / 0.36, -Math.PI / 2, 0, 1e-4);
        addMode(tmp, sr, f * 2, a * 0.16, 6.91 / 0.2, -Math.PI / 2, 0, 1e-4);
        addMode(tmp, sr, f * 3.01, a * 0.05, 6.91 / 0.12, -Math.PI / 2, 0, 1e-4);
        fadeIn(tmp, sr * 3e-3);
        for (let i = 0; i < tmp.length; i++) o[n0 + i] += tmp[i];
      }
      fadeOut(o, sr * 0.1);
      return normalise(o, 0.9);
    }
  };
  var SFX_LEVEL = { whoosh: 0.5, tick: 0.5, click: 0.36, rise: 0.5, bell: 0.46, grain: 0.42, thud: 0.9, select: 0.4 };
  var SFX_TAU = { whoosh: 0.5, tick: 0.02, click: 5e-3, rise: 1.2, bell: 0.4, grain: 0.15, thud: 0.06, select: 0.08 };
  var SFX_VARIANTS = { tick: 2, grain: 3 };
  var IR_ENERGY = 0.3;
  function makeIR(ctx) {
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.3), buf = ctx.createBuffer(2, len, sr);
    const pre = Math.floor(0.022 * sr), rm = prng(7802), mid = new Float32Array(len);
    for (let i = 0; i < len; i++) mid[i] = rm() * 2 - 1;
    const chans = [];
    let energy = 0;
    for (let ch = 0; ch < 2; ch++) {
      const r = prng(20973 + ch * 977), d = new Float32Array(len);
      const kd = Math.pow(10, -3 / (1.95 * sr)), kb = Math.exp(-1 / (0.03 * sr));
      let env = 1, bld = 1;
      for (let i = pre; i < len; i++) {
        d[i] = (0.84 * (r() * 2 - 1) + 0.38 * mid[i]) * (1 - bld) * env;
        env *= kd;
        bld *= kb;
      }
      let y1 = 0, y2 = 0, c = 0;
      for (let i = pre; i < len; i++) {
        if ((i - pre & 31) === 0) c = 1 - Math.exp(-TAU * (1250 + 7800 * Math.exp(-(i - pre) / sr / 0.4)) / sr);
        y1 += c * (d[i] - y1);
        y2 += c * (y1 - y2);
        d[i] = y2;
      }
      for (let k = 0; k < 12; k++) {
        const t = 3e-3 + 0.07 * Math.pow((k + 0.2 + 0.6 * r()) / 12, 1.25), i = pre + Math.floor(t * sr);
        const a = 0.9 * (1 - k / 16) * (r() < 0.5 ? -1 : 1);
        d[i - 1] += a * 0.5;
        d[i] += a;
        d[i + 1] += a * 0.5;
      }
      svf(d, sr, 140, 0.707, 2);
      fadeOut(d, sr * 0.35);
      for (let i = 0; i < len; i++) energy += d[i] * d[i];
      chans.push(d);
    }
    const g = Math.sqrt(IR_ENERGY / (energy / 2));
    for (let ch = 0; ch < 2; ch++) buf.getChannelData(ch).set(scale(chans[ch], g));
    return buf;
  }
  function ceilingCurve() {
    const n = 4097, c = new Float32Array(n), a = 0.4, top = 0.5;
    for (let i = 0; i < n; i++) {
      const x = (i - 2048) / 2048, ax = Math.abs(x);
      c[i] = ax <= a ? x : Math.sign(x) * (a + (top - a) * Math.tanh((ax - a) / (top - a)));
    }
    return c;
  }
  var COMP = { threshold: -20, knee: 14, ratio: 6, attack: 4e-3, release: 0.22, trim: 0.4126 };
  function buildGraph(ctx) {
    const sr = ctx.sampleRate, dest = ctx.destination;
    const mk = (v) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const master = mk(0), trim = mk(COMP.trim), sum = mk(1), mix = mk(1);
    const shaper = ctx.createWaveShaper();
    shaper.curve = ceilingCurve();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = COMP.threshold;
    comp.knee.value = COMP.knee;
    comp.ratio.value = COMP.ratio;
    comp.attack.value = COMP.attack;
    comp.release.value = COMP.release;
    const lpMax = Math.min(2e4, sr * 0.45);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpMax;
    lp.Q.value = 0.6;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 24;
    hp.Q.value = 0.707;
    sum.connect(comp);
    comp.connect(trim);
    trim.connect(mix);
    mix.connect(lp);
    lp.connect(hp);
    hp.connect(shaper);
    shaper.connect(master);
    master.connect(dest);
    const revIn = mk(1);
    revIn.channelCount = 1;
    revIn.channelCountMode = "explicit";
    revIn.channelInterpretation = "speakers";
    const conv = ctx.createConvolver();
    conv.normalize = false;
    conv.buffer = makeIR(ctx);
    const revOut = mk(1);
    revIn.connect(conv);
    conv.connect(revOut);
    revOut.connect(sum);
    const bus = (level, send, to) => {
      const g = mk(level);
      g.connect(to || sum);
      if (send > 0) {
        const s = mk(send);
        g.connect(s);
        s.connect(revIn);
      }
      return g;
    };
    const buses = { pluck: bus(1, 0.3), key: bus(0.95, 0.32), drum: bus(0.95, 0.16), sfx: bus(0.85, 0.26), bed: bus(1, 0, mix) };
    const cache = /* @__PURE__ */ new Map();
    let cacheSamples = 0;
    function cached(key, make) {
      let b = cache.get(key);
      if (b) {
        cache.delete(key);
        cache.set(key, b);
        return b;
      }
      const data = make();
      b = ctx.createBuffer(1, data.length, sr);
      b.getChannelData(0).set(data);
      cache.set(key, b);
      cacheSamples += data.length;
      while (cache.size > 80 || cacheSamples > 8e6) {
        const k = cache.keys().next().value;
        if (k === key) break;
        cacheSamples -= cache.get(k).length;
        cache.delete(k);
      }
      return b;
    }
    function stringBuffer(freq, o) {
      const f = clamp(num(freq, 146.83), 24, 4400), body = BODIES[o && o.body] ? o.body : "lyre";
      const semi = Math.round(12 * Math.log2(f / D2)), bq = Math.round(clamp(num(o && o.bright, 0.5), 0, 1) * 4);
      const dq = clamp(Math.round(2 * Math.log2(clamp(num(o && o.decay, 1), 0.2, 3))), -4, 3), fb = D2 * Math.pow(2, semi / 12);
      const buffer = cached("s|" + body + "|" + semi + "|" + bq + "|" + dq, () => renderString(sr, fb, body, bq / 4, Math.pow(2, dq / 2)));
      return { buffer, rate: f / fb, tag: "s" + body + semi };
    }
    function keyBuffer(freq) {
      const f = clamp(num(freq, 293.66), 24, 4400), semi = Math.round(12 * Math.log2(f / D2)), fb = D2 * Math.pow(2, semi / 12);
      return { buffer: cached("k|" + semi, () => renderKey(sr, fb)), rate: f / fb, tag: "k" + semi };
    }
    const human = prng(6699);
    const rr = {};
    const variant = (id, n) => n ? rr[id] = ((rr[id] || 0) + 1) % n : 0;
    const drumBuffer = (kind, v) => cached("d|" + kind + "|" + v, () => DRUMS[kind](sr, v));
    const sfxBuffer = (name, v) => cached("x|" + name + "|" + v, () => SFX[name](sr, v));
    const voices = [];
    const hasPanner = typeof ctx.createStereoPanner === "function";
    function drop(v) {
      try {
        v.src.onended = null;
        v.g.disconnect();
        v.out.disconnect();
      } catch (e) {
      }
    }
    function fade(v, t, tau) {
      const g = v.g.gain;
      try {
        g.cancelScheduledValues(t);
        g.setTargetAtTime(0, t, tau);
        v.src.stop(t + tau * 8);
      } catch (e) {
      }
      v.end = Math.min(v.end, t + tau * 8);
      v.amp = 0;
    }
    function play(buffer, o) {
      const now = ctx.currentTime, t = now + Math.max(0, num(o.delay, 0));
      let live = 0, best = -1, score = Infinity;
      for (let i = voices.length - 1; i >= 0; i--) {
        const v2 = voices[i];
        if (v2.end <= now) {
          drop(v2);
          voices.splice(i, 1);
          if (best > i) best--;
          continue;
        }
        if (o.tag && v2.tag === o.tag && v2.amp > 0 && v2.start <= t) fade(v2, t, o.choke || 0.03);
        if (v2.amp <= 0 || v2.end <= t) continue;
        live++;
        const s = v2.start > t ? Infinity : v2.amp * Math.exp(-(t - v2.start) / v2.tau);
        if (s < score) {
          score = s;
          best = i;
        }
      }
      if (live >= MAX_VOICES && best >= 0) fade(voices[best], t, 0.012);
      const gain = Math.max(0, num(o.gain, 1));
      if (gain <= 0) return null;
      const rate = clamp(num(o.rate, 1), 0.125, 8), pan = clamp(num(o.pan, 0), -1, 1);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      const g = mk(gain);
      let out;
      if (hasPanner) {
        out = ctx.createStereoPanner();
        out.pan.value = pan;
        g.connect(out);
      } else {
        const x = (pan + 1) * Math.PI / 4, l = mk(Math.cos(x)), r = mk(Math.sin(x));
        out = ctx.createChannelMerger(2);
        g.channelCount = 1;
        g.channelCountMode = "explicit";
        g.connect(l);
        g.connect(r);
        l.connect(out, 0, 0);
        r.connect(out, 0, 1);
      }
      src.connect(g);
      out.connect(o.bus);
      let end = t + buffer.duration / rate + 0.02;
      src.start(t);
      if (o.release > 0) {
        g.gain.setValueAtTime(gain, t);
        g.gain.setTargetAtTime(0, t + o.release, o.releaseTau);
        end = Math.min(end, t + o.release + o.releaseTau * 9);
        src.stop(end);
      }
      const v = { src, g, out, start: t, end, amp: gain, tau: o.tau || 0.4, tag: o.tag || "" };
      src.onended = () => {
        v.end = 0;
      };
      voices.push(v);
      return v;
    }
    function silence(t, tau) {
      for (let i = 0; i < voices.length; i++) fade(voices[i], t, tau);
    }
    let noiseBuf = null, shimmerBuf = null, humWave = null;
    function noiseLoop() {
      if (!noiseBuf) {
        const n = Math.floor(sr * 5.3);
        noiseBuf = ctx.createBuffer(2, n, sr);
        for (let ch = 0; ch < 2; ch++) {
          const d = noiseBuf.getChannelData(ch), r = prng(2577 + ch * 31);
          for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
        }
      }
      return noiseBuf;
    }
    function shimmerLoop() {
      if (!shimmerBuf) {
        const rate = sr >= 44100 ? sr / 2 : sr, L = 16, n = Math.floor(rate * L), r = prng(21521), l = new Float32Array(n), rt = new Float32Array(n);
        const notes = [[587.33, 0.5], [880.99, 0.42], [1174.66, 0.36], [1321.49, 0.13], [1468.32, 0.2], [1761.99, 0.24], [2349.32, 0.1]];
        const beats = [2, 3, 5, 7, 4, 6, 9];
        for (let i = 0; i < notes.length; i++) {
          const fc = Math.round(notes[i][0] * L) / L, a = notes[i][1];
          const parts = [[fc, a], [fc - beats[i] / L, a * 0.62], [fc + beats[(i + 3) % 7] / L, a * 0.62]];
          const c = [], gl = [], gr = [], y1 = [], y2 = [];
          for (let k = 0; k < 3; k++) {
            const x = (0.5 + (r() - 0.5) * 0.9) * Math.PI / 2, ph = r() * TAU, w = TAU * parts[k][0] / rate;
            c.push(2 * Math.cos(w));
            gl.push(parts[k][1] * Math.cos(x));
            gr.push(parts[k][1] * Math.sin(x));
            y1.push(Math.cos(ph - w));
            y2.push(Math.cos(ph - 2 * w));
          }
          const c0 = c[0], c1 = c[1], c2 = c[2], l0 = gl[0], l1 = gl[1], l2 = gl[2], r0 = gr[0], r1 = gr[1], r2 = gr[2];
          let a1 = y1[0], a2 = y2[0], b1 = y1[1], b2 = y2[1], d1 = y1[2], d2 = y2[2];
          for (let j = 0; j < n; j++) {
            const ya = c0 * a1 - a2, yb = c1 * b1 - b2, yd = c2 * d1 - d2;
            l[j] += ya * l0 + yb * l1 + yd * l2;
            rt[j] += ya * r0 + yb * r1 + yd * r2;
            a2 = a1;
            a1 = ya;
            b2 = b1;
            b1 = yb;
            d2 = d1;
            d1 = yd;
          }
        }
        const g = 0.5 / Math.max(peakOf(l), peakOf(rt));
        shimmerBuf = ctx.createBuffer(2, n, rate);
        shimmerBuf.getChannelData(0).set(scale(l, g));
        shimmerBuf.getChannelData(1).set(scale(rt, g));
      }
      return shimmerBuf;
    }
    const loop = (buffer, offset) => {
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.start(0, offset || 0);
      return s;
    };
    const osc = (f, type) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      if (type) o.type = type;
      o.start();
      return o;
    };
    const filt = (type, f, q) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const chain = (...n) => {
      for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]);
      return n[n.length - 1];
    };
    const BEDS = {
      room: { level: 0.02, send: 0, make() {
        const s = loop(noiseLoop(), 1.7), a = filt("lowpass", 260, 0.5), b = filt("lowpass", 900, 0.5), hpf = filt("highpass", 45, 0.7), out = mk(1);
        const h = filt("bandpass", 3800, 0.5), hg = mk(0.012);
        chain(s, hpf, a, b, out);
        chain(s, h, hg, out);
        return { out, srcs: [s], all: [s, a, b, hpf, h, hg, out] };
      } },
      air: { level: 0.13, send: 0.12, make() {
        const s = loop(noiseLoop(), 0), bp = filt("bandpass", 420, 0.75), hpf = filt("highpass", 170, 0.7), amp = mk(0.72), out = mk(1);
        const l1 = osc(0.083), l1g = mk(150), l2 = osc(0.131), l2g = mk(0.26), l3 = osc(0.047), l3g = mk(90);
        chain(s, bp, hpf, amp, out);
        chain(l1, l1g, bp.frequency);
        chain(l3, l3g, bp.frequency);
        chain(l2, l2g, amp.gain);
        return {
          out,
          srcs: [s, l1, l2, l3],
          all: [s, bp, hpf, amp, out, l1, l1g, l2, l2g, l3, l3g],
          tune(level, t) {
            bp.frequency.setTargetAtTime(360 + 820 * level, t, 0.8);
          }
        };
      } },
      sub: { level: 0.055, send: 0, make() {
        const out = mk(1), lpf = filt("lowpass", 190, 0.6), a = osc(36.708), ag = mk(0.5), b = osc(73.416), bg = mk(0.6), c = osc(73.526), cg = mk(0.34), d = osc(110.124), dg = mk(0.09);
        chain(a, ag, lpf);
        chain(b, bg, lpf);
        chain(c, cg, lpf);
        chain(d, dg, lpf);
        lpf.connect(out);
        return { out, srcs: [a, b, c, d], all: [a, ag, b, bg, c, cg, d, dg, lpf, out] };
      } },
      shimmer: { level: 0.085, send: 0.7, make() {
        const s = loop(shimmerLoop(), 0), out = mk(1);
        s.connect(out);
        return { out, srcs: [s], all: [s, out] };
      } },
      hum: { level: 0.013, send: 0, make() {
        if (!humWave) {
          const h = [0, 1, 0.42, 0.6, 0.16, 0.3, 0.08, 0.14, 0.04, 0.07, 0.02, 0.035], re = new Float32Array(h.length), im = new Float32Array(h);
          humWave = ctx.createPeriodicWave(re, im);
        }
        const o = ctx.createOscillator();
        o.setPeriodicWave(humWave);
        o.frequency.value = 55.062;
        o.start();
        const lpf = filt("lowpass", 520, 0.5), out = mk(1), s = loop(noiseLoop(), 3.1), bp = filt("bandpass", 4600, 0.4), hg = mk(0.05);
        chain(o, lpf, out);
        chain(s, bp, hg, out);
        return { out, srcs: [o, s], all: [o, lpf, out, s, bp, hg] };
      } }
    };
    const beds = {};
    function setBed(name, level) {
      const def = BEDS[name];
      if (!def) return;
      let b = beds[name];
      const t = ctx.currentTime;
      if (!b) {
        if (level <= 0) return;
        const inst = def.make(), g = mk(0);
        inst.out.connect(g);
        g.connect(buses.bed);
        let s = null;
        if (def.send > 0) {
          s = mk(def.send);
          g.connect(s);
          s.connect(revIn);
        }
        b = beds[name] = { inst, g, s, level: 0 };
      }
      b.level = level;
      b.g.gain.cancelScheduledValues(t);
      b.g.gain.setTargetAtTime(def.level * Math.pow(level, 1.5), t, 0.8);
      if (b.inst.tune) b.inst.tune(level, t);
    }
    function killBed(name) {
      const b = beds[name];
      if (!b) return;
      delete beds[name];
      try {
        b.inst.srcs.forEach((s) => s.stop());
        b.inst.all.forEach((n) => n.disconnect());
        b.g.disconnect();
        if (b.s) b.s.disconnect();
      } catch (e) {
      }
    }
    const macro = {
      lowpass(v, t) {
        lp.frequency.cancelScheduledValues(t);
        lp.frequency.setTargetAtTime(Math.min(lpMax, 240 * Math.pow(2e4 / 240, clamp(v, 0, 1))), t, 0.07);
      },
      reverb(v, t) {
        revOut.gain.cancelScheduledValues(t);
        revOut.gain.setTargetAtTime(clamp(v, 0, 2), t, 0.1);
      },
      volume(v, t) {
        mix.gain.cancelScheduledValues(t);
        mix.gain.setTargetAtTime(clamp(v, 0, 1), t, 0.08);
      }
    };
    return {
      ctx,
      master,
      buses,
      voices,
      beds,
      cache,
      string(freq, o) {
        const s = stringBuffer(freq, o);
        return play(s.buffer, {
          bus: buses.pluck,
          gain: num(o.gain, 0.5) * (1 + 0.08 * (human() - 0.5)),
          pan: o.pan,
          rate: s.rate * (1 + 8e-4 * (human() - 0.5)),
          delay: o.delay,
          tag: s.tag,
          choke: 0.035,
          tau: s.buffer.duration / 5
        });
      },
      key(freq, o) {
        const s = keyBuffer(freq), dur = clamp(num(o.dur, 1.6), 0.05, 12);
        return play(s.buffer, { bus: buses.key, gain: num(o.gain, 0.5), pan: o.pan, rate: s.rate, delay: o.delay, tag: s.tag, choke: 0.03, tau: 0.7, release: dur, releaseTau: 0.085 });
      },
      drum(kind, o) {
        if (!DRUMS[kind]) return null;
        return play(drumBuffer(kind, variant("d" + kind, DRUM_VARIANTS[kind])), {
          bus: buses.drum,
          gain: num(o.gain, 0.6) * DRUM_LEVEL[kind],
          pan: o.pan,
          rate: num(o.pitch, 1),
          delay: o.delay,
          tag: kind === "hat" ? "dhat" : "",
          choke: 0.012,
          tau: DRUM_TAU[kind]
        });
      },
      sfx(name, o) {
        if (!SFX[name]) return null;
        return play(sfxBuffer(name, variant("x" + name, SFX_VARIANTS[name])), { bus: buses.sfx, gain: num(o.gain, 1) * SFX_LEVEL[name], pan: o.pan, rate: num(o.pitch, 1), delay: o.delay, tau: SFX_TAU[name] });
      },
      setBed,
      killBed,
      killBeds() {
        Object.keys(beds).forEach(killBed);
      },
      silence,
      param(name, v) {
        if (macro[name]) macro[name](v, ctx.currentTime);
      },
      setMaster(on, instant) {
        const g = master.gain, t = ctx.currentTime;
        if (instant) {
          g.value = on ? 1 : 0;
          return;
        }
        g.cancelScheduledValues(t);
        g.setTargetAtTime(on ? 1 : 0, t, on ? 0.12 : 0.036);
      },
      warm(item) {
        try {
          if (item.pluck) {
            const k = cache.size;
            stringBuffer(item.pluck, item);
            return cache.size !== k;
          }
          if (item.key) {
            const k = cache.size;
            keyBuffer(item.key);
            return cache.size !== k;
          }
          if (item.drum && DRUMS[item.drum]) {
            const k = cache.size;
            for (let v = 0; v < (DRUM_VARIANTS[item.drum] || 1); v++) drumBuffer(item.drum, v);
            return cache.size !== k;
          }
          if (item.sfx && SFX[item.sfx]) {
            const k = cache.size;
            for (let v = 0; v < (SFX_VARIANTS[item.sfx] || 1); v++) sfxBuffer(item.sfx, v);
            return cache.size !== k;
          }
          if (item.layer === "shimmer") {
            const had = !!shimmerBuf;
            shimmerLoop();
            return !had;
          }
        } catch (e) {
        }
        return false;
      }
    };
  }
  var LAYER_NAMES = ["room", "air", "sub", "shimmer", "hum"];
  function createAudio(opts) {
    const injected = opts && opts.context || null;
    const g = typeof globalThis !== "undefined" ? globalThis : {};
    const AC = g.AudioContext || g.webkitAudioContext || null;
    let ac = null, G = null, dead = !injected && !AC;
    let muted = dead ? true : !(opts && opts.muted === false);
    let kicked = false, suspendTimer = 0, muteTimer = 0, warmTimer = 0;
    const want = { room: 0, air: 0, sub: 0, shimmer: 0, hum: 0 }, sent = {}, bedTimers = {}, params = {}, paramSent = {};
    let flushTimer = 0, lastFlush = 0;
    const warmQueue = [];
    const safe = (fn) => {
      try {
        return fn();
      } catch (e) {
        return void 0;
      }
    };
    const later = (fn, ms) => typeof setTimeout === "function" ? setTimeout(fn, ms) : 0;
    const cancel = (id) => {
      if (id && typeof clearTimeout === "function") clearTimeout(id);
    };
    const wall = () => g.performance && g.performance.now ? g.performance.now() : Date.now();
    const running = () => !!ac && (injected ? true : ac.state === "running");
    const live = () => !muted && !!G && running();
    function graph() {
      if (!G && ac) {
        try {
          G = buildGraph(ac);
          G.setMaster(!!(injected && opts.muted === false), true);
        } catch (e) {
          G = null;
          dead = true;
          muted = true;
          if (!injected) safe(() => ac.close());
        }
        if (G && !injected) {
          ["whoosh", "tick", "select", "click"].forEach((n) => warmQueue.push({ sfx: n }));
          pump();
        }
      }
      return G;
    }
    function pump() {
      if (warmTimer || !warmQueue.length || !G || injected) return;
      warmTimer = later(() => {
        warmTimer = 0;
        if (!G) return;
        const t0 = wall();
        while (warmQueue.length && wall() - t0 < 6) G.warm(warmQueue.shift());
        pump();
      }, 60);
    }
    function resume() {
      if (!ac || injected) return;
      cancel(suspendTimer);
      suspendTimer = 0;
      if (ac.state !== "running" && ac.state !== "closed") safe(() => {
        const p = ac.resume();
        if (p && p.catch) p.catch(() => {
        });
      });
    }
    function idle() {
      if (!ac || injected) return;
      cancel(suspendTimer);
      suspendTimer = later(() => {
        suspendTimer = 0;
        if (muted && ac && ac.state === "running") safe(() => {
          const p = ac.suspend();
          if (p && p.catch) p.catch(() => {
          });
        });
      }, 900);
    }
    function flush() {
      flushTimer = 0;
      lastFlush = wall();
      if (!live()) return;
      for (let i = 0; i < LAYER_NAMES.length; i++) {
        const n = LAYER_NAMES[i], v = want[n];
        if (sent[n] === v) continue;
        sent[n] = v;
        cancel(bedTimers[n]);
        bedTimers[n] = 0;
        safe(() => G.setBed(n, v));
        if (v <= 0 && G.beds[n] && !injected) bedTimers[n] = later(() => {
          bedTimers[n] = 0;
          if (G && want[n] <= 0) safe(() => G.killBed(n));
        }, 5200);
      }
      for (const k in params) if (paramSent[k] !== params[k]) {
        paramSent[k] = params[k];
        safe(() => G.param(k, params[k]));
      }
    }
    function touch() {
      if (flushTimer || !live()) return;
      const wait = 45 - (wall() - lastFlush);
      if (wait <= 0 || injected) flush();
      else flushTimer = later(flush, wait);
    }
    function wake() {
      if (!live()) return;
      cancel(muteTimer);
      muteTimer = 0;
      for (const k in sent) delete sent[k];
      for (const n in G.beds) sent[n] = -1;
      safe(() => G.setMaster(true, false));
      flush();
    }
    function unlock() {
      try {
        if (dead) return false;
        if (!ac) {
          ac = injected || new AC({ latencyHint: "interactive" });
          if (!injected && ac.addEventListener) ac.addEventListener("statechange", () => {
            if (!running()) return;
            if (muted) idle();
            else if (graph()) wake();
          });
        }
        if (injected) {
          if (!muted) {
            graph();
            wake();
          }
          return true;
        }
        if (!kicked) {
          kicked = true;
          safe(() => {
            const s = ac.createBufferSource();
            s.buffer = ac.createBuffer(1, 1, ac.sampleRate);
            s.connect(ac.destination);
            s.start(0);
          });
        }
        if (muted) {
          if (!suspendTimer && ac.state === "running") idle();
        } else {
          resume();
          if (graph()) wake();
        }
        return true;
      } catch (e) {
        if (!ac) {
          dead = true;
          muted = true;
        }
        return false;
      }
    }
    function setMuted(m) {
      try {
        m = !!m;
        if (dead) {
          muted = true;
          return;
        }
        if (m === muted) {
          if (!m) unlock();
          return;
        }
        muted = m;
        if (!m) {
          const ua = g.navigator && g.navigator.userActivation;
          if (ac || injected || !ua || ua.hasBeenActive) unlock();
          return;
        }
        cancel(flushTimer);
        flushTimer = 0;
        if (G) {
          safe(() => G.setMaster(false, false));
          cancel(muteTimer);
          muteTimer = later(() => {
            muteTimer = 0;
            if (!muted || !G) return;
            safe(() => {
              G.silence(G.ctx.currentTime, 0.01);
              G.killBeds();
            });
            for (const k in sent) delete sent[k];
          }, 260);
        }
        idle();
      } catch (e) {
      }
    }
    const api = {
      unlock,
      setMuted,
      get muted() {
        return muted;
      },
      get ctx() {
        return ac;
      },
      now() {
        return ac ? ac.currentTime : 0;
      },
      pluck(freq, o) {
        if (live()) return void safe(() => G.string(freq, o || {}));
      },
      drum(kind, o) {
        if (live()) return void safe(() => G.drum(kind, o || {}));
      },
      key(freq, o) {
        if (live()) return void safe(() => G.key(freq, o || {}));
      },
      sfx(name, o) {
        if (live()) return void safe(() => G.sfx(name, o || {}));
      },
      layer(name, level) {
        if (!(name in want)) return;
        const v = clamp(num(level, 0), 0, 1);
        if (Math.abs(v - want[name]) < 4e-3 && !(v === 0 && want[name] !== 0) && !(v === 1 && want[name] !== 1)) return;
        want[name] = v;
        touch();
      },
      param(name, v) {
        v = num(v, 1);
        if (params[name] === v) return;
        params[name] = v;
        touch();
      },
      // optional: render buffers ahead of first use. items: {pluck: freq, body, bright, decay} | {key: freq} | {drum: kind} | {sfx: name} | {layer: 'shimmer'}
      warm(items) {
        if (dead || !items) return;
        const list = Array.isArray(items) ? items : [items];
        for (let i = 0; i < list.length; i++) if (list[i]) warmQueue.push(list[i]);
        if (warmQueue.length > 200) warmQueue.splice(0, warmQueue.length - 200);
        pump();
      }
    };
    return api;
  }
  return __toCommonJS(audio_exports);
})();
