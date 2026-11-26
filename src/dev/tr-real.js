// THROWAWAY: the transitions against whichever real scenes exist (stand-ins for the rest). Same debug switches as transitions.js.
import { boot } from '../engine/deck.js'; import { transitions } from '../engine/transitions.js'; import { copy } from '../copy.js'; import { products } from '../products.js'; import { site } from '../site.js';
import zica from '../scenes/zica.js'; import ploca from '../scenes/ploca.js'; import talas from '../scenes/talas.js'; import sazvezdje from '../scenes/sazvezdje.js';
const dbg = {}, made = {};
for (const k in transitions) {
  const d = transitions[k];
  dbg[k] = { get dur() { return window.__trDebug != null ? 1e6 : d.dur; },
    create(ctx) { const get = n => made[n] || (made[n] = transitions[n].create(ctx)); return { render(o) { get(window.__trForce || k).render(window.__trDebug != null ? { ...o, p: window.__trDebug } : o); } }; } };
}
boot({ scenes: [zica, ploca, talas, sazvezdje], transitions: dbg, copy, products, site });
