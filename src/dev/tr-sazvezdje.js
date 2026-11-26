// THROWAWAY stand-in for 'sazvezdje' (night sky with Lyra). Transition testing only.
export default {
  id: 'sazvezdje', enterWith: 'tilt', beats: [{ dur: 5, copy: ['sazvezdje.b1.h'] }],
  create(ctx) {
    const { gfx } = ctx; const hdr = gfx.target({});
    const bg = gfx.pass(`
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
      void main(){
        vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.); if (uRes.x < uRes.y) p *= 1.5;
        vec3 col = vec3(.004, .006, .014) + vec3(.01, .012, .03) * fbm(p * 2.2 + 3.) * smoothstep(-.6, .5, p.y);
        for (int l = 0; l < 3; l++) {
          float sc = 40. + 45. * float(l); vec2 sp = p * sc + float(l) * 31.7; vec2 si = floor(sp), sf = fract(sp) - .5; vec2 so = (hash22(si) - .5) * .7;
          float sb = pow(hash12(si + 3.3), 18. - 3. * float(l)); float tw = .75 + .25 * sin(uTime * (1. + 3. * hash12(si)) + 6.28 * hash12(si + 1.));
          col += mix(vec3(1., .85, .7), vec3(.74, .83, 1.), hash12(si + 9.)) * sb * tw * exp(-dot(sf - so, sf - so) * (90. - 20. * float(l))) * 3.;
        }
        vec2 S[6]; S[0] = vec2(.06, .2); S[1] = vec2(.13, .12); S[2] = vec2(.115, -.085); S[3] = vec2(.215, -.12); S[4] = vec2(.235, .075); S[5] = vec2(.16, .235);
        float ln = min(min(seg(p, S[0], S[1]), seg(p, S[1], S[2])), min(min(seg(p, S[2], S[3]), seg(p, S[3], S[4])), min(seg(p, S[4], S[1]), seg(p, S[0], S[5]))));
        col += vec3(.85, .65, .28) * .12 * smoothstep(.0022, .0006, ln);
        for (int i = 0; i < 6; i++) { float dd = length(p - S[i]); float m = i == 0 ? 1. : .22;
          col += vec3(.74, .83, 1.) * m * (.00035 / (dd * dd + .00002) + .004 / (dd + .01)); }
        fragColor = vec4(col, 1.); }`, {});
    const ui = ctx.overlay();
    const h = ui.text('sazvezdje.b1.h', { size: 120, font: 'display', align: 'left', valign: 'top', width: 800 });
    return {
      update(s) { h.x = 120; h.y = 330; h.wrap = Math.min(800, ctx.view.w - 240); h.show(s.k(0, 1.2, 2.6), { style: 'blur', by: 'word' }); },
      render(target) { bg.render(hdr); gfx.post(hdr, target, { bloom: 1., threshold: .6, vignette: .35, grain: .025 }); ui.render(target); },
    };
  },
};
