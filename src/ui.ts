import type { Card } from './cards.ts';
import type { Agent, Bet, BetCtx, Events, Game, Lance, LanceResult, Reply, ReplyCtx, Sena } from './game.ts';
import { LANCE_NAME, SEAT_NAME, TEAM_NAME } from './game.ts';
import { rank } from './cards.ts';
import { pares, total, hasJuego, juegoValue, PARES_NAME } from './rules.ts';
import { strength } from './bots.ts';
import { BOT_DELAY, type Settings } from './settings.ts';

// Baraja Heraclio Fournier de 1878 (dominio público, Wikimedia Commons), incrustada al compilar.
declare const __CARDS__: Record<string, string>;
const NAME: Record<number, string> = { 1: 'as', 10: 'sota', 11: 'caballo', 12: 'rey' };
// Con 8 reyes, los treses y los doses llevan una etiqueta con lo que valen.
const ALIAS: Record<number, string> = { 3: 'vale rey', 2: 'vale as' };
const SHORT: Record<number, string> = { 1: 'As', 4: '4', 5: '5', 6: '6', 7: '7', 10: 'S', 11: 'C', 12: 'R' };
const PLURAL: Record<number, string> = {
  1: 'ases', 4: 'cuatros', 5: 'cincos', 6: 'seises', 7: 'sietes', 10: 'sotas', 11: 'caballos', 12: 'reyes',
};

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function cardHtml(c: Card, i: number, sel: boolean, deal = ''): string {
  const alias = ALIAS[c.n];
  return `<div class="card${sel ? ' sel' : ''}"${deal} data-i="${i}">`
    + `<img src="${__CARDS__[`${c.suit}-${c.n}`]}" alt="${NAME[c.n] ?? c.n} de ${c.suit}" draggable="false">`
    + (alias ? `<span class="alias">${alias}</span>` : '')
    + '</div>';
}

const BACK = (deal = '') => `<div class="card back"${deal}><img src="${__CARDS__.back}" alt="" draggable="false"></div>`;

function describe(h: Card[]): string {
  const p = pares(h);
  return `${total(h)}` + (p.kind ? ` · ${PARES_NAME[p.kind]}` : '');
}

function grade(s: number): string {
  return s >= 0.7 ? '<i class="g g3">buena</i>' : s >= 0.45 ? '<i class="g g2">regular</i>' : '<i class="g g1">floja</i>';
}

/** Chuleta con lo que llevas en cada lance, para quien no se acuerda de las reglas. */
function valuesHtml(h: Card[]): string {
  const rs = h.map(rank);
  const down = [...rs].sort((a, b) => b - a).map(r => SHORT[r]).join(' ');
  const up = [...rs].sort((a, b) => a - b).map(r => SHORT[r]).join(' ');
  const p = pares(h);
  const t = total(h);
  let paresText: string;
  if (p.kind === 0) paresText = 'Sin pares';
  else if (p.kind === 1) paresText = `Pareja de ${PLURAL[p.key[0]]} · 1 pt`;
  else if (p.kind === 2) paresText = `Medias de ${PLURAL[p.key[0]]} · 2 pts`;
  else if (p.key[0] === p.key[1]) paresText = `Duples de ${PLURAL[p.key[0]]} · 3 pts`;
  else paresText = `Duples ${PLURAL[p.key[0]]} y ${PLURAL[p.key[1]]} · 3 pts`;
  const juegoText = hasJuego(h)
    ? `${t}${t === 31 ? ', la mejor' : ''} · ${juegoValue(h)} pts`
    : `Sin juego · punto ${t}`;
  const cell = (label: string, text: string, g: string) =>
    `<div class="v"><span class="vl">${label}</span><span class="vt">${text}</span>${g}</div>`;
  return cell('Grande', down, grade(strength('grande', h)))
    + cell('Chica', up, grade(strength('chica', h)))
    + cell('Pares', paresText, p.kind ? grade(strength('pares', h)) : '<i class="g g0">—</i>')
    + cell(hasJuego(h) ? 'Juego' : 'Punto', juegoText, grade(strength(hasJuego(h) ? 'juego' : 'punto', h)));
}

