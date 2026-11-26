// THROWAWAY stand-in for the end of 'zica' (inside a grand piano). Transition testing only.
export default {
  id: 'zica', enterWith: 'fade', beats: [{ dur: 5, copy: ['zica.b3.h'] }],
  create(ctx) {
    const { gfx } = ctx; const hdr = gfx.target({});
    const bg = gfx.pass(`
      void main(){
        vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.);
        float hy = .23 + .004 * sin(uTime * .31); float d = hy - p.y; vec3 col = vec3(0.);
        if (d > 0.) {
          float z = .2 / d; float xw = (p.x - .04 + .01 * sin(uTime * .17)) * z;
          float f = xw * 11.; float id = floor(f); float fr = abs(fract(f) - .5); float aa = fwidth(f);
          float th = .06 + .05 * hash11(id * 3.7);
          float line = (1. - smoothstep(th, th + aa * 1.3, fr)) * min(1., .18 / (aa + .02));
          float sheen = exp(-pow((z - 2.4 - .8 * sin(uTime * .23 + id * .7)) * .55, 2.)) * 1.6 + .12;
          sheen += .9 * exp(-pow((z - .75) * 3., 2.));
          vec3 brass = mix(vec3(1., .58, .16), vec3(1., .82, .5), hash11(id + 9.) * .5);
          col += vec3(.035, .016, .005) * exp(-z * .22) * (1. + .6 * vnoise(vec2(xw * 2., z * 3.)));
          col += brass * line * sheen * 1.5 / (1. + z * z * .035);
          // hammers: a row of red felt
          float hz = (z - 1.02) / .2; float hx = abs(fract(xw * 11. / 3.) - .5);
          float ham = smoothstep(1., .7, abs(hz)) * smoothstep(.34, .26, hx);
          vec3 felt = vec3(.42, .035, .06) * (.35 + .9 * smoothstep(.34, 0., hx)) * (.6 + .5 * smoothstep(-1., 1., hz));
          col = mix(col, felt, ham * .95);
          col *= smoothstep(0., .05, d);
        } else {
          col = vec3(.03, .016, .006) * exp(d * 9.) + vec3(.012, .006, .003) * smoothstep(-.3, 0., d);
        }
        fragColor = vec4(col, 1.); }`, {});
    const ui = ctx.overlay();
    const h = ui.text('zica.b3.h', { size: 104, font: 'display', align: 'left', valign: 'top', width: 900 });
    return {
      update(s) { h.x = 120; h.y = 150; h.wrap = Math.min(900, ctx.view.w - 240); h.show(1); },
      render(target) { bg.render(hdr); gfx.post(hdr, target, { bloom: .9, threshold: .7, vignette: .4, grain: .03, halation: .3 }); ui.render(target); },
    };
  },
};
