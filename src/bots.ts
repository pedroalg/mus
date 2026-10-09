import { type Card, rank } from './cards.ts';
import type { Agent, Bet, BetCtx, Lance, Reply, ReplyCtx, Sena } from './game.ts';
import { pares, total, hasJuego } from './rules.ts';

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** Fuerza aproximada de una mano en un lance, de 0 a 1. */
export function strength(lance: Lance, h: Card[]): number {
  const rs = h.map(rank);
  switch (lance) {
    case 'grande':
      return clamp(rs.reduce((s, r) => s + (r === 12 ? 0.27 : r === 11 ? 0.08 : r === 10 ? 0.05 : 0), 0));
    case 'chica':
      return clamp(rs.reduce((s, r) => s + (r === 1 ? 0.27 : r === 4 ? 0.08 : r === 5 ? 0.04 : 0), 0));
    case 'pares': {
      const p = pares(h);
      if (p.kind === 0) return 0;
      if (p.kind === 1) return 0.3 + 0.3 * p.key[0] / 12;
      if (p.kind === 2) return 0.62 + 0.25 * p.key[0] / 12;
      return 0.85 + 0.15 * p.key[0] / 12;
    }
    case 'juego': {
      const t = total(h);
      return t === 31 ? 0.95 : t === 32 ? 0.75 : t === 40 ? 0.55 : 0.35;
    }
    case 'punto':
      return clamp((total(h) - 18) / 12);
  }
}

/** Todas las señas clásicas que encajan con la mano, de más a menos importante. */
export function senasFor(h: Card[]): Sena[] {
  const rs = h.map(rank);
  const reyes = rs.filter(r => r === 12).length;
  const ases = rs.filter(r => r === 1).length;
  const p = pares(h);
  const out: Sena[] = [];
  if (total(h) === 31) out.push({ face: '😉', gesture: 'te guiña un ojo', meaning: 'tiene 31' });
  if (p.kind === 3) out.push({ face: '🤨', gesture: 'levanta las cejas', meaning: 'tiene duples' });
  if (p.kind === 2) out.push({ face: '😏', gesture: 'tuerce la boca', meaning: 'tiene medias' });
  if (reyes === 3) out.push({ face: '😬', gesture: 'se muerde el labio de lado', meaning: 'tiene tres reyes' });
  if (reyes === 2) out.push({ face: '😬', gesture: 'se muerde el labio', meaning: 'tiene dos reyes' });
  if (ases === 3) out.push({ face: '😜', gesture: 'saca la lengua de lado', meaning: 'tiene tres ases' });
  if (ases === 2) out.push({ face: '😛', gesture: 'saca la punta de la lengua', meaning: 'tiene dos ases' });
  if (out.length === 0 && p.kind === 0 && !hasJuego(h) && total(h) < 27) {
    out.push({ face: '😑', gesture: 'cierra los ojos', meaning: 'va ciego, no tiene nada' });
  }
  return out;
}

export class Bot implements Agent {
  /** De vez en cuando: la seña más importante y, a veces, una segunda. */
  senas(h: Card[]): Sena[] {
    const all = senasFor(h);
    if (all.length === 0 || Math.random() < 0.35) return [];
    return all.slice(0, Math.random() < 0.4 ? 2 : 1);
  }

  async mus(_seat: number, h: Card[]): Promise<boolean> {
    const p = pares(h);
    const corta = total(h) === 31 || p.kind >= 2 || strength('grande', h) >= 0.8
      || (p.kind === 1 && p.key[0] >= 10 && hasJuego(h));
    return !corta;
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

  async bet({ hand, lance }: BetCtx): Promise<Bet> {
    const s = strength(lance, hand);
    const r = Math.random();
    if (s > 0.9 && r < 0.2) return { kind: 'ordago' };
    if (s > 0.6) return { kind: 'envido', amount: s > 0.8 ? 2 + Math.round((s - 0.8) * 25) : 2 };
    if (r < 0.08) return { kind: 'envido', amount: 2 }; // farol
    return { kind: 'paso' };
  }

  async reply({ hand, lance, amount, ordago }: ReplyCtx): Promise<Reply> {
    const s = strength(lance, hand);
    const r = Math.random();
    if (ordago) return { kind: s > 0.82 ? 'quiero' : 'noquiero' };
    const need = 0.42 + Math.min(amount, 12) * 0.025;
    if (s > 0.92 && r < 0.12) return { kind: 'ordago' };
    if (s > need + 0.25 && r < 0.45) return { kind: 'envido', amount: 2 };
    return { kind: s >= need ? 'quiero' : 'noquiero' };
  }
}
