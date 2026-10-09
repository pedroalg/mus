import { type Card, newDeck, shuffle } from './cards.ts';
import * as R from './rules.ts';

export type Lance = 'grande' | 'chica' | 'pares' | 'juego' | 'punto';
export const LANCE_NAME: Record<Lance, string> = {
  grande: 'Grande', chica: 'Chica', pares: 'Pares', juego: 'Juego', punto: 'Punto',
};
// Asientos en orden de juego (hacia la derecha): 0 tú, 1 derecha, 2 compañero, 3 izquierda.
export const SEAT_NAME = ['Tú', 'Derecha', 'Compañero', 'Izquierda'];
export const TEAM_NAME = ['Nosotros', 'Ellos'];
export const team = (seat: number) => seat % 2;

export type Bet = { kind: 'paso' } | { kind: 'envido'; amount: number } | { kind: 'ordago' };
export type Reply = { kind: 'quiero' } | { kind: 'noquiero' } | { kind: 'envido'; amount: number } | { kind: 'ordago' };

export interface BetCtx { seat: number; hand: Card[]; lance: Lance; scores: number[] }
export interface ReplyCtx extends BetCtx { amount: number; ordago: boolean }

export interface Agent {
  mus(seat: number, hand: Card[]): Promise<boolean>;
  discard(seat: number, hand: Card[]): Promise<number[]>;
  bet(ctx: BetCtx): Promise<Bet>;
  reply(ctx: ReplyCtx): Promise<Reply>;
  /** Señas que hace a su compañero tras cortar el mus (puede no hacer ninguna). */
  senas?(hand: Card[]): Sena[];
}

/** Una seña: el gesto que se ve en la mesa y lo que quiere decir. */
export interface Sena { face: string; gesture: string; meaning: string }

export interface Events {
  say(seat: number, text: string): Promise<void>;
  signal?(seat: number, sena: Sena): Promise<void>;
  /** Se acaban de repartir las cartas de una mano nueva. */
  newHand?(): void;
  update(): void;
}

export interface LanceResult {
  lance: Lance;
  players: number[];
  state: 'hablando' | 'paso' | 'envite' | 'querido' | 'noquerido' | 'ordago' | 'solo' | 'nadie';
  amount: number;
  /** Equipo que lleva la iniciativa (envite) o que se lo lleva (no querido, solo). */
  winner?: number;
}

class GameOver extends Error {}

export class Game {
  scores = [0, 0];
  mano = 0;
  hands: Card[][] = [[], [], [], []];
  results: LanceResult[] = [];
  current: Lance | null = null;
  phase = '';
  reveal = false;
  winner: number | null = null;
  /** Señas que te ha hecho tu compañero en esta mano. */
  senas: Sena[] = [];
  /** Asiento al que le toca hablar ahora mismo. */
  turn: number | null = null;
  private handsPlayed = 0;
  private deck: Card[] = [];
  private discards: Card[] = [];

  private agents: Agent[];
  private ev: Events;
  target: number;

  constructor(agents: Agent[], ev: Events, target = 40) {
    this.agents = agents;
    this.ev = ev;
    this.target = target;
  }

  private ask<T>(seat: number, f: (a: Agent) => Promise<T>): Promise<T> {
    this.turn = seat;
    this.ev.update();
    return f(this.agents[seat]);
  }

  order(): number[] {
    return [0, 1, 2, 3].map(i => (this.mano + i) % 4);
  }

  private draw(): Card {
    if (this.deck.length === 0) {
      this.deck = shuffle(this.discards);
      this.discards = [];
    }
    return this.deck.pop()!;
  }