function statusHtml(r: LanceResult | undefined): string {
  if (!r) return '<span class="st muted">—</span>';
  const chip = (t: number, text: string) => `<span class="st t${t}">${text}</span>`;
  switch (r.state) {
    case 'hablando': return '<span class="st muted">hablando…</span>';
    case 'paso': return '<span class="st muted">en paso</span>';
    case 'nadie': return '<span class="st muted">nadie tiene</span>';
    case 'solo': return chip(r.winner!, `solo ${TEAM_NAME[r.winner!].toLowerCase()}`);
    case 'envite': return chip(r.winner!, `${r.amount} envidado`);
    case 'querido': return '<span class="st on">' + `${r.amount} querido</span>`;
    case 'noquerido': return chip(r.winner!, `no quiero · +${r.amount}`);
    case 'ordago': return r.winner === undefined ? '<span class="st on">órdago querido</span>' : chip(r.winner, 'órdago');
  }
}

interface Option<T> { label: string; value: T; kind?: 'primary' | 'danger' }

/** Se lanza dentro de una partida abandonada para que deje de jugar. */
export class Abort extends Error {}

const DEAL_MS = 380;

export class Ui implements Events {
  game!: Game;
  private selecting = false;
  private selected = new Set<number>();
  private onSelect: (() => void) | null = null;
  private timers: number[] = [];
  /** Partida actual: al empezar otra, la anterior se corta. */
  gen = 0;
  private rejectPending: ((e: Error) => void) | null = null;
  private paused: Promise<void> | null = null;
  private resume: (() => void) | null = null;
  private botDelay = BOT_DELAY.normal;
  /** Momento en que empieza a repartirse cada carta, para animarla una sola vez. */
  private dealtAt = new Map<string, number>();
  private shownScores = [0, 0];

  constructor() {
    $('.seat-0 .hand').addEventListener('click', e => {
      const el = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
      if (!this.selecting || !el) return;
      const i = Number(el.dataset.i);
      if (this.selected.has(i)) this.selected.delete(i); else this.selected.add(i);
      this.update();
      this.onSelect?.();
    });
  }

  /** Empieza una partida nueva y corta la anterior si seguía en marcha. */
  newSession(game: Game): number {
    this.gen++;
    this.rejectPending?.(new Abort());
    this.rejectPending = null;
    this.selecting = false;
    this.selected.clear();
    this.onSelect = null;
    this.unpause();
    this.game = game;
    this.dealtAt.clear();
    this.shownScores = [0, 0];
    $('#actions').innerHTML = '';
    $('#summary').hidden = true;
    $('#log').hidden = false;
    this.clearLog();
    for (const b of document.querySelectorAll<HTMLElement>('.bubble')) b.hidden = true;
    this.update();
    return this.gen;
  }

  check(gen: number) {
    if (gen !== this.gen) throw new Abort();
  }

  pause() {
    if (!this.paused) this.paused = new Promise(r => { this.resume = r; });
  }

  unpause() {
    this.resume?.();
    this.paused = null;
    this.resume = null;
  }

  applySettings(s: Settings) {
    this.botDelay = BOT_DELAY[s.speed];
    document.body.classList.toggle('no-ayuda', !s.ayuda);
  }

  private async wait(ms: number) {
    await sleep(ms);
    while (this.paused) await this.paused;
  }

  async signal(seat: number, sena: Sena) {
    const b = $(`.seat-${seat} .bubble`);
    b.innerHTML = `<span class="face">${sena.face}</span> ${sena.gesture.replace(/^te /, '')}`;
    b.classList.add('sena');
    b.hidden = false;
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    clearTimeout(this.timers[seat]);
    this.timers[seat] = window.setTimeout(() => { b.hidden = true; b.classList.remove('sena'); }, 2600);
    this.log(`<b>${SEAT_NAME[seat]}</b> ${sena.gesture} <em>(${sena.meaning})</em>`);
    this.update();
    await this.wait(Math.max(1400, this.botDelay * 1.8));
  }

