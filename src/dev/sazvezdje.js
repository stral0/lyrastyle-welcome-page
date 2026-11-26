// Private dev entry for the 'sazvezdje' scene builder: this scene alone.
import { boot } from '../engine/deck.js'; import { transitions } from '../engine/transitions.js'; import { copy } from '../copy.js'; import { products } from '../products.js'; import { site } from '../site.js';
import scene from '../scenes/sazvezdje.js';
boot({ scenes: [scene], transitions, copy, products, site });
