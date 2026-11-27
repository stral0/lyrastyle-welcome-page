// Talas camera regression check (review-3 P0): for many viewports, go to talas beat 0 at the launch (the bells over the door) and at
// the arrival at Sava Centar, and assert through the headless hook window.__talasDbg that the camera solve framed the story:
// the shop pin, Sava Centar, the wave's path and the sleigh (bells over the door) are on screen, no fallback pose was used,
// the beat-0 headline is at most two lines in landscape, and the place labels / counter never overlap the words.
// Usage: node tools/check-talas.js [dist/index.html] [--shots dir] [--only 1280x720,844x390]
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-extensions', '--autoplay-policy=no-user-gesture-required'];
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--')));
const file = 'file://' + path.resolve(pos[0] || path.join(__dirname, '..', 'dist', 'index.html'));
const SHOTS = opt('shots') || path.join(__dirname, '..', 'shots', 'check-talas'); fs.mkdirSync(SHOTS, { recursive: true });
const VPS = [[1440, 900], [1280, 720], [1366, 657], [1280, 672], [1920, 1080], [2200, 900], [1024, 768], [844, 390], [390, 844], [360, 640], [3440, 1440]];
const only = opt('only') ? opt('only').split(',') : null;
const JOBS = [...VPS.map(v => [...v, 'sr']), [1280, 720, 'en'], [1366, 657, 'en'], [844, 390, 'en'], [360, 640, 'en']].filter(j => !only || only.includes(j[0] + 'x' + j[1]));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const rsleep = ms => new Promise(r => setTimeout(r, ms));
async function open(b, w, h, lang) {
  const mobile = Math.min(w, h) <= 430;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await ctx.addInitScript(l => { window.__LYRA_HEADLESS = true; try { localStorage.setItem('lyra-lang', l); } catch (e) { /* sandboxed */ } }, lang);
  const p = await ctx.newPage(); p._errs = [];
  p.on('console', m => { if (m.type() === 'error') p._errs.push(m.text()); });
  p.on('pageerror', e => p._errs.push('[pageerror] ' + e.message));
  await p.goto(file + '#talas');
  await p.waitForFunction(() => window.__lyra && document.body.classList.contains('started'), null, { timeout: 240000 });
  // the software renderer takes seconds per frame: freeze rAF and pump frames by hand (as tools/check.js does)
  await p.evaluate(() => { const q = []; let now = performance.now() + 1000; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__pump = ms => { now += ms; const cbs = q.splice(0); for (const cb of cbs) cb(now); return cbs.length; }; });
  await p.evaluate(() => window.__pump(1));
  return p;
}
const pump = (p, n, ms = 50) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__pump(ms); }, [n, ms]);
// land exactly on beat time t of talas beat 0, with a short natural pre-roll
async function at(p, t, pre = .8) {
  await p.evaluate(() => window.__lyra.goto('talas', 0, false)); await pump(p, 2, 1);
  const t0 = Math.max(0, t - pre); await p.evaluate(t => { window.__lyra.seek(t); window.__pump(1); }, t0);
  const n = Math.round((t - t0) * 20); if (n > 0) await pump(p, n, 50);
  await p.evaluate(t => { window.__lyra.seek(t - 1e-4); window.__pump(.1); }, t);
  await rsleep(50); await p.evaluate(() => window.__pump(.1));
  return p.evaluate(() => window.__talasDbg);
}
const hit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ARGS });
  for (const [w, h, lang] of JOBS) {
    const tag = `${w}x${h}${lang === 'en' ? '-en' : ''}`; let p;
    try {
      p = await open(b, w, h, lang);
      const s = await p.evaluate(() => window.__lyra.state()); if (s.id !== 'talas') { ok(false, tag + ': not on talas (' + s.id + ')'); continue; }
      const d0 = await p.evaluate(() => window.__talasDbg);
      const L = d0.LAUNCH, A = d0.ARRIVE;
      const d = await at(p, L); await p.screenshot({ path: path.join(SHOTS, tag + '-launch.png') });
      const land = w > h * 1.05;
      const ov = []; for (const l of d.labelBoxes) for (const t of d.textBoxes) if (hit(l, t)) ov.push(JSON.stringify(l) + 'x' + JSON.stringify(t));
      const info = `pin ${d.pin} sava ${d.sava} bell ${d.bell} lines ${d.headLines[0]} miss ${Math.round(d.missA)}/${Math.round(d.missB)} tries ${d.triesA}/${d.triesB} (${d.camMs} ms)`;
      ok(!d.usedFallback && d.pinOnScreen && d.savaOnScreen && d.pathOnScreen && d.sleighOnScreen && d.bellOverPin && ov.length === 0 && (!land || d.headLines[0] <= 2),
        `${tag} launch t=${L}: ` + (d.usedFallback ? 'FALLBACK ' : '') + (d.pinOnScreen ? '' : 'pin-off ') + (d.savaOnScreen ? '' : 'sava-off ') + (d.pathOnScreen ? '' : 'path-off ') + (d.sleighOnScreen ? '' : 'sleigh-off ') + (d.bellOverPin ? '' : 'bell-not-over-pin ') + (ov.length ? 'overlap ' + ov.join(' ') + ' ' : '') + (land && d.headLines[0] > 2 ? 'headline>2 lines ' : '') + '| ' + info);
      const e = await at(p, L + A + .6); await p.screenshot({ path: path.join(SHOTS, tag + '-arrive.png') });
      const ov2 = []; for (const l of e.labelBoxes) for (const t of e.textBoxes) if (hit(l, t)) ov2.push(JSON.stringify(l) + 'x' + JSON.stringify(t));
      ok(e.pinOnScreen && e.savaOnScreen && e.labelBoxes.length >= 2 && ov2.length === 0, `${tag} arrival t=${(L + A + .6).toFixed(1)}: pin ${e.pin} sava ${e.sava} labels ${e.labelBoxes.length}` + (ov2.length ? ' overlap ' + ov2.join(' ') : ''));
      ok(p._errs.length === 0, `${tag}: no console errors` + (p._errs.length ? ': ' + p._errs[0] : ''));
    } catch (er) { ok(false, tag + ': crashed ' + er.message); }
    if (p) await p.context().close();
  }
  await b.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('check-talas crashed:', e.message); process.exit(2); });
