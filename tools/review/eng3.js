// Engineering checks, part 3: key mashing, resize/orientation mid-scene, wheel, pointer interactions, sound path.
const L = require('./lib.js'); const log = (...a) => console.log(...a);
(async () => {
  const b = await L.launch();
  // ---- mashing
  let p = await L.open(b, { w: 1280, h: 720 }); await p.waitForTimeout(1500);
  const keys = ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowRight', ' ', 'End', 'Home', '3', 'o', 'Escape', 'l', 'ArrowRight', '?', 'Escape', 'm', '4', 'ArrowLeft', 'ArrowLeft', 'o', 'o', 'l', 'PageDown', 'PageUp', 'Enter', 'f', '2', '1', '4', 'ArrowRight', 'ArrowRight', 'ArrowRight'];
  for (let r = 0; r < 3; r++) for (const k of keys) { await p.keyboard.press(k); await p.waitForTimeout(25 + (r * 37) % 90); }
  await L.settle(p); await p.waitForTimeout(1500); let s = await L.st(p);
  log('MASH end state', JSON.stringify({ id: s.id, beat: s.beat, tr: s.tr, hash: s.hash, lang: s.lang }), 'over/help hidden:', await p.evaluate(() => [document.querySelector('.over').hidden, document.querySelector('.help').hidden, document.body.className].join(',')), 'hash matches:', s.hash === '#' + s.id + (s.beat ? '-' + (s.beat + 1) : ''));
  await p.screenshot({ path: L.SH + 'rv-mash-end.png' });
  // hold ArrowRight (auto-repeat)
  await p.keyboard.press('Home'); await L.settle(p); await p.waitForTimeout(500);
  await p.keyboard.down('ArrowRight'); for (let i = 0; i < 40; i++) { await p.keyboard.down('ArrowRight'); await p.waitForTimeout(30); } await p.keyboard.up('ArrowRight');
  await L.settle(p); s = await L.st(p); log('HELD ArrowRight ~1.2 s -> ', s.hash, '(auto-repeat skips beats?)');
  // wheel
  await p.keyboard.press('Home'); await L.settle(p); await p.waitForTimeout(800);
  await p.mouse.move(640, 360); await p.mouse.wheel(0, 120); await p.waitForTimeout(900); await L.settle(p); s = await L.st(p); log('WHEEL one notch ->', s.hash);
  for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, 40 * Math.exp(-i / 8)); await p.waitForTimeout(60); } await p.waitForTimeout(1200); await L.settle(p); s = await L.st(p); log('WHEEL inertial burst (25 decaying events over 1.5 s) ->', s.hash);
  await p.mouse.wheel(0, -120); await p.waitForTimeout(1200); await L.settle(p); s = await L.st(p); log('WHEEL up ->', s.hash);
  L.report(p, 'mash'); await p.close();

  // ---- resize / orientation mid-scene and mid-transition
  p = await L.open(b, { w: 1440, h: 900, hash: 'ploca-2' }); await p.waitForTimeout(2500);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(350);
  await p.setViewportSize({ width: 900, height: 1200 }); await p.waitForTimeout(500); await p.setViewportSize({ width: 700, height: 500 }); await L.settle(p); await p.waitForTimeout(4000);
  await p.screenshot({ path: L.SH + 'rv-resize-talas-700x500.png' }); s = await L.st(p); log('RESIZE mid-transition ->', JSON.stringify({ id: s.id, W: s.W, H: s.H, hash: s.hash }));
  for (const [w, h] of [[390, 844], [844, 390], [320, 568], [2560, 1080], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(2500); s = await L.st(p); log('  resize', w + 'x' + h, '-> canvas', s.W + 'x' + s.H, 'dpr', s.dpr, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth + 'x' + document.documentElement.scrollHeight)); await p.screenshot({ path: L.SH + `rv-resize-${w}x${h}.png` }); }
  await p.evaluate(() => window.__lyra.goto('sazvezdje', 1, true)); await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelectorAll('.scene-dom[data-scene="sazvezdje"] .sz-star')[3].click()); await p.waitForTimeout(800);
  await p.setViewportSize({ width: 600, height: 800 }); await p.waitForTimeout(2500); await p.screenshot({ path: L.SH + 'rv-resize-panel-600x800.png' });
  log('RESIZE with panel open ->', JSON.stringify(await p.evaluate(() => { const d = document.querySelector('.scene-dom[data-scene="sazvezdje"]'); const r = d.querySelector('.sz-panel').getBoundingClientRect(); return { layout: d.dataset.layout, on: d.querySelector('.sz-panel').classList.contains('on'), rect: [r.x, r.y, r.width, r.height].map(Math.round) }; })));
  await p.setViewportSize({ width: 320, height: 568 }); await p.waitForTimeout(2500); await p.keyboard.press('Escape'); await p.waitForTimeout(800); await p.screenshot({ path: L.SH + 'rv-320-saz2.png' });
  await p.evaluate(() => window.__lyra.goto('sazvezdje', 2, true)); await p.waitForTimeout(3000); await p.screenshot({ path: L.SH + 'rv-320-saz3.png' });
  await p.evaluate(() => window.__lyra.goto('zica', 0, true)); await p.waitForTimeout(2500); await p.screenshot({ path: L.SH + 'rv-320-zica1.png' });
  log('320 top bar:', JSON.stringify(await p.evaluate(() => { const r = document.querySelector('.top').getBoundingClientRect(); return { h: r.height, sw: document.documentElement.scrollWidth, tools: [...document.querySelectorAll('.tool')].map(e => { const q = e.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.right)]; }), mark: (() => { const q = document.querySelector('.mark').getBoundingClientRect(); return [Math.round(q.x), Math.round(q.right)]; })() }; })));
  L.report(p, 'resize'); await p.close();

  // ---- pointer interactions, desktop, with sound on
  p = await L.open(b, { w: 1440, h: 900, gate: true, init: L.RAF_CTL }); await p.waitForSelector('.gate.ready', { timeout: 180000 });
  await p.click('.enter.snd'); await p.waitForTimeout(2500);
  log('SOUND path:', JSON.stringify(await p.evaluate(() => ({ snd: document.querySelectorAll('.tool')[2].textContent, pressed: document.querySelectorAll('.tool')[2].getAttribute('aria-pressed') }))));
  await p.waitForTimeout(6000);
  // zica-1: drag the string down and release
  await p.mouse.move(700, 540); await p.mouse.down(); await p.mouse.move(700, 600, { steps: 6 }); await p.waitForTimeout(400); await p.screenshot({ path: L.SH + 'rv-int-zica-pull.png' }); await p.mouse.up(); await p.waitForTimeout(500); await p.screenshot({ path: L.SH + 'rv-int-zica-release.png' });
  // hover sweep across (no button)
  await p.mouse.move(400, 500); await p.mouse.move(400, 640, { steps: 5 }); await p.waitForTimeout(400); await p.screenshot({ path: L.SH + 'rv-int-zica-hover.png' });
  // ploca: click the plate
  await p.evaluate(() => window.__lyra.goto('ploca', 0, true)); await p.waitForTimeout(3000); await p.screenshot({ path: L.SH + 'rv-int-ploca-0.png' });
  await p.mouse.click(950, 430); await p.waitForTimeout(700); await p.screenshot({ path: L.SH + 'rv-int-ploca-1.png' }); await p.waitForTimeout(3500); await p.screenshot({ path: L.SH + 'rv-int-ploca-2.png' });
  await p.mouse.click(1100, 500); await p.waitForTimeout(4000); await p.screenshot({ path: L.SH + 'rv-int-ploca-3.png' });
  await p.mouse.click(300, 300); await p.waitForTimeout(600); log('PLOCA click on empty area (text side): state', (await L.st(p)).hash);
  // talas-2: click anywhere
  await p.evaluate(() => window.__lyra.goto('talas', 1, true)); await p.waitForTimeout(3000);
  await p.mouse.click(1000, 650); await p.waitForTimeout(1500); await p.screenshot({ path: L.SH + 'rv-int-talas-1.png' }); await p.mouse.click(500, 700); await p.mouse.click(1200, 560); await p.waitForTimeout(2500); await p.screenshot({ path: L.SH + 'rv-int-talas-2.png' });
  for (let i = 0; i < 30; i++) await p.mouse.click(300 + i * 30, 500 + (i % 5) * 60); await p.waitForTimeout(2500); await p.screenshot({ path: L.SH + 'rv-int-talas-3.png' }); s = await L.st(p); log('TALAS 30 rapid clicks -> calls', s.calls, 'tris', s.tris);
  // talas-1: click
  await p.evaluate(() => window.__lyra.goto('talas', 0, true)); await p.waitForTimeout(2500); await p.mouse.click(900, 600); await p.waitForTimeout(2000); await p.screenshot({ path: L.SH + 'rv-int-talas-b1-click.png' });
  // zica-3: piano strings
  await p.evaluate(() => window.__lyra.goto('zica', 2, true)); await p.waitForTimeout(3000); await p.mouse.move(500, 640); await p.mouse.move(1000, 640, { steps: 12 }); await p.waitForTimeout(500); await p.screenshot({ path: L.SH + 'rv-int-piano.png' });
  // zica-2 lyre strum
  await p.evaluate(() => window.__lyra.goto('zica', 1, true)); await p.waitForTimeout(3000); await p.mouse.move(820, 380); await p.mouse.move(1100, 380, { steps: 10 }); await p.waitForTimeout(350); await p.screenshot({ path: L.SH + 'rv-int-lyre.png' });
  // cursor feedback
  log('CURSOR over canvas:', JSON.stringify(await p.evaluate(() => getComputedStyle(document.getElementById('stage')).cursor)));
  L.report(p, 'pointer'); await p.close();
  await b.close();
})().catch(e => { console.error('eng3 crashed', e.message); process.exit(1); });
