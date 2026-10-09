// Torneo entre niveles de bots: cada pareja juega con un nivel y se cuentan las victorias.
// Uso: node scripts/torneo.ts normal facil 300
import { Game } from '../src/game.ts';
import { Bot, type Level } from '../src/bots.ts';

const [a = 'normal', b = 'facil', n = '200'] = process.argv.slice(2) as [Level, Level, string];
const ev = { say: async () => {}, update: () => {} };
let winsA = 0;
const games = Number(n);
const t0 = Date.now();
for (let i = 0; i < games; i++) {
  const bots = [0, 1, 2, 3].map(s => {
    const bot = new Bot();
    bot.level = s % 2 === 0 ? a : b; // pareja 0: asientos 0 y 2; pareja 1: asientos 1 y 3
    return bot;
  });
  const g = new Game(bots, ev);
  g.mano = i % 4;
  while (g.winner === null) await g.playHand();
  if (g.winner === 0) winsA++;
}
const pct = (100 * winsA) / games;
console.log(`${a} contra ${b}: ${winsA} de ${games} (${pct.toFixed(1)} %) en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
