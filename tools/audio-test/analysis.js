// Offline rendering + numeric analysis for the Lyra audio engine. Runs in the page; driven by run.js.
const SR = 48000, LEAD = 0.05;
const dB = x => (x > 0 ? 20 * Math.log10(x) : -Infinity);

async function render(dur, fn, sr = SR) {
  const off = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const a = LyraAudio.createAudio({ context: off, muted: false });
  a.unlock();
  const t0 = performance.now(); fn(a); const synthMs = performance.now() - t0;
  const buf = await off.startRendering();
  return { l: buf.getChannelData(0), r: buf.getChannelData(1), sr, synthMs };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}

function analyse(R, o = {}) {
  const { l, r, sr } = R, n = l.length, m = new Float32Array(n);
  let peak = 0, peakAt = 0;
  for (let i = 0; i < n; i++) { m[i] = 0.5 * (l[i] + r[i]); const a = Math.max(Math.abs(l[i]), Math.abs(r[i])); if (a > peak) { peak = a; peakAt = i; } }
  const out = { peakDb: dB(peak), synthMs: R.synthMs };
  if (peak < 1e-7) { out.silent = true; return out; }
  // onset / end (first and last sample above -60 dB re peak), envelope in 10 ms windows
  const thr = peak * 1e-3; let first = 0, last = n - 1;
  while (first < n && Math.max(Math.abs(l[first]), Math.abs(r[first])) < thr) first++;
  const win = Math.floor(sr * 0.01); let lastWin = 0;
  for (let w = 0; w + win <= n; w += win) { let e = 0; for (let i = w; i < w + win; i++) { const a = Math.max(Math.abs(l[i]), Math.abs(r[i])); if (a > e) e = a; } if (e >= thr) lastWin = w + win; }
  last = Math.min(n - 1, lastWin);
  out.t60 = (last - first) / sr; out.onset = first / sr; out.ranOut = lastWin >= n - win;
  const a0 = o.from !== undefined ? Math.floor(o.from * sr) : first, a1 = o.to !== undefined ? Math.floor(o.to * sr) : last;
  let s2 = 0, sl = 0, srr = 0; for (let i = a0; i < a1; i++) { s2 += 0.5 * (l[i] * l[i] + r[i] * r[i]); sl += l[i]; srr += r[i]; }
  out.rmsDb = dB(Math.sqrt(s2 / Math.max(1, a1 - a0)));
  const dc = Math.max(Math.abs(sl), Math.abs(srr)) / Math.max(1, a1 - a0);
  out.dc = dc; out.dcDb = dB(dc);
  // first audible sample step relative to peak (click detector) and the largest sample-to-sample jump
  let j0 = 0; while (j0 < n && l[j0] === 0 && r[j0] === 0) j0++;
  out.edgeDb = dB(Math.max(Math.abs(l[j0] || 0), Math.abs(r[j0] || 0)) / peak);
  // spectral centroid (Welch, Hann 8192) over the active region
  const N = 8192, hop = 4096, ps = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  let frames = 0;
  for (let p = Math.max(0, a0 - 256); p + N <= Math.max(a1, a0 + N) && p + N <= n; p += hop) {
    for (let i = 0; i < N; i++) { re[i] = m[p + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0; }
    fft(re, im); for (let k = 1; k < N / 2; k++) ps[k] += re[k] * re[k] + im[k] * im[k]; frames++;
  }
  let num = 0, den = 0; for (let k = 2; k < N / 2; k++) { num += ps[k] * k * sr / N; den += ps[k]; }
  out.centroid = den > 0 ? num / den : 0; out.frames = frames;
  // early centroid: first 200 ms after onset
  { const p = first; if (p + N <= n) { for (let i = 0; i < N; i++) { re[i] = m[p + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0; } fft(re, im); let a = 0, b = 0; for (let k = 2; k < N / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; a += e * k * sr / N; b += e; } out.centroid0 = a / b; } }
  if (o.f0) {
    // zoom DFT around the requested fundamental: +-90 cents in 0.25 cent steps, Hann window, 0.15..1.65 s after onset
    const s0 = first + Math.floor(0.15 * sr), L = Math.min(Math.floor(1.5 * sr), n - s0);
    let best = -1, bc = 0;
    const mag = c => { const f = o.f0 * Math.pow(2, c / 1200), w = 2 * Math.PI * f / sr; let cr = 0, ci = 0;
      for (let i = 0; i < L; i += 2) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / L), x = m[s0 + i] * h; cr += x * Math.cos(w * i); ci += x * Math.sin(w * i); } return cr * cr + ci * ci; };
    for (let c = -90; c <= 90; c += 3) { const v = mag(c); if (v > best) { best = v; bc = c; } }
    let b2 = -1, bc2 = bc; for (let c = bc - 3; c <= bc + 3; c += 0.25) { const v = mag(c); if (v > b2) { b2 = v; bc2 = c; } }
    out.cents = bc2; out.f0 = o.f0 * Math.pow(2, bc2 / 1200);
    // autocorrelation pitch (perceived periodicity, pulled by stretched partials)
    const A = Math.min(Math.floor(0.25 * sr), n - s0 - 1), lag0 = sr / o.f0; let ab = -Infinity, al = lag0;
    const ac = lag => { let s = 0; const li = Math.floor(lag), fr = lag - li; for (let i = 0; i < A; i++) { const y = m[s0 + i + li] * (1 - fr) + m[s0 + i + li + 1] * fr; s += m[s0 + i] * y; } return s; };
    for (let d = -0.03; d <= 0.03; d += 0.0005) { const lag = lag0 * (1 + d), v = ac(lag); if (v > ab) { ab = v; al = lag; } }
    out.acCents = 1200 * Math.log2((sr / al) / o.f0);
  }
  return out;
}

