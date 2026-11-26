// Engineering checks, part 2: keyboard-only flow, focus, panel, overview, help, language, mute.
const L = require('./lib.js'); const log = (...a) => console.log(...a);
const act = p => p.evaluate(() => { const e = document.activeElement; if (!e) return 'none'; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const vis = cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0; let op = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity; return `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ').join('.') : ''}[${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28)}] op=${op.toFixed(2)} outline=${cs.outlineStyle}/${cs.outlineWidth} ${e.matches(':focus-visible') ? 'FV' : 'no-FV'}`; });
(async () => {
  const b = await L.launch();
  // ---- gate, keyboard only
  let p = await L.open(b, { gate: true, w: 1280, h: 720 });
  await p.waitForSelector('.gate.ready', { timeout: 180000 });
  log('GATE focus:', await act(p));
  log('GATE a11y:', JSON.stringify(await p.evaluate(() => ({ gateRole: document.querySelector('.gate').getAttribute('role'), msgLive: document.querySelector('.gate-msg').getAttribute('aria-live'), tabbableBehind: [...document.querySelectorAll('.top a,.top button,.rail button,.step')].filter(e => e.tabIndex >= 0 && !e.disabled).length, canvasTab: document.getElementById('stage').tabIndex, langBtnVisible: getComputedStyle(document.querySelector('.top')).opacity }))));
  const seq = []; for (let i = 0; i < 6; i++) { await p.keyboard.press('Shift+Tab'); seq.push(await act(p)); } log('GATE shift-tab x6:\n   ' + seq.join('\n   '));
  await p.screenshot({ path: L.SH + 'rv-gate-shifttab.png' });
  // key presses on the gate
  await p.keyboard.press('l'); await p.waitForTimeout(300); log('GATE after "l":', await p.evaluate(() => document.documentElement.lang + ' | ' + document.querySelector('.gate-btns').textContent + ' | ' + document.querySelector('.gate-msg').textContent));
  await p.focus('.enter.quiet'); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
  log('ENTER via keyboard: started', await p.evaluate(() => document.body.classList.contains('started')), '| focus:', await act(p), '| state', JSON.stringify(await L.st(p)));
  // Tab order after start
  const order = []; for (let i = 0; i < 22; i++) { await p.keyboard.press('Tab'); order.push(await act(p)); } log('TAB order from canvas:\n   ' + order.join('\n   '));
  await p.screenshot({ path: L.SH + 'rv-focus-tick.png' });
  await p.close();

  // ---- sazvezdje-2: stars by keyboard, panel
  p = await L.open(b, { hash: 'sazvezdje-2', w: 1440, h: 900 }); await p.waitForTimeout(6000);
  await p.focus('#stage'); const o2 = []; let reached = -1;
  for (let i = 0; i < 30; i++) { await p.keyboard.press('Tab'); const a = await act(p); o2.push(a); if (reached < 0 && /sz-star/.test(a)) { reached = i + 1; break; } }
  log('SAZ-2: tabs needed to reach first star:', reached, '| last:', o2[o2.length - 1]);
  await p.screenshot({ path: L.SH + 'rv-star-focus.png' });
  await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  log('PANEL open via Enter:', JSON.stringify(await p.evaluate(() => { const pn = document.querySelector('.sz-panel'); return { on: pn.classList.contains('on'), inert: pn.inert, title: pn.querySelector('.sz-title').textContent, star: pn.querySelector('.sz-starname').textContent, count: pn.querySelector('.sz-count').textContent, items: pn.querySelectorAll('.sz-item').length, first: pn.querySelector('.sz-item').innerText.replace(/\n/g, ' | '), all: pn.querySelector('.sz-all').textContent + ' -> ' + pn.querySelector('.sz-all').href, note: pn.querySelector('.sz-note').textContent, listLang: pn.querySelector('.sz-list').lang }; })), '| focus:', await act(p));
  await p.screenshot({ path: L.SH + 'rv-panel-d.png' });
  const tr = []; for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); tr.push((await act(p)).slice(0, 60)); } log('PANEL tab cycle:\n   ' + tr.join('\n   '));
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(400); log('PANEL ArrowDown -> state', (await L.st(p)).hash, 'scrollTop', await p.evaluate(() => document.querySelector('.sz-body').scrollTop));
  await p.keyboard.press('l'); await p.waitForTimeout(900);
  log('PANEL after L (en):', JSON.stringify(await p.evaluate(() => { const pn = document.querySelector('.sz-panel'); return { on: pn.classList.contains('on'), title: pn.querySelector('.sz-title').textContent, star: pn.querySelector('.sz-starname').textContent, count: pn.querySelector('.sz-count').textContent, close: pn.querySelector('.sz-close').textContent, first: pn.querySelector('.sz-item').innerText.replace(/\n/g, ' | '), all: pn.querySelector('.sz-all').textContent, note: pn.querySelector('.sz-note').textContent }; })));
  await p.screenshot({ path: L.SH + 'rv-panel-d-en.png' });
  await p.keyboard.press('l'); await p.waitForTimeout(600);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500); await L.settle(p);
  log('PANEL open + ArrowRight ->', JSON.stringify(await p.evaluate(() => ({ st: window.__lyra.state().id + '-' + (window.__lyra.state().beat + 1), panelOn: document.querySelector('.sz-panel').classList.contains('on'), focus: document.activeElement.className || document.activeElement.tagName }))));
  await p.screenshot({ path: L.SH + 'rv-panel-then-next.png' });
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1500); await L.settle(p); await p.waitForTimeout(2500);
  // mouse: click each star, check panel counts
  const n = await p.evaluate(() => document.querySelectorAll('.scene-dom[data-scene="sazvezdje"] .sz-star').length); const rows = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => document.querySelectorAll('.scene-dom[data-scene="sazvezdje"] .sz-star')[i].click(), i); await p.waitForTimeout(500);
    rows.push(await p.evaluate(() => { const pn = document.querySelector('.sz-panel'); return pn.querySelector('.sz-starname').textContent + ' / ' + pn.querySelector('.sz-title').textContent + ' / ' + pn.querySelector('.sz-count').textContent + ' / ' + pn.querySelectorAll('.sz-item').length + ' items / ' + pn.querySelector('.sz-all').href; }));
  }
  log('STARS:\n   ' + rows.join('\n   '));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); log('ESC closes panel:', await p.evaluate(() => !document.querySelector('.sz-panel').classList.contains('on')), '| focus:', await act(p));
  // real mouse click on a star + click outside
  const box = await p.evaluate(() => { const r = document.querySelectorAll('.scene-dom[data-scene="sazvezdje"] .sz-star')[0].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.move(box[0], box[1]); await p.waitForTimeout(700); await p.screenshot({ path: L.SH + 'rv-star-hover.png' });
  await p.mouse.click(box[0], box[1]); await p.waitForTimeout(1200);
  await p.mouse.click(300, 300); await p.waitForTimeout(700); log('click outside closes panel:', await p.evaluate(() => !document.querySelector('.sz-panel').classList.contains('on')));
  L.report(p, 'saz'); await p.close();

  // ---- overview + help
  p = await L.open(b, { hash: 'ploca-2', w: 1440, h: 900 }); await p.waitForTimeout(3000);
  await p.keyboard.press('o'); await p.waitForTimeout(700); await p.screenshot({ path: L.SH + 'rv-overview-d.png' });
  log('OVERVIEW:', JSON.stringify(await p.evaluate(() => ({ label: document.querySelector('.over').getAttribute('aria-label') || document.querySelector('.over').getAttribute('aria-labelledby'), cards: [...document.querySelectorAll('.over .card')].map(c => c.innerText.replace(/\n/g, ' / ')), focus: document.activeElement.innerText.replace(/\n/g, ' / ') }))));
  const ov = []; for (let i = 0; i < 13; i++) { await p.keyboard.press('Tab'); ov.push((await act(p)).slice(0, 50)); } log('OVERVIEW tab:\n   ' + ov.join('\n   '));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); log('OVERVIEW ArrowRight moves focus?', (await act(p)).slice(0, 50), '| state', (await L.st(p)).hash);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); log('after Esc focus:', (await act(p)).slice(0, 60));
  await p.keyboard.press('?'); await p.waitForTimeout(500); await p.screenshot({ path: L.SH + 'rv-help-d.png' });
  log('HELP:', JSON.stringify(await p.evaluate(() => ({ modal: document.querySelector('.help').getAttribute('aria-modal'), label: document.querySelector('.help').getAttribute('aria-label'), text: document.querySelector('.help').innerText.replace(/\n/g, ' | ') }))));
  await p.keyboard.press('Escape');
  // a11y tree facts
  log('A11Y:', JSON.stringify(await p.evaluate(() => ({ htmlLang: document.documentElement.lang, canvas: { role: document.getElementById('stage').getAttribute('role'), label: document.getElementById('stage').getAttribute('aria-label'), inner: document.getElementById('stage').innerHTML }, live: document.querySelector('[aria-live]').textContent, langBtn: { text: document.querySelectorAll('.tool')[1].textContent, label: document.querySelectorAll('.tool')[1].getAttribute('aria-label'), lang: document.querySelectorAll('.tool')[1].lang }, snd: { text: document.querySelectorAll('.tool')[2].textContent, pressed: document.querySelectorAll('.tool')[2].getAttribute('aria-pressed') }, ticks: [...document.querySelectorAll('.tick')].slice(0, 4).map(t => t.getAttribute('aria-label') + (t.getAttribute('aria-current') ? '*' : '')), railLabel: document.querySelector('.rail').getAttribute('aria-label'), toolsLabel: document.querySelector('.tools').getAttribute('aria-label'), h1: document.querySelectorAll('h1').length, tickSize: (() => { const r = document.querySelector('.tick').getBoundingClientRect(); return r.width + 'x' + r.height; })() }))));
  await p.keyboard.press('m'); await p.waitForTimeout(500); log('MUTE toggle:', JSON.stringify(await p.evaluate(() => ({ snd: document.querySelectorAll('.tool')[2].textContent, pressed: document.querySelectorAll('.tool')[2].getAttribute('aria-pressed'), toast: document.querySelector('.toast').textContent, ac: 'n/a' }))));
  await p.keyboard.press('m'); await p.waitForTimeout(300);
  L.report(p, 'chrome'); await p.close();

  // ---- mobile: overview, panel sheet, help
  p = await L.open(b, { mobile: true, hash: 'sazvezdje-2' }); await p.waitForTimeout(6000);
  await p.evaluate(() => document.querySelectorAll('.scene-dom[data-scene="sazvezdje"] .sz-star')[0].click()); await p.waitForTimeout(1500); await p.screenshot({ path: L.SH + 'rv-panel-m.png' });
  log('MOBILE panel:', JSON.stringify(await p.evaluate(() => { const pn = document.querySelector('.sz-panel'); const r = pn.getBoundingClientRect(); const c = pn.querySelector('.sz-close').getBoundingClientRect(); return { layout: document.querySelector('.scene-dom[data-scene="sazvezdje"]').dataset.layout, rect: [r.x, r.y, r.width, r.height], close: [c.width, c.height], scrollable: pn.querySelector('.sz-body').scrollHeight + '/' + pn.querySelector('.sz-body').clientHeight }; })));
  await p.evaluate(() => document.querySelector('.sz-close').click()); await p.waitForTimeout(600);
  const sb = await p.evaluate(() => [...document.querySelectorAll('.scene-dom[data-scene="sazvezdje"] .sz-star')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), r.width, r.height]; })); log('MOBILE star hit boxes:', JSON.stringify(sb));
  await p.evaluate(() => document.querySelector('.tools .tool').click()); await p.waitForTimeout(800); await p.screenshot({ path: L.SH + 'rv-overview-m.png' });
  await p.evaluate(() => document.querySelector('.over .tool').click());
  log('MOBILE chrome sizes:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.tool,.tick,.mark')].slice(0, 7).map(e => { const r = e.getBoundingClientRect(); return (e.textContent || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height); }))));
  L.report(p, 'mobile'); await p.close();
  await b.close();
})().catch(e => { console.error('eng2 crashed', e.message); process.exit(1); });
