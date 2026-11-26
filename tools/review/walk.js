// Real keyboard walk through every beat; shots at start / mid / settled, and mid-flight for transitions.
const L = require('./lib.js');
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; }; const flag = k => a.includes('--' + k);
(async () => {
  const tag = opt('tag', 'w'); const b = await L.launch();
  const p = await L.open(b, { w: +opt('w', 1440), h: +opt('h', 900), mobile: flag('mobile'), rm: flag('rm') });
  if (opt('lang', 'sr') === 'en') { await p.evaluate(() => window.__lyra.lang('en')); }
  const scenes = await p.evaluate(() => window.__lyra.scenes); const durs = { zica: [7, 7, 8], ploca: [0, 0], talas: [0, 0], sazvezdje: [8.5, 6, 6] };
  const times = (opt('times', '1.2,3.5,S')).split(',');
  let first = true;
  for (const sc of scenes) for (let bi = 0; bi < sc.beats; bi++) {
    if (!first) {
      await p.keyboard.press('ArrowRight');
      if (bi === 0 && !flag('notr')) { // scene transition: capture mid-flight
        for (let k = 0; k < 6; k++) { await p.waitForTimeout(k ? 250 : 120); const s = await L.st(p); if (!s.tr) break; await L.shot(p, `rv-${tag}-tr-${sc.id}-${k}`); }
      }
      await L.settle(p);
    }
    first = false;
    for (const t of times) {
      const name = `rv-${tag}-${sc.id}-${bi + 1}-${t}`;
      if (t === 'S') { await L.waitBt(p, +opt('settle', 13)); } else await L.waitBt(p, +t);
      const s = await L.st(p); await L.shot(p, name); console.log('  state', JSON.stringify({ id: s.id, beat: s.beat, bt: +s.bt.toFixed(2), calls: s.calls, tris: s.tris, W: s.W, H: s.H, dpr: s.dpr, hash: s.hash }));
    }
  }
  L.report(p, tag); await b.close();
})().catch(e => { console.error('walk crashed', e.message); process.exit(1); });
