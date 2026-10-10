import type { Game } from './game.ts';
import { loadCast, loadSettings, loadStats, resetStats, saveSettings, type Settings, type Stats } from './settings.ts';
import { CHARACTERS, TABLES, type Cast, type CharacterId } from './characters.ts';
import { avatarSvg } from './avatars.ts';
import type { Ui } from './ui.ts';
import { cardSvg } from './cardArt.ts';
import { SEAT_NAME } from './game.ts';

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const SCREENS = ['#menu', '#mesa', '#rules', '#settings', '#gameover'];
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const ROWS: { key: keyof Cast; label: string }[] = [
  { key: 'partner', label: 'Tu compañero' },
  { key: 'left', label: 'Rival a tu izquierda' },
  { key: 'right', label: 'Rival a tu derecha' },
];

function recordText(s: Stats): string {
  if (s.won + s.lost === 0) return 'Aún no has jugado ninguna partida';
  return `Ganadas <b>${s.won}</b> · Perdidas <b>${s.lost}</b>`;
}

/** Pantallas fuera de la mesa: menú de inicio, reglas, ajustes y final de partida. */
export class Menu {
  private ui: Ui;
  /** Hay una partida empezada a la que se puede volver. */
  inGame = false;
  private onNew: (cast: Cast) => void;
  /** Reparto que se está preparando en «A tu gusto». */
  private cast: Cast = loadCast();
  private gameOverChoice: ((again: boolean) => void) | null = null;

  constructor(ui: Ui, onNew: (cast: Cast) => void) {
    this.ui = ui;
    this.onNew = onNew;

    // Abanico con los cuatro reyes
    $('#fan').innerHTML = (['oros', 'copas', 'espadas', 'bastos'] as const)
      .map((suit, i) => `<div class="card" style="--r:${-21 + i * 14}deg;--d:${120 + i * 90}ms">${cardSvg({ n: 12, suit })}</div>`)
      .join('');

    $('#m-new').onclick = () => this.openMesa();
    $('#mesa-list').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('[data-table]') as HTMLElement | null;
      const t = TABLES.find(x => x.id === b?.dataset.table);
      if (t) this.onNew({ partner: 'inaki', left: t.left, right: t.right });
    });
    $('#cast-pick').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('[data-pick]') as HTMLButtonElement | null;
      if (!b || b.disabled) return;
      this.cast = { ...this.cast, [b.dataset.seat as keyof Cast]: b.dataset.pick as CharacterId };
      this.renderPick();
    });
    $('#cast-random').onclick = () => {
      const ids = (Object.keys(CHARACTERS) as CharacterId[]).sort(() => Math.random() - 0.5);
      this.cast = { partner: ids[0], left: ids[1], right: ids[2] };
      this.renderPick();
    };
    $('#cast-play').onclick = () => this.onNew(this.cast);
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

  /** Pantalla «Elige mesa»: mesas preparadas y reparto a tu gusto. */
  private openMesa() {
    $('#mesa-list').innerHTML = TABLES.map(t => {
      const l = CHARACTERS[t.left];
      const r = CHARACTERS[t.right];
      return `<button class="mesa-card" data-table="${t.id}">`
        + `<span class="mc-faces"><span class="mc-av">${avatarSvg(l.id, 'neutral', 'them')}</span><span class="mc-av">${avatarSvg(r.id, 'neutral', 'them')}</span></span>`
        + `<span class="mc-text"><b>${t.name}</b><span>${t.desc}</span>`
        + `<span class="mc-who">${l.name} ${stars(l.stars)} · ${r.name} ${stars(r.stars)}</span></span></button>`;
    }).join('');
    this.renderPick();
    this.open('#mesa');
  }

  private renderPick() {
    const ids = Object.keys(CHARACTERS) as CharacterId[];
    $('#cast-pick').innerHTML = ROWS.map(({ key, label }) => {
      const chosen = CHARACTERS[this.cast[key]];
      const taken = new Set(ROWS.filter(r => r.key !== key).map(r => this.cast[r.key]));
      const chips = ids.map(id => `<button class="char-chip${id === chosen.id ? ' on' : ''}" data-seat="${key}" data-pick="${id}"`
        + `${taken.has(id) ? ' disabled' : ''} aria-label="${CHARACTERS[id].name}">`
        + `<span class="cc-av">${avatarSvg(id, 'neutral', key === 'partner' ? 'us' : 'them')}</span><span>${CHARACTERS[id].name}</span></button>`).join('');
      return `<div class="pick-row"><h4>${label}</h4><div class="chips">${chips}</div>`
        + `<p class="ficha"><b>${chosen.name}</b> · ${chosen.style} · <span class="st">${stars(chosen.stars)}</span><br>${chosen.blurb}</p></div>`;
    }).join('');
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
    $('#go-sub').textContent = game.endReason || (won ? `${SEAT_NAME[2]} y tú os lleváis la partida` : 'Esta vez se la llevan ellos');
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
  }

  private readSettings(form: HTMLFormElement): Settings {
    const get = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!.value;
    return {
      target: Number(get('target')),
      speed: get('speed') as Settings['speed'],
      senas: get('senas') === 'si',
      ayuda: get('ayuda') === 'si',
    };
  }
}
