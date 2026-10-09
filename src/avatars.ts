// Caras de los tres bots, dibujadas en SVG en el mismo estilo plano que las cartas.
// Cada cara puede poner los gestos de las señas del mus.

/** Gestos posibles. Las señas «de lado» son la misma cara con el gesto torcido. */
export type Expr =
  | 'neutral' | 'wink' | 'brows' | 'smirk' | 'bite' | 'biteSide' | 'tongue' | 'tongueSide' | 'closed';

export type Ring = 'us' | 'them' | 'turn';

interface Look { skin: string; shirt: string; extra: (front: boolean) => string; mouthY: number }

const INK = '#2A1E17';
const RING: Record<Ring, string> = { us: '#F2C14E', them: '#F08A6C', turn: '#F6F3EA' };

/** Asiento → aspecto. 1 Paco (derecha), 2 Iñaki (compañero), 3 Maite (izquierda). */
const LOOKS: Record<number, Look> = {
  // Iñaki: txapela y bigote cano
  2: {
    skin: '#E3B48C', shirt: '#2F5FA8', mouthY: 66,
    extra: front => front
      ? '<ellipse cx="50" cy="30" rx="27" ry="8" fill="#1F1F1F"/><rect x="48.5" y="18" width="3" height="6" rx="1.5" fill="#1F1F1F"/>'
        + '<path d="M41 62c3-3 6-3 9-1 3-2 6-2 9 1-3 2-6 2-9 1-3 1-6 1-9-1z" fill="#B9B4AE"/>'
      : '',
  },
  // Maite: media melena y gafas redondas
  3: {
    skin: '#F0C9A6', shirt: '#7A3E8E', mouthY: 63,
    extra: front => front
      ? '<path d="M27 46c2-14 12-20 23-20s21 6 23 20c-8-6-16-9-23-9s-15 3-23 9z" fill="#3B2A20"/>'
        + `<circle cx="40" cy="49" r="7" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="60" cy="49" r="7" fill="none" stroke="${INK}" stroke-width="2"/>`
        + `<path d="M47 49h6" stroke="${INK}" stroke-width="2"/>`
      : '<path d="M22 58c-2-24 10-38 28-38s30 14 28 38l-6 8V44H28v22z" fill="#3B2A20"/>',
  },
  // Paco: barba y entradas
  1: {
    skin: '#C98E66', shirt: '#3E7D3A', mouthY: 63,
    extra: front => front
      ? '<path d="M27 46c0-6 2-10 5-13v12zM73 46c0-6-2-10-5-13v12z" fill="#4A3426"/>'
        + '<path d="M28 54c2 14 10 20 22 20s20-6 22-20c-4 6-10 8-12 8-3-3-7-4-10-4s-7 1-10 4c-2 0-8-2-12-8z" fill="#4A3426"/>'
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

/** Cara de un bot en un círculo, con el aro del color de su pareja (o claro si le toca). */
export function avatarSvg(seat: number, expr: Expr, ring: Ring): string {
  const l = LOOKS[seat];
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
