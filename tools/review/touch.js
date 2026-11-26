// Mobile: real touch swipes (CDP) on every beat, from several start points. Does swipe always advance?
const L = require('./lib.js');
(async () => {
  const b = await L.launch(); const p = await L.open(b, { mobile: true, init: L.RAF_CTL });
  const cdp = await p.context().newCDPSession(p);
  const swipe = async (x0, y0, x1, y1, ms = 220) => {
    await p.evaluate(() => { window.__freeze = true; }); await p.waitForTimeout(450);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
    const n = 6; for (let i = 1; i <= n; i++) { await p.waitForTimeout(ms / n); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, id: 1 }] }); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.evaluate(() => { window.__freeze = false; });
  };
  const scenes = await p.evaluate(() => window.__lyra.scenes);
  const starts = [[195, 700, 'low'], [195, 520, 'mid'], [195, 330, 'upper'], [300, 600, 'right']];
  for (const sc of scenes) for (let bi = 0; bi < sc.beats; bi++) {
    for (const [x, y, nm] of starts) {
      await p.evaluate(([id, b]) => { window.__lyra.goto(id, b, true); }, [sc.id, bi]); await p.waitForTimeout(1500);
      const s0 = await L.st(p);
      await swipe(x, y, x, y - 260); await p.waitForTimeout(700); await L.settle(p);
      const s1 = await L.st(p);
      const moved = s0.hash !== s1.hash;
      console.log(`${sc.id}-${bi + 1} swipe-up from ${nm}(${x},${y}): ${moved ? 'advanced -> ' + s1.hash : 'NO ADVANCE'}`);
    }
    // swipe down (prev) from mid
    await p.evaluate(([id, b]) => { window.__lyra.goto(id, b, true); }, [sc.id, bi]); await p.waitForTimeout(1200);
    const s0 = await L.st(p); await swipe(195, 400, 195, 680); await p.waitForTimeout(700); await L.settle(p); const s1 = await L.st(p);
    console.log(`${sc.id}-${bi + 1} swipe-down from mid: ${s0.hash !== s1.hash ? 'went back -> ' + s1.hash : 'NO MOVE'}`);
  }
  L.report(p, 'touch'); await b.close();
})().catch(e => { console.error('touch crashed', e.message); process.exit(1); });