  /** Juega una mano completa y devuelve las líneas del recuento. */
  async playHand(): Promise<string[]> {
    if (this.handsPlayed++ > 0) this.mano = (this.mano + 1) % 4;
    this.deck = shuffle(newDeck());
    this.discards = [];
    this.results = [];
    this.senas = [];
    this.reveal = false;
    this.hands = [0, 1, 2, 3].map(() => [this.draw(), this.draw(), this.draw(), this.draw()]);
    this.ev.newHand?.();
    this.ev.update();
    const summary: string[] = [];
    try {
      await this.musPhase();
      await this.partnerSenas();
      await this.playLance('grande', this.order());
      await this.playLance('chica', this.order());
      await this.declareAndPlay();
      this.current = null;
      this.phase = 'Recuento';
      this.reveal = true;
      this.score(summary);
    } catch (e) {
      if (!(e instanceof GameOver)) throw e;
      summary.push(e.message);
    }
    this.current = null;
    this.turn = null;
    this.reveal = true;
    this.ev.update();
    return summary;
  }

  private async musPhase() {
    for (;;) {
      this.phase = 'Mus';
      this.ev.update();
      for (const s of this.order()) {
        const mus = await this.ask(s, a => a.mus(s, this.hands[s]));
        await this.ev.say(s, mus ? 'Mus' : 'No hay mus');
        if (!mus) return;
      }
      this.phase = 'Descartes';
      for (const s of this.order()) {
        const idx = await this.ask(s, a => a.discard(s, this.hands[s]));
        for (const i of idx) {
          this.discards.push(this.hands[s][i]);
          this.hands[s][i] = this.draw();
        }
        await this.ev.say(s, `Me descarto de ${idx.length}`);
      }
    }
  }

  /** Tu compañero (asiento 2) te pasa señas con las cartas ya definitivas. */
  private async partnerSenas() {
    const partner = 2;
    for (const sena of this.agents[partner].senas?.(this.hands[partner]) ?? []) {
      this.senas.push(sena);
      await this.ev.signal?.(partner, sena);
    }
  }

  private async declareAndPlay() {
    this.phase = 'Pares';
    this.current = 'pares';
    const conPares: number[] = [];
    for (const s of this.order()) {
      const tiene = R.pares(this.hands[s]).kind > 0;
      await this.ev.say(s, tiene ? 'Pares sí' : 'Pares no');
      if (tiene) conPares.push(s);
    }
    await this.playLance('pares', conPares);

    this.phase = 'Juego';
    this.current = 'juego';
    const conJuego: number[] = [];
    for (const s of this.order()) {
      const tiene = R.hasJuego(this.hands[s]);
      await this.ev.say(s, tiene ? 'Juego sí' : 'Juego no');
      if (tiene) conJuego.push(s);
    }
    if (conJuego.length) await this.playLance('juego', conJuego);
    else await this.playLance('punto', this.order());
  }

  private ctx(seat: number, lance: Lance): BetCtx {
    return { seat, hand: this.hands[seat], lance, scores: [...this.scores] };
  }

  private async playLance(lance: Lance, players: number[]) {
    this.current = lance;
    this.phase = LANCE_NAME[lance];
    const res: LanceResult = { lance, players, state: 'hablando', amount: 0 };
    this.results.push(res);
    const teams = new Set(players.map(team));
    if (players.length === 0) {
      res.state = 'nadie';
    } else if (teams.size === 1) {
      res.state = 'solo';
      res.winner = team(players[0]);
    } else {
      this.ev.update();
      for (const s of players) {
        const b = await this.ask(s, a => a.bet(this.ctx(s, lance)));
        await this.ev.say(s, betText(b));
        if (b.kind !== 'paso') {
          await this.envite(res, team(s), b);
          return;
        }
      }
      res.state = 'paso';
    }
    this.ev.update();
  }

  /** Quien responde por un equipo: tú si te toca hablar, si no el primero de la pareja. */
  private responder(players: number[], t: number): number {
    if (team(0) === t && players.includes(0)) return 0;
    return players.find(s => team(s) === t)!;
  }

