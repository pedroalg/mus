// Compila el juego en dos salidas:
//   dist/mus.html  página autocontenida para publicar como artifact en claude.ai
//   docs/          app web instalable y offline para GitHub Pages
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const out = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'safari15',
  minify: true,
  write: false,
});
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');

// Fuente incrustada (Atkinson Hyperlegible, licencia OFL): el juego no depende de internet
const font = async (weight) => `@font-face { font-family: "Atkinson Hyperlegible"; font-style: normal; font-weight: ${weight}; `
  + `font-display: swap; src: url(data:font/woff2;base64,${(await readFile(`pwa/fonts/atkinson-${weight}.woff2`)).toString('base64')}) format("woff2"); }`;
const fonts = `<style>${await font(400)}\n${await font(700)}</style>`;

const page = (await readFile('index.html', 'utf8'))
  .replace('<!--FONTS-->', () => fonts)
  .replace('<!--SCRIPT-->', () => `<script>${js}</script>`);

await mkdir('dist', { recursive: true });
await writeFile('dist/mus.html', page);
console.log(`dist/mus.html (${(page.length / 1024).toFixed(1)} KB)`);

// GitHub Pages: documento completo con lo que necesita iOS para instalarlo como app.
const site = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#12301f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mus">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
:root { padding-top: env(safe-area-inset-top, 0px); }
body { margin: 0; -webkit-touch-callout: none; }
[hidden] { display: none !important; }
</style>
</head>
<body>
${page}
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
</body>
</html>
`;
const hash = createHash('sha1').update(site);
for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) hash.update(await readFile(`pwa/${f}`));
const version = hash.digest('hex').slice(0, 10);
await mkdir('docs', { recursive: true });
await writeFile('docs/index.html', site);
await writeFile('docs/sw.js', (await readFile('pwa/sw.js', 'utf8')).replace('__VERSION__', version));
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
  await copyFile(`pwa/${f}`, `docs/${f}`);
}
await writeFile('docs/.nojekyll', '');
console.log(`docs/ (versión ${version})`);