function spectrogram(R, title, maxHz = 6000, seconds) {
  const c = document.getElementById('spec'), g = c.getContext('2d'), W = c.width, H = c.height, N = 4096, sr = R.sr;
  const n = seconds ? Math.min(R.l.length, Math.floor(seconds * sr)) : R.l.length, re = new Float64Array(N), im = new Float64Array(N);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const img = g.createImageData(W, H - 20), bins = Math.floor(maxHz / sr * N);
  for (let x = 0; x < W; x++) {
    const p = Math.floor(x / W * (n - N)); if (p < 0) break;
    for (let i = 0; i < N; i++) { re[i] = 0.5 * (R.l[p + i] + R.r[p + i]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0; }
    fft(re, im);
    for (let y = 0; y < H - 20; y++) {
      const k = Math.floor((1 - y / (H - 20)) * bins), d = 10 * Math.log10((re[k] * re[k] + im[k] * im[k]) / (N * N / 16) + 1e-14);
      const v = Math.max(0, Math.min(1, (d + 100) / 80)), o = (y * W + x) * 4;
      img.data[o] = 255 * Math.min(1, v * 1.6); img.data[o + 1] = 255 * Math.pow(v, 1.8); img.data[o + 2] = 255 * Math.pow(v, 4) + 40 * v; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0); g.fillStyle = '#f4ead8'; g.font = '13px sans-serif';
  g.fillText(`${title}  |  0..${maxHz} Hz, ${(n / sr).toFixed(1)} s, -100..-20 dB`, 8, H - 6);
}

const NOTES = { D2: 73.416, D3: 146.832, A3: 220, D4: 293.665 };
const CHORD = [73.416, 110, 146.832, 185, 220, 293.665, 369.99, 440];

async function runAll(filter) {
  const rows = [], want = name => !filter || name.indexOf(filter) >= 0;
  const add = async (name, dur, fn, o) => { if (!want(name)) return; const R = await render(dur, fn); rows.push(Object.assign({ name }, analyse(R, o))); };
  for (const body of ['lyre', 'guitar', 'piano', 'harp'])
    for (const k in NOTES) await add(`pluck ${body} ${k}`, 9, a => a.pluck(NOTES[k], { body, delay: LEAD }), { f0: NOTES[k] });
  await add('pluck lyre D3 bright1', 9, a => a.pluck(146.832, { bright: 1, delay: LEAD }), { f0: 146.832 });
  await add('pluck lyre D3 bright0', 9, a => a.pluck(146.832, { bright: 0, delay: LEAD }), { f0: 146.832 });
  await add('pluck lyre D3 decay.5', 9, a => a.pluck(146.832, { decay: 0.5, delay: LEAD }), { f0: 146.832 });
  await add('pluck lyre D3 decay2', 12, a => a.pluck(146.832, { decay: 2, delay: LEAD }), { f0: 146.832 });
  await add('pluck lyre D5', 9, a => a.pluck(587.33, { delay: LEAD }), { f0: 587.33 });
  await add('pluck lyre 150.0Hz (detuned)', 9, a => a.pluck(150, { delay: LEAD }), { f0: 150 });
  await add('pluck lyre E3 just 165.17', 9, a => a.pluck(165.17, { delay: LEAD }), { f0: 165.17 });
  for (const k of ['kick', 'snare', 'hat', 'tom', 'cymbal', 'rim']) await add(`drum ${k}`, 7, a => a.drum(k, { delay: LEAD }));
  await add('key D3', 6, a => a.key(146.832, { delay: LEAD }), { f0: 146.832 });
  await add('key A4', 6, a => a.key(440, { delay: LEAD }), { f0: 440 });
  await add('key D4 dur4', 8, a => a.key(293.665, { delay: LEAD, dur: 4 }), { f0: 293.665 });
  for (const k of ['whoosh', 'tick', 'click', 'rise', 'bell', 'grain', 'thud', 'select']) await add(`sfx ${k}`, 6, a => a.sfx(k, { delay: LEAD }), k === 'bell' ? { f0: 1174.66 } : undefined);
  for (const k of ['room', 'air', 'sub', 'shimmer', 'hum']) await add(`layer ${k} @1`, 22, a => a.layer(k, 1), { from: 6, to: 22 });
  await add('layers all @1', 22, a => { for (const k of ['room', 'air', 'sub', 'shimmer', 'hum']) a.layer(k, 1); }, { from: 6, to: 22 });
  await add('8 plucks (lyre, gain .5)', 9, a => CHORD.forEach((f, i) => a.pluck(f, { delay: LEAD, pan: -0.7 + 0.2 * i })));
  await add('8 plucks (piano, gain 1)', 9, a => CHORD.forEach((f, i) => a.pluck(f, { body: 'piano', gain: 1, delay: LEAD, pan: -0.7 + 0.2 * i })));
  await add('8 plucks same pan bright1 gain1', 9, a => CHORD.forEach(f => a.pluck(f, { bright: 1, gain: 1, delay: LEAD })));
  await add('everything at once', 9, a => { CHORD.forEach(f => a.pluck(f, { gain: 1, delay: LEAD })); ['kick', 'snare', 'cymbal', 'tom'].forEach(k => a.drum(k, { gain: 1, delay: LEAD })); a.sfx('thud', { delay: LEAD }); a.key(146.8, { gain: 1, delay: LEAD }); for (const k of ['room', 'air', 'sub', 'shimmer', 'hum']) a.layer(k, 1); });
  await add('40 plucks (voice cap)', 9, a => { for (let i = 0; i < 40; i++) a.pluck(73.416 * Math.pow(2, i / 12), { delay: LEAD + i * 0.03 }); });
  await add('retrigger same note x6', 9, a => { for (let i = 0; i < 6; i++) a.pluck(146.832, { delay: LEAD + i * 0.11 }); });
  await add('lowpass 0.2 pluck', 9, a => { a.param('lowpass', 0.2); a.pluck(146.832, { bright: 1, delay: 0.6 }); });
  return rows;
}

// Compressor calibration: static low-level gain of the browser's DynamicsCompressor at the engine's settings.
async function compMakeup(s) {
  const off = new OfflineAudioContext(1, SR * 2, SR), o = off.createOscillator(), g = off.createGain(), c = off.createDynamicsCompressor();
  o.frequency.value = 440; g.gain.value = 0.003;
  c.threshold.value = s.threshold; c.knee.value = s.knee; c.ratio.value = s.ratio; c.attack.value = s.attack; c.release.value = s.release;
  o.connect(g); g.connect(c); c.connect(off.destination); o.start();
  const b = (await off.startRendering()).getChannelData(0); let p = 0; for (let i = SR; i < b.length; i++) p = Math.max(p, Math.abs(b[i]));
  return p / 0.003;
}

// harmonic levels (dB re strongest) of the first `count` harmonics in a window starting `at` seconds after onset
function harmonics(R, f0, at, count = 16, winS = 0.12) {
  const sr = R.sr, n = R.l.length; let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(R.l[i]));
  let first = 0; while (first < n && Math.abs(R.l[first]) < peak * 1e-3) first++;
  const s0 = first + Math.floor(at * sr), L = Math.floor(winS * sr), out = [];
  for (let h = 1; h <= count; h++) { let best = 0;
    for (let c = -30; c <= 30; c += 3) { const w = 2 * Math.PI * f0 * h * Math.pow(2, c / 1200) / sr; let cr = 0, ci = 0;
      for (let i = 0; i < L; i++) { const x = 0.5 * (R.l[s0 + i] + R.r[s0 + i]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / L)); cr += x * Math.cos(w * i); ci += x * Math.sin(w * i); }
      best = Math.max(best, Math.hypot(cr, ci) * 4 / L); }
    out.push(best); }
  return out.map(v => +(20 * Math.log10(v + 1e-12)).toFixed(1));
}
function crest(R, from, to) { const sr = R.sr; let p = 0, s = 0, c = 0; for (let i = Math.floor(from * sr); i < Math.floor(to * sr); i++) { p = Math.max(p, Math.abs(R.l[i])); s += R.l[i] * R.l[i]; c++; } return +(20 * Math.log10(p / Math.sqrt(s / c))).toFixed(1); }
