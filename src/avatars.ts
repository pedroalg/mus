// Caras de los personajes, dibujadas en SVG en el mismo estilo plano que las cartas.
import type { CharacterId } from './characters.ts';
// Cada cara puede poner los gestos de las señas del mus.

/** Gestos posibles. Las señas «de lado» son la misma cara con el gesto torcido. */
export type Expr =
  | 'neutral' | 'wink' | 'brows' | 'smirk' | 'bite' | 'biteSide' | 'tongue' | 'tongueSide' | 'closed';

export type Ring = 'us' | 'them' | 'turn';

interface Look { skin: string; shirt: string; extra: (front: boolean) => string; mouthY: number }

const INK = '#2A1E17';
const GLASSES = `<circle cx="40" cy="49" r="7" fill="none" stroke="${'#2A1E17'}" stroke-width="2"/>`
  + `<circle cx="60" cy="49" r="7" fill="none" stroke="${'#2A1E17'}" stroke-width="2"/><path d="M47 49h6" stroke="${'#2A1E17'}" stroke-width="2"/>`;
const RING: Record<Ring, string> = { us: '#F2C14E', them: '#F08A6C', turn: '#F6F3EA' };

/** Aspecto de cada personaje. `extra(false)` va detrás de la cabeza y `extra(true)` delante. */
const LOOKS: Record<CharacterId, Look> = {
  // Iñaki: txapela y bigote cano
  inaki: {
    skin: '#E3B48C', shirt: '#2F5FA8', mouthY: 66,
    extra: front => front
      ? '<ellipse cx="50" cy="30" rx="27" ry="8" fill="#1F1F1F"/><rect x="48.5" y="18" width="3" height="6" rx="1.5" fill="#1F1F1F"/>'
        + '<path d="M41 62c3-3 6-3 9-1 3-2 6-2 9 1-3 2-6 2-9 1-3 1-6 1-9-1z" fill="#B9B4AE"/>'
      : '',
  },
  // Maite: media melena y gafas redondas
  maite: {
    skin: '#F0C9A6', shirt: '#7A3E8E', mouthY: 63,
    extra: front => front
      ? '<path d="M27 46c2-14 12-20 23-20s21 6 23 20c-8-6-16-9-23-9s-15 3-23 9z" fill="#3B2A20"/>' + GLASSES
      : '<path d="M22 58c-2-24 10-38 28-38s30 14 28 38l-6 8V44H28v22z" fill="#3B2A20"/>',
  },
  // Paco: barba y entradas
  paco: {
    skin: '#C98E66', shirt: '#3E7D3A', mouthY: 63,
    extra: front => front
      ? '<path d="M27 46c0-6 2-10 5-13v12zM73 46c0-6-2-10-5-13v12z" fill="#4A3426"/>'
        + '<path d="M28 54c2 14 10 20 22 20s20-6 22-20c-4 6-10 8-12 8-3-3-7-4-10-4s-7 1-10 4c-2 0-8-2-12-8z" fill="#4A3426"/>'
      : '',
  },
  // Doña Pili: moño gris y pendientes de perla
  pili: {
    skin: '#F1CBB0', shirt: '#8E2A25', mouthY: 63,
    extra: front => front
      ? '<path d="M27 46c2-14 12-21 23-21s21 7 23 21c-6-6-14-9-23-9s-17 3-23 9z" fill="#C9C4BD"/>'
        + '<circle cx="27.5" cy="58" r="2.4" fill="#FBF8F1"/><circle cx="72.5" cy="58" r="2.4" fill="#FBF8F1"/>'
      : '<circle cx="50" cy="45" r="27" fill="#C9C4BD"/><circle cx="50" cy="19" r="8" fill="#B5AFA7"/>',
  },
  // Txomin: gorra plana, patillas y bigote blancos
  txomin: {
    skin: '#D9A27A', shirt: '#3B3B3B', mouthY: 66,
    extra: front => front
      ? '<path d="M27 52v-10h4v12zM73 52v-10h-4v12z" fill="#ECE7DF"/>'
        + '<path d="M25 40c1-12 12-19 25-19s24 6 26 16l9 5H25z" fill="#6B4A2B"/>'
        + '<path d="M40 62c3-4 7-4 10-2 3-2 7-2 10 2-3 3-7 3-10 1-3 2-7 2-10-1z" fill="#ECE7DF"/>'
      : '',
  },
  // Lucía: melena larga oscura y aros dorados
  lucia: {
    skin: '#E8B48E', shirt: '#E07A2F', mouthY: 63,
    extra: front => front
      ? '<path d="M27 47c3-15 12-22 23-22 10 0 19 5 23 16-10-6-22-6-30 0-6 4-11 6-16 6z" fill="#2A1A14"/>'
        + '<circle cx="27" cy="58" r="3" fill="none" stroke="#E5A82A" stroke-width="1.6"/><circle cx="73" cy="58" r="3" fill="none" stroke="#E5A82A" stroke-width="1.6"/>'
      : '<path d="M22 52c0-20 12-31 28-31s28 11 28 31v32H22z" fill="#2A1A14"/>',
  },
  // Andoni: pelo rizado
  andoni: {
    skin: '#B07A55', shirt: '#C8372D', mouthY: 63,
    extra: front => front
      ? [30, 38, 46, 54, 62, 70].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 29 : 33}" r="7" fill="#1E1A17"/>`).join('')
        + '<circle cx="28" cy="40" r="5" fill="#1E1A17"/><circle cx="72" cy="40" r="5" fill="#1E1A17"/>'
      : '',
  },
  // Rosa: pelo corto cobrizo
  rosa: {
    skin: '#F0C9A6', shirt: '#2E8B7A', mouthY: 63,
    extra: front => front
      ? '<path d="M26 50c-1-17 10-26 24-26s25 8 24 24c-4-7-10-10-17-10-6 4-14 6-21 6-4 0-7 2-10 6z" fill="#A0482C"/>'
      : '',
  },
};

