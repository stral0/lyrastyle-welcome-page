// In-canvas typography. Each text block is rasterised once (Canvas2D -> mipmapped texture) and drawn as
// one quad per word / glyph / line so reveals can stagger. In and out are separate 0..1 inputs.
import * as THREE from 'three';

export const FONTS = {
  display: { family: 'Fraunces', weight: 400, style: 'normal' },
  displayLight: { family: 'Fraunces', weight: 300, style: 'normal' },
  displayItalic: { family: 'Fraunces', weight: 400, style: 'italic' },
  text: { family: 'Instrument Sans', weight: 400, style: 'normal' },
  textMed: { family: 'Instrument Sans', weight: 600, style: 'normal' },
};
const fontCss = (role, px) => { const f = FONTS[role] || FONTS.text; return `${f.style} ${f.weight} ${px}px "${f.family}", ${f.family === 'Fraunces' ? 'Georgia, serif' : 'system-ui, sans-serif'}`; };
const hex = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c); const n = m ? parseInt(m[1], 16) : 0xffffff; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

const VS = /* glsl */`
uniform vec2 uPos, uView; uniform float uIn, uOut, uStagger, uSize, uRot, uRise; uniform int uStyle;
in vec3 position; in vec2 uv; in float aI;
out vec2 vUv; out float vA, vBlur;
float oc(float t){ t = clamp(t, 0., 1.); return 1. - pow(1. - t, 3.); }
void main(){
  float w = uStagger;
  float tin = oc(uIn * (1. + w) - aI * w);
  float tout = clamp(uOut * (1. + w * .5) - aI * w * .5, 0., 1.); tout = tout * tout * (3. - 2. * tout);
  vA = tin * (1. - tout);
  vBlur = uStyle == 0 ? (1. - tin) + tout * .7 : 0.;
  vec2 p = position.xy;
  float rise = uStyle == 2 ? 0. : (uStyle == 0 ? .18 : .55);
  p.y += ((1. - tin) * rise - tout * rise * .5) * uSize * uRise;
  float c = cos(uRot), s = sin(uRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  p += uPos; vUv = uv;
  gl_Position = vec4(p.x / uView.x * 2. - 1., 1. - p.y / uView.y * 2., 0., 1.);
}`;
const FS = /* glsl */`
precision highp float;
uniform sampler2D map; uniform vec3 uColor; uniform float uAlpha, uLods;
in vec2 vUv; in float vA, vBlur; out vec4 fragColor;
void main(){
  float a = textureLod(map, vUv, vBlur * uLods).a;
  a *= vA * uAlpha; if (a < .002) discard;
  fragColor = vec4(uColor, a);
}`;
const STYLE = { blur: 0, rise: 1, fade: 2 };

