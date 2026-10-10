import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Agent } from '../src/game.ts';
import { Bot } from '../src/bots.ts';
import { CHARACTERS, type CharacterId } from '../src/characters.ts';

async function play(ids: CharacterId[], games: number) {
  const ev = { say: async () => {}, update: () => {} };
  for (let i = 0; i < games; i++) {
    const g = new Game(ids.map(id => new Bot(CHARACTERS[id].traits)), ev);
    let hands = 0;
    while (g.winner === null) {
      await g.playHand();
      for (const h of g.hands) assert.equal(h.length, 4);
      assert.ok(++hands < 500);
    }
    assert.ok(g.scores[g.winner] >= 40 || g.results.some(r => r.state === 'ordago'));
    assert.ok(g.endReason.length > 0);
  }
}

test('partidas con los personajes flojos terminan sin errores', () => play(['andoni', 'paco', 'lucia', 'andoni'], 60));
test('partidas con los personajes fuertes terminan sin errores', () => play(['txomin', 'maite', 'inaki', 'pili'], 15));

/** Cuenta cuántas veces envida un personaje en muchas manos, sin dejar que se acabe la partida. */
async function betRate(id: CharacterId) {
  let bets = 0;
  let asked = 0;
  const bot = new Bot(CHARACTERS[id].traits);
  const spy: Agent = {
    mus: (...a) => bot.mus(...a),
    discard: (...a) => bot.discard(...a),
    reply: (...a) => bot.reply(...a),
    bet: async ctx => { const b = await bot.bet(ctx); asked++; if (b.kind !== 'paso') bets++; return b; },
  };
  const others = () => new Bot(CHARACTERS.rosa.traits);
  for (let i = 0; i < 40; i++) {
    const g = new Game([spy, others(), others(), others()], { say: async () => {}, update: () => {} }, 999);
    for (let h = 0; h < 5; h++) await g.playHand();
  }
  return bets / asked;
}

test('el farolero envida mucho más que la prudente', async () => {
  const paco = await betRate('paco');
  const pili = await betRate('pili');
  assert.ok(paco > pili * 2, `Paco envida ${(paco * 100).toFixed(0)} %, Doña Pili ${(pili * 100).toFixed(0)} %`);
});
