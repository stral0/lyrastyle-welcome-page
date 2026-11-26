import { boot } from '../engine/deck.js'; import { transitions } from '../engine/transitions.js'; import { copy } from '../copy.js'; import { products } from '../products.js'; import { site } from '../site.js';
import probe from '../scenes/probe.js';
boot({ scenes: [probe, { ...probe, id: 'probeb' }], transitions, copy: { sr: { ...copy.sr, 'probeb.title': 'Proba B' }, en: { ...copy.en, 'probeb.title': 'Probe B' } }, products, site });
