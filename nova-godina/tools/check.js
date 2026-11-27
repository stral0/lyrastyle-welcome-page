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
  // words first: a press before the beat's copy is in only completes the text; at most two presses per step
  const seen = [(await st(p)).hash]; let presses = 0, ffOnly = true, maxP = 0;
  for (let i = 1; i < total; i++) {
    const h0 = (await st(p)).hash; let n = 0;
    while (n < 3) { await p.keyboard.press('ArrowRight'); n++; await p.waitForTimeout(500); await settle(p); const s = await st(p); if (s.hash !== h0) break; if (!s.ffd) ffOnly = false; }
    presses += n; maxP = Math.max(maxP, n); seen.push((await st(p)).hash);
  }
  ok(maxP <= 2 && ffOnly, `forward walk: at most two presses per step, an unmoved press only fast-forwards the text (max ${maxP}, total ${presses})`);
  const expect = scenes.flatMap(s => Array.from({ length: s.beats }, (_, i) => '#' + s.id + (i ? '-' + (i + 1) : '')));
  ok(JSON.stringify(seen) === JSON.stringify(expect), 'forward walk hashes: ' + seen.join(' '));
  await p.evaluate(() => window.__lyra.seek(60)); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); ok((await st(p)).hash === expect[expect.length - 1], 'next at the end is a no-op');
  ok(await p.evaluate(() => /bump/.test(document.querySelector('.rail').className) && document.querySelector('.toast').classList.contains('on') && document.querySelector('.toast').textContent.length > 10), 'next at the end: rail bounces + end toast');
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
  // 7. navigation UX regressions (research/ux-review.md): real wheel bursts, CDP touch swipes, keys
  {
    // the software renderer takes seconds per frame, which would space input events seconds apart; so rAF is frozen
    // and pumped by hand: input arrives with real-world spacing, scene time advances only in sleep() (50 ms frames)
    const rsleep = ms => new Promise(r => setTimeout(r, ms));
    const freeze = async p => { await p.evaluate(() => { const q = []; let now = performance.now() + 1000; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__pump = ms => { now += ms; const cbs = q.splice(0); for (const cb of cbs) cb(now); return cbs.length; }; }); await p.evaluate(() => window.__pump(1)); return p; };
    const sleep = async ms => { await rsleep(ms); await p.evaluate(n => { if (window.__pump) for (let i = 0; i < n; i++) window.__pump(50); }, Math.max(1, Math.round(ms / 50))); };
    const settle = async p => { for (let i = 0; i < 80; i++) { if (!(await st(p)).tr) return; await sleep(250); } };
    const flick = (dur = 1.1, peak = 42, sign = 1) => { const n = Math.round(dur * 60); const o = []; for (let i = 0; i < n; i++) { const v = i < 5 ? peak * (i + 1) / 5 : peak * Math.exp(-(i - 5) / (n / 4.2)); o.push(sign * Math.max(1, Math.round(v))); } return o; }; // macOS-like: finger ramp + momentum tail
    // explicit OS-style timestamps 16 ms apart: CDP otherwise stamps each event only after the previous one was handled
    const wheel = async (p, ds, gap = 16, x = 640, y = 360) => { const c = await p.context().newCDPSession(p); let ts = Date.now() / 1000; for (const d of ds) { await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: d, timestamp: (ts += gap / 1000) }); await rsleep(gap); } };
    const line = (x0, y0, x1, y1, n = 6) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
    // explicit OS timestamps: CDP otherwise stamps each event only after the slow renderer handled the previous one
    const swipe = async (p, pts, ms = 150) => { const c = await p.context().newCDPSession(p); let ts = Date.now() / 1000; const step = ms / (pts.length - 1) / 1000;
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }], timestamp: ts });
      for (const q of pts.slice(1)) { await rsleep(ms / (pts.length - 1)); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q[0], y: q[1] }], timestamp: (ts += step) }); }
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: (ts += step) }); };
    const go = (p, id, bt, done = true) => p.evaluate(([i, b, d]) => window.__lyra.goto(i, b, d), [id, bt, done]);
    // entry: one trackpad flick enters and lands on beat 1 (no extra step from the same gesture or its inertia)
    p = await open(b, { gate: true }); await p.waitForSelector('.gate.ready', { timeout: 180000 }); await freeze(p); await sleep(300);
    ok(await p.evaluate(() => /225deg|matrix\(-0\.70/.test(getComputedStyle(document.querySelector('.gate-chev')).transform)), 'gate: desktop cue points down');
    await wheel(p, flick(1.1)); await sleep(1200);
    { const s = await st(p); ok(s.hash === '#' + scenes[0].id && s.beat === 0, 'entry wheel flick lands on beat 1 (' + s.hash + ')'); }
    await p.close();
    p = await freeze(await open(b));
    await go(p, scenes[0].id, 0); await sleep(300); await wheel(p, flick(1.1)); await sleep(700);
    ok((await st(p)).hash === expect[1], 'one trackpad flick = one step (' + (await st(p)).hash + ')');
    await go(p, scenes[0].id, 0); await sleep(300); await wheel(p, [100, 100, 100, 100], 120); await sleep(700);
    ok((await st(p)).beat === 1, 'a fast burst of mouse-wheel notches = one step');
    // words first: the first request on a fresh beat only fast-forwards it; the second advances
    await go(p, scenes[0].id, 1, false); await sleep(150); await p.evaluate(() => window.__lyra.request(1)); await sleep(100);
    { const s = await st(p); ok(s.beat === 1 && s.ffd, 'text not in yet: first step fast-forwards the beat (beat ' + s.beat + ', ff ' + s.ffd + ')'); }
    await sleep(1600); ok(await p.evaluate(() => window.__lyra.revealed()), 'fast-forward brings the words in');
    await p.evaluate(() => window.__lyra.request(1)); await sleep(200); ok((await st(p)).beat === 2, 'second step advances');
    // review-3 P1-1: a beat reached by a transition is always seen. Two quick flicks from the last beat of the scene
    // before talas (the second buffered during the grain transition) land on talas beat 1 and stay there >= 1.2 s of
    // scene time; a third flick inside that dwell is absorbed. Scene time is pumped in-page in 100 ms frames.
    {
      const ti = Math.max(1, scenes.findIndex(s => s.id === 'talas')), into = scenes[ti], from = scenes[ti - 1];
      const pumpUntilCut = () => p.evaluate(() => { let n = 0; while (window.__lyra.state().tr && n++ < 120) window.__pump(100); return window.__lyra.state(); });
      const pumpStay = (id, secs) => p.evaluate(([id, secs]) => { let stay = 0, left = null; for (let i = 0; i < Math.round(secs / .1); i++) { window.__pump(100); const s = window.__lyra.state(); if (!left && s.id === id && s.beat === 0 && !s.tr) stay += .1; else if (!left) left = s; } return { stay: Math.round(stay * 100) / 100, left, fin: window.__lyra.state() }; }, [id, secs]);
      await go(p, from.id, from.beats - 1); await sleep(300);
      await wheel(p, flick(1.1).slice(0, 36)); await wheel(p, flick(1.1)); // 0.6 s apart: the second starts in the first's inertia tail
      const mid = await st(p), end = await pumpUntilCut();
      const a = await pumpStay(into.id, .3); await wheel(p, flick(1.1)); const b2 = await pumpStay(into.id, 2.2);
      const stay = a.stay + b2.stay, fin = b2.fin;
      ok(mid.tr && mid.pending === 1 && end.id === into.id && end.beat === 0 && !a.left && stay >= 1.2 - 1e-6 && fin.id === into.id && fin.beat <= 1,
        'two quick flicks into ' + into.id + ' land on its beat 1 and stay >= 1.2 s; a third flick in the dwell is absorbed (' + JSON.stringify({ midTr: mid.tr, pend: mid.pending, end: end.id + '-' + end.beat, endBt: +end.bt.toFixed(2), stay, fin: fin.id + '-' + fin.beat, ffd: fin.ffd }) + ')');
      // a single flick into the scene leaves no dwell; once the beat has been seen, a single flick advances at once
      await go(p, from.id, from.beats - 1); await sleep(300); await wheel(p, flick(1.1)); const e1 = await pumpUntilCut();
      const seen = await p.evaluate(() => { let n = 0, t = 0; while ((t < 1.3 || !window.__lyra.revealed()) && n++ < 120) { window.__pump(100); t += .1; } return window.__lyra.state(); });
      await wheel(p, flick(1.1)); await sleep(100); const s1 = await st(p);
      ok(e1.id === into.id && e1.beat === 0 && !e1.dwell && !seen.dwell && s1.id === into.id && s1.beat === 1, 'after the beat is seen, a single flick advances normally (' + JSON.stringify({ end: e1.id + '-' + e1.beat, dwell: e1.dwell, now: s1.hash }) + ')');
    }
    // scene DOM is no wheel dead zone: a flick over a star button or the end card steps; inside an open, scrollable
    // department list the wheel scrolls the list and never steps the story
    const last = scenes[scenes.length - 1], SD = `.scene-dom[data-scene="${last.id}"]`;
    const centre = (p, sel) => p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden'; }); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; }, sel);
    const hitIs = (p, xy, sel) => p.evaluate(([x, y, sel]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest(sel)); }, [xy[0], xy[1], sel]);
    if (last.beats >= 3) {
      await go(p, last.id, 1); await sleep(600); const sb = await centre(p, SD + ' .sz-star');
      ok(sb && await hitIs(p, sb, SD + ' .sz-star'), 'a star button is under the cursor (' + JSON.stringify(sb) + ')');
      if (sb) { await wheel(p, flick(1.1), 16, sb[0], sb[1]); await sleep(700); const s = await st(p); ok(s.id === last.id && s.beat === 2, 'wheel flick over a star button steps (' + s.hash + ')'); }
      await go(p, last.id, 2); await sleep(900); const eb = await centre(p, SD + ' .sz-end');
      ok(eb && await hitIs(p, eb, SD + ' .sz-end'), 'the end card is under the cursor (' + JSON.stringify(eb) + ')');
      if (eb) { await wheel(p, flick(1.1, 42, -1), 16, eb[0], eb[1]); await sleep(300); await settle(p); const s = await st(p); ok(s.id === last.id && s.beat === 1, 'wheel flick (back) over the end card steps (' + s.hash + ')'); }
      // open the department with the longest list, so its body scrolls
      await go(p, last.id, 1); await sleep(600);
      const opened = await p.evaluate(sd => { const bs = [...document.querySelectorAll(sd + ' .sz-star')]; bs[0].click(); return !!document.querySelector(sd + ' .sz-panel.on'); }, SD); await sleep(700);
      const lb = await p.evaluate(sd => { const b = document.querySelector(sd + ' .sz-panel.on .sz-body'); if (!b) return null; const r = b.getBoundingClientRect(); return { xy: [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)], can: b.scrollHeight - b.clientHeight }; }, SD);
      ok(opened && lb && lb.can > 20, 'department panel opens with a scrollable list (' + JSON.stringify(lb) + ')');
      if (lb && lb.can > 20) {
        await wheel(p, flick(1.1, 42), 16, lb.xy[0], lb.xy[1]); await sleep(900);
        const r = await p.evaluate(sd => ({ top: document.querySelector(sd + ' .sz-body').scrollTop, open: !!document.querySelector(sd + ' .sz-panel.on') }), SD); const s = await st(p);
        ok(r.top > 20 && r.open && s.id === last.id && s.beat === 1, 'wheel inside the open list scrolls it and does not step (' + JSON.stringify({ ...r, hash: s.hash }) + ')');
      }
      await p.keyboard.press('Escape'); await sleep(300);
    }
    ok(p._errs.length === 0, 'navigation UX desktop: no errors' + (p._errs.length ? ': ' + p._errs[0] : '')); await p.close();
    p = await freeze(await open(b, { mobile: true, vp: { width: 390, height: 844 } }));
    // a step asked for during a transition runs when it ends
    await go(p, scenes[0].id, 2); await sleep(300);
    for (let i = 0; i < 40 && !(await p.evaluate(() => window.__lyra.revealed())); i++) await sleep(250); // words in first, so the swipe is a real step
    await p.evaluate(() => window.__lyra.next()); await sleep(300); // start the scene transition directly; the swipe below lands inside it
    const mid = await st(p); await swipe(p, line(195, 560, 195, 300)); const mid2 = await st(p); await settle(p); await sleep(400); const aft = await st(p); aft.rev = await p.evaluate(() => window.__lyra.revealed());
    ok(mid.tr && mid2.pending === 1 && aft.pending === 0 && aft.id === scenes[1].id && (aft.beat === 1 || aft.ffd || aft.rev) /* the buffered step may already have fast-forwarded the words (ff lasts 0.3–0.6 s) */, 'swipe during a scene transition is executed after it (' + JSON.stringify({ midTr: mid.tr, pend2: mid2.pending, id: aft.id, beat: aft.beat, ff: aft.ffd, rev: aft.rev, pend: aft.pending }) + ')');
    await go(p, scenes[0].id, 2); await sleep(300); await swipe(p, line(195, 300, 195, 560)); await sleep(100); await swipe(p, line(195, 560, 195, 300)); await settle(p); await sleep(300);
    ok((await st(p)).beat === 2, 'swipe during the back-fade is executed after it');
    // swipes that start on the chrome navigate; taps on its controls still work
    await go(p, scenes[0].id, 0); await sleep(300); await swipe(p, line(330, 28, 110, 34)); await sleep(500);
    ok((await st(p)).beat === 1, 'swipe starting on the header navigates');
    await go(p, scenes[0].id, 0); await sleep(300); await swipe(p, line(195, 785, 195, 540)); await sleep(500);
    ok((await st(p)).beat === 1, 'swipe starting on the hint / rail strip navigates');
    await p.tap('.tools .tool:nth-child(2)'); await sleep(400); ok((await st(p)).lang === 'en', 'tap on a header control still works'); await p.tap('.tools .tool:nth-child(2)'); await sleep(300);
    ok(p._errs.length === 0, 'navigation UX mobile: no errors' + (p._errs.length ? ': ' + p._errs[0] : '')); await p.close();
  }
  await b.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('check crashed:', e.message); process.exit(2); });
