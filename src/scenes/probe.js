// Engine probe scene (not shipped): exercises target -> post -> text.
export default {
  id: 'probe', enterWith: 'fade',
  beats: [{ dur: 4, copy: ['probe.h'] }, { dur: 4, copy: ['probe.p'] }],
  create(ctx) {
    const { gfx } = ctx; const hdr = gfx.target({});
    const bg = gfx.pass(`uniform float uK; uniform vec3 uTint;
      void main(){ vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.);
        float y = p.y + .02 * sin(p.x * 9. + uTime * 2.) * uK; float l = .0025 / (abs(y) + .0015);
        vec3 c = uTint * l * (1.5 + uK * 4.) + vec3(.01, .008, .006) * fbm(p * 3. + uTime * .05);
        fragColor = vec4(c, 1.); }`, { uK: 0, uTint: new ctx.THREE.Vector3(1, .7, .3) });
    const ui = ctx.overlay();
    const h = ui.text('probe.h', { size: 150, font: 'display', align: 'center', valign: 'middle' });
    const p = ui.text('probe.p', { size: 40, font: 'text', align: 'center', valign: 'top', width: 900, color: '#a99c86' });
    return {
      update(s) { bg.u.uK.value = s.k(1, 0, 2, 'outCubic'); h.x = ctx.view.w / 2; h.y = ctx.view.h * .4; h.show(s.k(0, .5, 2.2), { style: 'blur', by: 'glyph' });
        p.x = ctx.view.w / 2; p.y = ctx.view.h * .58; p.wrap = Math.min(900, ctx.view.w * .8); p.show(s.k(1, .3, 1.8), { style: 'rise', by: 'word' }); },
      render(target, s) { bg.render(hdr); gfx.post(hdr, target, { bloom: .9, threshold: .8, vignette: .35, grain: .03 }); ui.render(target); },
    };
  },
};
