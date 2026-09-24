import { BENCH } from '../data/bench';
import { RMAP } from '../data/models';
import type { Lookup, Policy, Usage } from '../types';

/** Resolve a router rung (`id@effort`) to its Artificial Analysis row, if any. */
export function lookup(rung: string): Lookup | null {
  const [id, eff] = rung.split('@');
  const m = RMAP[id];
  if (!m) return null;
  const [bid, beff] = m.split('@');
  const bm = BENCH.find((b) => b.id === bid);
  if (!bm) return null;
  const p = bm.pts.find((x) => x[0] === (beff || eff));
  return p ? { m: bm, p } : null;
}

/** Count, per `model@effort` bench key, the distinct chains that route to it. */
export function usage(pol: Policy): Usage {
  const u: Usage = {};
  const add = (r: string) => {
    const l = lookup(r);
    if (l) {
      const k = `${l.m.id}@${l.p[0]}`;
      u[k] = (u[k] ?? 0) + 1;
    }
  };
  Object.values(pol.phases).forEach((c) => new Set(c).forEach(add));
  Object.values(pol.workloads).forEach((c) => new Set(c).forEach(add));
  new Set(pol.tail).forEach(add);
  return u;
}