let uid = 0;

const line = (d: string) => `<path d="${d}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const eyeOpen = (x: number) => `<circle cx="${x}" cy="49" r="3" fill="${INK}"/>`;
const eyeShut = (x: number) => line(`M${x - 4} 49q4 3 8 0`);

function eyes(e: Expr): string {
  if (e === 'closed') return eyeShut(40) + eyeShut(60);
  if (e === 'wink') return eyeOpen(40) + eyeShut(60);
  return eyeOpen(40) + eyeOpen(60);
}

function mouth(e: Expr, y: number): string {
  switch (e) {
    case 'tongue':
      return line(`M43 ${y}q7 4 14 0`) + `<path d="M47 ${y + 1.5}h6v3a3 3 0 0 1-6 0z" fill="#E0607E"/>`;
    case 'tongueSide':
      return line(`M43 ${y}q7 4 14 0`) + `<path d="M53 ${y + 1}h6v3a3 3 0 0 1-6 0z" fill="#E0607E" transform="rotate(-20 56 ${y + 2})"/>`;
    case 'smirk':
      return line(`M43 ${y + 1}q8 -1 14 -5`);
    case 'bite':
      return line(`M43 ${y}h14`) + `<rect x="47" y="${y}" width="6" height="3" rx="1" fill="#FFFFFF"/>`;
    case 'biteSide':
      return line(`M43 ${y + 1}l14 -3`) + `<rect x="51" y="${y - 1.5}" width="6" height="3" rx="1" fill="#FFFFFF" transform="rotate(-12 54 ${y})"/>`;
    case 'closed':
      return line(`M44 ${y}h12`);
    default:
      return line(`M43 ${y - 1}q7 5 14 0`);
  }
}

/** Cara de un personaje en un círculo, con el aro del color de su pareja (o claro si le toca). */
export function avatarSvg(who: CharacterId, expr: Expr, ring: Ring): string {
  const l = LOOKS[who];
  const id = `av${++uid}`;
  const browY = expr === 'brows' ? 37 : 42;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<defs><clipPath id="${id}"><circle cx="50" cy="50" r="45"/></clipPath></defs>`
    + `<circle cx="50" cy="50" r="50" fill="${RING[ring]}"/><circle cx="50" cy="50" r="45" fill="#285E49"/>`
    + `<g clip-path="url(#${id})">`
    + `<path d="M14 100c2-18 18-26 36-26s34 8 36 26z" fill="${l.shirt}"/>`
    + l.extra(false)
    + `<rect x="43" y="66" width="14" height="10" fill="${l.skin}"/><circle cx="50" cy="50" r="23" fill="${l.skin}"/>`
    + l.extra(true)
    + `<path d="M36 ${browY}h9M55 ${browY}h9" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    + eyes(expr)
    + mouth(expr, l.mouthY)
    + '</g></svg>';
}
