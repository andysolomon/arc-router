import type { Policy } from '../types';

export function rungIssue(r: string, pol: Policy): string | null {
  const [id, eff] = r.split('@');
  if (pol.excludeModels.includes(id)) return `${id} is in exclude-models.`;
  if (id === 'cursor-auto') return 'cursor-auto is explicit-only and holds no automatic rung.';
  const lunaMax = id === 'gpt-6-luna' && eff === 'max';
  if (pol.excludeEfforts.includes(eff) && !lunaMax) return `${r} uses excluded effort ${eff}.`;
  if (eff === 'max' && !lunaMax) return `${r}: efforts above high are reserved for Luna's max profile.`;
  return null;
}

export function validate(list: string[], isTail: boolean, pol: Policy): string[] {
  const w: string[] = [];
  if (!list.length) {
    w.push(isTail ? 'Tail is empty: exhausted chains have no availability backup.' : 'Empty chain: every task goes straight to the emergency tail.');
  }
  const seen = new Set<string>();
  for (const r of list) {
    if (seen.has(r)) w.push(`${r} appears more than once.`);
    seen.add(r);
    const i = rungIssue(r, pol);
    if (i) w.push(i);
  }
  return [...new Set(w)];
}
