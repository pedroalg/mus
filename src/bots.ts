import { type Card, rank } from './cards.ts';
import type { Agent, Bet, BetCtx, Lance, Reply, ReplyCtx, Sena } from './game.ts';
import type { Expr } from './avatars.ts';
import { pares, total, hasJuego } from './rules.ts';
import { outlook, strength, team, type Outlook, type TableInfo } from './ai.ts';
import { CHARACTERS, type Traits } from './characters.ts';

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

/** Lo que da de sí cada nivel de cabeza: repartos simulados, error de cálculo y lectura de envites. */
const SKILL: Record<Traits['skill'], { samples: number; noise: number; read: number }> = {
  1: { samples: 60, noise: 0.3, read: 0.2 },
  2: { samples: 100, noise: 0.2, read: 0.45 },
  3: { samples: 150, noise: 0.12, read: 0.7 },
  4: { samples: 300, noise: 0.06, read: 0.8 },
  5: { samples: 400, noise: 0, read: 0.85 },
};

/** Un bot que juega según los rasgos de su personaje. */
export class Bot implements Agent {
  traits: Traits = CHARACTERS.rosa.traits;
  /** Si hace señas a su compañero (el ajuste «Señas del compañero» puede apagarlas). */
  senasOn = true;

  constructor(traits?: Traits) {
    if (traits) this.traits = traits;
  }

  /** Algunas manos, la seña más importante y, a veces, una segunda. */
  senas(h: Card[]): Sena[] {
    if (!this.senasOn) return [];
    const all = senasFor(h);
    if (all.length === 0 || Math.random() > this.traits.senas) return [];
    return all.slice(0, Math.random() < 0.4 ? 2 : 1);
  }

  async mus(seat: number, h: Card[], info?: TableInfo): Promise<boolean> {
    const t = this.traits;
    const p = pares(h);
    // Con 31, medias o duples se corta siempre
    if (total(h) === 31 || p.kind >= 2) return false;
    // Si el compañero ha dicho que lleva buena mano, se corta para jugar con ella
    if (t.skill >= 2 && info?.senasFor[seat].some(e => STRONG.includes(e))) return false;
    const best = Math.max(strength('grande', h), strength('pares', h), hasJuego(h) ? strength('juego', h) : 0, strength('chica', h) * 0.8);
    return best < 0.85 - 0.35 * t.musCut;
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

  /** Qué espera la pareja del lance, con la precisión que da su cabeza. */
  private look({ seat, hand, lance, info }: BetCtx): Outlook {
    const k = SKILL[this.traits.skill];
    const o = outlook(seat, hand, lance, info, k.samples, k.read);
    if (k.noise) o.p = clamp(o.p + (Math.random() - 0.5) * k.noise);
    return o;
  }

  /** Puntos que les faltan a mi pareja y a la rival para ganar la partida. */
  private need({ seat, info }: BetCtx): { mine: number; theirs: number } {
    const t = team(seat);
    return { mine: info.target - info.scores[t], theirs: info.target - info.scores[1 - t] };
  }

  async bet(ctx: BetCtx): Promise<Bet> {
    const t = this.traits;
    const { p } = this.look(ctx);
    const need = this.need(ctx);
    const r = Math.random();
    // Los que tienen cabeza se la juegan si los rivales están a punto de ganar
    if (t.skill >= 4 && need.theirs <= 5 && need.mine > 8 && p > 0.62) return { kind: 'ordago' };
    if (p > 0.95 - 0.1 * t.ordago && r < 0.08 + 0.3 * t.ordago) return { kind: 'ordago' };
    if (p > 0.82 - 0.36 * t.aggression) {
      const base = p > 0.85 ? 5 : p > 0.75 ? 3 : 2;
      return { kind: 'envido', amount: base + (Math.random() < t.aggression - 0.4 ? 2 : 0) };
    }
    if (r < t.bluff) return Math.random() < t.ordago * 0.15 ? { kind: 'ordago' } : { kind: 'envido', amount: 2 };
    return { kind: 'paso' };
  }

  async reply(ctx: ReplyCtx): Promise<Reply> {
    const t = this.traits;
    const { p, us, them } = this.look(ctx);
    const need = this.need(ctx);
    const r = Math.random();
    if (ctx.ordago) {
      let bar = 0.6 - 0.3 * (t.call - 0.5);
      if (t.skill >= 4) {
        if (need.theirs <= 5) bar = 0.42; // van a ganar igualmente: mejor jugársela
        if (need.mine <= 5) bar = 0.72; // vamos a ganar: no regalar la partida
      }
      return { kind: p >= bar ? 'quiero' : 'noquiero' };
    }
    if (p > 0.92 && r < 0.05 + 0.2 * t.ordago) return { kind: 'ordago' };
    if (p > 0.8 - 0.1 * t.aggression && r < t.raise) return { kind: 'envido', amount: t.skill >= 4 && p > 0.88 ? 4 : 2 };
    // Querer o no, según lo que se espera ganar o perder con cada opción. Al no querer, los
    // rivales cobran lo que había y, en pares y juego, también sus jugadas. El aguante del
    // personaje inclina la balanza.
    const A = ctx.amount;
    const ifAccept = p * (A + us) - (1 - p) * (A + them);
    const ifDecline = -(ctx.prev + them);
    const lean = (t.call - 0.5) * 2 * (A + 1);
    return { kind: ifAccept - ifDecline + lean >= 0 ? 'quiero' : 'noquiero' };
  }
}
