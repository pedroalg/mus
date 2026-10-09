import { type Card, rank } from './cards.ts';
import type { Agent, Bet, BetCtx, Lance, Reply, ReplyCtx, Sena } from './game.ts';
import type { Expr } from './avatars.ts';
import { pares, total, hasJuego } from './rules.ts';
import { outlook, strength, team, type Outlook, type TableInfo } from './ai.ts';

export type Level = 'facil' | 'normal' | 'dificil';

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export { strength };

/** Las señas clásicas: gesto, cara para el historial y lo que quieren decir. */
export const SENAS: Record<Exclude<Expr, 'neutral'>, Sena> = {
  wink: { face: '😉', gesture: 'te guiña un ojo', meaning: 'tiene 31', expr: 'wink' },
  brows: { face: '🤨', gesture: 'levanta las cejas', meaning: 'tiene duples', expr: 'brows' },
  smirk: { face: '😏', gesture: 'tuerce la boca', meaning: 'tiene medias', expr: 'smirk' },
  biteSide: { face: '😬', gesture: 'se muerde el labio de lado', meaning: 'tiene tres reyes', expr: 'biteSide' },
  bite: { face: '😬', gesture: 'se muerde el labio', meaning: 'tiene dos reyes', expr: 'bite' },
  tongueSide: { face: '😜', gesture: 'saca la lengua de lado', meaning: 'tiene tres ases', expr: 'tongueSide' },
  tongue: { face: '😛', gesture: 'saca la punta de la lengua', meaning: 'tiene dos ases', expr: 'tongue' },
  closed: { face: '😑', gesture: 'cierra los ojos', meaning: 'va ciego, no tiene nada', expr: 'closed' },
};

/** Todas las señas clásicas que encajan con la mano, de más a menos importante. */
export function senasFor(h: Card[]): Sena[] {
  const rs = h.map(rank);
  const reyes = rs.filter(r => r === 12).length;
  const ases = rs.filter(r => r === 1).length;
  const p = pares(h);
  const out: Sena[] = [];
  if (total(h) === 31) out.push(SENAS.wink);
  if (p.kind === 3) out.push(SENAS.brows);
  if (p.kind === 2) out.push(SENAS.smirk);
  if (reyes === 3) out.push(SENAS.biteSide);
  if (reyes === 2) out.push(SENAS.bite);
  if (ases === 3) out.push(SENAS.tongueSide);
  if (ases === 2) out.push(SENAS.tongue);
  if (out.length === 0 && p.kind === 0 && !hasJuego(h) && total(h) < 27) out.push(SENAS.closed);
  return out;
}

/** Señas que dicen «llevo buena mano»: con ellas el compañero corta el mus. */
const STRONG: Expr[] = ['wink', 'brows', 'smirk', 'biteSide'];

export class Bot implements Agent {
  senasOn = true;
  level: Level = 'normal';

  /** De vez en cuando: la seña más importante y, a veces, una segunda. */
  senas(h: Card[]): Sena[] {
    if (!this.senasOn) return [];
    const all = senasFor(h);
    if (all.length === 0 || Math.random() < 0.35) return [];
    return all.slice(0, Math.random() < 0.4 ? 2 : 1);
  }

  async mus(seat: number, h: Card[], info?: TableInfo): Promise<boolean> {
    const p = pares(h);
    const corta = total(h) === 31 || p.kind >= 2 || strength('grande', h) >= 0.8
      || (p.kind === 1 && p.key[0] >= 10 && hasJuego(h));
    if (corta) return false;
    if (this.level !== 'facil' && info) {
      // Si el compañero ha dicho que lleva buena mano, se corta para jugar con ella
      if (info.senasFor[seat].some(e => STRONG.includes(e))) return false;
    }
    return true;
  }

  async discard(_seat: number, h: Card[]): Promise<number[]> {
    const keep = new Set(pares(h).key);
    const idx = h.map((_, i) => i).filter(i => {
      const r = rank(h[i]);
      return r !== 12 && r !== 1 && !keep.has(r);
    });
    if (idx.length) return idx;
    // Hay que tirar al menos una: la menos útil.
    const i = h.findIndex(c => rank(c) !== 12 && !keep.has(rank(c)));
    const j = h.findIndex(c => rank(c) !== 12);
    return [i >= 0 ? i : j >= 0 ? j : 0];
  }

