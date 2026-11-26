// Slow-motion capture: node slowmo.js --hash zica-3 --key ArrowRight --n 10 --dt 100 --per 3 --tag tr-ploca [--w --h --mobile --pre 0]
const L = require('./lib.js');
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; }; const flag = k => a.includes('--' + k);
(async () => {
  const b = await L.launch(); const p = await L.open(b, { w: opt('w') ? +opt('w') : undefined, h: opt('h') ? +opt('h') : undefined, mobile: flag('mobile'), rm: flag('rm'), init: L.RAF_CTL, hash: opt('hash', 'zica') });
  if (opt('lang', 'sr') === 'en') await p.evaluate(() => window.__lyra.lang('en'));
  await p.waitForTimeout(+opt('wait', 2500));
  if (opt('eval')) await p.evaluate(opt('eval'));
  await L.frames(p, 2, 16);
  if (opt('key')) await p.keyboard.press(opt('key'));
  if (+opt('pre', 0) > 0) await L.frames(p, Math.round(+opt('pre') * 1000 / 250), 250);
  const n = +opt('n', 10), dt = +opt('dt', 100), per = +opt('per', 3), tag = opt('tag', 'slow');
  for (let k = 0; k < n; k++) { await L.frames(p, per, dt); const s = await L.st(p); await L.shot(p, `rv-${tag}-${String(k).padStart(2, '0')}`); console.log('  ', s.id, s.beat, 'bt', s.bt.toFixed(2), 'tr', s.tr); }
  L.report(p, tag); await b.close();
})().catch(e => { console.error('slowmo crashed', e.message); process.exit(1); });
