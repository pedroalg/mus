// Baraja propia, dibujada en SVG: palos planos colocados como en la baraja española de siempre.
// Cada carta mide 200 × 316 unidades (la proporción de un naipe).
import type { Card, Suit } from './cards.ts';

const W = 200;
const H = 316;

export const SUIT_COLOR: Record<Suit, string> = {
  oros: '#B8860B',
  copas: '#C8372D',
  espadas: '#2F5FA8',
  bastos: '#3E7D3A',
};
const GOLD = '#C9961A';

/** Símbolo de cada palo, dibujado en una caja de 40 × 40. */
const PIP: Record<Suit, string> = {
  oros:
    '<circle cx="20" cy="20" r="17" fill="#E5A82A"/>'
    + '<circle cx="20" cy="20" r="10.5" fill="none" stroke="#9A6A0E" stroke-width="3"/>'
    + '<circle cx="20" cy="20" r="3" fill="#9A6A0E"/>',
  copas:
    '<path d="M7 4h26c0 10-5 16-10.5 17.5V29H29v4H11v-4h6.5v-7.5C12 20 7 14 7 4z" fill="#C8372D"/>'
    + '<rect x="9" y="34" width="22" height="4" rx="2" fill="#C8372D"/>',
  espadas:
    '<path d="M20 0l6.5 8V26h-13V8z" fill="#2F5FA8"/>'
    + '<rect x="6" y="25" width="28" height="6" rx="3" fill="#2F5FA8"/>'
    + '<rect x="16.5" y="31" width="7" height="5.5" fill="#2F5FA8"/>'
    + '<circle cx="20" cy="37" r="3" fill="#2F5FA8"/>',
  bastos:
    '<rect x="15.5" y="2" width="9" height="36" rx="4.5" fill="#3E7D3A"/>'
    + '<rect x="13.5" y="9" width="13" height="3.5" rx="1.75" fill="#2C5B29"/>'
    + '<rect x="13.5" y="27.5" width="13" height="3.5" rx="1.75" fill="#2C5B29"/>',
};

/** Figuras, en una caja de 40 × 40, del color del palo. */
const FIGURE: Record<number, (c: string) => string> = {
  // Sota: un paje con gorro de pluma
  10: c => `<path d="M12 9c0-4 4-6 8-6s8 2 8 6z" fill="${c}"/><path d="M27 7c3-4 7-4 9-3-3 1-5 3-7 5z" fill="${c}"/>`
    + `<circle cx="20" cy="14" r="5.5" fill="${c}"/><path d="M8 38c0-11 5-18 12-18s12 7 12 18z" fill="${c}"/>`,
  // Caballo: cabeza de caballo de perfil
  11: c => `<path d="M11 38l1.5-11C8 24 7 18 10.5 13L9 4l6 5c9-1.5 17 4.5 18.5 12.5l-4 3-5.5-3-2.5 4L26 38z" fill="${c}"/>`
    + '<circle cx="21" cy="14" r="1.8" fill="#FBF8F1"/>',
  // Rey: corona
  12: c => `<path d="M4 30L7 10l8 9 5-13 5 13 8-9 3 20z" fill="${c}"/><rect x="4" y="32" width="32" height="5" rx="1.5" fill="${c}"/>`
    + `<circle cx="7" cy="8.5" r="2.5" fill="${c}"/><circle cx="20" cy="4.5" r="2.5" fill="${c}"/><circle cx="33" cy="8.5" r="2.5" fill="${c}"/>`,
};

/** Coloca un dibujo de 40 × 40 centrado en (x, y) con lado `size`. */
const place = (art: string, x: number, y: number, size: number) =>
  `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 40})">${art}</g>`;

const L = 64;
const R = 136;
const M = 100;

/** Posición de las pintas para cada número, como en la baraja española. */
const LAYOUT: Record<number, [number, number][]> = {
  1: [[M, 172]],
  2: [[M, 105], [M, 245]],
  3: [[M, 92], [M, 172], [M, 252]],
  4: [[L, 100], [R, 100], [L, 245], [R, 245]],
  5: [[L, 100], [R, 100], [M, 172], [L, 245], [R, 245]],
  6: [[L, 92], [R, 92], [L, 172], [R, 172], [L, 252], [R, 252]],
  7: [[L, 90], [R, 90], [M, 140], [L, 190], [R, 190], [L, 260], [R, 260]],
};

/**
 * El 3 vale como rey y el 2 como as: una marca dorada bajo el número lo recuerda.
 * Va a la izquierda porque en el móvil las cartas se solapan y tapan su lado derecho.
 */
function aliasMark(n: number): string {
  if (n === 3) return place(FIGURE[12](GOLD), 34, 86, 36);
  if (n === 2) {
    return `<circle cx="34" cy="86" r="17" fill="none" stroke="${GOLD}" stroke-width="3.5"/>`
      + `<text x="34" y="95" text-anchor="middle" font-family="Atkinson Hyperlegible, system-ui, sans-serif" font-weight="700" font-size="25" fill="${GOLD}">1</text>`;
  }
  return '';
}

export function cardSvg(c: Card): string {
  const color = SUIT_COLOR[c.suit];
  let body: string;
  if (c.n >= 10) {
    body = place(FIGURE[c.n](color), M, 140, 120) + place(PIP[c.suit], M, 252, 46);
  } else {
    const spots = LAYOUT[c.n];
    const size = c.n === 1 ? 120 : c.n <= 3 ? 62 : c.n === 7 ? 46 : 54;
    body = spots.map(([x, y]) => place(PIP[c.suit], x, y, size)).join('');
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="#FBF8F1" stroke="#D9D2C2" stroke-width="2"/>`
    + `<text x="14" y="58" font-family="Atkinson Hyperlegible, system-ui, sans-serif" font-weight="700" font-size="58" fill="${color}">${c.n}</text>`
    + aliasMark(c.n)
    + body
    + '</svg>';
}

/** Reverso: granate liso con un filete claro. */
export function backSvg(): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="#8E2A25"/>`
    + '<rect x="12" y="12" width="176" height="292" rx="9" fill="none" stroke="#FBF8F1" stroke-opacity="0.55" stroke-width="2"/>'
    + '</svg>';
}
