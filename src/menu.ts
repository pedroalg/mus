import type { Game } from './game.ts';
import { loadSettings, loadStats, resetStats, saveSettings, type Settings, type Stats } from './settings.ts';
import type { Ui } from './ui.ts';
import { cardSvg } from './cardArt.ts';

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const SCREENS = ['#menu', '#rules', '#settings', '#gameover'];

function recordText(s: Stats): string {
  if (s.won + s.lost === 0) return 'Aún no has jugado ninguna partida';
  return `Ganadas <b>${s.won}</b> · Perdidas <b>${s.lost}</b>`;
}

/** Pantallas fuera de la mesa: menú de inicio, reglas, ajustes y final de partida. */
export class Menu {
  private ui: Ui;
  /** Hay una partida empezada a la que se puede volver. */
  inGame = false;
  private onNew: () => void;
  private gameOverChoice: ((again: boolean) => void) | null = null;

  constructor(ui: Ui, onNew: () => void) {
    this.ui = ui;
    this.onNew = onNew;

    // Abanico con los cuatro reyes
    $('#fan').innerHTML = (['oros', 'copas', 'espadas', 'bastos'] as const)
      .map((suit, i) => `<div class="card" style="--r:${-21 + i * 14}deg;--d:${120 + i * 90}ms">${cardSvg({ n: 12, suit })}</div>`)
      .join('');

    $('#m-new').onclick = () => this.onNew();
    $('#m-continue').onclick = () => this.resume();
    $('#m-rules').onclick = () => this.open('#rules');
    $('#m-settings').onclick = () => this.open('#settings');
    $('#open-menu').onclick = () => this.show();
    for (const b of document.querySelectorAll<HTMLElement>('.back')) b.onclick = () => this.open('#menu');
    $('#go-again').onclick = () => this.gameOverChoice?.(true);
    $('#go-menu').onclick = () => this.gameOverChoice?.(false);

    // Borrar el marcador pide un segundo toque
    const reset = $('#reset-stats') as HTMLButtonElement;
    reset.onclick = () => {
      if (!reset.classList.contains('armed')) {
        reset.classList.add('armed');
        reset.textContent = '¿Seguro? Toca otra vez';
        setTimeout(() => {
          reset.classList.remove('armed');
          reset.textContent = 'Borrar marcador de partidas';
        }, 3000);
        return;
      }
      resetStats();
      reset.classList.remove('armed');
      reset.textContent = 'Marcador borrado';
    };

    const form = $('#settings-form') as HTMLFormElement;
    this.fillSettings(form, loadSettings());
    form.onchange = () => {
      const s = this.readSettings(form);
      saveSettings(s);
      this.ui.applySettings(s);
    };
  }

  private open(id: string) {
    for (const s of SCREENS) $(s).hidden = s !== id;
    if (id === '#settings') $('#reset-stats').textContent = 'Borrar marcador de partidas';
    $(id).scrollTop = 0;
  }

  /** Abre el menú; si hay partida en marcha, la deja en pausa. */
  show() {
    if (this.inGame) this.ui.pause();
    const cont = $('#m-continue');
    cont.hidden = !this.inGame;
    $('#m-new').className = this.inGame ? '' : 'primary';
    $('#record').innerHTML = recordText(loadStats());
    this.open('#menu');
  }

  hide() {
    for (const s of SCREENS) $(s).hidden = true;
  }

  private resume() {
    this.hide();
    this.ui.unpause();
  }

  /** Pantalla final. Devuelve true si quiere la revancha. */
  gameOver(game: Game, stats: Stats): Promise<boolean> {
    const won = game.winner === 0;
    $('#go-title').textContent = won ? '¡Victoria!' : 'Derrota';
    $('#go-title').className = won ? 'won' : 'lost';
    // El motivo explica marcadores raros, como perder 6–2 por un órdago
    $('#go-sub').textContent = game.endReason || (won ? 'Iñaki y tú os lleváis la partida' : 'Esta vez se la llevan ellos');
    $('#go-us').textContent = String(game.scores[0]);
    $('#go-them').textContent = String(game.scores[1]);
    $('#go-record').innerHTML = recordText(stats);
    this.open('#gameover');
    return new Promise(resolve => {
      this.gameOverChoice = again => {
        this.gameOverChoice = null;
        resolve(again);
      };
    });
  }

  private fillSettings(form: HTMLFormElement, s: Settings) {
    const set = (name: string, value: string) => {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    };
    set('target', String(s.target));
    set('speed', s.speed);
    set('senas', s.senas ? 'si' : 'no');
    set('ayuda', s.ayuda ? 'si' : 'no');
    set('nivel', s.nivel);
  }

  private readSettings(form: HTMLFormElement): Settings {
    const get = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!.value;
    return {
      target: Number(get('target')),
      speed: get('speed') as Settings['speed'],
      senas: get('senas') === 'si',
      ayuda: get('ayuda') === 'si',
      nivel: get('nivel') as Settings['nivel'],
    };
  }
}
