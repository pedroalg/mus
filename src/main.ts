import { type Events, Game } from './game.ts';
import { Bot } from './bots.ts';
import { Abort, Human, Ui } from './ui.ts';
import { Menu } from './menu.ts';
import { loadSettings, recordResult } from './settings.ts';

const ui = new Ui();
const menu = new Menu(ui, () => { startGame(); });
ui.applySettings(loadSettings());

async function startGame() {
  const settings = loadSettings();
  ui.applySettings(settings);
  const partner = new Bot();
  partner.senasOn = settings.senas;

  // Los avisos de la partida pasan por aquí para que una partida abandonada se corte sola.
  let gen = 0;
  const ev: Events = {
    say: async (s, t) => { ui.check(gen); await ui.say(s, t); ui.check(gen); },
    signal: async (s, x) => { ui.check(gen); await ui.signal(s, x); ui.check(gen); },
    update: () => { if (gen === ui.gen) ui.update(); },
  };
  const game = new Game([new Human(ui), new Bot(), partner, new Bot()], ev, settings.target);
  game.mano = Math.floor(Math.random() * 4);
  gen = ui.newSession(game);
  menu.inGame = true;
  menu.hide();

  try {
    while (game.winner === null) {
      const summary = await game.playHand();
      ui.check(gen);
      await ui.showSummary(summary, game.winner);
    }
  } catch (e) {
    if (e instanceof Abort) return;
    throw e;
  }
  menu.inGame = false;
  const again = await menu.gameOver(game, recordResult(game.winner === 0));
  if (again) startGame();
  else menu.show();
}

menu.show();
