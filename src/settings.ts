// Ajustes y marcador de partidas, guardados en este dispositivo.

export type Speed = 'lenta' | 'normal' | 'rapida';
export type Level = 'facil' | 'normal' | 'dificil';

export interface Settings {
  target: number;
  speed: Speed;
  senas: boolean;
  ayuda: boolean;
  nivel: Level;
}

export interface Stats { won: number; lost: number }

const DEFAULTS: Settings = { target: 40, speed: 'normal', senas: true, ayuda: true, nivel: 'normal' };
const SETTINGS_KEY = 'mus.settings';
const STATS_KEY = 'mus.stats';

/** Pausa de los bots tras hablar, en milisegundos. */
export const BOT_DELAY: Record<Speed, number> = { lenta: 1150, normal: 750, rapida: 400 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento (modo privado): los ajustes duran lo que dure la página.
  }
}

export const loadSettings = () => read(SETTINGS_KEY, DEFAULTS);
export const saveSettings = (s: Settings) => write(SETTINGS_KEY, s);

export const loadStats = () => read<Stats>(STATS_KEY, { won: 0, lost: 0 });

export function resetStats(): Stats {
  const s = { won: 0, lost: 0 };
  write(STATS_KEY, s);
  return s;
}

export function recordResult(won: boolean): Stats {
  const s = loadStats();
  if (won) s.won++; else s.lost++;
  write(STATS_KEY, s);
  return s;
}
