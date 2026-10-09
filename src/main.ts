import { Game } from './game.ts';
import { Bot } from './bots.ts';
import { Human, Ui } from './ui.ts';

const ui = new Ui();
const agents = [new Human(ui), new Bot(), new Bot(), new Bot()];

async function run() {
  for (;;) {
    const game = new Game(agents, ui);
    game.mano = Math.floor(Math.random() * 4);
    ui.game = game;
    ui.clearLog();
    while (game.winner === null) {
      const summary = await game.playHand();
      await ui.showSummary(summary, game.winner);
    }
  }
}

run();
