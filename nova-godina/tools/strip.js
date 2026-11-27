// Motion contact sheets: step the deck's clock exactly and tile the frames into one PNG (frame-by-frame review).
// Usage: node tools/strip.js out.png --file dist/index.html --scene zica --beat 0 --t0 .8 --t1 3 [--step .0833]
//          [--crop x,y,w,h (CSS px)] [--cols 8] [--scale .5] [--sub 2] [--w 1440 --h 900] [--mobile] [--rm] [--done]
//        node tools/strip.js --jobs jobs.json --file dist/index.html     (jobs: [{ out, scene, beat, t0, t1, step, crop, cols, scale, sub, eval (js run before goto) }])
// The page's requestAnimationFrame is replaced by a manual pump after boot, so every frame advances by exactly
// step / sub seconds (sub substeps per captured frame; cues and integrators see a normal forward playback).
// Tiling uses python3 + PIL. Same Chrome launch args as tools/shot.js; headless sets window.__LYRA_HEADLESS.
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs'); const os = require('os');
const { execFileSync } = require('child_process');
const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; }; const flag = k => a.includes('--' + k);
const TILE = `
import sys, json
from PIL import Image, ImageDraw
j = json.load(open(sys.argv[1]))
fr = [Image.open(f).convert('RGB') for f in j['frames']]
sc = j['scale']; w, h = int(fr[0].width * sc), int(fr[0].height * sc); cols = min(j['cols'], len(fr)); rows = (len(fr) + cols - 1) // cols
lab = 14; pad = 2
out = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + lab + pad) + pad), (40, 40, 44)); d = ImageDraw.Draw(out)
for i, (im, t) in enumerate(zip(fr, j['times'])):
    x, y = pad + (i % cols) * (w + pad), pad + (i // cols) * (h + lab + pad)
    out.paste(im.resize((w, h), Image.LANCZOS), (x, y + lab)); d.text((x + 3, y + 1), '%.2f' % t, fill=(230, 220, 190))
out.save(j['out'])
`;
(async () => {
  const jobs = opt('jobs') ? JSON.parse(fs.readFileSync(opt('jobs'), 'utf8')) : [{ out: a[0], scene: opt('scene', 'zica'), beat: +opt('beat', 0), t0: +opt('t0', 0), t1: +opt('t1', 2), step: +opt('step', 1 / 12),
    crop: opt('crop'), cols: +opt('cols', 8), scale: +opt('scale', .5), sub: +opt('sub', 2), done: flag('done') }];
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--metrics-recording-only', '--no-pings'] });
  const mobile = flag('mobile');
  const ctx = await b.newContext({ viewport: { width: +opt('w', mobile ? 390 : 1440), height: +opt('h', mobile ? 844 : 900) }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, reducedMotion: flag('rm') ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); await p.addInitScript(() => { window.__LYRA_HEADLESS = true; });
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); }); p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  const file = path.resolve(opt('file', path.join(__dirname, '..', 'dist', 'index.html')));
  await p.goto('file://' + file);
  await p.waitForFunction(() => window.__lyra && document.body.classList.contains('started'), null, { timeout: 180000 });
  await p.waitForTimeout(500);
  // take over the clock: queue rAF callbacks and run them on demand with a synthetic timestamp
  await p.evaluate(() => {
    const q = []; let now = performance.now() + 1000;
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.__pump = ms => { now += ms; const cbs = q.splice(0); for (const cb of cbs) cb(now); return cbs.length; };
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__pump(1));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-'));
  for (const J of jobs) {
    const step = J.step || 1 / 12, sub = J.sub || 2, t0 = J.t0 || 0, t1 = J.t1 == null ? t0 + 2 : J.t1;
    const crop = J.crop ? (Array.isArray(J.crop) ? J.crop : String(J.crop).split(',').map(Number)) : null;
    if (J.eval) await p.evaluate(J.eval);
    await p.evaluate(([id, beat, done]) => { window.__lyra.goto(id, beat, done); }, [J.scene, J.beat || 0, !!J.done]);
    await p.evaluate(() => { for (let i = 0; i < 3; i++) window.__pump(1); });
    // run up to t0 at the strip's own frame rate from a little before (so followers and cues are in a natural state)
    const pre = J.pre == null ? Math.min(t0, 1.5) : J.pre;
    await p.evaluate(t => { window.__lyra.seek(t); window.__pump(1); }, Math.max(0, t0 - pre - step / sub));
    const dts = step / sub;
    let t = Math.max(0, t0 - pre);
    await p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__pump(ms); }, [Math.round(pre / dts), dts * 1000]);
    const frames = [], times = [];
    for (let i = 0; t0 + i * step <= t1 + 1e-6; i++) {
      const tt = t0 + i * step;
      await p.evaluate(tt => { window.__lyra.seek(tt - 1e-4); }, tt);
      await p.evaluate(ms => window.__pump(ms), 0.1);
      const f = path.join(tmp, `${path.basename(J.out, '.png')}-${String(i).padStart(3, '0')}.png`);
      await p.screenshot({ path: f, clip: crop ? { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } : undefined });
      frames.push(f); times.push(tt);
      if (tt + step <= t1 + 1e-6) await p.evaluate(([n, ms]) => { for (let k = 0; k < n; k++) window.__pump(ms); }, [sub, dts * 1000]);
    }
    const spec = path.join(tmp, 'spec.json'); fs.writeFileSync(spec, JSON.stringify({ frames, times, out: path.resolve(J.out), cols: J.cols || 8, scale: J.scale || .5 }));
    fs.writeFileSync(path.join(tmp, 'tile.py'), TILE);
    execFileSync('python3', ['-I', path.join(tmp, 'tile.py'), spec]);
    const st = await p.evaluate(() => window.__lyra.state());
    console.log('strip', J.out, frames.length, 'frames', `calls=${st.calls} tris=${st.tris}`);
  }
  if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].slice(0, 25).join('\n'));
  fs.rmSync(tmp, { recursive: true, force: true });
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
