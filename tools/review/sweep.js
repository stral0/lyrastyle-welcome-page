// Settled-state sweep: every beat at its finished hold, for one viewport. Optional panel/overview/help shots.
const L = require('./lib.js');
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; }; const flag = k => a.includes('--' + k);
(async () => {
  const tag = opt('tag', 's'); const b = await L.launch();
  const p = await L.open(b, { w: opt('w') ? +opt('w') : undefined, h: opt('h') ? +opt('h') : undefined, mobile: flag('mobile'), rm: flag('rm'), dpr: opt('dpr') ? +opt('dpr') : undefined, touch: flag('touch') });
  if (opt('lang', 'sr') === 'en') await p.evaluate(() => window.__lyra.lang('en'));
  const scenes = await p.evaluate(() => window.__lyra.scenes);
  const only = opt('only', '');
  for (const sc of scenes) for (let bi = 0; bi < sc.beats; bi++) {
    const key = sc.id + '-' + (bi + 1); if (only && !only.split(',').includes(key)) continue;
    await p.evaluate(([id, b]) => { window.__lyra.goto(id, b, true); }, [sc.id, bi]);
    await p.waitForTimeout(+opt('hold', 3500));
    await p.mouse.move(5, 5); // wake chrome so it is judged at full opacity
    await p.waitForTimeout(700);
    await L.shot(p, `rv-${tag}-${key}`);
  }
  const s = await L.st(p); console.log('state', JSON.stringify(s));
  L.report(p, tag); await b.close();
})().catch(e => { console.error('sweep crashed', e.message); process.exit(1); });
