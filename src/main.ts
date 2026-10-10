import { type Events, Game } from './game.ts';
import { Bot } from './bots.ts';
import { Abort, Human, Ui } from './ui.ts';
import { Menu } from './menu.ts';
import { loadSettings, recordResult, saveCast } from './settings.ts';
import { applyCast, SEAT_CHAR, type Cast } from './characters.ts';

const ui = new Ui();
const menu = new Menu(ui, cast => { startGame(cast); });
ui.applySettings(loadSettings());

async function startGame(cast: Cast) {
  saveCast(cast);
  applyCast(cast);
  ui.applyCast();
  const settings = loadSettings();
  ui.applySettings(settings);
  // Cada bot juega según su personaje; las señas de tu compañero dependen del ajuste
  const [right, partner, left] = [1, 2, 3].map(s => new Bot(SEAT_CHAR[s]!.traits));
  partner.senasOn = settings.senas;

  // Los avisos de la partida pasan por aquí para que una partida abandonada se corte sola.
  let gen = 0;
  const ev: Events = {
    say: async (s, t) => { ui.check(gen); await ui.say(s, t); ui.check(gen); },
    signal: async (s, x) => { ui.check(gen); await ui.signal(s, x); ui.check(gen); },
    newHand: () => { if (gen === ui.gen) ui.newHand(); },
    lanceDone: async r => { ui.check(gen); await ui.lanceDone(r); ui.check(gen); },
    update: () => { if (gen === ui.gen) ui.update(); },
  };
  const game = new Game([new Human(ui), right, partner, left], ev, settings.target);
  game.mano = Math.floor(Math.random() * 4);
  gen = ui.newSession(game);
  menu.inGame = true;
  menu.hide();

  try {
    while (game.winner === null) {
      const result = await game.playHand();
      ui.check(gen);
      await ui.showSummary(result, game.winner);
    }
  } catch (e) {
    if (e instanceof Abort) return;
    throw e;
  }
  menu.inGame = false;
  const again = await menu.gameOver(game, recordResult(game.winner === 0));
  if (again) startGame(cast);
  else menu.show();
}

menu.show();
