export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';
export interface Card { n: number; suit: Suit }

export const SUITS: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export function newDeck(): Card[] {
  return SUITS.flatMap(suit => NUMBERS.map(n => ({ n, suit })));
}

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Con 8 reyes: los treses cuentan como reyes y los doses como ases. */
export function rank(c: Card): number {
  if (c.n === 3) return 12;
  if (c.n === 2) return 1;
  return c.n;
}

/** Valor para juego y punto: figuras 10, el resto lo que marcan. */
export function points(c: Card): number {
  const r = rank(c);
  return r >= 10 ? 10 : r;
}
