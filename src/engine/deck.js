// deck: the narrative engine. Scenes -> beats -> timeline state; transitions; navigation; hash; overview; chrome; a11y.
import * as THREE from 'three';
import { createGfx } from './gfx.js';
import { createText } from './text.js';
import { createAudio } from './audio.js';
import { clamp, lerp, damp, ease, rng, smoothstep, remap } from './util.js';
import * as GLSL from './glsl.js';
import { logoSVG, logoDataURI } from '../logo.js';

const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const RESERVED = new Set(['settings', 'sidebar', 'customize', 'upgrade', 'downloads']);

export async function boot({ scenes, transitions, copy, products, thumbs = {}, site }) {
  const canvas = document.getElementById('stage'), ui = document.getElementById('ui');
  // brand mark: favicon + a CSS variable the chrome and scenes can use
  try { const uri = logoDataURI(); document.documentElement.style.setProperty('--logo', `url("${uri}")`);
    let fav = document.querySelector('link[rel=icon]'); if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.append(fav); } fav.type = 'image/svg+xml'; fav.href = uri; } catch (e) { /* cosmetic */ }
  const headless = /headless/.test(location.search) || !!window.__LYRA_HEADLESS;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mqReduce.matches;
  let lang = 'sr';
  for (const d of scenes) if (d.copy) { Object.assign(copy.sr, d.copy.sr || {}); Object.assign(copy.en, d.copy.en || {}); } // scene-local extra copy
  try { const l = localStorage.getItem('lyra-lang'); if (l === 'en' || l === 'sr') lang = l; } catch (e) { /* storage may be unavailable */ }
  const t = (key, vars) => {
    let s = (copy[lang] && copy[lang][key]); if (s == null) s = copy.sr[key]; if (s == null) return key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    if (key.indexOf('ui.') && key.indexOf('help.') && key.indexOf('gate.')) s = s.replace(/(^|[ \n(])([iuaosk]) /gi, '$1$2\u00a0');
    return s;
  };
  document.documentElement.lang = lang;

  // ---------- no-WebGL fallback: the whole narrative as a typeset page ----------
  const fallback = why => {
    document.body.classList.add('nogl'); document.documentElement.classList.add('nogl'); document.title = t('ui.title');
    const a = $('article', 'fallback');
    const fl = $('div', 'fb-logo'); fl.innerHTML = logoSVG('flg'); fl.setAttribute('aria-hidden', 'true'); a.append(fl, $('h1', '', 'Lyra Style'));
    for (const d of scenes) {
      const sec = $('section'); sec.append($('h2', '', t(d.id + '.title')));
      for (const b of d.beats) for (const k of (b.copy || [])) { if (/hint/i.test(k)) continue; const p = $(/\.h$/.test(k) ? 'h3' : 'p'); p.textContent = t(k); sec.append(p); }
      a.append(sec);
    }
    if (products && products.cats && products.cats.length) { // the hand-off still works without WebGL
      const ul = $('ul', 'depts');
      for (const c of products.cats) { const li = $('li'); const l = $('a'); l.href = c.url; l.target = '_blank'; l.rel = 'noopener'; l.textContent = c[lang] || c.sr; li.append(l); ul.append(li); }
      a.append(ul);
    }
    const p = $('p', 'cta'); p.innerHTML = `<a href="${site.shop}" target="_blank" rel="noopener">${t('ui.shop')}</a>`; a.append(p);
    const c = $('p', 'contact'); c.textContent = [site.phone1, site.phone2, site.email].filter(Boolean).join(', '); a.append(c);
    ui.append(a); canvas.remove(); console.warn('Lyra: fallback', why);
  };
  let gfx;
  try { gfx = createGfx(canvas); } catch (e) { fallback(e); return; }

  // ---------- view: design space. Short side is always 1080 units. ----------
  const view = { w: 1920, h: 1080, scale: 1, portrait: false, aspect: 16 / 9, cssW: 1, cssH: 1 };
  const audio = createAudio();
  const layers = new Set(); let creating = null;
  let quality = 1, dprCap = 2;

  const ctx = {
    gfx, THREE, GLSL, view, audio, products, site, headless, thumbs,
    t, lang: () => lang, reduced: () => reduced,
    util: { clamp, lerp, damp, smoothstep, remap, rng }, ease,
    overlay() { const l = text.layer(); layers.add(l); if (creating) creating.layers.push(l); return l; },
    sfx: (name, o) => audio.sfx(name, o),
    dom(id) { const d = $('div', 'scene-dom'); d.dataset.scene = id; d.hidden = true; ui.insertBefore(d, rail); return d; }, // before the rail: scene controls come first in tab order
    snapshots: {},
    go: (id, beat) => goto(id, beat || 0),
    next: () => next(), prev: () => prev(),
  };
  const text = createText(gfx, view, t);

  // ---------- chrome ----------
  const top = $('header', 'top');
  const mark = $('a', 'mark', '<span class="mark-tile" aria-hidden="true"></span><span>Lyra Style</span>'); mark.href = '#' + scenes[0].id;
  const nav = $('nav', 'tools');
  const bOver = $('button', 'tool', ''), bLang = $('button', 'tool', ''), bSnd = $('button', 'tool', '');
  const aShop = $('a', 'tool shop', ''); aShop.href = site.shop; aShop.target = '_blank'; aShop.rel = 'noopener';
  bOver.type = bLang.type = bSnd.type = 'button';
  nav.append(bOver, bLang, bSnd, aShop); top.append(mark, nav);
  const rail = $('nav', 'rail');
  const bPrev = $('button', 'step prev', '<span aria-hidden="true">&#8592;</span>'), bNext = $('button', 'step next', '<span aria-hidden="true">&#8594;</span>');
  bPrev.type = bNext.type = 'button';
  const hint = $('div', 'hint', '');
  const live = $('div', 'sr-only'); live.setAttribute('aria-live', 'polite');
  const toast = $('div', 'toast'); toast.setAttribute('role', 'status');
  const over = $('div', 'over'); over.hidden = true; over.setAttribute('role', 'dialog'); over.setAttribute('aria-modal', 'true');
  const help = $('div', 'help'); help.hidden = true; help.setAttribute('role', 'dialog'); help.setAttribute('aria-modal', 'true');
  const h1 = $('h1', 'sr-only', 'Lyra Style'); canvas.setAttribute('role', 'img');
  ui.append(h1, top, rail, bPrev, bNext, hint, live, toast, over, help);
  const chromeEls = [top, rail, bPrev, bNext]; chromeEls.forEach(e => { e.inert = true; }); // nothing behind the gate is focusable

  const ticks = [];
  scenes.forEach((d, si) => {
    const g = $('span', 'grp');
    d.beats.forEach((b, bi) => { const k = $('button', 'tick'); k.type = 'button'; k.addEventListener('click', () => goto(d.id, bi)); g.append(k); ticks.push({ el: k, si, bi }); });
    rail.append(g);
  });
  let toastT = 0, gateLabels_ = null;
  const say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 1800); };

  function relabel() {
    document.documentElement.lang = lang;
    document.title = t('ui.title');
    canvas.setAttribute('aria-label', t('ui.canvas'));
    bOver.textContent = t('ui.overview'); bLang.textContent = lang === 'sr' ? 'EN' : 'SR';
    bLang.setAttribute('aria-label', t('ui.langSwitch'));
    bSnd.textContent = audio.muted ? t('ui.soundOff') : t('ui.soundOn'); bSnd.setAttribute('aria-pressed', String(!audio.muted));
    aShop.textContent = t('ui.shop');
    bPrev.setAttribute('aria-label', t('ui.prev')); bNext.setAttribute('aria-label', t('ui.next')); rail.setAttribute('aria-label', t('ui.progress')); over.setAttribute('aria-label', t('ui.overview')); help.setAttribute('aria-label', t('help.title'));
    hint.textContent = t(view.touch ? 'ui.hintTouch' : 'ui.hint');
    ticks.forEach(k => k.el.setAttribute('aria-label', t(scenes[k.si].id + '.title') + ' ' + (k.bi + 1)));
    for (const l of layers) l.refresh && l.refresh();
    for (const sc of live_) sc.inst && sc.inst.lang && sc.inst.lang(lang);
    buildHelp(); if (!over.hidden) buildOver();
    if (typeof gateLabels_ === 'function') gateLabels_();
  }

  // ---------- scene instances + timeline state ----------
  const live_ = scenes.map((desc, index) => {
    const s = {
      t: 0, dt: 0, dir: 1, beat: 0, bt: 0, p: desc.beats.map(() => 0), enter: 1, exit: 0, q: 1, motion: 1,
      mouse: { x: 0, y: 0, down: false }, time: 0, _since: desc.beats.map(() => 0),
    };
    s.at = b => b < s.beat ? desc.beats[b].dur : b > s.beat ? 0 : s.bt;
    s.since = b => b > s.beat ? 0 : s._since[b];
    s.k = (b, t0, t1, e) => {
      if (b < s.beat) return 1; if (b > s.beat) return 0;
      const x = clamp((s.bt - t0) / Math.max(1e-4, t1 - t0));
      return e ? (typeof e === 'string' ? ease[e] : e)(x) : x;
    };
    return { desc, index, s, inst: null, dom: null, layers: [] };
  });
  const byId = Object.fromEntries(live_.map(sc => [sc.desc.id, sc]));
  function setBeat(sc, b, done) {
    const s = sc.s, beats = sc.desc.beats; b = clamp(b, 0, beats.length - 1);
    s.beat = b; s.bt = (done || reduced) ? beats[b].dur : 0;
    for (let i = 0; i < beats.length; i++) { s._since[i] = i < b ? Math.max(s._since[i], beats[i].dur + 4) : i === b ? s.bt : 0; s.p[i] = i < b ? 1 : i === b ? clamp(s.bt / beats[b].dur) : 0; }
  }
  function advance(sc, dt) {
    const s = sc.s, beats = sc.desc.beats;
    s.dt = dt; s.t += dt; s.bt += dt; s.time = gfx.time; s.q = quality; s.motion = reduced ? .12 : 1;
    for (let i = 0; i <= s.beat; i++) s._since[i] += dt;
    s.p[s.beat] = clamp(s.bt / beats[s.beat].dur);
    s.mouse.x = damp(s.mouse.x, mouse.x, 6, dt); s.mouse.y = damp(s.mouse.y, mouse.y, 6, dt); s.mouse.down = mouse.down;
  }

  // ---------- transitions ----------
  let A = null, B = null;
  const trInst = {};
  const getTr = name => { const d = transitions[name] || transitions.fade; const key = transitions[name] ? name : 'fade'; return trInst[key] || (trInst[key] = { dur: d.dur, ...d.create(ctx) }); };
  let cur = null, tr = null; // tr = { from, to, inst, p, dur, frozen }

  function announce() {
    const d = cur.desc, b = d.beats[cur.s.beat];
    live.textContent = t(d.id + '.title') + '. ' + (b.copy || []).map(k => t(k)).join(' ');
    const i = ticks.findIndex(k => k.si === cur.index && k.bi === cur.s.beat);
    ticks.forEach((k, j) => { k.el.classList.toggle('on', j === i); k.el.classList.toggle('past', j < i); if (j === i) k.el.setAttribute('aria-current', 'step'); else k.el.removeAttribute('aria-current'); });
    const first = cur.index === 0 && cur.s.beat === 0, last = cur.index === live_.length - 1 && cur.s.beat === d.beats.length - 1;
    bPrev.disabled = first; bNext.disabled = last; hint.classList.toggle('on', first);
    const h = d.id + (cur.s.beat ? '-' + (cur.s.beat + 1) : '');
    if (location.hash.slice(1) !== h) { try { history.replaceState(null, '', '#' + h); } catch (e) { try { location.hash = h; } catch (e2) { /* sandboxed */ } } }
    document.body.dataset.scene = d.id; document.body.dataset.beat = String(cur.s.beat);
    for (const sc of live_) if (sc.dom) sc.dom.hidden = sc !== cur;
  }
  function startTransition(to, name, beat, done) {
    if (tr) return false;
    const from = cur;
    if (!A) { A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false }); }
    const inst = getTr(reduced ? 'fade' : name);
    to.s.t = 0; setBeat(to, beat, done); to.s.enter = 0; to.s.exit = 0; to.s.dir = to.index >= from.index ? 1 : -1;
    from.inst.exit && from.inst.exit(from.s);
    to.inst.enter && to.inst.enter(to.s);
    tr = { from, to, inst, p: 0, dur: reduced ? .55 : inst.dur };
    cur = to; announce(); audio.sfx('whoosh', { gain: .35 });
    return true;
  }
  function freezeFade(change) { // same-scene jump: freeze last frame into A, change state, fade to it
    if (tr) return false;
    if (!A) { A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false }); }
    cur.s.dt = 0; cur.inst.render(A, cur.s);
    change();
    tr = { from: null, to: cur, inst: getTr('fade'), p: 0, dur: .75 };
    announce(); return true;
  }
  function next() {
    if (tr || !cur || !started) return;
    const s = cur.s, beats = cur.desc.beats;
    if (s.beat < beats.length - 1) { setBeat(cur, s.beat + 1); s.dir = 1; cur.inst.beat && cur.inst.beat(s); audio.sfx('tick', { gain: .25 }); announce(); }
    else if (cur.index < live_.length - 1) { const to = live_[cur.index + 1]; startTransition(to, to.desc.enterWith || 'fade', 0); }
  }
  function prev() {
    if (tr || !cur || !started) return;
    const s = cur.s;
    if (s.beat > 0) freezeFade(() => { setBeat(cur, s.beat - 1, true); s.dir = -1; });
    else if (cur.index > 0) { const to = live_[cur.index - 1]; startTransition(to, 'fade', to.desc.beats.length - 1, true); }
  }
  function goto(id, beat = 0) {
    const to = byId[id]; if (!to || tr || !started) return;
    beat = clamp(beat | 0, 0, to.desc.beats.length - 1);
    if (to === cur) { if (beat !== cur.s.beat) freezeFade(() => setBeat(cur, beat, beat < cur.s.beat)); return; }
    startTransition(to, to.index === cur.index + 1 && beat === 0 ? (to.desc.enterWith || 'fade') : 'fade', beat, false);
  }
  function parseHash() {
    const h = decodeURIComponent(location.hash.slice(1)); if (!h || RESERVED.has(h)) return null;
    const m = /^([a-z0-9]+?)(?:-(\d+))?$/.exec(h.toLowerCase()); if (!m || !byId[m[1]]) return null;
    return { id: m[1], beat: m[2] ? +m[2] - 1 : 0 };
  }
  let pendingHash = null;
  window.addEventListener('hashchange', () => { const h = parseHash(); if (h && cur && (h.id !== cur.desc.id || h.beat !== cur.s.beat)) { if (tr) pendingHash = h; else goto(h.id, h.beat); } });

  // ---------- overview + help ----------
  function buildOver() {
    over.innerHTML = '';
    const head = $('div', 'over-head'); head.append($('h2', '', t('ui.overview')));
    const x = $('button', 'tool', t('ui.close')); x.type = 'button'; x.addEventListener('click', closeChrome); head.append(x); over.append(head);
    const grid = $('div', 'over-grid');
    live_.forEach(sc => sc.desc.beats.forEach((b, bi) => {
      const btn = $('button', 'card'); btn.type = 'button';
      const th = $('div', 'th'); const key = sc.desc.id + (bi ? '-' + (bi + 1) : '');
      const img = ctx.snapshots[key] || thumbs[key] || ctx.snapshots[sc.desc.id] || thumbs[sc.desc.id];
      if (img) th.style.backgroundImage = `url(${img})`;
      const cap = $('span', 'cap'); cap.textContent = t(sc.desc.id + '.title') + (sc.desc.beats.length > 1 ? ' · ' + (bi + 1) : '');
      const sub = $('span', 'sub'); sub.textContent = (b.copy && b.copy[0]) ? t(b.copy[0]) : '';
      btn.append(th, cap, sub);
      if (sc === cur && bi === cur.s.beat) btn.setAttribute('aria-current', 'true');
      btn.addEventListener('click', () => { closeChrome(); goto(sc.desc.id, bi); });
      grid.append(btn);
    }));
    over.append(grid);
  }
  function buildHelp() {
    const rows = [['→ ↓ Space', 'help.next'], ['← ↑', 'help.prev'], ['Home / End', 'help.ends'], ['1–' + scenes.length, 'help.jump'], ['O', 'help.overview'], ['M', 'help.mute'], ['L', 'help.lang'], ['F', 'help.full'], ['?', 'help.help'], ['Esc', 'help.close']];
    help.innerHTML = `<h2>${t('help.title')}</h2><dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${t(r[1])}</dd>`).join('')}</dl>`;
    const x = $('button', 'tool', t('ui.close')); x.type = 'button'; x.addEventListener('click', closeChrome); help.append(x);
  }
  let lastFocus = null;
  function openOver() { if (!started) return; lastFocus = document.activeElement; help.hidden = true; buildOver(); over.hidden = false; document.body.classList.add('chrome-open'); (over.querySelector('[aria-current]') || over.querySelector('button.card')).focus(); }
  function openHelp() { lastFocus = document.activeElement; over.hidden = true; buildHelp(); help.hidden = false; document.body.classList.add('chrome-open'); help.querySelector('button').focus(); }
  function closeChrome() { over.hidden = true; help.hidden = true; document.body.classList.remove('chrome-open'); (lastFocus && lastFocus.focus) ? lastFocus.focus() : canvas.focus(); }
  const chromeOpen = () => !over.hidden || !help.hidden;
  const trap = e => { if (e.key !== 'Tab') return; const box = !over.hidden ? over : help; const f = [...box.querySelectorAll('button, a[href]')]; if (!f.length) return;
    const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); } else if (!box.contains(document.activeElement)) { first.focus(); e.preventDefault(); } };
  over.addEventListener('keydown', trap); help.addEventListener('keydown', trap);

  function toggleLang() { lang = lang === 'sr' ? 'en' : 'sr'; try { localStorage.setItem('lyra-lang', lang); } catch (e) { /* ignore */ } relabel(); if (cur) announce(); }
  function toggleMute() { audio.setMuted(!audio.muted); relabel(); say(audio.muted ? t('ui.soundOffSay') : t('ui.soundOnSay')); }
  bOver.addEventListener('click', openOver); bLang.addEventListener('click', toggleLang); bSnd.addEventListener('click', toggleMute);
  bNext.addEventListener('click', next); bPrev.addEventListener('click', prev);
  mark.addEventListener('click', e => { e.preventDefault(); goto(scenes[0].id, 0); });

  // ---------- input ----------
  const mouse = { x: 0, y: 0, down: false };
  let started = false, idleT = 0;
  const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 3200); };
  const toEvt = (type, e) => {
    const r = canvas.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    return { type, x: nx * view.w, y: ny * view.h, nx: nx * 2 - 1, ny: 1 - ny * 2, id: e.pointerId, pointerType: e.pointerType };
  };
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    wake(); audio.unlock(); const ev = toEvt('down', e); mouse.x = ev.nx; mouse.y = ev.ny; mouse.down = true;
    const used = started && !tr && cur && cur.inst.pointer && cur.inst.pointer(ev, cur.s);
    drag = { x: e.clientX, y: e.clientY, used: !!used, t: performance.now() }; // only a consumed DOWN (a grabbed object) blocks swipe navigation
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', e => {
    wake(); const ev = toEvt('move', e); mouse.x = ev.nx; mouse.y = ev.ny;
    if (started && !tr && cur && cur.inst.pointer) cur.inst.pointer(ev, cur.s);
  });
  const up = e => {
    mouse.down = false; const ev = toEvt('up', e);
    if (started && !tr && cur && cur.inst.pointer) cur.inst.pointer(ev, cur.s);
    if (drag && !drag.used && e.pointerType !== 'mouse') { // swipe navigation on touch
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 48 && performance.now() - drag.t < 900) { if (Math.abs(dx) > Math.abs(dy) ? dx < 0 : dy < 0) next(); else prev(); }
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { if (cur && cur.inst.pointer && !mouse.down) cur.inst.pointer({ type: 'leave', x: -1, y: -1, nx: 9, ny: 9 }, cur.s); });
  let wheelAcc = 0, wheelLock = 0, wheelLast = 0;
  window.addEventListener('wheel', e => {
    if (chromeOpen() || e.ctrlKey) return; if (e.target.closest && e.target.closest('.scene-dom')) return;
    wake(); const now = performance.now();
    // one continuous stream of wheel events (incl. trackpad inertia) is ONE gesture = one step
    const gap = now - wheelLast; wheelLast = now; if (gap > 220) wheelAcc = 0;
    if (now < wheelLock) { if (gap < 160) wheelLock = Math.max(wheelLock, now + 260); return; }
    wheelAcc += e.deltaY + e.deltaX; if (Math.abs(wheelAcc) > 60) { wheelAcc > 0 ? next() : prev(); wheelAcc = 0; wheelLock = now + 800; }
  }, { passive: true });
  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; wake();
    const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape') { if (chromeOpen()) { closeChrome(); e.preventDefault(); } else if (cur && cur.inst.key && cur.inst.key(e, cur.s)) e.preventDefault(); return; }
    if (typing) return;
    if (chromeOpen()) { if (e.key.toLowerCase() === 'o' || e.key === '?') { closeChrome(); e.preventDefault(); } return; }
    if (!started) return;
    if (cur && cur.inst.key && cur.inst.key(e, cur.s)) { e.preventDefault(); return; }
    const onBtn = tag === 'button' || tag === 'a';
    const k = e.key;
    if (e.repeat && /^(Arrow|Page| |Enter|Home|End|\d)/.test(k)) { e.preventDefault(); return; } // a held key is one step, not ten
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onBtn) || (k === 'Enter' && !onBtn)) { next(); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onBtn)) { prev(); e.preventDefault(); }
    else if (k === 'Home') { goto(scenes[0].id, 0); e.preventDefault(); }
    else if (k === 'End') { const l = live_[live_.length - 1]; goto(l.desc.id, l.desc.beats.length - 1); e.preventDefault(); }
    else if (/^[1-9]$/.test(k)) { const sc = live_[+k - 1]; if (sc) goto(sc.desc.id, 0); }
    else if (k.toLowerCase() === 'o' || k.toLowerCase() === 'g') openOver();
    else if (k.toLowerCase() === 'm') toggleMute();
    else if (k.toLowerCase() === 'l') toggleLang();
    else if (k === '?' || k.toLowerCase() === 'h') openHelp();
    else if (k.toLowerCase() === 'f') { try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); } catch (er) { /* refused */ } }
  });
  window.addEventListener('pointermove', wake, { passive: true });
  mqReduce.addEventListener && mqReduce.addEventListener('change', () => { reduced = mqReduce.matches; });

  // ---------- sizing ----------
  function resize() {
    const cssW = Math.max(1, window.innerWidth), cssH = Math.max(1, window.innerHeight);
    const big = cssW * cssH > 1600 * 1000;
    let dpr = Math.min(window.devicePixelRatio || 1, big ? Math.min(dprCap, 1.5) : dprCap);
    const maxPix = 2.4e6 * (0.5 + 0.5 * quality); // absolute cap, shrinks with adaptive quality
    dpr = Math.min(dpr, Math.sqrt(maxPix / (cssW * cssH)));
    dpr = Math.max(.6, dpr);
    gfx.quality = quality; gfx.resize(cssW, cssH, dpr);
    view.cssW = cssW; view.cssH = cssH; view.aspect = cssW / cssH; view.portrait = cssH > cssW * 1.05;
    if (view.portrait) { view.w = 1080; view.h = 1080 / view.aspect; } else { view.h = 1080; view.w = 1080 * view.aspect; }
    view.scale = gfx.W / view.w; view.touch = matchMedia('(pointer: coarse)').matches;
    { const u = view.w / cssW; view.safeTop = Math.max(110, 66 * u); view.safeBottom = Math.max(130, 84 * u); view.safeSide = Math.max(90, 22 * u); } // chrome is sized in CSS px: clearances in design units
    text.resize && text.resize();
    for (const sc of live_) sc.inst && sc.inst.resize && sc.inst.resize();
    hint.textContent = t(view.touch ? 'ui.hintTouch' : 'ui.hint');
  }
  let rsT = 0; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(resize, 80); });

  // ---------- gate / loader ----------
  const gate = $('div', 'gate');
  gate.innerHTML = `<div class="gate-in"><div class="gate-logo" aria-hidden="true">${logoSVG('glg', { attrs: ' focusable="false"' })}</div><p class="gate-mark">Lyra Style</p><div class="gate-bar"><i></i></div><p class="gate-msg"></p><p class="gate-go" aria-hidden="true"><span class="gate-chev"></span><span class="gate-go-t"></span></p></div>`;
  ui.append(gate);
  const bar = gate.querySelector('i'), gmsg = gate.querySelector('.gate-msg');
  gmsg.textContent = t('gate.loading');
  relabel(); resize();

  // ---- loader choreography -------------------------------------------------
  // Heavy scene setup blocks the main thread, which would stutter the logo drawing in. So: let the logo draw
  // on an idle thread first, then do the work in steps. The bar only animates `transform` (compositor thread),
  // and each step is set BEFORE the blocking work, so the bar keeps gliding while the thread is busy.
  const frames = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const tGate = performance.now();
  await text.ready;
  if (!headless && !reduced) { const wait = 2300 - (performance.now() - tGate); if (wait > 0) await new Promise(r => setTimeout(r, wait)); }
  gate.classList.add('loading');
  const steps = live_.length + 1; let done = 0;
  const step = async k => { bar.style.transform = `scaleX(${Math.min(1, k / steps)})`; await frames(2); };
  await step(.35);
  for (const sc of live_) {
    try {
      creating = sc; sc.inst = sc.desc.create(ctx); creating = null;
      if (sc.inst.init) await sc.inst.init();
      sc.dom = ui.querySelector(`.scene-dom[data-scene="${sc.desc.id}"]`);
    } catch (e) { console.error('scene init failed', sc.desc.id, e); fallback(e); return; }
    done++; await step(done + .35);
  }
  resize();
  // warm-up: draw every beat of every scene once, offscreen, so no program compiles or texture uploads happen on the
  // first visible frame or in the middle of the first transition
  try {
    if (!A) { A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false }); }
    for (const sc of live_) {
      sc.inst.enter && sc.inst.enter(sc.s);
      for (let b = 0; b < sc.desc.beats.length; b++) { setBeat(sc, b, true); sc.s.dt = 0; sc.inst.update(sc.s); sc.inst.render(A, sc.s); }
      sc.inst.exit && sc.inst.exit(sc.s); setBeat(sc, 0, false); sc.s.t = 0;
    }
    gfx.renderer.getContext().finish && gfx.renderer.getContext().flush();
  } catch (e) { console.warn('scene warm-up skipped', e); }
  // compile every transition behind the loader so the first cut does not hitch
  try {
    A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false });
    for (const name of new Set(['fade', ...scenes.map(d => d.enterWith).filter(Boolean)])) { const tI = getTr(name); try { tI.render({ A, B, p: .5, out: null, time: 0, from: null, to: null, sa: live_[0].s, sb: live_[0].s }); } catch (e) { /* render warm-up optional */ } }
  } catch (e) { console.warn('transition warm-up skipped', e); }

  const start0 = parseHash() || { id: scenes[0].id, beat: 0 };
  cur = byId[start0.id]; setBeat(cur, start0.beat, start0.beat > 0); cur.s.t = 0;
  cur.inst.enter && cur.inst.enter(cur.s); announce();

  const begin = withSound => {
    if (started) return; started = true;
    audio.setMuted(!withSound); if (withSound) audio.unlock();
    setBeat(cur, cur.s.beat, cur.s.beat > 0); cur.s.t = 0; cur.inst.enter && cur.inst.enter(cur.s);
    gate.classList.add('gone'); setTimeout(() => gate.remove(), 2000);
    chromeEls.forEach(e => { e.inert = false; }); document.body.classList.add('started'); relabel(); canvas.focus({ preventScroll: true }); wake();
  };
  // the gate is the first page: logo, name, bar, one line, then a quiet "swipe / scroll" cue. Any forward gesture enters, with sound.
  const gGo = gate.querySelector('.gate-go-t');
  const gateLabels = () => { gmsg.textContent = t('zica.b1.h').replace(/\u00a0/g, ' '); gGo.textContent = t(view.touch ? 'gate.swipe' : 'gate.scroll'); gate.setAttribute('aria-label', gmsg.textContent + ' ' + gGo.textContent); };
  gateLabels_ = gateLabels; gateLabels();
  bar.style.transform = 'scaleX(1)';
  if (!headless) await new Promise(r => setTimeout(r, reduced ? 50 : 1250));
  gate.tabIndex = 0; gate.setAttribute('role', 'button'); gate.classList.add('ready');
  const enter = () => begin(true);
  let gy = null;
  gate.addEventListener('pointerdown', e => { gy = e.clientY; audio.unlock(); });
  gate.addEventListener('pointerup', e => { const dy = gy == null ? 0 : gy - e.clientY; gy = null; if (dy > 30 || Math.abs(dy) < 10) enter(); });
  gate.addEventListener('wheel', e => { if (e.deltaY + e.deltaX > 8) enter(); }, { passive: true });
  gate.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); audio.unlock(); enter(); } });
  if (headless) begin(false); else gate.focus({ preventScroll: true });

  // ---------- loop ----------
  let sdt = 0, last = performance.now(), slow = 0, fast = 0, snapKey = '', lost = false, acc = 0;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; say(t('ui.lost')); });
  canvas.addEventListener('webglcontextrestored', () => { location.reload(); });
  let mutedByHide = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (!audio.muted) { mutedByHide = true; audio.setMuted(true); } }
    else if (mutedByHide) { mutedByHide = false; audio.setMuted(false); }
  });
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || lost) { last = now; return; }
    const raw = (now - last) / 1000; last = now;
    let dt = clamp(raw, 0, headless ? .34 : 1 / 20); // software-rendered test browser runs at a few fps: let time keep up there
    // even out frame-to-frame jitter (vsync slop, GC, a late frame) so motion advances at a steady rate
    if (!headless) { sdt = sdt ? sdt + (dt - sdt) * .25 : dt; if (Math.abs(dt - sdt) < .012) dt = sdt; else sdt = dt; }
    if (chromeOpen()) dt = 0;
    acc += dt; gfx.tick(acc);
    // adaptive quality from real frame time
    if (started && !headless && raw < .25) {
      if (raw > 1 / 40) slow++; else slow = Math.max(0, slow - 1);
      if (raw < 1 / 57) fast++; else fast = 0;
      if (slow > 50 && quality > .35) { quality = Math.max(.35, quality - .2); slow = 0; fast = 0; resize(); }
      else if (fast > 600 && quality < 1) { quality = Math.min(1, quality + .1); fast = 0; resize(); }
    }
    if (tr) {
      tr.p = Math.min(1, tr.p + dt / tr.dur);
      const { from, to } = tr;
      if (from) { from.s.exit = tr.p; for (const l of from.layers) l.fade = 1 - smoothstep(0, .3, tr.p); advance(from, dt); from.inst.update(from.s); from.inst.render(A, from.s); for (const l of from.layers) l.fade = 1; }
      to.s.enter = tr.p; if (from) for (const l of to.layers) l.fade = smoothstep(.62, 1, tr.p); advance(to, dt); to.inst.update(to.s); to.inst.render(B, to.s); for (const l of to.layers) l.fade = 1;
      tr.inst.render({ A, B, p: tr.p, out: null, time: acc, from: from && from.inst, to: to.inst, sa: from && from.s, sb: to.s });
      if (tr.p >= 1) { if (from) { from.s.exit = 0; } to.s.enter = 1; tr = null; if (pendingHash) { const h = pendingHash; pendingHash = null; if (h.id !== cur.desc.id || h.beat !== cur.s.beat) goto(h.id, h.beat); } }
    } else if (cur) {
      advance(cur, started ? dt : 0); cur.inst.update(cur.s); cur.inst.render(null, cur.s);
      // keep a small live snapshot of what the visitor has seen (for the overview)
      if (started && snapKey !== cur.desc.id + cur.s.beat && cur.s.bt > Math.min(3.5, cur.desc.beats[cur.s.beat].dur)) { snapKey = cur.desc.id + cur.s.beat; snapshot(); } // once per beat: a readback stalls the GPU
    }
  }
  const snapC = document.createElement('canvas'); snapC.width = 480; snapC.height = 270;
  function snapshot() {
    try {
      const g = snapC.getContext('2d'); const cw = canvas.width, ch = canvas.height; const s = Math.max(480 / cw, 270 / ch);
      g.fillStyle = '#000'; g.fillRect(0, 0, 480, 270); g.drawImage(canvas, (480 - cw * s) / 2, (270 - ch * s) / 2, cw * s, ch * s);
      const key = cur.desc.id + (cur.s.beat ? '-' + (cur.s.beat + 1) : '');
      ctx.snapshots[key] = snapC.toDataURL('image/jpeg', .7);
    } catch (e) { /* ignore */ }
  }
  requestAnimationFrame(frame);

  // test / bake hooks
  window.__lyra = {
    goto: (id, beat, done) => { const sc = byId[id]; if (!sc) return false; if (cur !== sc) { cur.inst.exit && cur.inst.exit(cur.s); cur = sc; sc.s.t = 0; setBeat(sc, beat || 0, done); sc.inst.enter && sc.inst.enter(sc.s); } else setBeat(sc, beat || 0, done); tr = null; announce(); return true; },
    seek: sec => { cur.s.bt = sec; cur.s._since[cur.s.beat] = sec; cur.s.p[cur.s.beat] = clamp(sec / cur.desc.beats[cur.s.beat].dur); },
    next, prev, state: () => ({ id: cur.desc.id, beat: cur.s.beat, bt: cur.s.bt, tr: !!tr, quality, dpr: gfx.dpr, W: gfx.W, H: gfx.H, calls: gfx.renderer.info.render.calls, tris: gfx.renderer.info.render.triangles, programs: gfx.renderer.info.programs ? gfx.renderer.info.programs.length : 0 }),
    scenes: scenes.map(d => ({ id: d.id, beats: d.beats.length })), snaps: () => Object.keys(ctx.snapshots), snapNow: () => { snapshot(); return Object.keys(ctx.snapshots).map(k => k + ':' + ctx.snapshots[k].length); }, lang: l => { if (l !== lang) toggleLang(); },
  };
}
