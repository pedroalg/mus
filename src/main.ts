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
  // Los tres bots juegan al nivel elegido. Los rivales se pasan señas entre ellos (sin que las
  // veas) salvo en fácil; las de Iñaki dependen del ajuste «Señas del compañero».
  const bot = (senas: boolean) => {
    const b = new Bot();
    b.level = settings.nivel;
    b.senasOn = senas;
    return b;
  };
  const rivalSenas = settings.nivel !== 'facil';
  const partner = bot(settings.senas);

  // Los avisos de la partida pasan por aquí para que una partida abandonada se corte sola.
  let gen = 0;
  const ev: Events = {
    say: async (s, t) => { ui.check(gen); await ui.say(s, t); ui.check(gen); },
    signal: async (s, x) => { ui.check(gen); await ui.signal(s, x); ui.check(gen); },
    newHand: () => { if (gen === ui.gen) ui.newHand(); },
    lanceDone: async r => { ui.check(gen); await ui.lanceDone(r); ui.check(gen); },
    update: () => { if (gen === ui.gen) ui.update(); },
  };
  const game = new Game([new Human(ui), bot(rivalSenas), partner, bot(rivalSenas)], ev, settings.target);
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
  if (again) startGame();
  else menu.show();
}

menu.show();
