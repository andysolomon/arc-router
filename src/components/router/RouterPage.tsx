import { useCallback, useMemo } from 'react';
import { modelInfo, PHASES, WORKLOADS } from '../../data/models';
import { getList } from '../../lib/policy';
import { validate } from '../../lib/validate';
import type { ListPath, Policy, PolicyUpdater } from '../../types';
import { ChainGroup, type ChainSpec } from './ChainGroup';
import { Exclusions } from './Exclusions';
import { ParentDefaults } from './ParentDefaults';
import { PolicyPanel } from './PolicyPanel';

interface Props {
  policy: Policy;
  setPolicy: PolicyUpdater;
  reset: () => void;
  updatedDate: string;
}

export type EditList = (path: ListPath, fn: (list: string[]) => void) => void;

export function RouterPage({ policy, setPolicy, reset, updatedDate }: Props) {
  const editList = useCallback<EditList>((path, fn) => setPolicy((p) => fn(getList(p, path))), [setPolicy]);

  const warnCount = useMemo(() => {
    let n = 0;
    for (const ph of PHASES) n += validate(policy.phases[ph], false, policy).length;
    for (const w of WORKLOADS) n += validate(policy.workloads[w], false, policy).length;
    n += validate(policy.tail, true, policy).length;
    return n;
  }, [policy]);

  const tailText = policy.tail.map((r) => modelInfo(r.split('@')[0]).label).join(' · ') || 'none';

  const phaseChains: ChainSpec[] = [
    { key: 'analyze', label: 'analyze', sub: 'parent-local', hasTail: false },
    ...PHASES.map<ChainSpec>((ph) => ({ key: ph, label: ph, sub: 'phase', path: { kind: 'phases', key: ph }, hasTail: true })),
  ];
  const workloadChains = WORKLOADS.map<ChainSpec>((w) => ({
    key: w,
    label: w.replace('-', ' · '),
    sub: 'workload ' + w,
    path: { kind: 'workloads', key: w },
    hasTail: true,
  }));
  const tailChains: ChainSpec[] = [{ key: 'tail', label: 'tail', sub: 'all stacks', path: { kind: 'tail' }, hasTail: false }];

  return (
    <main className="mx-auto flex max-w-[1440px] flex-wrap items-start gap-10 px-8 pb-24 pt-10">
      <div className="flex min-w-0 flex-[1_1_640px] flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[28px] font-semibold leading-[1.2] tracking-[-0.025em]">Router configuration</h1>
          <p className="m-0 max-w-[680px] text-pretty text-muted">
            Edits the fenced arc-model-policy block, the single authoritative routing input for ARC Pi and the arc-orchestrator runner.
            Rung order is fallback order. Each rung shows its Artificial Analysis Intelligence Index and cost per task.
          </p>
        </div>

        <ParentDefaults policy={policy} setPolicy={setPolicy} />

        <ChainGroup
          title="Phases"
          desc="Worker chains per lifecycle phase. Fallback is availability-only: task, malformed-output, and verification failures on any rung are terminal."
          chains={phaseChains}
          policy={policy}
          editList={editList}
          tailText={tailText}
        />
        <ChainGroup
          title="Implement workloads"
          desc="Implement chains keyed by the nine canonical workload classes, difficulty then size."
          chains={workloadChains}
          policy={policy}
          editList={editList}
          tailText={tailText}
        />
        <ChainGroup
          title="Emergency tail"
          desc="Availability-only rungs appended to every automatic worker stack. The last rung is terminal."
          chains={tailChains}
          policy={policy}
          editList={editList}
          tailText={tailText}
        />

        <Exclusions policy={policy} setPolicy={setPolicy} />
      </div>

      <PolicyPanel policy={policy} updatedDate={updatedDate} warnCount={warnCount} onReset={reset} />
    </main>
  );
}
