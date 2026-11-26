const L = require('./lib.js');
(async () => {
  const b = await L.launch(); const p = await L.open(b, { mobile: true, hash: process.argv[2] || 'sazvezdje' });
  const cdp = await p.context().newCDPSession(p);
  await p.evaluate(() => { window.__ev = []; const c = document.getElementById('stage'); for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave', 'touchstart', 'touchend', 'click']) c.addEventListener(t, e => window.__ev.push([t, e.pointerType || '', Math.round(e.clientX || 0), Math.round(e.clientY || 0), Math.round(performance.now())]), true); });
  const swipe = async (x0, y0, x1, y1, n = 4) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
    for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await p.waitForTimeout(2500);
  const s0 = await L.st(p);
  await swipe(195, 620, 195, 320); await p.waitForTimeout(1200); await L.settle(p);
  const s1 = await L.st(p);
  console.log(s0.hash, '->', s1.hash);
  console.log(JSON.stringify(await p.evaluate(() => window.__ev)));
  await b.close();
})().catch(e => { console.error('crashed', e.message); process.exit(1); });
