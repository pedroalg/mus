import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { Bot, type Level } from '../src/bots.ts';

async function play(level: Level, games: number) {
  const ev = { say: async () => {}, update: () => {} };
  for (let i = 0; i < games; i++) {
    const bots = [0, 1, 2, 3].map(() => {
      const b = new Bot();
      b.level = level;
      return b;
    });
    const g = new Game(bots, ev);
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

test('200 partidas en nivel fácil terminan sin errores', () => play('facil', 200));
test('40 partidas en nivel normal terminan sin errores', () => play('normal', 40));
test('20 partidas en nivel difícil terminan sin errores', () => play('dificil', 20));