  async say(seat: number, text: string) {
    $(`.seat-${seat} .bubble`).classList.remove('sena');
    const b = $(`.seat-${seat} .bubble`);
    b.textContent = text;
    b.hidden = false;
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    clearTimeout(this.timers[seat]);
    this.timers[seat] = window.setTimeout(() => { b.hidden = true; }, 2200);
    this.log(`<b>${SEAT_NAME[seat]}</b> ${text}`);
    this.update();
    await this.wait(seat === 0 ? 300 : this.botDelay);
  }

  log(html: string) {
    const ol = $('#log');
    const li = document.createElement('li');
    li.innerHTML = html;
    ol.prepend(li);
    while (ol.children.length > 40) ol.lastElementChild!.remove();
  }

  clearLog() {
    $('#log').innerHTML = '';
  }

  update() {
    const g = this.game;
    const senas = $('#senas');
    senas.hidden = g.senas.length === 0;
    senas.innerHTML = '<span class="sl">Señas de tu compañero</span>' + g.senas
      .map(x => `<span class="sx"><span class="face">${x.face}</span> ${x.gesture}: <b>${x.meaning}</b></span>`)
      .join('');
    for (const t of [0, 1]) {
      const el = $(`#s${t}`);
      el.textContent = String(g.scores[t]);
      if (g.scores[t] !== this.shownScores[t]) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
        this.shownScores[t] = g.scores[t];
      }
    }
    const now = performance.now();
    $('#target').textContent = `a ${g.target}`;
    $('#phase').innerHTML = `${g.phase}<small>Mano: <b>${SEAT_NAME[g.mano]}</b></small>`;

    for (let s = 0; s < 4; s++) {
      const el = $(`.seat-${s}`);
      el.classList.toggle('is-mano', s === g.mano);
      el.classList.toggle('is-turn', s === g.turn);
      el.querySelector('.name')!.innerHTML = (s === g.mano ? '<span class="mano" title="Es mano: habla primero y gana los empates">Mano</span>' : '')
        + `<span>${SEAT_NAME[s]}</span>`;
      const faceUp = s === 0 || g.reveal;
      const hand = el.querySelector('.hand') as HTMLElement;
      hand.classList.toggle('picking', s === 0 && this.selecting);
      hand.innerHTML = g.hands[s]
        .map((c, i) => {
          const deal = this.dealAttr(`${c.suit}-${c.n}`, now, s, i);
          return faceUp ? cardHtml(c, i, s === 0 && this.selected.has(i), deal) : BACK(deal);
        })
        .join('');
      const info = el.querySelector('.info')!;
      if (s === 0) info.innerHTML = g.hands[0].length ? valuesHtml(g.hands[0]) : '';
      else info.textContent = faceUp && g.hands[s].length ? describe(g.hands[s]) : '';
    }

