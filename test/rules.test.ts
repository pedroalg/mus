import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../src/cards.ts';
import * as R from '../src/rules.ts';

const h = (...ns: number[]): Card[] => ns.map((n, i) => ({ n, suit: (['oros', 'copas', 'espadas', 'bastos'] as const)[i % 4] }));

test('8 reyes: el 3 es rey y el 2 es as', () => {
  assert.ok(R.cmpGrande(h(3, 3, 3, 12), h(12, 12, 12, 11)) > 0);
  assert.equal(R.cmpChica(h(2, 1, 2, 1), h(1, 1, 1, 1)), 0);
  assert.ok(R.cmpChica(h(2, 1, 1, 4), h(1, 1, 5, 4)) > 0);
});

test('pares: duples > medias > pareja', () => {
  assert.equal(R.pares(h(12, 3, 1, 2)).kind, 3);
  assert.equal(R.pares(h(7, 7, 7, 1)).kind, 2);
  assert.equal(R.pares(h(5, 5, 6, 1)).kind, 1);
  assert.equal(R.pares(h(4, 5, 6, 7)).kind, 0);
  assert.ok(R.cmpPares(h(4, 4, 1, 1), h(12, 12, 12, 1)) > 0);
  assert.ok(R.cmpPares(h(12, 12, 1, 1), h(11, 11, 10, 10)) > 0);
  assert.ok(R.cmpPares(h(12, 12, 12, 12), h(12, 12, 11, 11)) > 0);
});

test('juego: 31 > 32 > 40 > 37 > 33', () => {
  const j31 = h(12, 11, 10, 2), j32 = h(12, 10, 7, 5), j40 = h(12, 3, 11, 10), j37 = h(12, 10, 10, 7), j33 = h(12, 11, 7, 6);
  assert.deepEqual([j31, j32, j40, j37, j33].map(R.total), [31, 32, 40, 37, 33]);
  assert.ok(R.cmpJuego(j31, j32) > 0);
  assert.ok(R.cmpJuego(j32, j40) > 0);
  assert.ok(R.cmpJuego(j40, j37) > 0);
  assert.ok(R.cmpJuego(j37, j33) > 0);
  assert.equal(R.juegoValue(j31), 3);
  assert.equal(R.juegoValue(j33), 2);
});

test('punto: gana el más cercano a 30', () => {
  assert.ok(R.cmpPunto(h(10, 10, 5, 4), h(10, 10, 7, 1)) > 0);
});
