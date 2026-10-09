import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { Bot } from '../src/bots.ts';

test('200 partidas entre bots terminan sin errores', async () => {
  const ev = { say: async () => {}, update: () => {} };
  for (let i = 0; i < 200; i++) {
    const g = new Game([new Bot(), new Bot(), new Bot(), new Bot()], ev);
    let hands = 0;
    while (g.winner === null) {
      await g.playHand();
      for (const h of g.hands) assert.equal(h.length, 4);
      assert.ok(++hands < 500);
    }
    assert.ok(g.scores[g.winner] >= 40 || g.results.some(r => r.state === 'ordago'));
  }
});
