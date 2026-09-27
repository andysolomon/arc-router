// Joins the editorial Artificial Analysis rows with the authoritative routing
// data: the registry (identity, transport, effort support, maturity), the
// capability snapshot (bands, benchmark provenance, cost priors), and the
// policy (which chains route to a rung). The join is by data, not by a
// hand-maintained map: a leaderboard row names the binding base or stable id
// it corresponds to and everything else is looked up.
//
// Unknown is preserved as unknown: a row with no snapshot rung has no band, a
// rung with no cost prior has no estimated cost, and neither is treated as low.

import {
  bandForSnapshotEntry,
  measurementForSnapshotEntry,
  registryLabelIndex,
  selectableEffortsFor,
  type CapabilityAxis,
  type CapabilityBand,
  type CapabilitySnapshot,
  type Effort,
  type Measurement,
  type ModelDefinition,
  type RouteBinding,
  type RoutingPolicy,
  type RungId,
  type RungSnapshotEntry,
} from '../routing-core/index';
import type { BenchModel, BenchPoint, Usage } from '../types';
import { chainsRoutingTo, rungUsage } from './policy-state';

export interface BenchResolution {
  stableId: string;
  entry: ModelDefinition;
  binding: RouteBinding | null;
}

/** Resolve a leaderboard row to a registry entry via binding base, stable id, or any registry label. */
export function resolveBenchModel(bench: BenchModel, policy: RoutingPolicy, registry: readonly ModelDefinition[]): BenchResolution | null {
  const binding = policy.routeBindings.find((row) => row.base === bench.binds || row.stableId === bench.binds) ?? null;
  const stableId = binding?.stableId ?? bench.binds;
  const entry = registry.find((row) => row.stableId === stableId) ?? registryLabelIndex(registry).get(bench.binds.toLowerCase()) ?? null;
  if (!entry) return null;
  return { stableId: entry.stableId, entry, binding: binding ?? policy.routeBindings.find((row) => row.stableId === entry.stableId) ?? null };
}

/** The registry rung a leaderboard effort level corresponds to. */
export function rungForBenchEffort(entry: ModelDefinition, benchEffort: string): RungId {
  if (entry.fixedEffort) return `${entry.stableId}@${entry.fixedEffort}`;
  const efforts = selectableEffortsFor(entry);
  if (efforts.length === 1 && efforts[0] === 'none') return `${entry.stableId}@none`;
  return `${entry.stableId}@${benchEffort}`;
}

const NO_EFFORT_PREFERENCE = ['max', 'xhigh', 'high', 'default', 'medium', 'low'];

/** The leaderboard point a registry rung corresponds to (inverse of rungForBenchEffort). */
export function benchPointForRung(bench: BenchModel, entry: ModelDefinition, effort: Effort): BenchPoint | null {
  if (entry.fixedEffort) return bench.pts.find((point) => point[0] === entry.fixedEffort) ?? null;
  if (effort === 'none') {
    if (bench.pts.length === 1) return bench.pts[0]!;
    for (const preferred of NO_EFFORT_PREFERENCE) {
      const point = bench.pts.find((candidate) => candidate[0] === preferred);
      if (point) return point;
    }
    return bench.pts[0] ?? null;
  }
  return bench.pts.find((point) => point[0] === effort) ?? null;
}

/** Count, per `benchId@effort`, the distinct chains routing to it under the policy. */
export function usageByBenchKey(policy: RoutingPolicy, registry: readonly ModelDefinition[], bench: readonly BenchModel[]): Usage {
  const usage: Usage = {};
  const byStable = new Map<string, { bench: BenchModel; entry: ModelDefinition }>();
  for (const row of bench) {
    const resolved = resolveBenchModel(row, policy, registry);
    if (resolved) byStable.set(resolved.stableId, { bench: row, entry: resolved.entry });
  }
  for (const [rung, count] of rungUsage(policy)) {
    const at = rung.lastIndexOf('@');
    const stableId = rung.slice(0, at);
    const effort = rung.slice(at + 1) as Effort;
    const hit = byStable.get(stableId);
    if (!hit) continue;
    const point = benchPointForRung(hit.bench, hit.entry, effort);
    if (!point) continue;
    const key = `${hit.bench.id}@${point[0]}`;
    usage[key] = (usage[key] ?? 0) + count;
  }
  return usage;
}

export interface BenchJoinRow {
  bench: BenchModel;
  point: BenchPoint;
  key: string;
  resolution: BenchResolution | null;
  rungId: RungId | null;
  snapshotRung: RungSnapshotEntry | null;
  bands: { swe: CapabilityBand | null; agenticEdit: CapabilityBand | null };
  measurements: Measurement[];
  costPriorUsd: number | null;
  costPriorSource: string | null;
  priceBand: string | null;
  efforts: Effort[];
  maturity: ModelDefinition['maturity'] | null;
  routedIn: number;
  chains: string[];
}

export function joinBench(
  bench: readonly BenchModel[],
  policy: RoutingPolicy,
  registry: readonly ModelDefinition[],
  snapshot: CapabilitySnapshot,
): BenchJoinRow[] {
  const usage = usageByBenchKey(policy, registry, bench);
  const byRung = new Map(snapshot.rungs.map((rung) => [rung.rungId, rung] as const));
  const rows: BenchJoinRow[] = [];
  for (const row of bench) {
    const resolution = resolveBenchModel(row, policy, registry);
    for (const point of row.pts) {
      const key = `${row.id}@${point[0]}`;
      const rungId = resolution ? rungForBenchEffort(resolution.entry, point[0]) : null;
      const snapshotRung = rungId ? byRung.get(rungId) ?? null : null;
      const band = (axis: CapabilityAxis) => bandForSnapshotEntry(snapshotRung, axis, snapshot.bandWidth);
      rows.push({
        bench: row,
        point,
        key,
        resolution,
        rungId,
        snapshotRung,
        bands: { swe: band('swe'), agenticEdit: band('agentic-edit') },
        measurements: snapshotRung ? (['swe', 'agentic-edit'] as CapabilityAxis[]).map((axis) => measurementForSnapshotEntry(snapshotRung, axis)).filter((m): m is Measurement => m != null) : [],
        costPriorUsd: snapshotRung?.costPrior?.usdPerTask ?? null,
        costPriorSource: snapshotRung?.costPrior?.source ?? null,
        priceBand: snapshotRung?.priceBand ?? resolution?.entry.priceBand ?? null,
        efforts: resolution ? [...selectableEffortsFor(resolution.entry)] : [],
        maturity: resolution?.entry.maturity ?? null,
        routedIn: usage[key] ?? 0,
        chains: resolution ? chainsRoutingTo(policy, resolution.stableId) : [],
      });
    }
  }
  return rows;
}
