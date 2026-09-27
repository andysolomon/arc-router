import { PAL } from '../data/bench';
import type { Theme } from '../types';

/** Model line/dot color: oklch(L 0.15 hue), L 0.6 light / 0.75 dark. */
export function modelColor(id: string, theme: Theme): string {
  const hue = (PAL[id] ?? [0, 0])[0];
  return `oklch(${theme === 'dark' ? 0.75 : 0.6} 0.15 ${hue})`;
}

/** Backend dot colors shared by badges, chains, and tables. */
export const BACKEND_DOT: Record<string, string> = {
  claude: 'oklch(0.62 0.14 45)',
  codex: 'oklch(0.58 0.14 255)',
  composer: 'oklch(0.6 0.13 160)',
  opencode: 'oklch(0.57 0.14 315)',
  minimax: 'oklch(0.66 0.13 95)',
  kimi: 'oklch(0.6 0.12 335)',
};
