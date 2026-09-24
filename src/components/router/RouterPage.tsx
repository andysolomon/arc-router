import { useCallback, useMemo } from 'react';
import { modelInfo, PHASES, WORKLOADS } from '../../data/models';
import { useCopy } from '../../hooks/useCopy';
import { diff as computeDiff, getList } from '../../lib/policy';
import { validate } from '../../lib/validate';
import type { ListPath, Policy, PolicyUpdater } from '../../types';
import { ChainGroup, type ChainSpec } from './ChainGroup';
import { Exclusions } from './Exclusions';
import { ParentDefaults } from './ParentDefaults';
import { PolicyPanel } from './PolicyPanel';

const SECTIONS: [string, string][] = [
  ['parent', 'Parent'],
  ['phases', 'Phases'],
  ['workloads', 'Workloads'],
  ['tail', 'Tail'],
  ['exclusions', 'Exclusions'],
  ['policy', 'Policy'],
];

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

  const diff = useMemo(() => computeDiff(policy, updatedDate), [policy, updatedDate]);
  const { copied, copy } = useCopy('```arc-model-policy\n' + diff.full + '\n```');

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
    // Below lg the policy panel follows the editor and a fixed action bar keeps copy in reach; lg+ puts it in a sticky column.
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-8 px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-10">
      <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">Router configuration</h1>
          <p className="m-0 max-w-[680px] text-pretty text-[13.5px] text-muted sm:text-[14px]">
            Edits the fenced arc-model-policy block, the single authoritative routing input for ARC Pi and the arc-orchestrator runner.
            Rung order is fallback order. Each rung shows its Artificial Analysis Intelligence Index and cost per task.
          </p>
        </div>

        <SectionNav />

        <ParentDefaults policy={policy} setPolicy={setPolicy} />

        <ChainGroup
          id="phases"
          title="Phases"
          desc="Worker chains per lifecycle phase. Fallback is availability-only: task, malformed-output, and verification failures on any rung are terminal."
          chains={phaseChains}
          policy={policy}
          editList={editList}
          tailText={tailText}
        />
        <ChainGroup
          id="workloads"
          title="Implement workloads"
          desc="Implement chains keyed by the nine canonical workload classes, difficulty then size."
          chains={workloadChains}
          policy={policy}
          editList={editList}
          tailText={tailText}
        />
        <ChainGroup
          id="tail"
          title="Emergency tail"
          desc="Availability-only rungs appended to every automatic worker stack. The last rung is terminal."
          chains={tailChains}
          policy={policy}
          editList={editList}
          tailText={tailText}
        />

        <Exclusions policy={policy} setPolicy={setPolicy} />
      </div>

      <PolicyPanel diff={diff} warnCount={warnCount} copied={copied} onCopy={copy} onReset={reset} />

      <ActionBar changes={diff.changes} warnCount={warnCount} copied={copied} onCopy={copy} />
    </main>
  );
}

/** Sticky jump links, below lg only: the page is long on phones and the policy panel sits at the very end. */
function SectionNav() {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden"
    >
      <ul className="scrollbar-none m-0 flex list-none gap-[6px] overflow-x-auto p-0">
        {SECTIONS.map(([id, label]) => (
          <li key={id} className="flex-none">
            <a
              href={`#${id}`}
              className="inline-flex min-h-[32px] items-center rounded-full border border-line bg-surface px-3 text-[12.5px] text-muted2 no-underline touch:min-h-[40px]"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface ActionBarProps {
  changes: number;
  warnCount: number;
  copied: boolean;
  onCopy: () => void;
}

/** Fixed bottom bar below lg: change and warning status plus the primary action, respecting the iOS home indicator. */
function ActionBar({ changes, warnCount, copied, onCopy }: ActionBarProps) {
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur sm:px-6 lg:hidden">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3">
        <a href="#policy" className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center text-[12px] leading-tight no-underline">
          <span className={changes ? 'font-medium text-add-ink' : 'text-muted'}>
            {changes ? `${changes} line${changes > 1 ? 's' : ''} changed` : 'Matches main'}
          </span>
          <span className={warnCount ? 'text-warn' : 'text-muted'}>
            {warnCount ? `${warnCount} warning${warnCount > 1 ? 's' : ''}` : 'No warnings'} · review ↓
          </span>
        </a>
        <button
          type="button"
          onClick={onCopy}
          className="min-h-[44px] flex-none cursor-pointer rounded-md bg-ink px-5 text-[14px] font-medium text-bg"
        >
          {copied ? 'Copied' : 'Copy block'}
        </button>
      </div>
    </div>
  );
}