  private async envite(res: LanceResult, bettor: number, first: Bet) {
    let amount = first.kind === 'envido' ? first.amount : 0;
    let ordago = first.kind === 'ordago';
    let prev = 1; // lo que se lleva quien envida si no se le quiere
    let attacker = bettor;
    for (;;) {
      res.state = 'envite';
      res.amount = amount;
      res.winner = attacker;
      if (ordago) res.state = 'ordago';
      this.ev.update();
      const s = this.responder(res.players, 1 - attacker);
      const r = await this.ask(s, a => a.reply({ ...this.ctx(s, res.lance), amount, ordago }));
      await this.ev.say(s, replyText(r));
      if (r.kind === 'quiero') break;
      if (r.kind === 'noquiero') {
        res.state = 'noquerido';
        res.amount = prev;
        this.ev.update();
        this.award(attacker, prev);
        return;
      }
      prev = amount;
      if (r.kind === 'ordago') ordago = true;
      else amount += r.amount;
      attacker = 1 - attacker;
    }
    res.winner = undefined;
    res.state = ordago ? 'ordago' : 'querido';
    this.ev.update();
    if (ordago) {
      this.reveal = true;
      const w = team(this.lanceWinner(res.lance, res.players));
      this.endGame(w, `Órdago a ${LANCE_NAME[res.lance].toLowerCase()} querido: gana ${TEAM_NAME[w].toLowerCase()}.`);
    }
  }

  lanceWinner(lance: Lance, players: number[]): number {
    const cmp = { grande: R.cmpGrande, chica: R.cmpChica, pares: R.cmpPares, juego: R.cmpJuego, punto: R.cmpPunto }[lance];
    let best = players[0];
    for (const s of players.slice(1)) if (cmp(this.hands[s], this.hands[best]) > 0) best = s;
    return best;
  }

  private award(t: number, pts: number) {
    this.scores[t] += pts;
    this.ev.update();
    if (this.scores[t] >= this.target) this.endGame(t, `${TEAM_NAME[t]} llegan a ${this.target}.`);
  }

  private endGame(t: number, msg: string): never {
    this.winner = t;
    throw new GameOver(msg);
  }

  private score(summary: string[]) {
    for (const res of this.results) {
      if (res.state === 'nadie' || res.state === 'noquerido' && (res.lance === 'grande' || res.lance === 'chica' || res.lance === 'punto')) continue;
      const w = res.state === 'noquerido' || res.state === 'solo'
        ? res.winner!
        : team(this.lanceWinner(res.lance, res.players));
      let pts = 0;
      const parts: string[] = [];
      if (res.state === 'paso' && res.lance !== 'pares' && res.lance !== 'juego') {
        pts += 1;
        parts.push('en paso');
      }
      if (res.state === 'querido') {
        pts += res.amount;
        parts.push(`${res.amount} de envite`);
      }
      for (const s of res.players) {
        if (team(s) !== w) continue;
        if (res.lance === 'pares') {
          const p = R.pares(this.hands[s]);
          pts += p.kind;
          parts.push(`${R.PARES_NAME[p.kind]} de ${SEAT_NAME[s].toLowerCase()}`);
        }
        if (res.lance === 'juego') {
          pts += R.juegoValue(this.hands[s]);
          parts.push(`${R.total(this.hands[s])} de ${SEAT_NAME[s].toLowerCase()}`);
        }
      }
      if (pts > 0) {
        summary.push(`${LANCE_NAME[res.lance]}: +${pts} ${TEAM_NAME[w].toLowerCase()} (${parts.join(', ')})`);
        this.award(w, pts);
      }
    }
  }
}

export function betText(b: Bet): string {
  if (b.kind === 'paso') return 'Paso';
  if (b.kind === 'ordago') return '¡Órdago!';
  return b.amount === 2 ? 'Envido' : `Envido ${b.amount}`;
}

export function replyText(r: Reply): string {
  if (r.kind === 'quiero') return 'Quiero';
  if (r.kind === 'noquiero') return 'No quiero';
  if (r.kind === 'ordago') return '¡Órdago!';
  return `${r.amount} más`;
}
