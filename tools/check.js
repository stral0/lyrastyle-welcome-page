// End-to-end check of dist/index.html: walks every beat with the keyboard (real transitions), then exercises
// hash deep links, language toggle, overview, mute, reduced motion and mobile. Prints PASS/FAIL lines.
const { chromium } = require('playwright-core'); const path = require('path');
const ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-extensions', '--autoplay-policy=no-user-gesture-required'];
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function open(b, o = {}, hash = '') {
  const ctx = await b.newContext({ viewport: o.vp || { width: 1280, height: 720 }, hasTouch: !!o.mobile, isMobile: !!o.mobile, deviceScaleFactor: 1, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p._errs = []; p._reqs = [];
  p.on('console', m => { if (m.type() === 'error') p._errs.push(m.text()); if (m.type() === 'warning' && !/GPU stall|ReadPixels/.test(m.text())) p._errs.push('[warn] ' + m.text()); });
  p.on('pageerror', e => p._errs.push('[pageerror] ' + e.message));
  p.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) p._reqs.push(u); });
  if (!o.gate) await p.addInitScript(() => { window.__LYRA_HEADLESS = true; });
  await p.goto(file + (hash ? '#' + hash : ''));
  if (!o.gate) await p.waitForFunction(() => window.__lyra && document.body.classList.contains('started'), null, { timeout: 180000 });
  return p;
}
const st = p => p.evaluate(() => ({ ...window.__lyra.state(), hash: location.hash, lang: document.documentElement.lang }));
const settle = async p => { for (let i = 0; i < 80; i++) { if (!(await st(p)).tr) return; await p.waitForTimeout(250); } };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ARGS });
  // 1. gate
  let p = await open(b, { gate: true });
  await p.waitForSelector('.gate.ready', { timeout: 180000 });
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('gate')), 'gate: focused');
  ok(await p.evaluate(() => !document.querySelector('.gate button')), 'gate: no buttons');
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.body.classList.contains('started')), 'gate: arrow enters');
  await p.close();
  // 2. walk forward through every beat, then back
  p = await open(b); const scenes = await p.evaluate(() => window.__lyra.scenes); const total = scenes.reduce((a, s) => a + s.beats, 0);
  const seen = [(await st(p)).hash];
  for (let i = 1; i < total; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); await settle(p); const s = await st(p); seen.push(s.hash); }
  const expect = scenes.flatMap(s => Array.from({ length: s.beats }, (_, i) => '#' + s.id + (i ? '-' + (i + 1) : '')));
  ok(JSON.stringify(seen) === JSON.stringify(expect), 'forward walk hashes: ' + seen.join(' '));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); ok((await st(p)).hash === expect[expect.length - 1], 'next at the end is a no-op');
  for (let i = 1; i < total; i++) { await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(400); await settle(p); }
  ok((await st(p)).hash === expect[0], 'backward walk returns to start');
  // 3. keys: End, Home, digits, overview, help, lang, mute
  await p.keyboard.press('End'); await settle(p); ok((await st(p)).hash === expect[expect.length - 1], 'End key');
  await p.keyboard.press('Home'); await settle(p); ok((await st(p)).hash === expect[0], 'Home key');
  await p.keyboard.press('2'); await settle(p); ok((await st(p)).id === scenes[1].id, 'digit jumps to scene 2');
  await p.keyboard.press('o'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('.over').hidden && document.querySelectorAll('.over .card').length), 'overview opens with cards');
  ok(await p.evaluate(() => document.activeElement.classList.contains('card')), 'overview focuses a card');
  ok(await p.evaluate(() => [...document.querySelectorAll('.over .card .th')].every(e => e.style.backgroundImage)), 'overview: every card has a thumbnail');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(() => document.querySelector('.over').hidden), 'Esc closes overview');
  await p.keyboard.press('?'); await p.waitForTimeout(200); ok(await p.evaluate(() => !document.querySelector('.help').hidden), 'help opens'); await p.keyboard.press('Escape');
  await p.keyboard.press('l'); await p.waitForTimeout(600); ok((await st(p)).lang === 'en', 'L switches to English');
  ok(await p.evaluate(() => document.querySelector('.tool.shop').textContent === 'Shop'), 'chrome relabels in English');
  await p.keyboard.press('l'); await p.waitForTimeout(400);
  await p.keyboard.press('m'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelector('.toast').textContent.length > 0), 'M toggles sound (toast)');
  // 4. hashchange deep link while running
  await p.evaluate(h => { location.hash = h; }, expect[expect.length - 1].slice(1)); await p.waitForTimeout(500); await settle(p);
  ok((await st(p)).hash === expect[expect.length - 1], 'hashchange navigates');
  ok(p._errs.length === 0, 'no console errors on desktop walk' + (p._errs.length ? ':\n   ' + [...new Set(p._errs)].slice(0, 8).join('\n   ') : ''));
  ok(p._reqs.length === 0, 'zero external requests' + (p._reqs.length ? ': ' + p._reqs.join(', ') : ''));
  const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  ok(links.every(h => /^(https:\/\/lyrastyle\.rs\/|tel:|mailto:|#)/.test(h)), 'all links point to lyrastyle.rs / tel / mailto / hash (' + links.length + ')');
  await p.close();
  // 5. deep links on load
  for (const h of [expect[expect.length - 1], expect[Math.floor(expect.length / 2)]]) { p = await open(b, {}, h.slice(1)); ok((await st(p)).hash === h, 'cold deep link ' + h); ok(p._errs.length === 0, 'no errors on ' + h + (p._errs.length ? ': ' + p._errs[0] : '')); await p.close(); }
  // 6. reduced motion + mobile
  p = await open(b, { rm: true }); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600); await settle(p);
  for (let i = 0; i < scenes[0].beats; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); await settle(p); }
  ok((await st(p)).id === scenes[1].id, 'reduced motion: navigation works'); ok(p._errs.length === 0, 'reduced motion: no errors'); await p.close();
  p = await open(b, { mobile: true, vp: { width: 390, height: 844 } });
  const box = await p.evaluate(() => { const r = document.querySelector('.top').getBoundingClientRect(); return { w: r.width, h: r.height, sw: document.documentElement.scrollWidth }; });
  ok(box.sw <= 390 && box.h < 70, 'mobile: top bar fits on one line (' + JSON.stringify(box) + ')');
  await p.evaluate(() => window.__lyra.next()); await p.waitForTimeout(500); await settle(p); ok((await st(p)).beat === 1, 'mobile: next works'); ok(p._errs.length === 0, 'mobile: no errors' + (p._errs.length ? ': ' + p._errs[0] : '')); await p.close();
  await b.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('check crashed:', e.message); process.exit(2); });
