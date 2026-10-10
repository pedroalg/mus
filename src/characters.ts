// Personajes de la mesa: cada uno con su cara, sus frases y su forma de jugar.

/** Rasgos de juego. Los números van de 0 (nada) a 1 (mucho) salvo `skill`. */
export interface Traits {
  /** Cabeza, de 1 a 5: lo bien que calcula y lo que se fija en los demás. */
  skill: 1 | 2 | 3 | 4 | 5;
  /** Con qué mano envida y cuánto sube. */
  aggression: number;
  /** Probabilidad de envidar sin nada (farol). */
  bluff: number;
  /** Aguante: si quiere casi todo (1) o se retira enseguida (0). 0,5 es lo razonable. */
  call: number;
  /** Afición al órdago. */
  ordago: number;
  /** Facilidad para cortar el mus (1) o pedir mus hasta tener buena mano (0). */
  musCut: number;
  /** Probabilidad de hacer señas a su compañero. */
  senas: number;
  /** Probabilidad de subir cuando le envidan con buena mano. */
  raise: number;
}

export type CharacterId = 'inaki' | 'maite' | 'paco' | 'pili' | 'txomin' | 'lucia' | 'andoni' | 'rosa';

/** Frases propias para lo que dice en la mesa (se mezclan con las normales). */
export type LineKey = 'Paso' | 'Envido' | 'Quiero' | 'No quiero' | '¡Órdago!' | 'Mus' | 'No hay mus';

export interface Character {
  id: CharacterId;
  name: string;
  /** Estilo en dos o tres palabras, para la ficha. */
  style: string;
  /** Una frase que lo retrata. */
  blurb: string;
  /** Lo bien que juega, de 1 a 5, medido con el torneo de personajes. */
  stars: number;
  traits: Traits;
  lines: Partial<Record<LineKey, string[]>>;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  inaki: {
    id: 'inaki', name: 'Iñaki', style: 'Sólido y fiable', stars: 4,
    blurb: 'El compañero de toda la vida: hace señas claras y no regala nada.',
    traits: { skill: 4, aggression: 0.5, bluff: 0.05, call: 0.5, ordago: 0.3, musCut: 0.5, senas: 0.75, raise: 0.5 },
    lines: { Quiero: ['Quiero', 'Venga, quiero'], Paso: ['Paso', 'Paso, paso'] },
  },
  maite: {
    id: 'maite', name: 'Maite', style: 'Calculadora y prudente', stars: 4,
    blurb: 'Casi nunca farolea. Si Maite envida, cuidado.',
    traits: { skill: 4, aggression: 0.3, bluff: 0.01, call: 0.4, ordago: 0.15, musCut: 0.5, senas: 0.6, raise: 0.3 },
    lines: { 'No quiero': ['No quiero', 'No, gracias'], Envido: ['Envido', 'Envido. Tú verás'] },
  },
  paco: {
    id: 'paco', name: 'Paco', style: 'Farolero de bar', stars: 2,
    blurb: 'Envida con cualquier cosa y echa órdagos por diversión.',
    traits: { skill: 2, aggression: 0.85, bluff: 0.22, call: 0.6, ordago: 0.7, musCut: 0.6, senas: 0.5, raise: 0.7 },
    lines: { Envido: ['¡Envido, majo!', 'Envido'], '¡Órdago!': ['¡Órdago, a lo loco!', '¡Órdago!'], Quiero: ['Quiero, venga'] },
  },
  pili: {
    id: 'pili', name: 'Doña Pili', style: 'Muy prudente', stars: 4,
    blurb: 'Se retira a la mínima y no regala ni un tanto. Si envida, va en serio.',
    traits: { skill: 1, aggression: 0.1, bluff: 0, call: 0.15, ordago: 0.05, musCut: 0.25, senas: 0.4, raise: 0.1 },
    lines: { Paso: ['Paso, hijo', 'Paso'], 'No quiero': ['No quiero, gracias', 'No quiero'] },
  },
  txomin: {
    id: 'txomin', name: 'Txomin', style: 'Veterano de campeonato', stars: 5,
    blurb: 'Lo ha visto todo. Lee los envites y elige bien el momento del órdago.',
    traits: { skill: 5, aggression: 0.35, bluff: 0.04, call: 0.42, ordago: 0.3, musCut: 0.5, senas: 0.8, raise: 0.5 },
    lines: { Quiero: ['Quiero.'], Envido: ['Envido.'], 'No quiero': ['No.'] },
  },
  lucia: {
    id: 'lucia', name: 'Lucía', style: 'Impulsiva', stars: 2,
    blurb: 'Sube siempre que puede y se deja llevar.',
    traits: { skill: 2, aggression: 0.8, bluff: 0.12, call: 0.65, ordago: 0.5, musCut: 0.8, senas: 0.5, raise: 0.9 },
    lines: { Envido: ['¡Envido!', '¡Envido, vamos!'], Quiero: ['¡Quiero!'] },
  },
  andoni: {
    id: 'andoni', name: 'Andoni', style: 'Lo quiere todo', stars: 1,
    blurb: 'Nunca se retira. Le encanta ver las cartas.',
    traits: { skill: 1, aggression: 0.4, bluff: 0.04, call: 0.9, ordago: 0.2, musCut: 0.5, senas: 0.3, raise: 0.2 },
    lines: { Quiero: ['¡Quiero, claro!', 'Quiero'] },
  },
  rosa: {
    id: 'rosa', name: 'Rosa', style: 'Equilibrada y paciente', stars: 3,
    blurb: 'Pide mus hasta tener buena mano, y entonces la juega bien.',
    traits: { skill: 3, aggression: 0.45, bluff: 0.04, call: 0.5, ordago: 0.2, musCut: 0.15, senas: 0.65, raise: 0.4 },
    lines: { Mus: ['Mus', 'Mus, mus'] },
  },
};

