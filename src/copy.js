// All visible words. Serbian (Latin) first, English second. Scenes reference keys only.
const ui_sr = {
  'ui.title': 'Lyra Style – tvoj zvuk počinje ovde', 'ui.canvas': 'Lyra Style: priča o zvuku u nekoliko scena. Strelice ili skrol za dalje.',
  'ui.overview': 'Pregled', 'ui.close': 'Zatvori', 'ui.shop': 'Prodavnica', 'ui.langSwitch': 'Switch to English',
  'ui.soundOn': 'Zvuk: uklj.', 'ui.soundOff': 'Zvuk: isklj.', 'ui.soundOnSay': 'Zvuk je uključen', 'ui.soundOffSay': 'Zvuk je isključen',
  'ui.prev': 'Nazad', 'ui.next': 'Dalje', 'ui.progress': 'Tok priče', 'ui.hint': 'Skroluj ili pritisni strelicu', 'ui.hintTouch': 'Prevuci nagore za dalje', 'ui.lost': 'Grafika je prekinuta. Osveži stranicu.',
  'gate.loading': 'Štimujemo…', 'gate.ready': 'Najlepše je sa zvukom.', 'gate.sound': 'Uđi sa zvukom', 'gate.quiet': 'Uđi bez zvuka', 'gate.swipe': 'Prevuci nagore', 'gate.scroll': 'Skroluj za dalje',
  'help.title': 'Prečice', 'help.next': 'Dalje', 'help.prev': 'Nazad', 'help.ends': 'Početak / kraj', 'help.jump': 'Skok na scenu', 'help.overview': 'Pregled svih scena', 'help.mute': 'Zvuk', 'help.lang': 'Jezik', 'help.full': 'Ceo ekran', 'help.help': 'Ova pomoć', 'help.close': 'Zatvori',
};
const ui_en = {
  'ui.title': 'Lyra Style – your sound starts here', 'ui.canvas': 'Lyra Style: a story about sound in a few scenes. Use arrow keys or scroll to continue.',
  'ui.overview': 'Overview', 'ui.close': 'Close', 'ui.shop': 'Shop', 'ui.langSwitch': 'Prebaci na srpski',
  'ui.soundOn': 'Sound: on', 'ui.soundOff': 'Sound: off', 'ui.soundOnSay': 'Sound is on', 'ui.soundOffSay': 'Sound is off',
  'ui.prev': 'Back', 'ui.next': 'Next', 'ui.progress': 'Progress', 'ui.hint': 'Scroll or press an arrow key', 'ui.hintTouch': 'Swipe up to continue', 'ui.lost': 'Graphics were interrupted. Reload the page.',
  'gate.loading': 'Tuning up…', 'gate.ready': 'Best with sound.', 'gate.sound': 'Enter with sound', 'gate.quiet': 'Enter without sound', 'gate.swipe': 'Swipe up', 'gate.scroll': 'Scroll to continue',
  'help.title': 'Shortcuts', 'help.next': 'Next', 'help.prev': 'Back', 'help.ends': 'Start / end', 'help.jump': 'Jump to a scene', 'help.overview': 'Overview of all scenes', 'help.mute': 'Sound', 'help.lang': 'Language', 'help.full': 'Full screen', 'help.help': 'This help', 'help.close': 'Close',
};
import { scenes_sr, scenes_en } from './copy.scenes.js';
export const copy = { sr: { ...ui_sr, ...scenes_sr }, en: { ...ui_en, ...scenes_en } };
