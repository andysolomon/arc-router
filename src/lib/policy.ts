import { PHASES, WORKLOADS } from '../data/models';
import { BINDINGS, ORIG } from '../data/policy';
import type { ListPath, Policy } from '../types';

export const FOLD = '§FOLD';
/** `updated:` value while the policy matches ORIG. */
export const POLICY_DATE = '2026-09-23';

export function genLines(pol: Policy, updated: string): string[] {
  const L = [
    'policy: runner-routing-v4',
    'updated: ' + updated,
    'supersedes: docs/arc-model-update-08-18-26.md',
    'fallback: availability-only',
    'parent-local: analyze',
    'parent-default pi: ' + pol.parent.pi,
    'parent-default claude-code: ' + pol.parent.cc,
    FOLD,
    'tail: ' + pol.tail.join(', '),
  ];
  PHASES.forEach((ph) => L.push(`phase ${ph}: ${pol.phases[ph].join(', ')}`));
  WORKLOADS.forEach((w) => L.push(`workload ${w}: ${pol.workloads[w].join(', ')}`));
  L.push('exclude-models: ' + pol.excludeModels.join(', '), 'exclude-efforts: ' + pol.excludeEfforts.join(', '));
  return L;
}

/** Expand the fold marker into the binding and surface lines. */
export function fullBlock(lines: string[]): string {
  return lines.flatMap((l) => (l === FOLD ? BINDINGS : [l])).join('\n');
}

export type DiffKind = 'same' | 'del' | 'add' | 'fold';

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

export interface Diff {
  lines: DiffLine[];
  changes: number;
  full: string;
}

const keyOf = (l: string) => l.split(':')[0];

export function diff(pol: Policy, updatedDate: string): Diff {
  const newL = genLines(pol, updatedDate);
  const origL = genLines(ORIG, POLICY_DATE);
  const om = new Map<string, string>();
  origL.forEach((l) => om.set(keyOf(l), l));
  const lines: DiffLine[] = [];
  let changes = 0;
  for (const l of newL) {
    if (l === FOLD) {
      lines.push({ kind: 'fold', text: `… ${BINDINGS.length} binding and surface lines, unchanged` });
      continue;
    }
    const o = om.get(keyOf(l));
    if (o === l) {
      lines.push({ kind: 'same', text: l });
    } else {
      changes++;
      if (o) lines.push({ kind: 'del', text: o });
      lines.push({ kind: 'add', text: l });
    }
  }
  return { lines, changes, full: fullBlock(newL) };
}

export function isDirty(pol: Policy): boolean {
  return JSON.stringify(pol) !== JSON.stringify(ORIG);
}

export function getList(p: Policy, path: ListPath): string[] {
  if (path.kind === 'tail') return p.tail;
  return path.kind === 'phases' ? p.phases[path.key] : p.workloads[path.key];
}

export function clonePolicy(p: Policy): Policy {
  return structuredClone(p);
}
