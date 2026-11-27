// Private dev entry for the xmas visual kit: the 'xmaskit' test scene alone (dev only, not shipped).
import { boot } from '../engine/deck.js'; import { transitions } from '../engine/transitions.js'; import { copy } from '../copy.js'; import { products } from '../products.js'; import { site } from '../site.js';
import scene from '../scenes/xmaskit.js';
boot({ scenes: [scene], transitions, copy, products, site });
