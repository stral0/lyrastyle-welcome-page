// node tools/audio-test/run.js [--filter str] [--spec "pluck lyre D3"] [--live]
const path = require('path'), fs = require('fs');
const esbuild = require('esbuild'); const { chromium } = require('playwright-core');
const here = __dirname, root = path.join(here, '..', '..');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
(async () => {
  await esbuild.build({ entryPoints: [path.join(root, 'src/engine/audio.js')], bundle: true, format: 'iife', globalName: 'LyraAudio', target: ['es2020'], outfile: path.join(here, 'audio.iife.js'), logLevel: 'warning' });
  await esbuild.build({ entryPoints: [path.join(root, 'src/engine/audio.js')], bundle: true, format: 'esm', target: ['es2020'], outfile: '/tmp/audio.bundle.js', logLevel: 'warning' });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1420, height: 560 } });
  const errors = [], warnings = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(here, 'index.html'));
  const f = v => (v === undefined || v === null ? '' : Number.isFinite(v) ? v.toFixed(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) : String(v));
  if (arg('--spec')) {
    const [name, code, hz, secs] = arg('--spec').split('|');
    await page.evaluate(async ([name, code, hz, secs]) => { const R = await render(+secs || 6, new Function('a', code)); spectrogram(R, name, +hz || 6000, +secs || 6); }, [name, code, hz, secs]);
    const out = path.join(here, 'spec-' + name.replace(/\W+/g, '_') + '.png'); await (await page.$('#spec')).screenshot({ path: out }); console.log('wrote', out);
  } else {
    const mk = await page.evaluate(() => compMakeup({ threshold: -20, knee: 14, ratio: 6, attack: 0.004, release: 0.22 }));
    console.log(`compressor built-in make-up: x${mk.toFixed(4)} (${(20 * Math.log10(mk)).toFixed(2)} dB)`);
    const rows = await page.evaluate(flt => runAll(flt), arg('--filter'));
    const head = ['cue', 'peak dB', 'rms dB', 'DC dB', 't-60 s', 'centr Hz', 'c0 Hz', 'f0 Hz', 'cents', 'acf c', 'edge dB', 'synth ms'];
    const lines = rows.map(r => [r.name, f(r.peakDb), f(r.rmsDb), f(r.dcDb), f(r.t60) + (r.ranOut ? '+' : ''), f(r.centroid), f(r.centroid0), f(r.f0), f(r.cents), f(r.acCents), f(r.edgeDb), f(r.synthMs)]);
    const w = head.map((h, i) => Math.max(h.length, ...lines.map(l => l[i].length)));
    const fmt = l => l.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ');
    console.log(fmt(head)); console.log(w.map(n => '-'.repeat(n)).join('  ')); lines.forEach(l => console.log(fmt(l)));
    fs.writeFileSync(path.join(here, 'last-run.json'), JSON.stringify(rows, null, 1));
    const bad = [];
    for (const r of rows) {
      if (r.silent) { bad.push(r.name + ': SILENT'); continue; }
      if (r.peakDb > -6.0) bad.push(`${r.name}: peak ${f(r.peakDb)} dBFS above -6`);
      if (r.dcDb > -70) bad.push(`${r.name}: DC ${f(r.dcDb)} dB`);
      if (r.cents !== undefined && Math.abs(r.cents) > 5 && !/lowpass/.test(r.name)) bad.push(`${r.name}: ${f(r.cents)} cents off`);
      if (/^pluck .* (D2|D3|A3|D4)$/.test(r.name) && (r.t60 < 2.5 || r.t60 > 6.3)) bad.push(`${r.name}: t-60 ${f(r.t60)} s out of range`);
    }
    console.log(bad.length ? '\nFAILED CHECKS:\n  ' + bad.join('\n  ') : '\nall numeric checks passed');
  }
  if (process.argv.includes('--live') || !arg('--spec')) {
    // live smoke test: real AudioContext, whole public API, mute/unmute, no throws, no console errors
    const live = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms)), log = [];
      // tap whatever reaches a real destination so the live path can be measured, not just exercised
      let tap = null; const conn = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (dst, ...rest) {
        if (dst instanceof AudioDestinationNode && !(this instanceof AudioBufferSourceNode)) { tap = this.context.createAnalyser(); tap.fftSize = 2048; conn.call(this, tap); }
        return conn.call(this, dst, ...rest);
      };
      const level = async ms => { const buf = new Float32Array(2048); let p = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { if (tap) { tap.getFloatTimeDomainData(buf); for (const v of buf) p = Math.max(p, Math.abs(v)); } await wait(15); } return p > 0 ? (20 * Math.log10(p)).toFixed(1) + ' dBFS' : 'silent'; };
      const a = LyraAudio.createAudio();
      log.push('initial muted=' + a.muted + ' now=' + a.now() + ' ctx=' + a.ctx);
      a.pluck(146); a.drum('kick'); a.layer('air', 1); a.sfx('bell'); a.key(220); a.param('lowpass', 0.5);   // locked: no-ops
      a.unlock(); a.unlock();
      log.push('after unlock (muted): state=' + (a.ctx && a.ctx.state));
      a.setMuted(false); await wait(600);
      log.push('unmuted: muted=' + a.muted + ' state=' + a.ctx.state + ' sr=' + a.ctx.sampleRate + ' idle output=' + await level(150));
      a.pluck(146.83); log.push('live pluck peak: ' + await level(500));
      a.layer('air', 1); a.layer('sub', 1); log.push('live beds after 2.5 s: ' + await level(2500));
      a.layer('air', 0); a.layer('sub', 0); await wait(6500); log.push('beds at 0 for 6.5 s (torn down): ' + await level(300));
      for (const b of ['lyre', 'guitar', 'piano', 'harp', 'nonsense']) a.pluck(146.83, { body: b, pan: 0.3 });
      a.pluck(NaN); a.pluck(1e9); a.pluck(-5, { gain: -1, pan: 9, decay: 0, bright: 7 }); a.pluck(220, null);
      for (const k of ['kick', 'snare', 'hat', 'tom', 'cymbal', 'rim', 'bogus']) a.drum(k, { pitch: 1.1 });
      for (const k of ['whoosh', 'tick', 'click', 'rise', 'bell', 'grain', 'thud', 'select', 'bogus']) a.sfx(k);
      a.key(293.66, { dur: 0.5 }); a.key(440);
      for (const k of ['room', 'air', 'sub', 'shimmer', 'hum', 'bogus']) a.layer(k, 1);
      for (let i = 0; i < 120; i++) { a.layer('air', i / 120); a.param('lowpass', i / 120); }
      a.warm([{ pluck: 220 }, { drum: 'cymbal' }, { sfx: 'rise' }, { key: 440 }, { layer: 'shimmer' }, null, {}]);
      for (let i = 0; i < 60; i++) a.pluck(100 + i * 7, { gain: 0.2 });
      await wait(700); const t1 = a.now();
      log.push('time advances: ' + (t1 > 0.3));
      log.push('busy peak (everything + 60 plucks): ' + await level(400));
      a.setMuted(true); await wait(400); const mutedLevel = await level(200); await wait(900);
      log.push('muted: output=' + mutedLevel + ' state=' + a.ctx.state + ' (expected silent, suspended)');
      a.pluck(146); a.setMuted(false); a.unlock(); await wait(500);
      a.pluck(220); log.push('re-unmuted: state=' + a.ctx.state + ' pluck peak=' + await level(400) + ' (beds restored at level 1)');
      a.pluck(146); a.setMuted(true); a.setMuted(false); a.setMuted(true); await wait(200);
      // AudioContext unavailable
      const AC = window.AudioContext, WAC = window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined;
      const d = LyraAudio.createAudio(); d.unlock(); d.setMuted(false); d.pluck(100); d.layer('sub', 1); d.sfx('tick'); d.param('lowpass', 0);
      log.push('no AudioContext: muted=' + d.muted + ' now=' + d.now() + ' ctx=' + d.ctx);
      // AudioContext constructor that throws
      window.AudioContext = function () { throw new Error('refused'); };
      const e = LyraAudio.createAudio(); e.setMuted(false); e.unlock(); e.pluck(100);
      log.push('throwing AudioContext: muted=' + e.muted);
      window.AudioContext = AC; window.webkitAudioContext = WAC; AudioNode.prototype.connect = conn;
      return log;
    });
    console.log('\nlive smoke test:\n  ' + live.join('\n  '));
  }
  console.log(`\nconsole errors: ${errors.length}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  if (warnings.length) console.log('console warnings:\n  ' + [...new Set(warnings)].join('\n  '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
