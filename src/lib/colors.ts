import { PAL } from '../data/bench';
import type { Theme } from '../types';

/** Model line/dot color: oklch(L 0.15 hue), L 0.6 light / 0.75 dark. */
export function modelColor(id: string, theme: Theme): string {
  const hue = (PAL[id] ?? [0, 0])[0];
  return `oklch(${theme === 'dark' ? 0.75 : 0.6} 0.15 ${hue})`;
}
