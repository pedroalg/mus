import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../src/cards.ts';
import { fitsSena, outlook, type TableInfo } from '../src/ai.ts';
import { Game } from '../src/game.ts';
import { Bot, SENAS } from '../src/bots.ts';

const h = (...ns: number[]): Card[] => ns.map((n, i) => ({ n, suit: (['oros', 'copas', 'espadas', 'bastos'] as const)[i % 4] }));
const info = (): TableInfo => ({
  mano: 0, target: 40, scores: [0, 0],
  pares: [undefined, undefined, undefined, undefined], juego: [undefined, undefined, undefined, undefined],
  senasFor: [[], [], [], []], bets: [], passes: [],
});

test('las señas solo encajan con las manos que dicen', () => {
  assert.ok(fitsSena(h(12, 11, 10, 1), 'wink'));
  assert.ok(!fitsSena(h(12, 11, 10, 4), 'wink'));
  assert.ok(fitsSena(h(12, 3, 5, 7), 'bite'));
  assert.ok(fitsSena(h(4, 5, 6, 7), 'closed'));
  assert.ok(!fitsSena(h(4, 4, 6, 7), 'closed'));
});

test('el compañero que hace seña de 31 sube mucho las opciones al juego', () => {
  const mine = h(4, 5, 6, 7); // sin juego
  const sin = outlook(0, mine, 'juego', info(), 400).p;
  const i = info();
  i.senasFor[0] = ['wink'];
  const con = outlook(0, mine, 'juego', i, 400).p;
  assert.ok(con > sin + 0.25, `sin seña ${sin.toFixed(2)}, con seña ${con.toFixed(2)}`);
  assert.ok(con > 0.6);
});

test('quien envida se supone fuerte: bajan las opciones propias', () => {
  const mine = h(12, 10, 7, 5);
  const libre = outlook(0, mine, 'grande', info(), 400).p;
  const i = info();
  i.bets = [{ seat: 1, lance: 'grande' }];
  const tras = outlook(0, mine, 'grande', i, 400).p;
  assert.ok(tras < libre - 0.1, `antes ${libre.toFixed(2)}, tras el envite ${tras.toFixed(2)}`);
});

test('tus señas le llegan solo a Iñaki', () => {
  const g = new Game([new Bot(), new Bot(), new Bot(), new Bot()], { say: async () => {}, update: () => {} });
  g.humanSena(SENAS.bite);
  assert.deepEqual(g.info.senasFor[2], ['bite']);
  assert.deepEqual(g.info.senasFor[1], []);
  assert.deepEqual(g.info.senasFor[3], []);
});