    const last: Lance = g.results.some(r => r.lance === 'punto') ? 'punto' : 'juego';
    $('#lances').innerHTML = (['grande', 'chica', 'pares', last] as Lance[])
      .map(l => {
        const r = g.results.find(x => x.lance === l);
        const label = l === 'juego' ? 'Juego / Punto' : LANCE_NAME[l];
        return `<li class="${g.current === l ? 'now' : ''}"><span class="ln">${label}</span>${statusHtml(r)}</li>`;
      })
      .join('');
  }

  /** Las cartas nuevas entran repartidas; si se repinta a mitad, la animación sigue donde iba. */
  private dealAttr(key: string, now: number, seat: number, i: number): string {
    let start = this.dealtAt.get(key);
    if (start === undefined) {
      start = now + (i * 4 + seat) * 45;
      this.dealtAt.set(key, start);
    }
    if (now - start >= DEAL_MS) return '';
    return ` style="animation-delay:${Math.round(start - now)}ms" data-deal`;
  }

  choose<T>(prompt: string, opts: Option<T>[]): Promise<T> {
    return new Promise((resolve, reject) => {
      this.rejectPending = reject;
      const bar = $('#actions');
      bar.innerHTML = prompt ? `<p class="prompt">${prompt}</p>` : '';
      for (const o of opts) {
        const b = document.createElement('button');
        b.textContent = o.label;
        if (o.kind) b.className = o.kind;
        b.onclick = () => {
          this.rejectPending = null;
          bar.innerHTML = '';
          resolve(o.value);
        };
        bar.append(b);
      }
    });
  }

  pickDiscards(): Promise<number[]> {
    this.selecting = true;
    this.selected.clear();
    this.update();
    return new Promise((resolve, reject) => {
      this.rejectPending = reject;
      const bar = $('#actions');
      const draw = () => {
        const n = this.selected.size;
        bar.innerHTML = '<p class="prompt">Toca las cartas que quieres cambiar</p>';
        const b = document.createElement('button');
        b.className = 'primary';
        b.textContent = n ? `Descartar ${n}` : 'Descartar';
        b.disabled = n === 0;
        b.onclick = () => {
          const idx = [...this.selected];
          this.rejectPending = null;
          this.selecting = false;
          this.selected.clear();
          this.onSelect = null;
          bar.innerHTML = '';
          this.update();
          resolve(idx);
        };
        bar.append(b);
      };
      this.onSelect = draw;
      draw();
    });
  }

  async showSummary(lines: string[], winner: number | null) {
    const el = $('#summary');
    const title = winner === null ? 'Fin de la mano' : winner === 0 ? '¡Ganáis la partida!' : 'Ganan ellos la partida';
    el.innerHTML = `<h2>${title}</h2><ul>${(lines.length ? lines : ['Nada que contar']).map(l => `<li>${l}</li>`).join('')}</ul>`;
    el.hidden = false;
    $('#log').hidden = true;
    await this.choose('', [{ label: winner === null ? 'Siguiente mano' : 'Ver resultado', value: 0, kind: 'primary' }]);
    el.hidden = true;
    $('#log').hidden = false;
  }
}

export class Human implements Agent {
  private ui: Ui;

  constructor(ui: Ui) {
    this.ui = ui;
  }

  mus() {
    return this.ui.choose('¿Pides mus?', [
      { label: 'Mus', value: true, kind: 'primary' },
      { label: 'No hay mus', value: false },
    ]);
  }

  discard() {
    return this.ui.pickDiscards();
  }

  bet({ lance }: BetCtx) {
    return this.ui.choose<Bet>(`${LANCE_NAME[lance]}: te toca hablar`, [
      { label: 'Paso', value: { kind: 'paso' } },
      { label: 'Envido', value: { kind: 'envido', amount: 2 }, kind: 'primary' },
      { label: 'Envido 5', value: { kind: 'envido', amount: 5 } },
      { label: 'Órdago', value: { kind: 'ordago' }, kind: 'danger' },
    ]);
  }

  reply({ lance, amount, ordago }: ReplyCtx) {
    const name = LANCE_NAME[lance].toLowerCase();
    const opts: Option<Reply>[] = [
      { label: 'Quiero', value: { kind: 'quiero' }, kind: 'primary' },
      { label: 'No quiero', value: { kind: 'noquiero' } },
    ];
    if (!ordago) {
      opts.push({ label: '2 más', value: { kind: 'envido', amount: 2 } });
      opts.push({ label: 'Órdago', value: { kind: 'ordago' }, kind: 'danger' });
    }
    return this.ui.choose(ordago ? `¡Órdago a ${name}!` : `Os envidan ${amount} a ${name}`, opts);
  }
}
