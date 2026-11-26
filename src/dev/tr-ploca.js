// THROWAWAY stand-in for 'ploca' (brass Chladni plate). Transition testing only.
export default {
  id: 'ploca', enterWith: 'pluck', beats: [{ dur: 5, copy: ['ploca.b1.h'] }],
  create(ctx) {
    const { gfx } = ctx; const hdr = gfx.target({});
    const bg = gfx.pass(`
      void main(){
        vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.); if (uRes.x < uRes.y) p *= 1.7;
        vec3 ro = vec3(0., 1.25, -1.5), ta = vec3(.12, 0., .02);
        vec3 ww = normalize(ta - ro), uu = normalize(cross(vec3(0., 1., 0.), ww)), vv = cross(ww, uu);
        vec3 rd = normalize(p.x * uu + p.y * vv + 1.55 * ww);
        float t = -ro.y / rd.y; vec3 hit = ro + rd * t; vec3 col = vec3(0.);
        float a = .38 + .02 * sin(uTime * .2); vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * hit.xz;
        float L = .66; float box = max(abs(q.x), abs(q.y)); float aa = fwidth(box) * 1.5;
        float inside = 1. - smoothstep(L - aa, L + aa, box);
        if (t > 0.) {
          vec2 u = q / L * .5 + .5; float n = 3., m = 5.;
          float c = cos(n * 3.14159 * u.x) * cos(m * 3.14159 * u.y) - cos(m * 3.14159 * u.x) * cos(n * 3.14159 * u.y);
          float dens = exp(-c * c * 26.);
          float g = hash12(floor(hit.xz * 620.)); float g2 = vnoise(hit.xz * 240.);
          float sand = smoothstep(1. - dens * .97, 1. - dens * .97 + .12, g * .7 + g2 * .3 + dens * .25);
          vec3 brass = vec3(.34, .19, .05) * (.35 + .9 * pow(vnoise(vec2(q.x * 3., q.y * 160.)), 2.));
          float key = exp(-dot(q - vec2(-.25, .2), q - vec2(-.25, .2)) * 2.2);
          brass *= .25 + 1.6 * key; brass += vec3(.6, .38, .14) * pow(key, 6.) * .25;
          vec3 sandc = vec3(.93, .86, .7) * (.55 + .6 * g) * (.3 + 1.1 * key);
          col = mix(brass, sandc, sand) * inside;
          // rim light
          col += vec3(.45, .6, 1.) * .12 * smoothstep(L - .02, L, box) * inside;
        }
        fragColor = vec4(col, 1.); }`, {});
    const ui = ctx.overlay();
    const h = ui.text('ploca.b1.h', { size: 120, font: 'display', align: 'left', valign: 'top', width: 800 });
    return {
      update(s) { h.x = 120; h.y = ctx.view.h - 330; h.wrap = Math.min(800, ctx.view.w - 240); h.show(s.k(0, .8, 2.2), { style: 'blur', by: 'word' }); },
      render(target) { bg.render(hdr); gfx.post(hdr, target, { bloom: .8, threshold: .8, vignette: .45, grain: .03, halation: .25 }); ui.render(target); },
    };
  },
};
