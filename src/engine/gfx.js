// gfx: thin facade over one THREE.WebGLRenderer. Targets, full-screen passes, hand-written post chain.
import * as THREE from 'three';
import { PASS_VS, PASS_FS_HEAD } from './glsl.js';

const TONEMAP = { none: 0, aces: 1, agx: 2 };

export function createGfx(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // we tone-map + encode ourselves in post()
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);
  renderer.info.autoReset = false;
  const gl = renderer.getContext();
  const floatOK = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');

  const gfx = { renderer, THREE, W: 2, H: 2, aspect: 1, dpr: 1, time: 0, floatOK, quality: 1 };
  const scaled = new Set(); // targets that follow the backbuffer size

  // ---- targets ---------------------------------------------------------
  // target({ scale=1 | w,h, hdr=true, depth=false, samples=0, filter='linear', wrap='clamp', mips=false })
  // MSAA is the biggest memory cost (4x RGBA16F at full size): 4 samples only on small backbuffers, 2 otherwise, 0 at low quality
  const msaa = req => !req ? 0 : gfx.quality < .6 ? 0 : (gfx.W * gfx.H > 1.5e6 || gfx.dpr >= 1.5) ? Math.min(req, 2) : req;
  gfx.target = (o = {}) => {
    const hdr = o.hdr !== false && floatOK;
    const w = o.w || Math.max(2, Math.round(gfx.W * (o.scale || 1))), h = o.h || Math.max(2, Math.round(gfx.H * (o.scale || 1)));
    const filt = o.filter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat,
      depthBuffer: !!o.depth, stencilBuffer: false, samples: msaa(o.samples || 0),
      minFilter: o.mips ? THREE.LinearMipmapLinearFilter : filt, magFilter: filt, generateMipmaps: !!o.mips,
      wrapS: o.wrap === 'repeat' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping, wrapT: o.wrap === 'repeat' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
      colorSpace: THREE.NoColorSpace,
    });
    rt.texture.colorSpace = THREE.NoColorSpace;
    if (!o.w) { rt.userData = { scale: o.scale || 1, max: o.max || 0, samples: o.samples || 0 }; scaled.add(rt); }
    return rt;
  };
  gfx.free = rt => { if (!rt) return; scaled.delete(rt); rt.dispose(); };

  // ---- full-screen passes ----------------------------------------------
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const passCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passScene = new THREE.Scene();
  const passMesh = new THREE.Mesh(tri, null); passMesh.frustumCulled = false; passScene.add(passMesh);
  const uRes = { value: new THREE.Vector2(2, 2) }, uTime = { value: 0 };

  // pass(fragmentSource, { name: initialValue, ... }, { blend: 'none'|'add'|'alpha' })
  // fragment source: body only, must define void main(); gets vUv, uRes, uTime, hash/noise/color helpers.
  // returns { u: {name:{value}}, render(target), material, dispose() }
  gfx.pass = (frag, uniforms = {}, o = {}) => {
    const u = { uRes, uTime };
    for (const k in uniforms) u[k] = { value: uniforms[k] };
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: PASS_VS, fragmentShader: PASS_FS_HEAD + frag, uniforms: u,
      depthTest: false, depthWrite: false,
      blending: o.blend === 'add' ? THREE.AdditiveBlending : o.blend === 'alpha' ? THREE.NormalBlending : THREE.NoBlending,
      transparent: !!o.blend && o.blend !== 'none', premultipliedAlpha: o.blend === 'alpha',
    });
    return {
      u, material,
      render(target = null, clear = !o.blend || o.blend === 'none') {
        const ac = renderer.autoClear; renderer.autoClear = clear;
        setTarget(target); passMesh.material = material; renderer.render(passScene, passCam);
        renderer.autoClear = ac;
      },
      dispose() { material.dispose(); },
    };
  };
  function setTarget(t) {
    renderer.setRenderTarget(t || null);
    if (t) uRes.value.set(t.width, t.height); else uRes.value.set(gfx.W, gfx.H);
  }
  // draw(scene, camera, target, { clear=true, color })
  gfx.draw = (scene, camera, target = null, o = {}) => {
    const ac = renderer.autoClear; renderer.autoClear = o.clear !== false;
    if (o.color !== undefined) renderer.setClearColor(o.color, 1);
    setTarget(target); renderer.render(scene, camera);
    renderer.autoClear = ac; if (o.color !== undefined) renderer.setClearColor(0x000000, 1);
  };

  const copyPass = gfx.pass(`uniform sampler2D tSrc; void main(){ fragColor = texture(tSrc, vUv); }`, { tSrc: null });
  gfx.copy = (src, out = null) => { copyPass.u.tSrc.value = src.texture || src; copyPass.render(out); };

  // ---- post chain: bloom (dual filter) + grade ---------------------------
  const LEVELS = 6;
  let bloom = [];
  const mkBloom = () => {
    bloom.forEach(gfx.free); bloom = [];
    let w = Math.max(2, gfx.W >> 1), h = Math.max(2, gfx.H >> 1);
    for (let i = 0; i < LEVELS; i++) { bloom.push(gfx.target({ w, h })); w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); }
  };
  const pre = gfx.pass(`
    uniform sampler2D tSrc; uniform float uThr, uKnee;
    vec3 pf(vec2 uv){ vec3 c = min(texture(tSrc, uv).rgb, vec3(60.)); float br = max(c.r, max(c.g, c.b));
      float soft = clamp(br - uThr + uKnee, 0., 2. * uKnee); soft = soft * soft / (4. * uKnee + 1e-4);
      return c * max(soft, br - uThr) / max(br, 1e-4); }
    void main(){ vec2 px = 1. / vec2(textureSize(tSrc, 0)); vec3 a = pf(vUv + px * vec2(-1, -1)), b = pf(vUv + px * vec2(1, -1)), c = pf(vUv + px * vec2(-1, 1)), d = pf(vUv + px * vec2(1, 1));
      // Karis average to kill fireflies
      float wa = 1. / (1. + luma(a)), wb = 1. / (1. + luma(b)), wc = 1. / (1. + luma(c)), wd = 1. / (1. + luma(d));
      fragColor = vec4((a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd), 1.); }`, { tSrc: null, uThr: 1, uKnee: .5 });
  const down = gfx.pass(`
    uniform sampler2D tSrc;
    void main(){ vec2 px = 1. / vec2(textureSize(tSrc, 0)); vec3 s = texture(tSrc, vUv).rgb * 4.;
      s += texture(tSrc, vUv + px * vec2(-1, -1)).rgb + texture(tSrc, vUv + px * vec2(1, -1)).rgb + texture(tSrc, vUv + px * vec2(-1, 1)).rgb + texture(tSrc, vUv + px * vec2(1, 1)).rgb;
      fragColor = vec4(s / 8., 1.); }`, { tSrc: null });
  const up = gfx.pass(`
    uniform sampler2D tSrc; uniform float uRadius, uGain;
    void main(){ vec2 px = uRadius / vec2(textureSize(tSrc, 0)); vec3 s = vec3(0.);
      s += texture(tSrc, vUv + px * vec2(-1, 0)).rgb * 2. + texture(tSrc, vUv + px * vec2(1, 0)).rgb * 2. + texture(tSrc, vUv + px * vec2(0, -1)).rgb * 2. + texture(tSrc, vUv + px * vec2(0, 1)).rgb * 2.;
      s += texture(tSrc, vUv + px * vec2(-1, -1)).rgb + texture(tSrc, vUv + px * vec2(1, -1)).rgb + texture(tSrc, vUv + px * vec2(-1, 1)).rgb + texture(tSrc, vUv + px * vec2(1, 1)).rgb;
      fragColor = vec4(s / 12. * uGain, 1.); }`, { tSrc: null, uRadius: 1, uGain: 1 }, { blend: 'add' });
  const grade = gfx.pass(`
    uniform sampler2D tSrc, tBloom, tHal;
    uniform float uExposure, uBloom, uHalation, uContrast, uSaturation, uVignette, uGrain, uFade; uniform int uTone;
    uniform vec3 uLift, uGain, uHalTint;
    vec3 aces(vec3 x){ x *= .6; return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    vec3 agx(vec3 c){ // compact AgX-like: log encode + sigmoid, gentle highlight desaturation
      const mat3 mi = mat3(.842479, .0423283, .0423756, .0784336, .878469, .0784336, .0792237, .0791661, .879143);
      const mat3 mo = mat3(1.19688, -.0528969, -.0529716, -.0980209, 1.15190, -.0980435, -.0990297, -.0989612, 1.15107);
      c = mi * c; c = clamp((log2(max(c, 1e-6)) + 12.47393) / 16.5, 0., 1.);
      vec3 x2 = c * c, x4 = x2 * x2; c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + .4298 * x2 + .1191 * c - .00232;
      c = mo * c; return pow(clamp(c, 0., 1.), vec3(2.2)); }
    void main(){
      vec3 c = min(texture(tSrc, vUv).rgb, vec3(60.));
      vec3 b = texture(tBloom, vUv).rgb; vec3 h = texture(tHal, vUv).rgb;
      c += b * uBloom + h * uHalTint * uHalation;
      c *= uExposure;
      if (uTone == 1) c = aces(c); else if (uTone == 2) c = agx(c); else c = clamp(c, 0., 1.);
      c = uLift + c * (uGain - uLift);
      float l = luma(c); c = mix(vec3(l), c, uSaturation);
      c = (c - .18) * uContrast + .18;
      vec2 q = vUv - .5; q.x *= mix(1., uRes.x / uRes.y, .35);
      c *= 1. - uVignette * smoothstep(.25, .95, length(q) * 1.25);
      c = toSRGB(max(c, 0.));
      float n = hash12(gl_FragCoord.xy + fract(uTime) * vec2(311.7, 197.3));
      c += (n - .5) * uGrain * (1.2 - .6 * l);
      c += (ign(gl_FragCoord.xy) - .5) / 255.;
      fragColor = vec4(c * uFade, 1.); }`, {
    tSrc: null, tBloom: null, tHal: null, uExposure: 1, uBloom: .5, uHalation: 0, uContrast: 1, uSaturation: 1, uVignette: .25, uGrain: .02, uFade: 1, uTone: 1,
    uLift: new THREE.Vector3(0, 0, 0), uGain: new THREE.Vector3(1, 1, 1), uHalTint: new THREE.Vector3(1, .35, .15),
  });

  // post(src, out, grade): src = HDR linear target, out = LDR target or null (screen).
  // grade = { exposure, bloom, threshold, knee, radius, tone:'aces'|'agx'|'none', contrast, saturation, vignette, grain, halation, lift:[r,g,b], gain:[r,g,b], fade }
  gfx.post = (src, out = null, g = {}) => {
    if (!bloom.length) mkBloom();
    const useBloom = (g.bloom ?? .5) > 0 || (g.halation ?? 0) > 0;
    if (useBloom) {
      pre.u.tSrc.value = src.texture; pre.u.uThr.value = g.threshold ?? 1; pre.u.uKnee.value = g.knee ?? .5; pre.render(bloom[0]);
      for (let i = 1; i < LEVELS; i++) { down.u.tSrc.value = bloom[i - 1].texture; down.render(bloom[i]); }
      up.u.uRadius.value = g.radius ?? 1;
      for (let i = LEVELS - 1; i > 0; i--) { up.u.tSrc.value = bloom[i].texture; up.u.uGain.value = i === LEVELS - 1 ? 1 : 1; up.render(bloom[i - 1], false); }
    }
    const u = grade.u;
    u.tSrc.value = src.texture; u.tBloom.value = bloom[0].texture; u.tHal.value = bloom[Math.min(2, LEVELS - 1)].texture;
    u.uExposure.value = g.exposure ?? 1; u.uBloom.value = useBloom ? (g.bloom ?? .5) / LEVELS * 2 : 0; u.uHalation.value = (g.halation ?? 0) / LEVELS;
    u.uContrast.value = g.contrast ?? 1; u.uSaturation.value = g.saturation ?? 1; u.uVignette.value = g.vignette ?? .25; u.uGrain.value = g.grain ?? .02;
    u.uFade.value = g.fade ?? 1; u.uTone.value = TONEMAP[g.tone ?? 'aces'] ?? 1;
    const L = g.lift, G = g.gain; u.uLift.value.set(L ? L[0] : 0, L ? L[1] : 0, L ? L[2] : 0); u.uGain.value.set(G ? G[0] : 1, G ? G[1] : 1, G ? G[2] : 1);
    grade.render(out);
  };

  // ---- sizing -------------------------------------------------------------
  gfx.resize = (cssW, cssH, dpr) => {
    gfx.dpr = dpr; renderer.setPixelRatio(dpr); renderer.setSize(cssW, cssH, false);
    gfx.W = Math.max(2, Math.round(cssW * dpr)); gfx.H = Math.max(2, Math.round(cssH * dpr)); gfx.aspect = gfx.W / gfx.H;
    for (const rt of scaled) {
      let s = rt.userData.scale; if (rt.userData.max) s = Math.min(s, rt.userData.max / gfx.W);
      const sm = msaa(rt.userData.samples || 0); if (sm !== rt.samples) { rt.samples = sm; rt.dispose(); }
      rt.setSize(Math.max(2, Math.round(gfx.W * s)), Math.max(2, Math.round(gfx.H * s)));
    }
    mkBloom();
  };
  gfx.tick = t => { gfx.time = t; uTime.value = t; renderer.info.reset(); };
  return gfx;
}
