const L = require('./lib.js');
(async () => {
  const b = await L.launch([], ['--no-sandbox', '--disable-gpu', '--disable-3d-apis']);
  const p = await L.open(b, { nowait: true, gate: true }); await p.waitForTimeout(2500);
  const m = () => p.evaluate(() => ({ bodyScrollTop: document.body.scrollTop, bodyScrollH: document.body.scrollHeight, bodyClientH: document.body.clientHeight, winY: scrollY, ui: getComputedStyle(document.getElementById('ui')).pointerEvents, active: document.activeElement.tagName }));
  console.log('before', JSON.stringify(await m()));
  await p.mouse.move(700, 400); await p.mouse.wheel(0, 700); await p.waitForTimeout(500); console.log('after wheel', JSON.stringify(await m()));
  await p.keyboard.press('End'); await p.waitForTimeout(400); console.log('after End key', JSON.stringify(await m()));
  await p.keyboard.press('Tab'); await p.waitForTimeout(300); console.log('after Tab', JSON.stringify(await p.evaluate(() => ({ a: document.activeElement.outerHTML.slice(0, 120), top: document.body.scrollTop }))));
  await p.screenshot({ path: L.SH + 'rv-nogl-sr-end.png' });
  await b.close();
})();
