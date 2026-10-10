// Torneo de personajes: cada pareja la forman dos copias del mismo personaje.
// Uso: node scripts/torneo.ts txomin paco 300      (un enfrentamiento)
//      node scripts/torneo.ts liga 200             (todos contra Rosa, la de referencia)
import { Game } from '../src/game.ts';
import { Bot } from '../src/bots.ts';
import { CHARACTERS, type CharacterId } from '../src/characters.ts';

async function match(a: CharacterId, b: CharacterId, games: number) {
  const ev = { say: async () => {}, update: () => {} };
  let wins = 0;
  let bluffs = 0;
  for (let i = 0; i < games; i++) {
    const bots = [0, 1, 2, 3].map(s => new Bot(CHARACTERS[s % 2 === 0 ? a : b].traits));
    const g = new Game(bots, ev);
    g.mano = i % 4;
    while (g.winner === null) await g.playHand();
    if (g.winner === 0) wins++;
  }
  return { a, b, games, pct: (100 * wins) / games, bluffs };
}

const [x = 'liga', y = '200', z = '200'] = process.argv.slice(2);
const t0 = Date.now();
if (x === 'liga') {
  const games = Number(y);
  const ids = (Object.keys(CHARACTERS) as CharacterId[]).filter(id => id !== 'rosa');
  const results = await Promise.all(ids.map(id => match(id, 'rosa', games)));
  results.sort((p, q) => q.pct - p.pct);
  for (const r of results) console.log(`${CHARACTERS[r.a].name.padEnd(10)} contra Rosa: ${r.pct.toFixed(1)} %`);
} else {
  const r = await match(x as CharacterId, y as CharacterId, Number(z));
  console.log(`${CHARACTERS[r.a].name} contra ${CHARACTERS[r.b].name}: ${r.pct.toFixed(1)} % de ${r.games}`);
}
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
