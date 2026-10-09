// Cerebro de los bots de nivel normal y difícil: estima la probabilidad de que su pareja gane
// un lance simulando muchos repartos de las cartas que no ve, y descartando los repartos que
// no encajan con lo que se sabe en la mesa (declaraciones de pares y juego, y las señas del
// compañero).
import { type Card, newDeck, rank, shuffle } from './cards.ts';
import type { Expr } from './avatars.ts';
import * as R from './rules.ts';

export type Lance = 'grande' | 'chica' | 'pares' | 'juego' | 'punto';

/** Lo que un jugador atento sabe de la mano en curso. */
export interface TableInfo {
  mano: number;
  target: number;
  scores: number[];
  /** Quién ha dicho «pares sí/no» y «juego sí/no» (undefined: aún no ha declarado). */
  pares: (boolean | undefined)[];
  juego: (boolean | undefined)[];
  /** Gestos de las señas que ha recibido cada asiento de su compañero. */
  senasFor: Expr[][];
  /** Quién ha envidado en esta mano y en qué lance. */
  bets: { seat: number; lance: Lance }[];
  /** Quién ha pasado pudiendo envidar, y en qué lance (dato disponible para futuros niveles). */
  passes: { seat: number; lance: Lance }[];
}

export const team = (seat: number) => seat % 2;
export const partnerOf = (seat: number) => (seat + 2) % 4;

const count = (h: Card[], r: number) => h.filter(c => rank(c) === r).length;
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** Fuerza aproximada de una mano en un lance, de 0 a 1, mirando solo las propias cartas. */
export function strength(lance: Lance, h: Card[]): number {
  const rs = h.map(rank);
  switch (lance) {
    case 'grande':
      return clamp(rs.reduce((s, r) => s + (r === 12 ? 0.27 : r === 11 ? 0.08 : r === 10 ? 0.05 : 0), 0));
    case 'chica':
      return clamp(rs.reduce((s, r) => s + (r === 1 ? 0.27 : r === 4 ? 0.08 : r === 5 ? 0.04 : 0), 0));
    case 'pares': {
      const p = R.pares(h);
      if (p.kind === 0) return 0;
      if (p.kind === 1) return 0.3 + 0.3 * p.key[0] / 12;
      if (p.kind === 2) return 0.62 + 0.25 * p.key[0] / 12;
      return 0.85 + 0.15 * p.key[0] / 12;
    }
    case 'juego': {
      const t = R.total(h);
      return t === 31 ? 0.95 : t === 32 ? 0.75 : t === 40 ? 0.55 : 0.35;
    }
    case 'punto':
      return clamp((R.total(h) - 18) / 12);
  }
}

/** ¿Es compatible esta mano con el gesto de una seña? */
export function fitsSena(h: Card[], e: Expr): boolean {
  const p = R.pares(h);
  switch (e) {
    case 'wink': return R.total(h) === 31;
    case 'brows': return p.kind === 3;
    case 'smirk': return p.kind === 2;
    case 'bite': return count(h, 12) === 2;
    case 'biteSide': return count(h, 12) === 3;
    case 'tongue': return count(h, 1) === 2;
    case 'tongueSide': return count(h, 1) === 3;
    case 'closed': return p.kind === 0 && !R.hasJuego(h) && R.total(h) < 27;
    default: return true;
  }
}

const CMP = { grande: R.cmpGrande, chica: R.cmpChica, pares: R.cmpPares, juego: R.cmpJuego, punto: R.cmpPunto };

function eligible(lance: Lance, h: Card[]): boolean {
  if (lance === 'pares') return R.pares(h).kind > 0;
  if (lance === 'juego') return R.hasJuego(h);
  return true;
}

/** Ganador de un lance con cuatro manos: el mejor; en empate, el más cercano a la mano. */
function winner(lance: Lance, hands: Card[][], mano: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < 4; i++) {
    const s = (mano + i) % 4;
    if (!eligible(lance, hands[s])) continue;
    if (best === null || CMP[lance](hands[s], hands[best]) > 0) best = s;
  }
  return best;
}

/** Puntos de pares o juego que se lleva una pareja si gana el lance (0 en los demás lances). */
function bonus(lance: Lance, hands: Card[][], t: number): number {
  if (lance !== 'pares' && lance !== 'juego') return 0;
  let pts = 0;
  for (const s of [t, t + 2]) {
    if (lance === 'pares') pts += R.pares(hands[s]).kind;
    else if (R.hasJuego(hands[s])) pts += R.juegoValue(hands[s]);
  }
  return pts;
}

/** Lo que espera una pareja de un lance: probabilidad de ganarlo y puntos de jugadas de cada lado. */
export interface Outlook {
  /** Probabilidad (0 a 1) de que gane la pareja propia. */
  p: number;
  /** Media de puntos de pares o juego de la pareja propia y de la rival. */
  us: number;
  them: number;
}

/**
 * Simula `samples` repartos de las cartas que no se ven y cuenta cuántos gana la pareja de `seat`.
 * Las señas del compañero que no encajen nunca (por ejemplo, si eran un farol) se ignoran.
 * `betRead` es cuánto se fía de que quien envida lleva buena mano (0: nada, 1: del todo).
 */
export function outlook(seat: number, hand: Card[], lance: Lance, info: TableInfo, samples: number, betRead = 0.85): Outlook {
  const mine = new Set(hand.map(c => `${c.suit}${c.n}`));
  const pool = newDeck().filter(c => !mine.has(`${c.suit}${c.n}`));
  const others = [0, 1, 2, 3].filter(s => s !== seat);
  const partner = partnerOf(seat);
  let senas = info.senasFor[seat];
  // Quien ha envidado en este lance casi seguro que lleva buena mano para él (salvo farol)
  const bettors = new Set(info.bets.filter(b => b.lance === lance && b.seat !== seat).map(b => b.seat));

  const fits = (s: number, h: Card[]) => {
    if (info.pares[s] !== undefined && (R.pares(h).kind > 0) !== info.pares[s]) return false;
    if (info.juego[s] !== undefined && R.hasJuego(h) !== info.juego[s]) return false;
    if (s === partner) for (const e of senas) if (!fitsSena(h, e)) return false;
    if (bettors.has(s) && strength(lance, h) < 0.55 && Math.random() < betRead) return false;
    return true;
  };

  let wins = 0;
  let valid = 0;
  let us = 0;
  let them = 0;
  let tries = 0;
  const maxTries = samples * 25;
  const hands: Card[][] = [[], [], [], []];
  hands[seat] = hand;
  while (valid < samples && tries < maxTries) {
    tries++;
    // A mitad de intentos sin éxito, se deja de creer en las señas
    if (tries === Math.floor(maxTries / 2) && valid < samples / 10) senas = [];
    shuffle(pool);
    let ok = true;
    for (let k = 0; k < 3 && ok; k++) {
      const s = others[k];
      hands[s] = pool.slice(k * 4, k * 4 + 4);
      ok = fits(s, hands[s]);
    }
    if (!ok) continue;
    valid++;
    const w = winner(lance, hands, info.mano);
    if (w !== null && team(w) === team(seat)) wins++;
    us += bonus(lance, hands, team(seat));
    them += bonus(lance, hands, 1 - team(seat));
  }
  if (!valid) return { p: 0.5, us: 0, them: 0 };
  return { p: wins / valid, us: us / valid, them: them / valid };
}

export const winChance = (seat: number, hand: Card[], lance: Lance, info: TableInfo, samples: number) =>
  outlook(seat, hand, lance, info, samples).p;
