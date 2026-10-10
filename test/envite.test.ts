import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Agent, type Bet, type Reply } from '../src/game.ts';

/** Jugador de prueba: envida en grande si se le indica y contesta lo que se le diga. */
function agent(seat: number, log: number[], opts: { bet?: Bet; reply?: Reply }): Agent {
  return {
    mus: async () => false,
    discard: async () => [0],
    bet: async ({ lance }) => (lance === 'grande' && opts.bet ? opts.bet : { kind: 'paso' }),
    reply: async () => { log.push(seat); return opts.reply ?? { kind: 'noquiero' }; },
  };
}

test('si Paco envida, contesta antes Iñaki; si no quiere, aún puedes querer tú', async () => {
  const log: number[] = [];
  const agents = [
    agent(0, log, { reply: { kind: 'quiero' } }),
    agent(1, log, { bet: { kind: 'envido', amount: 2 } }),
    agent(2, log, { reply: { kind: 'noquiero' } }),
    agent(3, log, {}),
  ];
  const g = new Game(agents, { say: async () => {}, update: () => {} });
  g.mano = 1;
  await g.playHand();
  assert.deepEqual(log, [2, 0]);
  assert.equal(g.results.find(r => r.lance === 'grande')!.state, 'querido');
});

test('si Maite envida, contestas tú primero; si quieres, Iñaki ya no contesta', async () => {
  const log: number[] = [];
  const agents = [
    agent(0, log, { reply: { kind: 'quiero' } }),
    agent(1, log, {}),
    agent(2, log, { reply: { kind: 'noquiero' } }),
    agent(3, log, { bet: { kind: 'envido', amount: 2 } }),
  ];
  const g = new Game(agents, { say: async () => {}, update: () => {} });
  g.mano = 3;
  await g.playHand();
  assert.deepEqual(log, [0]);
});

test('si nadie de la pareja quiere, cobra quien envidó', async () => {
  const log: number[] = [];
  const agents = [agent(0, log, {}), agent(1, log, { bet: { kind: 'envido', amount: 2 } }), agent(2, log, {}), agent(3, log, {})];
  const g = new Game(agents, { say: async () => {}, update: () => {} });
  g.mano = 1;
  await g.playHand();
  assert.deepEqual(log, [2, 0]);
  assert.equal(g.results.find(r => r.lance === 'grande')!.state, 'noquerido');
});
