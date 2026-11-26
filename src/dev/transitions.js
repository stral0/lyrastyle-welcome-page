// DEV entry for the transitions builder: four throwaway stand-in scenes wired with the real transition table.
// window.__trDebug = 0..1 (set BEFORE the first transition starts) freezes p; both scenes keep running.
// window.__trForce = 'pluck' | 'grain' | 'tilt' | 'fade' renders that transition whatever the scene pair is.
import { boot } from '../engine/deck.js'; import { transitions } from '../engine/transitions.js'; import { copy } from '../copy.js'; import { products } from '../products.js'; import { site } from '../site.js';
import zica from './tr-zica.js'; import ploca from './tr-ploca.js'; import talas from './tr-talas.js'; import sazvezdje from './tr-sazvezdje.js';
const dbg = {}, made = {};
for (const k in transitions) {
  const d = transitions[k];
  dbg[k] = {
    get dur() { return window.__trDebug != null ? 1e6 : d.dur; },
    create(ctx) {
      const get = n => made[n] || (made[n] = transitions[n].create(ctx));
      return { render(o) { get(window.__trForce || k).render(window.__trDebug != null ? { ...o, p: window.__trDebug } : o); } };
    },
  };
}
boot({ scenes: [zica, ploca, talas, sazvezdje], transitions: dbg, copy, products, site });
