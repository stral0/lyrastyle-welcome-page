// xmas/snow.js — gentle snowfall. One instanced draw call, everything a pure function of time (jump-safe).
// mode 'world': flakes in a box that wraps around the camera (parallax is real), size attenuation, near flakes
//               open into soft out-of-focus discs, far flakes stay crisp; lit by an optional light shaft.
// mode 'screen': a 2D overlay in design units with parallax layers (near = big, soft, fast; far = tiny, slow).
// See src/xmas/README.md for the API.
import { designCamera } from './santa.js';

const VS = /* glsl */`
precision highp float;
in vec2 position;                       // quad corner -1..1
in vec4 aSeed;                          // xyz: position in the unit box, w: size/speed jitter
uniform mat4 projectionMatrix, viewMatrix;
uniform float uTime, uMode, uFall, uSize, uCount, uFocus, uAper, uNear, uPx, uSway, uLayers;
uniform vec3 uBox, uCam, uWind, uShaftO, uShaftD; uniform vec2 uView;
uniform float uShaftR;
out vec2 vC; out float vA, vSoft, vShaft, vRing;
float hash(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  float id = float(gl_InstanceID);
  if (id >= uCount) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec4 s = aSeed;
  float t = uTime;
  float sp = mix(.65, 1.35, s.w);                             // per-flake fall speed
  float ph = s.x * 37.1 + s.y * 11.3;
  // sway: each flake flutters on two incommensurate sines (integrated, so pure in t)
  vec2 sway = vec2(sin(t * (.6 + .5 * s.w) + ph), sin(t * (.43 + .3 * s.y) + ph * 1.7)) * uSway;
  // gusts: a slow wind modulation, analytically integrated
  float gust = .35 * sin(t * .13 + 1.1) / .13 + .2 * sin(t * .071 + 2.3) / .071;
  vC = position;
  if (uMode < .5) {
    // ---- world: wrap a fixed lattice around the camera
    vec3 drift = vec3(uWind.x * t + gust * uWind.x * .3 + sway.x, -uFall * sp * t, uWind.z * t + gust * uWind.z * .3 + sway.y);
    vec3 p = s.xyz * uBox + drift;
    p = mod(p - uCam + .5 * uBox, uBox) - .5 * uBox + uCam;
    vec4 mv = viewMatrix * vec4(p, 1.);
    float z = max(-mv.z, 1e-3);
    float r = uSize * mix(.55, 1.45, fract(s.w * 7.13)) * .5;           // flake radius (m)
    // circle of confusion (m at the flake's depth): grows away from the focus distance
    float coc = uAper * abs(z - uFocus) / max(uFocus, 1e-3) ;
    float rr = max(r, coc);
    // never smaller than ~1.2 px on screen
    float pxm = z * uPx;                                                // metres per pixel at depth z
    rr = max(rr, 1.2 * pxm);
    float area = (r * r + .6 * pxm * pxm) / (rr * rr);
    vSoft = clamp((rr - r) / rr, 0., 1.);
    vRing = vSoft;
    // fade: near plane, far edge of the box
    vec3 d = abs(p - uCam) / (.5 * uBox);
    float edge = 1. - smoothstep(.75, 1., max(d.x, max(d.y, d.z)));
    vA = clamp(area, 0., 1.) * edge * smoothstep(uNear, uNear * 2.5, z);
    // light shaft (a cylinder along uShaftD from uShaftO): flakes inside it glow warm
    vec3 q = p - uShaftO; float al = dot(q, uShaftD); vec3 perp = q - uShaftD * al;
    vShaft = exp(-dot(perp, perp) / max(uShaftR * uShaftR, 1e-6)) * step(0., al);
    mv.xy += position * rr;
    gl_Position = projectionMatrix * mv;
  } else {
    // ---- screen: layers in design units (x right, y down); s.z picks the layer depth (0 near .. 1 far)
    // nearness: most flakes are far (tiny, slow); a few are near (bigger, faster); a rare one is out of focus
    float n = pow(s.z, uLayers);
    float k = mix(.32, 2.0, n);                                           // parallax factor
    float sz = uSize * k * mix(.6, 1.4, fract(s.w * 7.13));
    vec2 drift = vec2(uWind.x * t * k + gust * uWind.x * .3 * k + sway.x * 40. * k, uFall * sp * t * k);
    vec2 p = mod(s.xy * (uView + 2. * sz + 80.) + drift, uView + 2. * sz + 80.) - sz - 40.;
    vSoft = smoothstep(.6, 1., n) * uAper;
    vRing = vSoft;
    float r = sz * (1. + vSoft * 2.4);
    vA = mix(.5, .85, n) / (1. + vSoft * 6.);
    vec2 sh = p - uShaftO.xy; float al = dot(sh, uShaftD.xy); vec2 perp = sh - uShaftD.xy * al;
    vShaft = exp(-dot(perp, perp) / max(uShaftR * uShaftR, 1e-6)) * step(0., al);
    vec2 c = p + position * r;
    gl_Position = projectionMatrix * viewMatrix * vec4(c.x, -c.y, 0., 1.);
  }
}`;
const FS = /* glsl */`
precision highp float;
in vec2 vC; in float vA, vSoft, vShaft, vRing; out vec4 fragColor;
uniform vec3 uColor, uShaftC; uniform float uBright, uOpacity;
void main(){
  float r = length(vC);
  if (r > 1.) discard;
  // crisp flake: a bright core with a soft skirt. out of focus: a flat disc with a faint brighter rim (lens bokeh)
  float crisp = exp(-r * r * 4.5);
  float disc = smoothstep(1., .7, r) * (.7 + .3 * smoothstep(.4, .9, r));
  float m = mix(crisp, disc, vSoft);
  vec3 c = (uColor + uShaftC * vShaft) * uBright;
  float a = m * vA * uOpacity;
  fragColor = vec4(c * a, 0.);                   // additive light (premultiplied, alpha unused)
}`;

