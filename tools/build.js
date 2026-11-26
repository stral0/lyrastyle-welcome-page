// Build: bundle src/main.js (+three) into one IIFE, inline CSS + base64 fonts into the template -> dist/index.html
const esbuild = require('esbuild'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const R = p => path.join(root, p);
const minify = !process.argv.includes('--dev');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENTRY = arg('entry', 'src/main.js'), OUT = arg('out', 'dist/index.html');
(async () => {
  const res = await esbuild.build({ entryPoints: [R(ENTRY)], bundle: true, format: 'iife', write: false,
    minify, target: ['es2020'], legalComments: 'none', loader: { '.glsl': 'text' }, logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' } });
  let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const fonts = JSON.parse(fs.readFileSync(R('src/fonts.json'), 'utf8'));
  let fontCss = '';
  for (const f of fonts) {
    const b64 = fs.readFileSync(R(f.file)).toString('base64');
    fontCss += `@font-face{font-family:"${f.family}";font-style:${f.style || 'normal'};font-weight:${f.weight};font-display:block;` +
      (f.stretch ? `font-stretch:${f.stretch};` : '') +
      `src:url(data:font/woff2;base64,${b64}) format("woff2");` + (f.unicodeRange ? `unicode-range:${f.unicodeRange};` : '') + `}\n`;
  }
  const css = fs.readFileSync(R('src/styles.css'), 'utf8');
  let html = fs.readFileSync(R('src/index.template.html'), 'utf8');
  html = html.replace('/*__FONTS__*/', () => fontCss).replace('/*__CSS__*/', () => css).replace('/*__APP__*/', () => js);
  fs.writeFileSync(R(OUT), html);
  // external-request audit: any URL-ish resource loads?
  const ext = (html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi) || []).filter(u => !/href\s*=\s*["']https:\/\/(www\.)?lyrastyle\.rs/i.test(u));
  const imports = html.match(/@import|url\(\s*["']?https?:/gi) || [];
  console.log(`${OUT} ${(html.length / 1024).toFixed(0)} KB (js ${(js.length / 1024).toFixed(0)} KB, fonts ${(fontCss.length / 1024).toFixed(0)} KB) lines=${html.split('\n').length}`);
  if (ext.length || imports.length) console.log('EXTERNAL REFS:', ext, imports);
})().catch(e => { console.error(e.message || e); process.exit(1); });
