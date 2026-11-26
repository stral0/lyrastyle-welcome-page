// THROWAWAY stand-in for 'talas' (night aerial of a modernist city, ring of light). Transition testing only.
export default {
  id: 'talas', enterWith: 'grain', beats: [{ dur: 5, copy: ['talas.b2.h'] }],
  create(ctx) {
    const { gfx } = ctx; const hdr = gfx.target({});
    const bg = gfx.pass(`
      void main(){
        vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.);
        float hy = .2; float d = hy - p.y; vec3 col = vec3(0.);
        if (d > 0.) {
          float z = .16 / d; vec2 w = vec2(p.x * z * 1.5, z + uTime * .01);
          vec2 g = w * 7.; vec2 id = floor(g); vec2 f = fract(g);
          float blockOn = step(.38, hash12(floor(id / vec2(3., 2.)) + 7.));
          float aa = max(fwidth(g.x), fwidth(g.y));
          float atten = 1. / (1. + z * z * .05);
          // windows: a few warm points per cell
          for (int i = 0; i < 3; i++) {
            vec2 o = hash22(id + float(i) * 17.3); float on = step(.45, hash12(id * 1.7 + float(i) * 5.1)) * blockOn;
            float dd = length((f - (.15 + .7 * o)) * vec2(1., .55));
            vec3 wc = mix(vec3(1., .62, .25), vec3(1., .85, .6), hash12(id + float(i)));
            col += wc * on * exp(-dd * dd / (.004 + aa * aa * .3)) * 2.2 * atten / (1. + aa * 30.);
          }
          // streets
          float st = smoothstep(.06 + aa, .06, min(f.x, 1. - f.x)) * step(.5, hash12(vec2(id.x, 3.))) + smoothstep(.05 + aa, .05, min(f.y, 1. - f.y)) * step(.6, hash12(vec2(5., id.y)));
          col += vec3(1., .5, .16) * st * .11 * atten;
          col += vec3(.012, .012, .02) * (.4 + vnoise(w * 2.));
          // the wave
          float R = 1.2 + 2.4 * fract(uTime * .09); float r = length(vec2(w.x, (z - 2.6) * 1.5));
          float ring = exp(-pow((r - R) * 5., 2.));
          col += vec3(1., .8, .45) * ring * .5 * atten + col * ring * 2.5;
          col = mix(col, vec3(.08, .05, .035), smoothstep(.06, 0., d));
        } else {
          vec2 sp = p * 70.; vec2 si = floor(sp); vec2 sf = fract(sp) - .5; vec2 so = hash22(si) - .5;
          float sb = pow(hash12(si + 3.3), 14.);
          col += vec3(.8, .88, 1.) * sb * exp(-dot(sf - so * .6, sf - so * .6) * 60.) * 3. * smoothstep(0., .12, -d);
          col += vec3(.08, .05, .035) * exp(d * 14.) + vec3(.006, .008, .016);
        }
        fragColor = vec4(col, 1.); }`, {});
    const ui = ctx.overlay();
    const h = ui.text('talas.b2.h', { size: 110, font: 'display', align: 'left', valign: 'top', width: 900 });
    return {
      update(s) { h.x = 120; h.y = 400; h.wrap = Math.min(900, ctx.view.w - 240); h.show(s.k(0, 1., 2.4), { style: 'blur', by: 'word' }); },
      render(target) { bg.render(hdr); gfx.post(hdr, target, { bloom: 1., threshold: .7, vignette: .4, grain: .03, halation: .3 }); ui.render(target); },
    };
  },
};