/**
 * Mesas preparadas: tus rivales (izquierda y derecha); el compañero es Iñaki.
 * Ordenadas de más fácil a más difícil según el torneo de personajes.
 */
export const TABLES: { id: string; name: string; desc: string; left: CharacterId; right: CharacterId }[] = [
  { id: 'empezar', name: 'Para empezar', desc: 'Rivales que se dejan ganar', left: 'andoni', right: 'lucia' },
  { id: 'bar', name: 'De bar', desc: 'Envites y faroles a todas horas', left: 'lucia', right: 'paco' },
  { id: 'seria', name: 'Seria', desc: 'Prudencia y paciencia', left: 'rosa', right: 'pili' },
  { id: 'campeonato', name: 'De campeonato', desc: 'Lo más difícil', left: 'maite', right: 'txomin' },
];

/** Reparto de la partida: quién se sienta en cada sitio (1 derecha, 2 compañero, 3 izquierda). */
export interface Cast { partner: CharacterId; left: CharacterId; right: CharacterId }

export const DEFAULT_CAST: Cast = { partner: 'inaki', left: 'maite', right: 'paco' };

import { SEAT_NAME } from './game.ts';

/** Personaje de cada asiento (el 0 eres tú). */
export function seatCharacters(c: Cast): (Character | null)[] {
  return [null, CHARACTERS[c.right], CHARACTERS[c.partner], CHARACTERS[c.left]];
}

/** Personajes sentados ahora a la mesa. */
export const SEAT_CHAR: (Character | null)[] = seatCharacters(DEFAULT_CAST);

/** Sienta a los personajes del reparto: cambia caras, nombres y frases de cada asiento. */
export function applyCast(c: Cast) {
  const chars = seatCharacters(c);
  for (let s = 1; s < 4; s++) {
    SEAT_CHAR[s] = chars[s];
    SEAT_NAME[s] = chars[s]!.name;
  }
}

/** Una frase con sabor propio para lo que dice el personaje, a veces. */
export function flavor(ch: Character | null, text: string): string {
  const options = ch?.lines[text as LineKey];
  if (!options || Math.random() < 0.4) return text;
  return options[Math.floor(Math.random() * options.length)];
}
