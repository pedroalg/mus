import { type Card, rank, points } from './cards.ts';

// Todas las comparaciones devuelven > 0 si la mano `a` gana a `b`.
// Los empates los resuelve quien llama: gana el más cercano a la mano.

function lex(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const desc = (h: Card[]) => h.map(rank).sort((a, b) => b - a);
const asc = (h: Card[]) => h.map(rank).sort((a, b) => a - b);

export const cmpGrande = (a: Card[], b: Card[]) => lex(desc(a), desc(b));
export const cmpChica = (a: Card[], b: Card[]) => lex(asc(b), asc(a));

/** kind: 0 nada, 1 pareja, 2 medias, 3 duples. */
export interface Pares { kind: 0 | 1 | 2 | 3; key: number[] }
export const PARES_NAME = ['', 'pareja', 'medias', 'duples'];

export function pares(h: Card[]): Pares {
  const counts = new Map<number, number>();
  for (const c of h) counts.set(rank(c), (counts.get(rank(c)) ?? 0) + 1);
  const groups = [...counts].filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1] || y[0] - x[0]);
  if (groups.length === 0) return { kind: 0, key: [] };
  const [r, n] = groups[0];
  if (n === 4) return { kind: 3, key: [r, r] };
  if (groups.length === 2) return { kind: 3, key: [groups[0][0], groups[1][0]] };
  if (n === 3) return { kind: 2, key: [r] };
  return { kind: 1, key: [r] };
}

export function cmpPares(a: Card[], b: Card[]): number {
  const pa = pares(a), pb = pares(b);
  return pa.kind - pb.kind || lex(pa.key, pb.key);
}

export const total = (h: Card[]) => h.reduce((s, c) => s + points(c), 0);
export const hasJuego = (h: Card[]) => total(h) >= 31;

const JUEGO_ORDER = [31, 32, 40, 37, 36, 35, 34, 33];
export const cmpJuego = (a: Card[], b: Card[]) => JUEGO_ORDER.indexOf(total(b)) - JUEGO_ORDER.indexOf(total(a));
export const juegoValue = (h: Card[]) => (total(h) === 31 ? 3 : 2);

export const cmpPunto = (a: Card[], b: Card[]) => total(a) - total(b);
