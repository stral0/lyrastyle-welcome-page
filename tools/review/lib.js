// Review helpers (reviewer-owned). Same launch args as tools/shot.js.
const { chromium } = require('/home/claude/lyra/node_modules/playwright-core'); const path = require('path');
const ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--metrics-recording-only', '--no-pings'];
const FILE = 'file://' + path.resolve('/home/claude/lyra/dist/lyra-style.html');
const SH = '/home/claude/lyra/shots/';
async function launch(extra = [], replace) { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: replace || ARGS.concat(extra) }); }
async function open(b, o = {}) {
  const mobile = !!o.mobile;
  const ctx = await b.newContext({ viewport: { width: o.w || (mobile ? 390 : 1440), height: o.h || (mobile ? 844 : 900) }, deviceScaleFactor: o.dpr || (mobile ? 2 : 1), hasTouch: mobile || !!o.touch, isMobile: mobile, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p._errs = []; p._reqs = [];
  if (!o.gate) await p.addInitScript(() => { window.__LYRA_HEADLESS = true; });
  if (o.init) await p.addInitScript(o.init);
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|ReadPixels/.test(m.text())) p._errs.push(`[${m.type()}] ${m.text()}`); });
  p.on('pageerror', e => p._errs.push('[pageerror] ' + e.message));
  p.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) p._reqs.push(u); });
  await p.goto((o.url || FILE) + (o.hash ? '#' + o.hash : ''));
  if (!o.gate && !o.nowait) await p.waitForFunction(() => window.__lyra && document.body.classList.contains('started'), null, { timeout: 180000 });
  return p;
}
// rAF control: window.__freeze = true holds frames (so input is handled promptly in the slow software renderer)
const RAF_CTL = () => { const raf = window.requestAnimationFrame.bind(window); let vt = null; window.__freeze = false; window.__gated = false; window.__budget = 0; window.__vstep = null;
  window.requestAnimationFrame = cb => raf(function tick(t) {
    if (window.__freeze || (window.__gated && window.__budget <= 0)) { raf(tick); return; }
    if (window.__gated) window.__budget--;
    if (window.__vstep != null) { if (vt == null) vt = t; vt += window.__vstep; cb(vt); } else { vt = null; cb(t); }
  }); };
// run exactly n frames of dtMs virtual time each, then hold
const frames = async (p, n, dtMs) => { await p.evaluate(([n, d]) => { window.__vstep = d; window.__gated = true; window.__budget = n; }, [n, dtMs]); for (let i = 0; i < 400; i++) { if (await p.evaluate(() => window.__budget <= 0)) break; await p.waitForTimeout(60); } await p.waitForTimeout(120); };
const st = p => p.evaluate(() => ({ ...window.__lyra.state(), hash: location.hash, lang: document.documentElement.lang }));
const settle = async (p, max = 120) => { for (let i = 0; i < max; i++) { if (!(await st(p)).tr) return; await p.waitForTimeout(200); } };
const waitBt = async (p, sec, max = 300) => { for (let i = 0; i < max; i++) { const s = await st(p); if (!s.tr && s.bt >= sec) return s; await p.waitForTimeout(150); } return st(p); };
const shot = async (p, name) => { await p.screenshot({ path: SH + name + '.png' }); console.log('shot', name); };
const report = (p, label) => { if (p._errs.length) console.log('ERRS[' + label + ']:\n  ' + [...new Set(p._errs)].slice(0, 12).join('\n  ')); if (p._reqs.length) console.log('REQS[' + label + ']: ' + p._reqs.join(', ')); };
module.exports = { RAF_CTL, frames, launch, open, st, settle, waitBt, shot, report, FILE, SH, ARGS };
