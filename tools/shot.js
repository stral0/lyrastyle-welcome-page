// Usage: node tools/shot.js out.png [--hash name] [--w 1440 --h 900] [--wait 2500] [--keys "ArrowRight,ArrowRight"] [--eval "js"] [--mobile] [--rm] [--file path]
// Prints console errors and failed/external requests. Uses system Chrome with SwiftShader.
const { chromium } = require('playwright-core'); const path = require('path');
const a = process.argv.slice(2); const out = a[0];
const opt = (k, d) => { const i = a.indexOf('--' + k); return i > 0 ? a[i + 1] : d; }; const flag = k => a.includes('--' + k);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--metrics-recording-only', '--no-pings'] });
  const mobile = flag('mobile');
  const ctx = await b.newContext({ viewport: { width: +opt('w', mobile ? 390 : 1440), height: +opt('h', mobile ? 844 : 900) }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, reducedMotion: flag('rm') ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); if (!flag('gate')) await p.addInitScript(() => { window.__LYRA_HEADLESS = true; }); const errs = []; const reqs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
  p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  p.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); });
  const file = path.resolve(opt('file', path.join(__dirname, '..', 'dist', 'index.html')));
  const hash = opt('hash', ''); await p.goto('file://' + file + (hash ? '#' + hash : ''));
  await p.waitForTimeout(+opt('wait', 2500));
  const keys = opt('keys', ''); if (keys) for (const k of keys.split(',')) { await p.keyboard.press(k); await p.waitForTimeout(+opt('keywait', 1800)); }
  const ev = opt('eval', ''); if (ev) { const r = await p.evaluate(ev); if (r !== undefined) console.log('eval:', JSON.stringify(r)); await p.waitForTimeout(+opt('evalwait', 800)); }
  await p.screenshot({ path: out });
  if (errs.length) console.log('CONSOLE:\n' + errs.slice(0, 25).join('\n'));
  if (reqs.length) console.log('EXTERNAL REQUESTS:\n' + reqs.join('\n'));
  console.log('shot', out);
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