export function createText(gfx, view, resolve) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const meas = document.createElement('canvas').getContext('2d');
  const all = new Set();
  const maxTex = Math.min(4096, gfx.renderer.capabilities.maxTextureSize);

  function makeText(scene, src, o) {
    const T = {
      x: o.x || 0, y: o.y || 0, alpha: 1, rotation: 0, width: 0, height: 0, visible: true,
      box: { x: 0, y: 0, w: 0, h: 0 }, _in: 1, _out: 0, _style: 0, _stagger: .6, _by: o.by || 'word', _rise: 1,
    };
    let opts = { size: 48, font: 'text', color: '#f4ead8', align: 'left', valign: 'top', width: 0, leading: 1.18, tracking: 0, ...o };
    let str = '', mesh = null, tex = null, built = '', ox = 0, oy = 0;
    const u = {
      uPos: { value: new THREE.Vector2() }, uView: { value: new THREE.Vector2(1920, 1080) }, uIn: { value: 1 }, uOut: { value: 0 }, uStagger: { value: .6 },
      uSize: { value: 48 }, uRot: { value: 0 }, uRise: { value: 1 }, uStyle: { value: 0 }, map: { value: null }, uColor: { value: new THREE.Vector3(1, 1, 1) }, uAlpha: { value: 1 }, uLods: { value: 4 },
    };
    const mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms: u, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });

    // Phones: one design unit is ~0.36 CSS px, so authored sizes get a physical floor (15 px paragraphs, 12 px labels).
    const effSize = () => { const u = view.cssW / view.w; const floor = (opts.size >= 33 ? 15 : 12) / u; return opts.size < 60 ? Math.max(opts.size, Math.min(floor, opts.size * 1.3)) : opts.size; };
    function build() {
      const size = effSize(), rs = Math.min(view.scale, 3); // device px per design unit
      const px = Math.max(6, size * rs);
      const key = [str, px.toFixed(1), opts.font, opts.width, opts.align, opts.leading, opts.tracking, T._by].join('|');
      if (key === built) return; built = key;
      if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh = null; }
      if (tex) { tex.dispose(); tex = null; }
      if (!str) { T.width = T.height = 0; return; }
      const font = fontCss(opts.font, px);
      meas.font = font; if ('letterSpacing' in meas) meas.letterSpacing = (opts.tracking * px) + 'px';
      const m0 = meas.measureText('Hgjpdž');
      const asc = m0.fontBoundingBoxAscent || px * .9, desc = m0.fontBoundingBoxDescent || px * .25;
      const lineH = opts.leading * px, space = meas.measureText(' ').width, maxW = opts.width ? opts.width * rs : Infinity;
      // layout: paragraphs -> words -> lines (breaks on plain spaces only; U+00A0 keeps words together)
      const lines = [];
      for (const para of String(str).split('\n')) {
        let line = { words: [], w: 0 };
        for (const word of para.split(' ')) {
          if (word === '') continue;
          const w = meas.measureText(word).width;
          if (line.words.length && line.w + space + w > maxW) { lines.push(line); line = { words: [], w: 0 }; }
          line.words.push({ s: word, x: line.words.length ? line.w + space : 0, w }); line.w = line.words.length > 1 ? line.w + space + w : w;
        }
        lines.push(line);
      }
      const blockW = Math.max(1, ...lines.map(l => l.w)), blockH = (lines.length - 1) * lineH + asc + desc;
      // units: each word / glyph / line gets its OWN atlas cell with an empty gutter, so a quad never samples a neighbour's ink
      const units = []; // { s, x (block px, pen position), y0 (block px, top), w }
      lines.forEach((l, li) => {
        const lx = opts.align === 'center' ? (blockW - l.w) / 2 : opts.align === 'right' ? blockW - l.w : 0, y0 = li * lineH;
        if (T._by === 'line') { if (l.words.length) units.push({ s: l.words.map(w => w.s).join(' '), x: lx, y0, w: l.w, parts: l.words }); return; }
        for (const w of l.words) {
          if (T._by === 'glyph') { let acc = 0; for (let i = 0; i < w.s.length; i++) { const nx = meas.measureText(w.s.slice(0, i + 1)).width; units.push({ s: w.s[i], x: lx + w.x + acc, y0, w: nx - acc }); acc = nx; } }
          else units.push({ s: w.s, x: lx + w.x, y0, w: w.w });
        }
      });
      const pad = Math.ceil(px * .42), cellH = Math.ceil(asc + desc + pad * 2);
      // shelf-pack the cells
      let rowW = Math.min(maxTex, 2048), ds = 1;
      const widest = Math.max(...units.map(q => Math.ceil(q.w) + pad * 2));
      if (widest > rowW) rowW = Math.min(maxTex, widest);
      let cx = 0, cy = 0;
      for (const q of units) { const cw0 = Math.ceil(q.w) + pad * 2; if (cx + cw0 > rowW && cx > 0) { cx = 0; cy += cellH; } q.cx = cx; q.cy = cy; q.cw = cw0; cx += cw0; }
      let cw = Math.max(2, Math.min(rowW, Math.max(...units.map(q => q.cx + q.cw)))), ch = cy + cellH;
      if (cw > maxTex || ch > maxTex) ds = Math.min(maxTex / cw, maxTex / ch);
      const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.ceil(cw * ds)); cv.height = Math.max(2, Math.ceil(ch * ds));
      const g = cv.getContext('2d'); g.scale(ds, ds); g.font = font; if ('letterSpacing' in g) g.letterSpacing = (opts.tracking * px) + 'px';
      g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
      for (const q of units) {
        if (q.parts) { const x0 = q.parts[0].x; for (const w of q.parts) g.fillText(w.s, q.cx + pad + (w.x - x0), q.cy + pad + asc); }
        else g.fillText(q.s, q.cx + pad, q.cy + pad + asc);
      }
      tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 1; u.map.value = tex; u.uLods.value = Math.max(1.5, Math.log2(px * .16));
      // alignment offsets (design units)
      const W = blockW / rs, H = blockH / rs; T.width = W; T.height = H; T._eff = size;
      ox = opts.align === 'center' ? -W / 2 : opts.align === 'right' ? -W : 0;
      oy = opts.valign === 'middle' ? -H / 2 : opts.valign === 'bottom' ? -H : opts.valign === 'baseline' ? -asc / rs : 0;
      const n = units.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), ai = new Float32Array(n * 4), idx = new (n * 4 > 65535 ? Uint32Array : Uint16Array)(n * 6);
      units.forEach((q, i) => {
        // quad = the whole cell (ink + gutter), placed so the pen position lands at (q.x, q.y0 + asc)
        const X0 = (q.x - pad) / rs + ox, X1 = (q.x - pad + q.cw) / rs + ox, Y0 = (q.y0 - pad) / rs + oy, Y1 = (q.y0 - pad + cellH) / rs + oy;
        pos.set([X0, Y0, 0, X1, Y0, 0, X1, Y1, 0, X0, Y1, 0], i * 12);
        const U0 = q.cx / cw, U1 = (q.cx + q.cw) / cw, V0 = 1 - q.cy / ch, V1 = 1 - (q.cy + cellH) / ch;
        uv.set([U0, V0, U1, V0, U1, V1, U0, V1], i * 8);
        const a = n > 1 ? i / (n - 1) : 0; ai.set([a, a, a, a], i * 4);
        idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('aI', new THREE.BufferAttribute(ai, 1)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
      mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);
    }
    T.set = s => { const r = resolve ? resolve(s) : s; T._src = s; if (r !== str) { str = r; built = ''; } return T; };
    T.opt = (k, v) => { if (opts[k] !== v) { opts[k] = v; built = ''; } return T; };
    T.show = (inP = 1, so = {}) => { T._in = inP; T._out = so.q || 0; T._style = STYLE[so.style] ?? 0; if (so.stagger != null) T._stagger = so.stagger; if (so.rise != null) T._rise = so.rise; if (so.by && so.by !== T._by) { T._by = so.by; built = ''; } return T; };
    T._refresh = () => { T.set(T._src); built = ''; };
    T._sync = (fade = 1) => {
      build(); if (!mesh) return;
      mesh.visible = T.visible && T.alpha > .002 && T._in > .001 && T._out < .999;
      u.uPos.value.set(T.x, T.y); u.uView.value.set(view.w, view.h); u.uIn.value = T._in; u.uOut.value = T._out; u.uStagger.value = T._stagger;
      u.uSize.value = T._eff || opts.size; u.uRot.value = T.rotation; u.uStyle.value = T._style; u.uAlpha.value = T.alpha * fade; u.uRise.value = T._rise;
      const c = hex(opts.color); u.uColor.value.set(c[0], c[1], c[2]);
      T.box.x = T.x + ox; T.box.y = T.y + oy; T.box.w = T.width; T.box.h = T.height;
    };
    Object.defineProperty(T, 'size', { get: () => opts.size, set: v => T.opt('size', v) });
    Object.defineProperty(T, 'color', { get: () => opts.color, set: v => { opts.color = v; } });
    Object.defineProperty(T, 'wrap', { get: () => opts.width, set: v => T.opt('width', v) });
    T.dispose = () => { if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); } if (tex) tex.dispose(); mat.dispose(); };
    T.set(src); return T;
  }

  const api = {
    ready: (async () => {
      try { await Promise.race([Promise.all(Object.values(FONTS).map(f => document.fonts.load(`${f.style} ${f.weight} 48px "${f.family}"`, 'Aa Ščćžđ'))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* fall back to system fonts */ }
    })(),
    layer() {
      const scene = new THREE.Scene(); const items = [];
      const L = {
        text(src, o = {}) { const T = makeText(scene, src, o); items.push(T); return T; },
        fade: 1, // set by the deck: words of the outgoing scene leave early in a transition, the incoming ones arrive late
        render(target = null) { for (const T of items) T._sync(L.fade); gfx.draw(scene, cam, target, { clear: false }); },
        refresh() { for (const T of items) T._refresh(); },
        measure(src, o = {}) { const T = makeText(new THREE.Scene(), src, o); T._sync(); const r = { w: T.width, h: T.height }; T.dispose(); return r; },
        dispose() { for (const T of items) T.dispose(); all.delete(L); },
      };
      all.add(L); return L;
    },
    resize() { /* blocks rebuild lazily: their cache key includes the raster size */ },
  };
  return api;
}
