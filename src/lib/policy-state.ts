// Immutable editing helpers over the shared RoutingPolicy shape. The UI never
// mutates a policy in place; every edit returns a new policy so React state and
// the persisted draft stay coherent. Validation is delegated to routing-core.

import {
  WORKER_PHASES,
  WORKLOAD_CLASSES,
  chainOf,
  clonePolicy,
  parseRungId,
  selectableEffortsFor,
  type ChainRef,
  type Effort,
  type ModelDefinition,
  type ParentDefault,
  type RoutingPolicy,
  type RungId,
} from '../routing-core/index';

export type { ChainRef };

export function chainRefs(): ChainRef[] {
  return [
    ...WORKER_PHASES.map((key): ChainRef => ({ kind: 'phase', key })),
    ...WORKLOAD_CLASSES.map((key): ChainRef => ({ kind: 'workload', key })),
    { kind: 'tail' },
  ];
}

export function chainKey(ref: ChainRef): string {
  return ref.kind === 'tail' ? 'tail' : `${ref.kind}:${ref.key}`;
}

export function getChain(policy: RoutingPolicy, ref: ChainRef): RungId[] {
  return [...chainOf(policy, ref)];
}

type MutableChains = {
  emergencyTail: RungId[];
  phaseChains: Record<string, RungId[]>;
  workloadChains: Record<string, RungId[]>;
};

export function withChain(policy: RoutingPolicy, ref: ChainRef, fn: (chain: RungId[]) => RungId[]): RoutingPolicy {
  const next = clonePolicy(policy) as unknown as MutableChains;
  const chain = fn(getChain(policy, ref));
  if (ref.kind === 'tail') next.emergencyTail = chain;
  else if (ref.kind === 'phase') next.phaseChains[ref.key] = chain;
  else next.workloadChains[ref.key] = chain;
  return next as unknown as RoutingPolicy;
}

export function moveRung(chain: RungId[], from: number, to: number): RungId[] {
  if (to < 0 || to >= chain.length || from === to) return chain;
  const next = [...chain];
  const [rung] = next.splice(from, 1);
  next.splice(to, 0, rung!);
  return next;
}

export function setRungEffort(chain: RungId[], index: number, effort: Effort): RungId[] {
  const parsed = parseRungId(chain[index] ?? '');
  if (!parsed) return chain;
  const next = [...chain];
  next[index] = `${parsed.stableId}@${effort}`;
  return next;
}

export function setParentDefault(policy: RoutingPolicy, surface: string, parent: ParentDefault): RoutingPolicy {
  const next = clonePolicy(policy) as RoutingPolicy & { parentDefaults: Record<string, ParentDefault> };
  next.parentDefaults[surface] = parent;
  return next;
}

export function setExcludedEfforts(policy: RoutingPolicy, efforts: Effort[]): RoutingPolicy {
  const next = clonePolicy(policy) as RoutingPolicy & { excludedEfforts: Effort[] };
  next.excludedEfforts = efforts;
  return next;
}

export function setExcludedModels(policy: RoutingPolicy, models: string[]): RoutingPolicy {
  const next = clonePolicy(policy) as RoutingPolicy & { excludedModels: string[] };
  next.excludedModels = models;
  return next;
}

export function setUpdated(policy: RoutingPolicy, updated: string): RoutingPolicy {
  const next = clonePolicy(policy) as RoutingPolicy & { updated: string };
  next.updated = updated;
  return next;
}

export interface RungOption {
  stableId: string;
  label: string;
  backend: ModelDefinition['transportBackend'];
  efforts: Effort[];
  defaultEffort: Effort;
  fixedEffort: Effort | null;
  maturity: ModelDefinition['maturity'];
  bound: boolean;
}

/** Models a chain may name: bound by the policy, present in the registry, not excluded. */
export function rungOptions(policy: RoutingPolicy, registry: readonly ModelDefinition[]): RungOption[] {
  const byId = new Map(registry.map((entry) => [entry.stableId, entry] as const));
  const seen = new Set<string>();
  const options: RungOption[] = [];
  for (const binding of policy.routeBindings) {
    if (seen.has(binding.stableId)) continue;
    seen.add(binding.stableId);
    const entry = byId.get(binding.stableId);
    if (!entry) continue;
    if (policy.excludedModels.includes(binding.stableId)) continue;
    const efforts = [...selectableEffortsFor(entry)];
    const preferred = binding.defaultEffort ?? entry.fixedEffort ?? (efforts.includes('high') ? 'high' : efforts[0]!);
    options.push({
      stableId: binding.stableId,
      label: policy.surfaces[binding.stableId]?.name ?? entry.displayName,
      backend: entry.transportBackend,
      efforts,
      defaultEffort: preferred,
      fixedEffort: entry.fixedEffort ?? null,
      maturity: entry.maturity,
      bound: true,
    });
  }
  return options;
}

export function effortsFor(stableId: string, policy: RoutingPolicy, registry: readonly ModelDefinition[]): Effort[] {
  const entry = registry.find((row) => row.stableId === stableId);
  if (!entry) return [];
  const surface = policy.surfaces[stableId];
  if (surface?.fixedEffort) return [surface.fixedEffort];
  return [...selectableEffortsFor(entry)];
}

export function displayName(stableId: string, policy: RoutingPolicy, registry: readonly ModelDefinition[]): string {
  return policy.surfaces[stableId]?.name ?? registry.find((row) => row.stableId === stableId)?.displayName ?? stableId;
}

export function backendOf(stableId: string, registry: readonly ModelDefinition[]): ModelDefinition['transportBackend'] {
  return registry.find((row) => row.stableId === stableId)?.transportBackend ?? null;
}

/** Number of distinct chains (phases, workloads, tail) routing to each rung. */
export function rungUsage(policy: RoutingPolicy): Map<RungId, number> {
  const usage = new Map<RungId, number>();
  for (const ref of chainRefs()) {
    for (const rung of new Set(chainOf(policy, ref))) {
      usage.set(rung, (usage.get(rung) ?? 0) + 1);
    }
  }
  return usage;
}

/** Chain labels that route to a stable id, for the benchmark table. */
export function chainsRoutingTo(policy: RoutingPolicy, stableId: string): string[] {
  const labels: string[] = [];
  for (const ref of chainRefs()) {
    if (chainOf(policy, ref).some((rung) => parseRungId(rung)?.stableId === stableId)) {
      labels.push(ref.kind === 'tail' ? 'tail' : ref.key);
    }
  }
  return labels;
}
