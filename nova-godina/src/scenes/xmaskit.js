// xmaskit — dev-only test scene for src/xmas (santa, sleigh, snow). Not part of the shipped narrative.
// b0: Deda Mraz in a warm light shaft reaches for a string and plucks it (pose cycle).
// b1: the sleigh crosses a night sky with a big pale moon, snow falling (3D placement).
// b2: the sleigh small (~120 px) above a dark horizon (screen placement, LOD).
import { createSanta } from '../xmas/santa.js';
import { createSleigh } from '../xmas/sleigh.js';
import { createSnow } from '../xmas/snow.js';

export default {
  id: 'xmaskit', enterWith: 'fade',
  beats: [{ dur: 12, copy: [] }, { dur: 12, copy: [] }, { dur: 12, copy: [] }],
  copy: { sr: { 'xmaskit.title': 'Novogodišnji komplet' }, en: { 'xmaskit.title': 'New Year kit' } },
  create(ctx) {
    const { gfx, THREE, view } = ctx;
    const hdr = gfx.target({ depth: true, samples: 4 });
    const santa = createSanta(ctx, { light: [-0.55, 0.84] });
    // b1: a 3D night sky; b2: a screen-space horizon
    const cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 400);
    // b1 flight path: a pure function of time (so the spark trail is jump-safe); crosses in front of the moon mid-beat
    const PITCH = .12, eul = new THREE.Euler(PITCH, 0, 0), V = new THREE.Vector3();
    const path1 = { asp: 1.6, mx: .64, my: .66, set(a, x, y) { this.asp = a; this.mx = x; this.my = y; },
      at(t) {
        const Z = -42, halfH = Math.tan(cam.fov * Math.PI / 360) * -Z, halfW = halfH * this.asp;
        const xm = (this.mx * 2 - 1) * halfW, ym = (this.my * 2 - 1) * halfH;
        const q = ((t * .07) % 1.4) - .2;                                   // 0..1 crosses the frame, 0.5 at the moon
        const x = xm + (q - .5) * halfW * 2.7, y = ym + 2.2 * Math.cos((q - .5) * 2.4) - 2.2 + (q - .5) * 1.6;
        V.set(x, y, Z).applyEuler(eul); return [V.x, V.y, V.z];
      } };
    const sleigh3 = createSleigh(ctx, { size: 21, light: [0.55, 0.85], path: t => { const a = path1.at(t), b = path1.at(t + .02); return { pos: a, dir: [b[0] - a[0], b[1] - a[1], b[2] - a[2]] }; } });
    const sleigh2 = createSleigh(ctx, { mode: 'screen', size: 120, light: [0.5, 0.86], sparks: 160 });
    const snow3 = createSnow(ctx, { count: 6000, color: [0.5, 0.6, 0.85], brightness: 0.55, focus: 7, aperture: 0.06, size: 0.03 });
    const snow2 = createSnow(ctx, { mode: 'screen', count: 700, color: [0.55, 0.62, 0.8], brightness: 0.6, size: 3.2 });
    const sky = gfx.pass(`
      uniform vec2 uMoon; uniform float uMoonR, uAsp, uHorizon, uCity;
      void main(){
        vec2 p = vec2(vUv.x * uAsp, vUv.y);
        float h = vUv.y;
        vec3 c = mix(vec3(.010, .014, .028), vec3(.0025, .0035, .008), smoothstep(.0, .9, h));
        // stars: sparse, varied, a few brighter
        vec2 g = p * 260.; vec2 id = floor(g); float r = hash12(id);
        vec2 f = fract(g) - .5 - (hash22(id) - .5) * .6;
        float st = step(.9965, r) * exp(-dot(f, f) * 40.) * (.3 + 2.5 * pow(hash12(id + 7.), 6.));
        c += vec3(.75, .82, 1.) * st * smoothstep(.15, .6, h) * (.7 + .3 * sin(uTime * 2. + r * 50.));
        // the moon: a pale disc with soft mottling and a wide cool halo
        vec2 d = p - uMoon; float dm = length(d);
        float disc = smoothstep(uMoonR, uMoonR - .0025, dm);
        float mott = .78 + .3 * smoothstep(.35, .65, fbm(d / uMoonR * 1.6 + 3.1)) - .08 * smoothstep(.5, .7, fbm(d / uMoonR * 3.3 + 9.));
        float limb = sqrt(max(0., 1. - pow(dm / uMoonR, 2.)));
        c += vec3(1.0, .98, .92) * 1.25 * disc * mott * (.82 + .18 * limb);
        c += vec3(.55, .65, .95) * (.11 * exp(-max(dm - uMoonR, 0.) * 9.) + .05 * exp(-max(dm - uMoonR, 0.) * 2.5));
        // horizon: dark rolling hills with a faint city glow and a few lights
        if (uHorizon > 0.) {
          float hx = vUv.x * uAsp;
          float hill = uHorizon + .03 * sin(hx * 2.3 + 1.) + .012 * sin(hx * 7.1 + 2.) + .008 * fbm(vec2(hx * 9., 1.));
          // a distant town on the ridge: irregular roofs, a church spire or two
          float bx = floor(hx * 46.), bw = fract(hx * 46.);
          float bh = (.004 + .012 * hash11(bx) * hash11(bx + 3.)) * step(.35, fbm(vec2(hx * 2.2, 4.)));
          bh *= smoothstep(0., .12, bw) * smoothstep(1., .88, bw);
          float spire = step(.985, hash11(floor(hx * 9.))) * smoothstep(.03, 0., abs(fract(hx * 9.) - .5)) * .03;
          float top = hill + (bh + spire) * uCity;
          c += vec3(.9, .55, .3) * .035 * exp(-max(h - hill, 0.) * 14.) * uCity;
          float land = smoothstep(top + .0012, top - .0012, h);
          vec2 lg = vec2(hx * 220., h * 220.); float li = step(.996, hash12(floor(lg))) * step(h, top - .003) * step(top - .05, h) * uCity;
          c = mix(c, vec3(.0025, .0025, .003) + vec3(1., .66, .34) * li * .9, land);
        }
        fragColor = vec4(c, 1.);
      }`, { uMoon: new THREE.Vector2(1.2, .7), uMoonR: .11, uAsp: 1.6, uHorizon: 0, uCity: 0 });
    // stage: warm shaft from the upper left, dust in the beam, a pool on the floor, one brass string
    const stage = gfx.pass(`
      uniform vec2 uSrc, uDir, uPull; uniform float uFloor, uStrY, uStrX0, uStrX1, uStrA, uAsp, uVib, uVibT;
      void main(){
        vec2 p = vec2(vUv.x * uAsp, 1. - vUv.y);                      // design-ish: x 0..asp, y down 0..1
        vec2 d = p - uSrc; float along = dot(d, uDir); vec2 nrm = vec2(-uDir.y, uDir.x);
        float across = abs(dot(d, nrm)); float wdt = .05 + along * .2;
        float beam = smoothstep(wdt, wdt * .15, across) * smoothstep(0., .25, along) * exp(-along * .55);
        float dust = .65 + .7 * fbm(vec2(along * 3. - uTime * .05, dot(d, nrm) * 9.) + uTime * .02);
        vec3 warm = vec3(1., .62, .3);
        vec3 c = vec3(.006, .0045, .0035);
        c += warm * beam * dust * .75;
        float fl = smoothstep(uFloor - .002, uFloor + .004, p.y);
        vec2 pool = vec2(p.x - (uSrc.x + uDir.x * (uFloor - uSrc.y) / uDir.y), (p.y - uFloor) * 6.);
        c += fl * warm * .5 * exp(-dot(pool, pool) * 18.) ;
        c *= 1. - fl * .35;
        float sx = smoothstep(uStrX0 - .01, uStrX0 + .01, p.x) * smoothstep(uStrX1 + .01, uStrX1 - .01, p.x);
        float u = clamp((p.x - uStrX0) / (uStrX1 - uStrX0), 0., 1.), up = clamp((uPull.x - uStrX0) / (uStrX1 - uStrX0), .001, .999);
        float tri = u < up ? u / up : (1. - u) / (1. - up);
        float yy = uStrY + uPull.y * tri + uVib * sin(3.14159 * u) * cos(uVibT * 38.) * exp(-uVibT * 1.6) + uVib * .4 * sin(6.283 * u) * cos(uVibT * 77.) * exp(-uVibT * 2.4);
        float sy = abs(p.y - yy); float line = (.0009 / (sy + .0009)) * sx * (1. + 2. * abs(uVib) * exp(-uVibT * 1.6) * 30.);
        c += vec3(1., .74, .38) * line * uStrA * (.6 + .9 * exp(-pow((p.x - uSrc.x - .3) * 2., 2.)));
        fragColor = vec4(c, 1.);
      }`, { uSrc: new THREE.Vector2(.2, -.15), uDir: new THREE.Vector2(.42, .91).normalize(), uPull: new THREE.Vector2(1, 0), uFloor: .86, uStrY: .5, uStrX0: .5, uStrX1: 1.6, uStrA: 1, uAsp: 1.6, uVib: 0, uVibT: 9 });

    // beat-0 choreography, a pure function of time T in a 7 s loop:
    // stand -> raise the arm (pose blend) -> the fingertip glides onto the string (armTarget) -> the finger pulls the
    // string down (reach->pluck blend, target moving through) -> release at 3.15 s -> the string rings -> back to stand
    const STR = [34.5, 33.5];                   // the string's contact point, figure units (in front of the chest)
    const REL = 3.15;
    const choreo = T => {
      const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      if (T < 1.2) return { a: 'stand', b: 'stand', f: 0, tw: 0, pull: 0 };
      if (T < 2.2) return { a: 'stand', b: 'reach', f: sm((T - 1.2) / 1), tw: sm((T - 1.6) / .6), pull: 0 };
      if (T < 2.8) return { a: 'reach', b: 'reach', f: 0, tw: 1, pull: -1.4 * sm((T - 2.2) / .6) };
      if (T < REL) { const k = sm((T - 2.8) / (REL - 2.8)); return { a: 'reach', b: 'pluck', f: k, tw: 1, pull: -1.4 + 9.4 * k }; }
      if (T < 3.6) return { a: 'pluck', b: 'pluck', f: 0, tw: 1 - sm((T - REL) / .45), pull: 8 + 4 * sm((T - REL) / .45), free: true };
      if (T < 5.0) return { a: 'pluck', b: 'stand', f: sm((T - 3.6) / 1.4), tw: 0, pull: 0, free: true };
      return { a: 'stand', b: 'stand', f: 0, tw: 0, pull: 0, free: true };
    };
    let prevT = -1, prev1 = -1, prev2 = -1;
    let mode = 0;
    if (typeof window !== 'undefined') window.__xk = { santa, stage, sleigh3, sleigh2, snow3, snow2 };
    return {
      async init() { santa.update(0); ctx.audio.warm([{ sfx: 'jingle' }, { sfx: 'sleigh' }, { pluck: 146.83 }]); },
      enter() { prevT = -1; prev1 = -1; prev2 = -1; },
      update(s) {
        const W = view.w, H = view.h, asp = W / H;
        stage.u.uAsp.value = asp; sky.u.uAsp.value = asp;
        const t = (typeof window !== 'undefined' && window.__xkT != null) ? window.__xkT : s.since(0);
        if (s.beat === 0) {
          const fx = view.portrait ? W * .3 : W * .3, fy = H * .87, fh = view.portrait ? H * .42 : H * .64;
          santa.place(fx, fy, fh);
          const T = t % 7, c = choreo(T);
          santa.pose(c.a, c.b, c.f).armTarget(null).update(s.time);
          const nat = santa.fingertip.slice();
          const goal = [STR[0], STR[1] + Math.min(c.pull, 9)];
          if (c.tw > 0) santa.armTarget([nat[0] + (goal[0] - nat[0]) * c.tw, nat[1] + (goal[1] - nat[1]) * c.tw]);
          const sp = santa.toDesign(STR);
          stage.u.uStrY.value = sp[1] / H; stage.u.uStrX0.value = santa.toDesign([20, 0])[0] / H; stage.u.uStrX1.value = asp + .1;
          // the string follows the finger until the release, then rings
          const held = !c.free && c.pull > 0;
          stage.u.uPull.value.set(sp[0] / H, held ? c.pull * fh / 100 / H : 0);
          const vt = T - REL; stage.u.uVib.value = vt >= 0 ? 8.5 * fh / 100 / H : 0; stage.u.uVibT.value = Math.max(0, vt);
          if (prevT >= 0 && prevT < REL && T >= REL && s.dt > 0) ctx.audio.pluck(146.83, { gain: .8, pan: .2 });
          prevT = T;
          stage.u.uSrc.value.set(fx / H - .28, -.2); stage.u.uFloor.value = fy / H;
          santa.update(s.time);
        } else if (s.beat === 1) {
          cam.aspect = asp; cam.updateProjectionMatrix(); cam.position.set(0, 0, 0);
          cam.rotation.set(PITCH, 0, 0); cam.updateMatrixWorld();
          // moon high right of centre; the path crosses in front of it
          const mx = view.portrait ? .62 : .64, my = .66;
          sky.u.uMoon.value.set(mx * asp, my); sky.u.uMoonR.value = view.portrait ? .07 : .1; sky.u.uHorizon.value = 0;
          const tt = (typeof window !== 'undefined' && window.__xkT != null) ? window.__xkT : s.since(1);
          path1.set(asp, mx, my);
          sleigh3.update(tt, null, null, cam);
          // sound: the sleigh passes (whoosh + bells) as it crosses the moon, then a shake of the bells
          const ph1 = (tt * .07) % 1.4;
          if (prev1 >= 0 && s.dt > 0 && prev1 < .48 && ph1 >= .48) { ctx.sfx('sleigh', { gain: .9, pan: 0 }); ctx.sfx('jingle', { shake: .7, gain: .5, pan: .2, delay: .4 }); }
          prev1 = ph1;
          snow3.update(s.time, cam);
        } else {
          sky.u.uMoon.value.set(.2 * asp, .74); sky.u.uMoonR.value = .055; sky.u.uHorizon.value = .2; sky.u.uCity.value = 1;
          const tt = (typeof window !== 'undefined' && window.__xkT != null) ? window.__xkT : s.since(2);
          const u = ((tt * .06) % 1.3) - .15;
          const px = view.h / gfx.H;                                   // design units per device pixel
          const big = typeof window !== 'undefined' && window.__xkSize;
          const x = big ? W * .5 : W * (1.1 - u * 1.2), y = big ? H * .5 : H * (.36 + .04 * Math.sin(u * 4.));
          sleigh2.update(tt, [x, y], [big ? 1 : -1, big ? 0 : .02 * Math.cos(u * 4.)], null, (big || 120) * px);
          snow2.update(s.time);
          const ph2 = tt % 4; if (prev2 >= 0 && s.dt > 0 && ph2 < prev2) ctx.sfx('jingle', { shake: .3, gain: .35, pitch: 1.12 }); prev2 = ph2;
        }
      },
      render(target, s) {
        if (s.beat === 0) {
          stage.render(hdr);
          if (typeof window !== 'undefined' && window.__xkSheet) {           // dev: every pose side by side
            const N = santa.poses.length, H = view.h, w = view.w / 4.3;
            santa.poses.forEach((n, i) => { santa.place(w * ((i % 4) + .45), H * (i < 4 ? .5 : .95), H * .4).pose(n).update(0); santa.render(hdr); });
          } else santa.render(hdr);
        } else if (s.beat === 1) {
          sky.render(hdr); sleigh3.render(hdr, cam);
          if (typeof window !== 'undefined' && window.__xkSanta3D) {        // dev: Santa as a world-space billboard (3D placement test)
            const v = new THREE.Vector3(-6, -7, -20).applyEuler(cam.rotation);
            santa.placeWorld([v.x, v.y, v.z], 3.6).pose('wave').update(s.time); santa.setLight(.55, .85); santa.render(hdr, cam);
          }
          snow3.render(hdr, cam);
        } else {
          sky.render(hdr); sleigh2.render(hdr); snow2.render(hdr);
        }
        gfx.post(hdr, target, { exposure: 1, bloom: .6, threshold: .9, knee: .6, vignette: .4, grain: .035, halation: .3, tone: 'aces' });
      },
    };
  },
};
