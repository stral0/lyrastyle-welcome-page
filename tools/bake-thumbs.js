// Bake overview thumbnails from the real scenes: one small JPEG per beat -> src/thumbs.js (data URIs).
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-extensions'] });
  const p = await (await b.newContext({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 0.6 })).newPage();
  await p.addInitScript(() => { window.__LYRA_HEADLESS = true; });
  await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'index.html'));
  await p.waitForFunction(() => window.__lyra && document.body.classList.contains('started'), null, { timeout: 120000 });
  await p.addStyleTag({ content: '#ui{visibility:hidden!important}' });
  const scenes = await p.evaluate(() => window.__lyra.scenes); const out = {};
  for (const sc of scenes) for (let i = 0; i < sc.beats; i++) {
    await p.evaluate(([id, i]) => window.__lyra.goto(id, i, true), [sc.id, i]);
    await p.waitForTimeout(+(process.argv[2] || 3500));
    const buf = await p.screenshot({ type: 'jpeg', quality: 62 });
    const key = sc.id + (i ? '-' + (i + 1) : ''); out[key] = 'data:image/jpeg;base64,' + buf.toString('base64'); console.log(key, (buf.length / 1024).toFixed(1) + ' KB');
  }
  fs.writeFileSync(path.resolve(__dirname, '..', 'src', 'thumbs.js'), '// Baked by tools/bake-thumbs.js from the real scenes.\nexport const thumbs = ' + JSON.stringify(out) + ';\n');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
