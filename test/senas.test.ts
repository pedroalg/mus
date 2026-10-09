import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../src/cards.ts';
import { senasFor } from '../src/bots.ts';

const h = (...ns: number[]): Card[] => ns.map((n, i) => ({ n, suit: (['oros', 'copas', 'espadas', 'bastos'] as const)[i % 4] }));
const meanings = (c: Card[]) => senasFor(c).map(s => s.meaning);

test('señas clásicas según la mano', () => {
  assert.deepEqual(meanings(h(12, 11, 10, 1)), ['tiene 31']);
  assert.deepEqual(meanings(h(12, 3, 1, 2)), ['tiene duples', 'tiene dos reyes', 'tiene dos ases']);
  assert.deepEqual(meanings(h(7, 7, 7, 4)), ['tiene medias']);
  assert.deepEqual(meanings(h(4, 5, 6, 7)), ['va ciego, no tiene nada']);
  assert.deepEqual(meanings(h(12, 11, 5, 4)), []);
});
