// node tools/audio-test/probe.js "<async js body using render/analyse/LyraAudio; return value is printed>"
const path = require('path'); const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  const out = await page.evaluate(code => (new Function('return (async()=>{' + code + '})()'))(), process.argv[2]);
  console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1)); if (errs.length) console.log('ERRORS', errs);
  await browser.close();
})();
