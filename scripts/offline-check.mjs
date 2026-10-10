// Prueba del modo sin conexión con Chrome: una sola visita con red y después, sin red, se abre
// el juego como lo abriría el icono de la pantalla de inicio.
// Uso: node scripts/offline-check.mjs https://pedroalg.github.io/mus/
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'https://pedroalg.github.io/mus/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const first = await ctx.newPage();
await first.goto(url, { waitUntil: 'load' });
const sw = await first.evaluate(async () => {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 10000))]);
  return reg ? 'listo' : 'sin service worker';
});
console.log('una visita con red; service worker:', sw);
await first.close();

await ctx.setOffline(true);
let fallos = 0;
for (const target of [url, url + '?desde=icono', url + 'index.html']) {
  const page = await ctx.newPage();
  try {
    await page.goto(target, { waitUntil: 'load', timeout: 10000 });
    await page.click('#m-new', { timeout: 3000 });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({
      cartas: document.querySelectorAll('.seat-0 .card').length,
      fuente: document.fonts.check('700 16px "Atkinson Hyperlegible"'),
    }));
    const ok = r.cartas === 4;
    if (!ok) fallos++;
    console.log(`sin red → ${target}: ${ok ? 'se juega' : 'NO se juega'}; fuente propia: ${r.fuente ? 'sí' : 'no'}`);
  } catch (e) {
    fallos++;
    console.log(`sin red → ${target}: ERROR ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
process.exit(fallos ? 1 : 0);
