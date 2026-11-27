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
    overlay() { const l = text.layer(); layers.add(l); if (creating) creating.layers.push(l);
      // remember the blocks so the deck can tell whether a beat's words are in yet (see revealed())
      const mk = l.text; l._items = []; l.text = (src, o) => { const T = mk(src, o); l._items.push(T); return T; }; return l; },
    sfx: (name, o) => audio.sfx(name, o),
    dom(id) { const d = $('div', 'scene-dom'); d.dataset.scene = id; d.hidden = true; ui.insertBefore(d, rail); return d; }, // before the rail: scene controls come first in tab order
    snapshots: {},
    go: (id, beat) => goto(id, beat || 0),
    next: () => next(), prev: () => prev(),
    request: d => request(d < 0 ? -1 : 1), // a visitor's own step (words first, buffering, rail pulse), e.g. a swipe that started on scene DOM
    chrome: on => { sceneChrome = { sc: creatingOrCur(), off: on === false }; syncChrome(); }, // a scene hides the deck chrome while its own panel is open
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
  const say = (msg, ms = 1800) => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), ms); };
  // feedback: restart a one-shot CSS animation class
  const kick = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el['_k' + cls]); el['_k' + cls] = setTimeout(() => el.classList.remove(cls), 700); };
  const tickOf = (si, bi) => ticks.find(k => k.si === si && k.bi === bi);
  const pingTick = (si, bi) => { const k = tickOf(si, bi); k && kick(k.el, 'ping'); };
  const nextOf = () => { if (!cur) return null; const b = cur.s.beat; if (b < cur.desc.beats.length - 1) return [cur.index, b + 1]; if (cur.index < live_.length - 1) return [cur.index + 1, 0]; return null; };
  // chrome over scene panels: hidden while a scene asks (ctx.chrome(false)) or any open dialog / [data-modal] sits in the current scene's DOM
  let sceneChrome = { sc: null, off: false }, chromeHidden = false;
  const creatingOrCur = () => creating || cur;
  function syncChrome() {
    let off = !!(sceneChrome.off && sceneChrome.sc && sceneChrome.sc === cur);
    if (!off && cur && cur.dom && !cur.dom.hidden) {
      for (const el of cur.dom.querySelectorAll('[role=dialog],[data-modal]')) {
        if (el.hidden || el.closest('[hidden],[inert]') || el.getAttribute('aria-hidden') === 'true' || el.dataset.modal === 'false') continue;
        if (!el.getClientRects().length) continue;
        off = true; break;
      }
    }
    if (off === chromeHidden) return; chromeHidden = off;
    document.body.classList.toggle('chrome-hidden', off);
    if (started) [rail, bPrev, bNext].forEach(e => { e.inert = off; });
  }

  function relabel() {
    document.documentElement.lang = lang;
    document.title = t('ui.title');
    canvas.setAttribute('aria-label', t('ui.canvas'));
    bOver.textContent = t('ui.overview'); bLang.textContent = lang === 'sr' ? 'EN' : 'SR';
    bLang.setAttribute('aria-label', t('ui.langSwitch'));
    bSnd.textContent = audio.muted ? t('ui.soundOn') : t('ui.soundOff'); bSnd.removeAttribute('aria-pressed'); // the label names the action (turn sound on / mute), so no pressed state
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
  let beatSerial = 0; // bumps on every beat change: a fast-forward is spent once per visit of a beat
  function setBeat(sc, b, done) {
    const s = sc.s, beats = sc.desc.beats; b = clamp(b, 0, beats.length - 1); beatSerial++; ff = null;
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
    // not `disabled`: a press at either end must still answer (rail bounce + toast), so only aria-disabled
    bPrev.setAttribute('aria-disabled', String(first)); bNext.setAttribute('aria-disabled', String(last)); hint.classList.toggle('on', first);
    const h = d.id + (cur.s.beat ? '-' + (cur.s.beat + 1) : '');
    if (location.hash.slice(1) !== h) { try { history.replaceState(null, '', '#' + h); } catch (e) { try { location.hash = h; } catch (e2) { /* sandboxed */ } } }
    document.body.dataset.scene = d.id; document.body.dataset.beat = String(cur.s.beat);
    for (const sc of live_) if (sc.dom) sc.dom.hidden = sc !== cur;
    syncChrome();
  }
  function startTransition(to, name, beat, done) {
    if (tr) return false;
    const from = cur;
    if (!A) { A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false }); }
    const inst = getTr(reduced ? 'fade' : name);
    to.s.t = 0; setBeat(to, beat, done); to.s.enter = 0; to.s.exit = 0; to.s.dir = to.index >= from.index ? 1 : -1;
    from.inst.exit && from.inst.exit(from.s);
    to.inst.enter && to.inst.enter(to.s);
    tr = { from, to, inst, p: 0, dur: reduced ? .55 : inst.dur, fwd: !done }; // fwd: arrives at a fresh beat (see arrive())
    cur = to; announce(); audio.sfx('whoosh', { gain: .35 });
    return true;
  }
  function freezeFade(change, dur = .75, fwd = false) { // same-scene jump: freeze last frame into A, change state, fade to it
    if (tr) return false;
    if (!A) { A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false }); }
    cur.s.dt = 0; cur.inst.render(A, cur.s);
    change();
    tr = { from: null, to: cur, inst: getTr('fade'), p: 0, dur, fwd };
    announce(); return true;
  }
  function next() {
    if (tr || !cur || !started) return false;
    const s = cur.s, beats = cur.desc.beats;
    if (s.beat < beats.length - 1) {
      const fwd = () => { setBeat(cur, s.beat + 1); s.dir = 1; cur.inst.beat && cur.inst.beat(s); };
      if (reduced) freezeFade(fwd, .3, true); else { fwd(); announce(); } // reduced motion: a short dissolve instead of a hard cut
      audio.sfx('tick', { gain: .25 }); return true;
    }
    if (cur.index < live_.length - 1) { const to = live_[cur.index + 1]; return startTransition(to, to.desc.enterWith || 'fade', 0); }
    return false;
  }
  // ---- the visitor's own steps (wheel, swipe, arrow keys, the next/back buttons) ----
  // Words first: a forward step asked for before the current beat's copy is in fast-forwards the beat instead (an eased
  // catch-up, not a cut); the next request then advances. During a transition ONE step is buffered and runs when it ends.
  // Every accepted request answers visibly; a step past the end bounces the rail and says where to go.
  let ff = null, ffSpent = -1, pendingStep = 0, enteredAt = -1e9, endSaid = -1e9;
  // A beat the visitor arrives at by a transition is always seen. A forward step buffered during that transition may at
  // most fast-forward the new beat's words; otherwise it waits until the beat has been on screen, transition-free, for
  // DWELL seconds and its words are in, and only then advances. Further forward gestures in that window are absorbed.
  // Tied to beatSerial, so any jump, back step or deep link cancels it. Deliberate single steps never meet it.
  const DWELL = 1.2; let dwell = null; // { serial, t, step }
  function arrive() { // a buffered forward step at the end of a transition into a fresh beat
    if (!revealed(cur) && ffSpent !== beatSerial) { ff = { serial: beatSerial, t: 0, out: null, to: textAt(cur) }; ffSpent = beatSerial; pingTick(cur.index, cur.s.beat); kick(bNext, 'flash'); dwell = { serial: beatSerial, t: 0, step: 0 }; }
    else dwell = { serial: beatSerial, t: 0, step: 1 };
  }
  function dwellTick(dt) {
    if (!dwell) return; if (dwell.serial !== beatSerial) { dwell = null; return; }
    if (dwell.t < DWELL - 1e-6 || !revealed(cur)) { dwell.t += dt; return; } // checked before adding: the beat was drawn for the whole dwell
    const go = dwell.step; dwell = null; if (go) request(1);
  }
  const textAt = sc => { const b = sc.desc.beats[sc.s.beat]; return b.textAt != null ? Math.min(+b.textAt, b.dur) : null; };
  function copyIn(sc) { // true / false from the text blocks that show this beat's copy keys; null when none can be seen
    const keys = (sc.desc.beats[sc.s.beat].copy || []).filter(k => !/hint/i.test(k)); if (!keys.length) return null;
    let n = 0;
    for (const l of sc.layers) for (const T of (l._items || [])) {
      if (!T.visible || keys.indexOf(T._src) < 0) continue; n++;
      if (T._in < .9 || T._out > .1 || T.alpha < .3) return false;
    }
    return n ? true : null;
  }
  function revealed(sc) {
    const s = sc.s, b = sc.desc.beats[s.beat], at = textAt(sc);
    if (reduced || s.bt >= b.dur) return true;
    if (at != null) return s.bt >= at - .05;
    const c = copyIn(sc); return c == null ? s.bt >= Math.min(b.dur, 2.5) : c;
  }
  function request(dir) {
    if (!cur || !started) return;
    if (performance.now() - enteredAt < 550) return; // the gesture that opened the gate never also steps
    if (tr) { pendingStep = dir; if (dir > 0) { const n = nextOf(); n && pingTick(n[0], n[1]); kick(bNext, 'flash'); } else kick(bPrev, 'flash'); return; } // cur is already the destination
    if (dir < 0) { if (prev()) pingTick(cur.index, cur.s.beat); else kick(rail, 'bump-l'); return; }
    if (dwell && dwell.serial === beatSerial) { // the arrival dwell: this gesture is absorbed (the held step, if any, still runs)
      const n = dwell.step ? nextOf() : [cur.index, cur.s.beat]; n && pingTick(n[0], n[1]); kick(bNext, 'flash'); return; }
    if (!revealed(cur) && ffSpent !== beatSerial) { // first request: bring the words in now
      ff = { serial: beatSerial, t: 0, out: null, to: textAt(cur) }; ffSpent = beatSerial;
      kick(bNext, 'flash'); pingTick(cur.index, cur.s.beat); return;
    }
    if (next()) { pingTick(cur.index, cur.s.beat); kick(bNext, 'flash'); return; }
    kick(rail, 'bump'); kick(bNext, 'bump'); // the end: nowhere further to go
    const now = performance.now(); if (now - endSaid > 2600) { endSaid = now; say(t('ui.end'), 3200); }
  }
  function ffStep(dt) { // scene seconds to advance this frame while a fast-forward runs
    if (!ff || ff.serial !== beatSerial || dt <= 0) { ff = null; return dt; }
    const s = cur.s, b = cur.desc.beats[s.beat];
    ff.t += dt;
    if (ff.out == null && (s.bt >= (ff.to != null ? ff.to : b.dur) - 1e-3 || (ff.to == null && revealed(cur)) || ff.t > 1.4)) ff.out = ff.t;
    const speed = ff.out == null ? 1 + 7 * smoothstep(0, .12, ff.t) : 1 + 7 * (1 - smoothstep(0, .2, ff.t - ff.out));
    let d = dt * speed;
    if (ff.to != null && ff.out == null) d = Math.min(d, Math.max(dt, ff.to - s.bt));
    if (ff.out != null && ff.t - ff.out >= .2) ff = null;
    return d;
  }
  function prev() {
    if (tr || !cur || !started) return false;
    const s = cur.s;
    if (s.beat > 0) return freezeFade(() => { setBeat(cur, s.beat - 1, true); s.dir = -1; }, reduced ? .3 : .75);
    if (cur.index > 0) { const to = live_[cur.index - 1]; return startTransition(to, 'fade', to.desc.beats.length - 1, true); }
    return false;
  }
  function goto(id, beat = 0) {
    const to = byId[id]; if (!to || tr || !started) return; pendingStep = 0;
    beat = clamp(beat | 0, 0, to.desc.beats.length - 1);
    if (to === cur) { if (beat !== cur.s.beat) freezeFade(() => setBeat(cur, beat, beat < cur.s.beat), .75, beat > cur.s.beat); return; }
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
  function openOver() { if (!started) return; lastFocus = document.activeElement; help.hidden = true; buildOver(); over.hidden = false; document.body.classList.add('chrome-open');
    // focus the current card without scrolling the sheet past its heading; scroll only as far as the card needs
    const c = over.querySelector('[aria-current]') || over.querySelector('button.card'); over.scrollTop = 0; c.focus({ preventScroll: true }); try { c.scrollIntoView({ block: 'nearest' }); } catch (e) { /* old engines */ } }
  function openHelp() { lastFocus = document.activeElement; over.hidden = true; buildHelp(); help.hidden = false; document.body.classList.add('chrome-open'); help.querySelector('button').focus(); }
  function closeChrome() { over.hidden = true; help.hidden = true; document.body.classList.remove('chrome-open'); (lastFocus && lastFocus.focus) ? lastFocus.focus() : canvas.focus(); }
  const chromeOpen = () => !over.hidden || !help.hidden;
  const trap = e => { if (e.key !== 'Tab') return; const box = !over.hidden ? over : help; const f = [...box.querySelectorAll('button, a[href]')]; if (!f.length) return;
    const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); } else if (!box.contains(document.activeElement)) { first.focus(); e.preventDefault(); } };
  over.addEventListener('keydown', trap); help.addEventListener('keydown', trap);

  function toggleLang() { lang = lang === 'sr' ? 'en' : 'sr'; try { localStorage.setItem('lyra-lang', lang); } catch (e) { /* ignore */ } relabel(); if (cur) announce(); }
  function toggleMute() { audio.setMuted(!audio.muted); relabel(); say(audio.muted ? t('ui.soundOffSay') : t('ui.soundOnSay')); }
  bOver.addEventListener('click', openOver); bLang.addEventListener('click', toggleLang); bSnd.addEventListener('click', toggleMute);
  bNext.addEventListener('click', () => request(1)); bPrev.addEventListener('click', () => request(-1));
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
    drag = { x: e.clientX, y: e.clientY, used: !!used, t: e.timeStamp || performance.now() }; // only a consumed DOWN (a grabbed object) blocks swipe navigation
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', e => {
    wake(); const ev = toEvt('move', e); mouse.x = ev.nx; mouse.y = ev.ny;
    if (started && !tr && cur && cur.inst.pointer) cur.inst.pointer(ev, cur.s);
  });
  const up = e => {
    mouse.down = false; const ev = toEvt('up', e);
    if (started && !tr && cur && cur.inst.pointer) cur.inst.pointer(ev, cur.s);
    if (drag && !drag.used && e.pointerType !== 'mouse') { const d = swipeDir(drag, e.clientX, e.clientY, e.timeStamp); if (d) request(d); } // swipe navigation on touch
    drag = null;
  };
  // a swipe: > 48 px within 0.9 s (a slow deliberate drag of > 90 px may take 1.5 s). Horizontal swipes that start in the
  // 24 px system-gesture strips at the screen edges are left to the OS (back / forward), never doubled by a step.
  function swipeDir(d, x, y, ts) {
    const dx = x - d.x, dy = y - d.y, dist = Math.max(Math.abs(dx), Math.abs(dy)), el = (ts || performance.now()) - d.t; // event timestamps, not handler time
    if (dist <= 48 || el > (dist > 90 ? 1500 : 900)) return 0;
    const horiz = Math.abs(dx) > Math.abs(dy);
    if (horiz && (d.x < 24 || d.x > window.innerWidth - 24)) return 0;
    return (horiz ? dx < 0 : dy < 0) ? 1 : -1;
  }
  // swipes that start on the chrome (header, rail, step buttons, hint) navigate too; a tap there is still a tap
  const CHROME = '.top,.rail,.step,.hint';
  let cdrag = null, swallowClick = 0;
  ui.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || !started || !e.target.closest || !e.target.closest(CHROME)) return; cdrag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: e.timeStamp || performance.now(), id: e.pointerId }; }, true);
  window.addEventListener('pointermove', e => { if (cdrag && e.pointerId === cdrag.id) { cdrag.lx = e.clientX; cdrag.ly = e.clientY; } }, true);
  const cup = e => { if (!cdrag || e.pointerId !== cdrag.id) return; const d = swipeDir(cdrag, e.type === 'pointercancel' ? cdrag.lx : e.clientX, e.type === 'pointercancel' ? cdrag.ly : e.clientY, e.timeStamp); cdrag = null; if (d) { swallowClick = performance.now() + 450; request(d); } };
  window.addEventListener('pointerup', cup, true); window.addEventListener('pointercancel', cup, true);
  ui.addEventListener('click', e => { if (performance.now() < swallowClick) { e.preventDefault(); e.stopPropagation(); } }, true);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { if (cur && cur.inst.pointer && !mouse.down) cur.inst.pointer({ type: 'leave', x: -1, y: -1, nx: 9, ny: 9 }, cur.s); });
  // wheel / trackpad: ONE gesture = ONE step. A gesture is a stream of wheel events with gaps under 180 ms (event time,
  // so a main-thread stall cannot split one flick in two); the momentum tail belongs to it. A second flick that starts
  // while the first one's inertia is still decaying is recognised by its deltas rising again.
  const wg = { last: -1e9, used: false, acc: 0, peak: 0, floor: 0, at: -1e9 };
  const wheelDelta = e => { const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1; return (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * k; };
  function wheelGesture(e, onStep) {
    const ts = e.timeStamp || performance.now(), d = wheelDelta(e), a = Math.abs(d);
    const gap = ts - wg.last; wg.last = Math.max(wg.last, ts);
    let fresh = gap > 180;
    if (!fresh && wg.used && ts - wg.at > 250 && wg.floor < wg.peak * .45 && a > Math.max(12, wg.floor * 3)) fresh = true;
    if (fresh) { wg.used = false; wg.acc = 0; wg.peak = 0; wg.floor = 0; }
    if (a >= wg.peak) { wg.peak = a; wg.floor = a; } else wg.floor = Math.min(wg.floor, a);
    if (wg.used) return;
    if (!onStep) { wg.used = true; wg.at = ts; wg.acc = 0; return; } // consumed elsewhere (a scrolling list): spend the gesture
    if (wg.acc && Math.sign(d) !== Math.sign(wg.acc)) wg.acc = 0;
    wg.acc += d;
    if (Math.abs(wg.acc) > 60) { wg.used = true; wg.at = ts; onStep(wg.acc > 0 ? 1 : -1); }
  }
  const armWheel = () => { const n = performance.now(); wg.used = true; wg.at = n; wg.last = Math.max(wg.last, n); wg.acc = 0; }; // the current gesture is spent
  // Scene DOM (star buttons, the end card) is no dead zone: a gesture over it steps like anywhere else. It belongs to a
  // scene element only while that element can still scroll in the gesture's direction (the department list), or when it
  // sits inside an open scene dialog (a gesture that scrolled the list to its end must not leak into the story).
  function wheelOwner(e) {
    const t = e.target; if (!t || !t.closest) return null;
    const sd = t.closest('.scene-dom'); if (!sd) return null;
    const d = wheelDelta(e), horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    for (let el = t; el && el !== sd; el = el.parentElement) {
      if (el.nodeType !== 1) continue;
      const cs = getComputedStyle(el), ov = horiz ? cs.overflowX : cs.overflowY;
      if (ov !== 'auto' && ov !== 'scroll') continue;
      if (horiz) { const max = el.scrollWidth - el.clientWidth; if (max > 1 && (d > 0 ? el.scrollLeft < max - 1 : el.scrollLeft > 1)) return 'scroll'; }
      else { const max = el.scrollHeight - el.clientHeight; if (max > 1 && (d > 0 ? el.scrollTop < max - 1 : el.scrollTop > 1)) return 'scroll'; }
    }
    const dlg = t.closest('[role=dialog],[data-modal]');
    if (dlg && sd.contains(dlg) && dlg.dataset.modal !== 'false' && !dlg.inert && !dlg.closest('[hidden],[inert]') && getComputedStyle(dlg).visibility !== 'hidden') return 'dialog';
    return null;
  }
  window.addEventListener('wheel', e => {
    if (chromeOpen() || e.ctrlKey) return;
    if (started && wheelOwner(e)) { wake(); wheelGesture(e, null); return; } // the element scrolls natively; this gesture is spent
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.cancelable) e.preventDefault(); // no browser history swipe on a horizontal trackpad gesture
    wake(); if (!started) return;
    wheelGesture(e, request);
  }, { passive: false });
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
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onBtn) || (k === 'Enter' && !onBtn)) { request(1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onBtn)) { request(-1); e.preventDefault(); }
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
      sc.targets = []; gfx.onTarget = rt => sc.targets.push(rt); // which targets belong to which scene (see parkIdle)
      creating = sc; sc.inst = sc.desc.create(ctx); creating = null;
      if (sc.inst.init) await sc.inst.init();
      gfx.onTarget = null;
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
    if (!A) { A = gfx.target({ hdr: false }); B = gfx.target({ hdr: false }); }
    for (const name of new Set(['fade', ...scenes.map(d => d.enterWith).filter(Boolean)])) { const tI = getTr(name); try { tI.render({ A, B, p: .5, out: null, time: 0, from: null, to: null, sa: live_[0].s, sb: live_[0].s }); } catch (e) { /* render warm-up optional */ } }
  } catch (e) { console.warn('transition warm-up skipped', e); }

  const start0 = parseHash() || { id: scenes[0].id, beat: 0 };
  cur = byId[start0.id]; setBeat(cur, start0.beat, start0.beat > 0); cur.s.t = 0;
  cur.inst.enter && cur.inst.enter(cur.s); announce(); parkIdle();

  const begin = withSound => {
    if (started) return; started = true;
    audio.setMuted(!withSound); if (withSound) audio.unlock();
    setBeat(cur, cur.s.beat, cur.s.beat > 0); cur.s.t = 0; cur.inst.enter && cur.inst.enter(cur.s);
    armWheel(); if (!headless) enteredAt = performance.now(); pendingStep = 0; // the gesture that opens the gate (and its inertia tail) is spent: it never also steps
    gate.classList.add('gone'); setTimeout(() => gate.remove(), 2000);
    chromeEls.forEach(e => { e.inert = false; }); document.body.classList.add('started'); relabel(); canvas.focus({ preventScroll: true }); wake();
    if (withSound && !headless) setTimeout(() => say(t(view.touch ? 'ui.soundEnter' : 'ui.soundEnterKey'), 2400), 900);
  };
  // the gate is the first page: logo, name, bar, one line, then a quiet "swipe / scroll" cue. Any forward gesture enters, with sound.
  const gGo = gate.querySelector('.gate-go-t');
  // the cue points the way the gesture goes: down + "scroll down" with a wheel, up + "swipe up" on touch
  const gateLabels = () => { gate.classList.toggle('touch', !!view.touch); gmsg.textContent = t('gate.line').replace(/\u00a0/g, ' '); gGo.textContent = t(view.touch ? 'gate.swipe' : 'gate.scroll'); gate.setAttribute('aria-label', gmsg.textContent + ' ' + gGo.textContent); };
  gateLabels_ = gateLabels; gateLabels();
  bar.style.transform = 'scaleX(1)';
  if (!headless) await new Promise(r => setTimeout(r, reduced ? 50 : 1250));
  gate.tabIndex = 0; gate.setAttribute('role', 'button'); gate.classList.add('ready');
  const enter = () => begin(true);
  let gy = null;
  gate.addEventListener('pointerdown', e => { gy = e.clientY; audio.unlock(); });
  gate.addEventListener('pointerup', e => { const dy = gy == null ? 0 : gy - e.clientY; gy = null; if (dy > 30 || Math.abs(dy) < 10) enter(); });
  gate.addEventListener('wheel', e => { if (gate.classList.contains('gone')) return; if (Math.abs(wheelDelta(e)) > 8) enter(); }, { passive: true }); // either direction
  gate.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); audio.unlock(); enter(); } });
  if (headless) begin(false); else gate.focus({ preventScroll: true });

  // ---------- loop ----------
  let chromeN = 0, sdt = 0, last = performance.now(), slow = 0, fast = 0, snapKey = '', lost = false, acc = 0;
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
      // a quality change reallocates every target (a one-off hitch): make it in a beat's hold, not mid-move or mid-cut,
      // unless the frame rate has stayed low for a long while
      const hold = !tr && cur && cur.s.bt > cur.desc.beats[cur.s.beat].dur;
      if (slow > 50 && quality > .35 && (hold || slow > 240)) { quality = Math.max(.35, quality - .2); slow = 0; fast = 0; resize(); }
      else if (fast > 600 && quality < 1 && hold) { quality = Math.min(1, quality + .1); fast = 0; resize(); }
    }
    if (tr) {
      tr.p = Math.min(1, tr.p + dt / tr.dur);
      const { from, to } = tr;
      if (from) { from.s.exit = tr.p; for (const l of from.layers) l.fade = 1 - smoothstep(0, .3, tr.p); advance(from, dt); from.inst.update(from.s); from.inst.render(A, from.s); for (const l of from.layers) l.fade = 1; }
      to.s.enter = tr.p; if (from) for (const l of to.layers) l.fade = smoothstep(.62, 1, tr.p); advance(to, dt); to.inst.update(to.s); to.inst.render(B, to.s); for (const l of to.layers) l.fade = 1;
      tr.inst.render({ A, B, p: tr.p, out: null, time: acc, from: from && from.inst, to: to.inst, sa: from && from.s, sb: to.s });
      if (tr.p >= 1) { if (from) { from.s.exit = 0; } to.s.enter = 1; const fwd = tr.fwd; tr = null; parkIdle();
        if (pendingHash) { const h = pendingHash; pendingHash = null; pendingStep = 0; if (h.id !== cur.desc.id || h.beat !== cur.s.beat) goto(h.id, h.beat); }
        else if (pendingStep) { const d = pendingStep; pendingStep = 0; if (d > 0 && fwd && started) arrive(); else request(d); } }
    } else if (cur) {
      advance(cur, started ? ffStep(dt) : 0); cur.inst.update(cur.s); cur.inst.render(null, cur.s);
      if (started) dwellTick(dt);
      if ((++chromeN & 7) === 0) syncChrome();
      // keep a small live snapshot of what the visitor has seen (for the overview)
      // once per beat, and only in the quiet hold after the beat's motion (never mid-move): ask for an idle moment, then
      // copy the frame that was just drawn (async GPU copy where available; the JPEG encode happens off this frame)
      const sk = cur.desc.id + cur.s.beat;
      if (started && snapKey !== sk && !ff && !chromeOpen() && cur.s.bt > cur.desc.beats[cur.s.beat].dur + .5) { snapKey = sk; idle(() => { if (cur && cur.desc.id + cur.s.beat === sk && !tr) snapWant = sk; }); }
      else if (snapWant && snapWant === sk) { snapWant = null; snapshot(true); }
      else if (snapWant) snapWant = null;
      if (started && cur.s.beat === cur.desc.beats.length - 1 && cur.s.bt > cur.desc.beats[cur.s.beat].dur + 1 && warmKey !== sk) { warmKey = sk; idle(() => { if (!tr && cur && cur.desc.id + cur.s.beat === sk) prewarmNext(); }); }
    }
  }
  // memory: each scene keeps a full-size multisampled HDR world target (with depth). Only the current scene and its
  // transition partner need theirs; the others are parked (GPU storage released) and come back on their next bind.
  // World targets are cleared and fully redrawn every frame, so nothing visible is lost. In the last beat's hold the next
  // scene's target is allocated ahead, so the transition's first frame does not pay for it.
  function parkIdle() {
    for (const sc of live_) { if (sc === cur || (tr && (tr.from === sc || tr.to === sc))) continue;
      for (const rt of sc.targets || []) if (rt.userData && rt.userData.samples > 0) gfx.park(rt); }
  }
  function prewarmNext() {
    const n = cur && live_[cur.index + 1]; if (!n) return;
    for (const rt of n.targets || []) if (rt.userData && rt.userData.samples > 0) gfx.unpark(rt);
  }
  let warmKey = '';
  const idle = f => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 1200 }) : setTimeout(f, 200));
  let snapWant = null;
  const snapC = document.createElement('canvas'); snapC.width = 480; snapC.height = 270;
  const snapURL = {};
  function snapStore(key, src) { // src: the WebGL canvas (same frame) or an ImageBitmap of it
    const g = snapC.getContext('2d'); const cw = src.width, ch = src.height; const s = Math.max(480 / cw, 270 / ch);
    g.fillStyle = '#000'; g.fillRect(0, 0, 480, 270); g.drawImage(src, (480 - cw * s) / 2, (270 - ch * s) / 2, cw * s, ch * s);
    if (src.close) src.close();
    if (snapC.toBlob && window.URL && URL.createObjectURL) snapC.toBlob(bl => { if (!bl) return; if (snapURL[key]) URL.revokeObjectURL(snapURL[key]); ctx.snapshots[key] = snapURL[key] = URL.createObjectURL(bl); }, 'image/jpeg', .7);
    else ctx.snapshots[key] = snapC.toDataURL('image/jpeg', .7);
  }
  function snapshot(async_) {
    const key = cur.desc.id + (cur.s.beat ? '-' + (cur.s.beat + 1) : '');
    try {
      if (async_ && window.createImageBitmap) { // a GPU-side copy of this frame's drawing buffer, scaled; the readback and encode come later
        const cw = canvas.width, ch = canvas.height, s = Math.max(480 / cw, 270 / ch);
        createImageBitmap(canvas, { resizeWidth: Math.max(1, Math.round(cw * s)), resizeHeight: Math.max(1, Math.round(ch * s)), resizeQuality: 'medium' })
          .then(bm => idle(() => { try { snapStore(key, bm); } catch (e) { /* ignore */ } }), () => { /* unsupported: no live snapshot */ });
        return;
      }
      const g = snapC.getContext('2d'); const cw = canvas.width, ch = canvas.height; const s = Math.max(480 / cw, 270 / ch);
      g.fillStyle = '#000'; g.fillRect(0, 0, 480, 270); g.drawImage(canvas, (480 - cw * s) / 2, (270 - ch * s) / 2, cw * s, ch * s);
      ctx.snapshots[key] = snapC.toDataURL('image/jpeg', .7);
    } catch (e) { /* ignore */ }
  }
  requestAnimationFrame(frame);

  // test / bake hooks
  window.__lyra = {
    goto: (id, beat, done) => { const sc = byId[id]; if (!sc) return false; if (cur !== sc) { cur.inst.exit && cur.inst.exit(cur.s); cur = sc; sc.s.t = 0; setBeat(sc, beat || 0, done); sc.inst.enter && sc.inst.enter(sc.s); } else setBeat(sc, beat || 0, done); tr = null; announce(); parkIdle(); return true; },
    targets: () => live_.map(sc => sc.desc.id + ':' + (sc.targets || []).filter(rt => rt.userData && rt.userData.samples > 0).map(rt => gfx.parked(rt) ? 'parked' : 'live').join(',')).join(' '),
    seek: sec => { cur.s.bt = sec; cur.s._since[cur.s.beat] = sec; cur.s.p[cur.s.beat] = clamp(sec / cur.desc.beats[cur.s.beat].dur); },
    next, prev, request: d => request(d < 0 ? -1 : 1), revealed: () => revealed(cur),
    state: () => ({ id: cur.desc.id, beat: cur.s.beat, bt: cur.s.bt, tr: !!tr, ff: !!ff, ffd: ffSpent === beatSerial, pending: pendingStep, dwell: dwell && dwell.serial === beatSerial ? { t: dwell.t, step: dwell.step } : null, chromeHidden, quality, dpr: gfx.dpr, W: gfx.W, H: gfx.H, calls: gfx.renderer.info.render.calls, tris: gfx.renderer.info.render.triangles, programs: gfx.renderer.info.programs ? gfx.renderer.info.programs.length : 0 }),
    scenes: scenes.map(d => ({ id: d.id, beats: d.beats.length })), snaps: () => Object.keys(ctx.snapshots), snapNow: () => { snapshot(); return Object.keys(ctx.snapshots).map(k => k + ':' + ctx.snapshots[k].length); }, lang: l => { if (l !== lang) toggleLang(); },
  };
}