export function createSnow(ctx, opts = {}) {
  const { THREE } = ctx;
  const o = {
    mode: 'world', count: 6000, seed: 1301,
    box: [24, 14, 24], fall: 0.55, wind: [0.25, 0, -0.08], sway: 0.35, size: 0.022, focus: 4, aperture: 0.05, near: 0.3,
    color: [0.62, 0.72, 0.95], brightness: 1, opacity: 1, layers: 3,
    shaft: null,                                  // { origin:[x,y,z], dir:[x,y,z], radius, color:[r,g,b] } (screen: 2D, design units)
    ...opts,
  };
  const screen = o.mode === 'screen';
  if (screen && opts.size == null) o.size = 2.6;            // design units
  if (screen && opts.fall == null) o.fall = 38;              // design units / s
  if (screen && opts.wind == null) o.wind = [14, 0, 0];
  if (screen && opts.sway == null) o.sway = 0.4;
  if (screen && opts.aperture == null) o.aperture = 1;
  if (screen && opts.count == null) o.count = 900;
  const N = Math.max(1, Math.round(o.count));
  const r = ctx.util && ctx.util.rng ? ctx.util.rng(o.seed) : Math.random;
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seeds[i] = r();
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = N;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const v3 = a => new THREE.Vector3(a[0], a[1], a[2] || 0);
  const U = {
    uTime: { value: 0 }, uMode: { value: screen ? 1 : 0 }, uFall: { value: o.fall }, uSize: { value: o.size }, uCount: { value: N },
    uFocus: { value: o.focus }, uAper: { value: o.aperture }, uNear: { value: o.near }, uPx: { value: 0.001 }, uSway: { value: o.sway },
    uLayers: { value: o.layers }, uBox: { value: v3(o.box) }, uCam: { value: new THREE.Vector3() }, uWind: { value: v3(o.wind) },
    uShaftO: { value: new THREE.Vector3() }, uShaftD: { value: new THREE.Vector3(0, -1, 0) }, uShaftR: { value: 0 }, uShaftC: { value: new THREE.Vector3() },
    uView: { value: new THREE.Vector2(1920, 1080) }, uColor: { value: v3(o.color) }, uBright: { value: o.brightness }, uOpacity: { value: o.opacity },
  };
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms: U,
    transparent: true, depthWrite: false, depthTest: !screen, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;
  const scene = new THREE.Scene(); scene.add(mesh);
  const cam = screen ? designCamera(THREE, ctx.view) : null;

  const snow = {
    mesh, object: mesh,
    // time in seconds; camera: the THREE camera used to draw (world mode) — sets the wrap centre and pixel scale
    update(time, camera) {
      U.uTime.value = time;
      if (!screen && camera) {
        camera.updateMatrixWorld();
        U.uCam.value.setFromMatrixPosition(camera.matrixWorld);
        const fov = camera.isPerspectiveCamera ? camera.fov * Math.PI / 180 : 1;
        U.uPx.value = 2 * Math.tan(fov / 2) / Math.max(1, ctx.gfx.H);
      }
      return snow;
    },
    set(p) {
      if (!p) return snow;
      if (p.density != null) U.uCount.value = Math.max(0, Math.min(N, Math.round(N * p.density)));
      if (p.count != null) U.uCount.value = Math.max(0, Math.min(N, Math.round(p.count)));
      if (p.fall != null) U.uFall.value = p.fall; if (p.size != null) U.uSize.value = p.size;
      if (p.wind) U.uWind.value.set(p.wind[0], p.wind[1] || 0, p.wind[2] || 0);
      if (p.sway != null) U.uSway.value = p.sway; if (p.focus != null) U.uFocus.value = p.focus; if (p.aperture != null) U.uAper.value = p.aperture;
      if (p.color) U.uColor.value.set(p.color[0], p.color[1], p.color[2]);
      if (p.brightness != null) U.uBright.value = p.brightness; if (p.opacity != null) U.uOpacity.value = p.opacity;
      if (p.box) U.uBox.value.set(p.box[0], p.box[1], p.box[2]);
      if (p.shaft !== undefined) {
        const sh = p.shaft;
        if (!sh) { U.uShaftR.value = 0; U.uShaftC.value.set(0, 0, 0); }
        else {
          U.uShaftO.value.set(sh.origin[0], sh.origin[1], sh.origin[2] || 0);
          const d = sh.dir, l = Math.hypot(d[0], d[1], d[2] || 0) || 1; U.uShaftD.value.set(d[0] / l, d[1] / l, (d[2] || 0) / l);
          U.uShaftR.value = sh.radius; const c = sh.color || [1, 0.62, 0.3]; U.uShaftC.value.set(c[0], c[1], c[2]);
        }
      }
      return snow;
    },
    // quality: scales the flake count (call with s.q)
    quality(q) { U.uCount.value = Math.max(1, Math.round(N * Math.max(0.2, Math.min(1, q)) * (snow._density ?? 1))); return snow; },
    density(d) { snow._density = d; U.uCount.value = Math.max(0, Math.round(N * d)); return snow; },
    // screen mode: draw over target (additive). world mode: draw with the given camera (or add snow.mesh to your scene)
    render(target = null, camera) {
      if (screen) {
        const v = ctx.view; U.uView.value.set(v.w, v.h);
        cam.fit();
        ctx.gfx.draw(scene, cam, target, { clear: false });
      } else if (camera) {
        const parent = mesh.parent; scene.add(mesh);
        ctx.gfx.draw(scene, camera, target, { clear: false });
        if (parent && parent !== scene) parent.add(mesh);
      }
    },
    dispose() { geo.dispose(); mat.dispose(); if (mesh.parent) mesh.parent.remove(mesh); },
  };
  snow.set({ shaft: o.shaft || null });
  return snow;
}