  /**
   * Qué espera la pareja del lance. Difícil lee a fondo los envites de los rivales; normal,
   * a medias y con algo de error de cálculo.
   */
  private look({ seat, hand, lance, info }: BetCtx): Outlook {
    const hard = this.level === 'dificil';
    const o = outlook(seat, hand, lance, info, hard ? 400 : 150, hard ? 0.85 : 0.7);
    if (!hard) o.p = clamp(o.p + (Math.random() - 0.5) * 0.12);
    return o;
  }

  /** Puntos que les faltan a mi pareja y a la rival para ganar la partida. */
  private need({ seat, info }: BetCtx): { mine: number; theirs: number } {
    const t = team(seat);
    return { mine: info.target - info.scores[t], theirs: info.target - info.scores[1 - t] };
  }

  async bet(ctx: BetCtx): Promise<Bet> {
    if (this.level === 'facil') return this.easyBet(ctx);
    const { p } = this.look(ctx);
    const need = this.need(ctx);
    const r = Math.random();
    if (this.level === 'dificil') {
      // Si los rivales están a punto de ganar, se arriesga todo con una mano decente
      if (need.theirs <= 5 && need.mine > 8 && p > 0.62) return { kind: 'ordago' };
      if (p > 0.92 && r < 0.15) return { kind: 'ordago' };
    } else if (p > 0.92 && r < 0.12) {
      return { kind: 'ordago' };
    }
    if (p > 0.62) {
      return { kind: 'envido', amount: p > 0.85 ? 5 : p > 0.75 ? 3 : 2 };
    }
    if (r < 0.05) return { kind: 'envido', amount: 2 }; // farol
    return { kind: 'paso' };
  }

  async reply(ctx: ReplyCtx): Promise<Reply> {
    if (this.level === 'facil') return this.easyReply(ctx);
    const { p, us, them } = this.look(ctx);
    const need = this.need(ctx);
    const r = Math.random();
    if (ctx.ordago) {
      let bar = 0.6;
      if (this.level === 'dificil') {
        if (need.theirs <= 5) bar = 0.42; // van a ganar igualmente: mejor jugársela
        if (need.mine <= 5) bar = 0.72; // vamos a ganar: no regalar la partida
      }
      return { kind: p >= bar ? 'quiero' : 'noquiero' };
    }
    if (p > 0.92 && r < (this.level === 'dificil' ? 0.2 : 0.1)) return { kind: 'ordago' };
    if (p > 0.78 && r < 0.5) return { kind: 'envido', amount: this.level === 'dificil' && p > 0.88 ? 4 : 2 };
    // Querer o no, según lo que se espera ganar o perder con cada opción. Al no querer, los
    // rivales cobran lo que había y, en pares y juego, también sus jugadas.
    const A = ctx.amount;
    const ifAccept = p * (A + us) - (1 - p) * (A + them);
    const ifDecline = -(ctx.prev + them);
    return { kind: ifAccept >= ifDecline ? 'quiero' : 'noquiero' };
  }

  // Nivel fácil: decide solo con sus cartas, como los primeros bots del juego
  private easyBet({ hand, lance }: BetCtx): Bet {
    const s = strength(lance, hand);
    const r = Math.random();
    if (s > 0.9 && r < 0.2) return { kind: 'ordago' };
    if (s > 0.6) return { kind: 'envido', amount: s > 0.8 ? 2 + Math.round((s - 0.8) * 25) : 2 };
    if (r < 0.08) return { kind: 'envido', amount: 2 }; // farol
    return { kind: 'paso' };
  }

  private easyReply({ hand, lance, amount, ordago }: ReplyCtx): Reply {
    const s = strength(lance, hand);
    const r = Math.random();
    if (ordago) return { kind: s > 0.82 ? 'quiero' : 'noquiero' };
    const need = 0.42 + Math.min(amount, 12) * 0.025;
    if (s > 0.92 && r < 0.12) return { kind: 'ordago' };
    if (s > need + 0.25 && r < 0.45) return { kind: 'envido', amount: 2 };
    return { kind: s >= need ? 'quiero' : 'noquiero' };
  }
}
