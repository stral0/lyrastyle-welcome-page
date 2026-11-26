// Engineering checks, part 1: no-WebGL fallback, sandboxed iframe, deep links, hashchange, history.
const L = require('./lib.js'); const fs = require('fs'); const path = require('path');
const log = (...a) => console.log(...a);
(async () => {
  // ---- 1. no WebGL
  {
    const b = await L.launch([], ['--no-sandbox', '--disable-gpu', '--disable-3d-apis']);
    for (const lang of ['sr', 'en']) {
      const p = await L.open(b, { nowait: true, gate: true, init: lang === 'en' ? () => { try { localStorage.setItem('lyra-lang', 'en'); } catch (e) {} } : undefined });
      await p.waitForTimeout(3000);
      const info = await p.evaluate(() => ({ nogl: document.body.classList.contains('nogl'), lang: document.documentElement.lang, title: document.title, text: (document.querySelector('.fallback') || document.body).innerText, links: [...document.querySelectorAll('a[href]')].map(a => a.textContent + ' -> ' + a.getAttribute('href')), canvas: !!document.getElementById('stage'), buttons: document.querySelectorAll('button').length, scroll: document.documentElement.scrollHeight + '/' + innerHeight, overflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow, uiKids: [...document.getElementById('ui').children].map(e => e.tagName + '.' + e.className) }));
      log('NOGL[' + lang + ']', JSON.stringify(info, null, 1)); L.report(p, 'nogl-' + lang);
      await p.screenshot({ path: L.SH + 'rv-nogl-' + lang + '.png', fullPage: true });
      // can the page actually scroll?
      await p.mouse.wheel(0, 600); await p.waitForTimeout(300); log('  scrollY after wheel', await p.evaluate(() => window.scrollY + ' / docH ' + document.documentElement.scrollHeight));
      await p.close();
    }
    // narrow
    const p = await L.open(b, { nowait: true, gate: true, mobile: true }); await p.waitForTimeout(2500); await p.screenshot({ path: L.SH + 'rv-nogl-mobile.png', fullPage: true }); await p.close();
    await b.close();
  }
  // ---- 2. sandboxed iframe
  {
    const wrap = path.resolve(__dirname, 'frame.html');
    fs.writeFileSync(wrap, '<!doctype html><meta charset="utf-8"><title>frame</title><style>html,body{margin:0;height:100%;background:#333}iframe{border:0;width:100%;height:100%}</style><iframe sandbox="allow-scripts" src="../../dist/lyra-style.html#talas-2"></iframe>');
    const b = await L.launch(['--allow-file-access-from-files']);
    const p = await L.open(b, { url: 'file://' + wrap, nowait: true, gate: true });
    await p.waitForTimeout(12000);
    const fr = p.frames().find(f => /lyra-style/.test(f.url()));
    if (!fr) log('IFRAME: frame not found', p.frames().map(f => f.url()));
    else {
      const pre = await fr.evaluate(() => ({ gateReady: !!document.querySelector('.gate.ready'), started: document.body.classList.contains('started'), origin: location.origin, hash: location.hash }));
      log('IFRAME pre', JSON.stringify(pre));
      await fr.click('.enter.snd').catch(e => log('  click failed', e.message)); await p.waitForTimeout(2500);
      const run = async (label, fn) => { try { const r = await fr.evaluate(fn); log('IFRAME', label, JSON.stringify(r)); } catch (e) { log('IFRAME', label, 'THREW', e.message.split('\n')[0]); } };
      await run('started', () => ({ started: document.body.classList.contains('started'), st: window.__lyra && window.__lyra.state(), hash: location.hash }));
      for (const k of ['ArrowRight', 'l', 'm', 'f', 'o', 'Escape', 'ArrowLeft']) { await fr.focus('#stage').catch(() => {}); await p.keyboard.press(k); await p.waitForTimeout(1500); }
      await p.waitForTimeout(4000);
      await run('after keys', () => ({ st: window.__lyra.state(), hash: location.hash, lang: document.documentElement.lang, snd: document.querySelector('.tools').textContent }));
      await run('storage probe', () => { try { localStorage.getItem('x'); return 'storage ok'; } catch (e) { return 'storage throws ' + e.name; } });
    }
    L.report(p, 'iframe'); await p.screenshot({ path: L.SH + 'rv-iframe.png' }); await b.close();
  }
  // ---- 3. deep links cold
  {
    const b = await L.launch();
    for (const h of ['zica', 'zica-2', 'zica-3', 'ploca', 'ploca-2', 'talas', 'talas-2', 'sazvezdje', 'sazvezdje-2', 'sazvezdje-3', 'zica-9', 'zica-0', 'nope', 'Sazvezdje-2', 'settings', 'ploca-2?x=1']) {
      const p = await L.open(b, { hash: h, w: 1280, h: 720 }); await p.waitForTimeout(800); const s = await L.st(p);
      log('COLD #' + h, '->', s.id, s.beat, s.hash, p._errs.length ? 'ERRS ' + p._errs[0] : ''); await p.close();
    }
    // ---- 4. hashchange live, mid-transition, back/forward
    const p = await L.open(b, { w: 1280, h: 720 }); await p.waitForTimeout(1500);
    const hl0 = await p.evaluate(() => history.length);
    await p.evaluate(() => { location.hash = 'talas'; }); await p.waitForTimeout(300); const mid = await L.st(p);
    await p.evaluate(() => { location.hash = 'sazvezdje-2'; }); await p.waitForTimeout(300); const mid2 = await L.st(p);
    await L.settle(p); await p.waitForTimeout(600); const end = await L.st(p);
    log('HASHCHANGE during transition: first', mid.id, mid.tr, '| second requested sazvezdje-2 while tr ->', mid2.id, mid2.hash, '| settled', end.id, end.beat, end.hash, '(URL says', end.hash, 'scene is', end.id + '-' + (end.beat + 1) + ')');
    await p.keyboard.press('ArrowRight'); await L.settle(p); await p.waitForTimeout(500);
    const hl1 = await p.evaluate(() => history.length);
    log('HISTORY length', hl0, '->', hl1);
    await p.goBack().catch(e => log('goBack', e.message)); await p.waitForTimeout(1200); await L.settle(p);
    let s = await p.evaluate(() => ({ url: location.href.slice(-40), st: window.__lyra ? window.__lyra.state() : null })); log('BACK 1 ->', s.url, s.st && (s.st.id + ' ' + s.st.beat));
    await p.goBack().catch(e => log('goBack', e.message)); await p.waitForTimeout(1200);
    s = await p.evaluate(() => ({ url: location.href.slice(-40), st: window.__lyra ? window.__lyra.state() : null })); log('BACK 2 ->', s.url, s.st && (s.st.id + ' ' + s.st.beat));
    L.report(p, 'hash'); await b.close();
  }
})().catch(e => { console.error('eng1 crashed', e.message); process.exit(1); });
