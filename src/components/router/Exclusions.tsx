import type { Policy, PolicyUpdater } from '../../types';
import { ROW, Section } from './Section';

interface Props {
  policy: Policy;
  setPolicy: PolicyUpdater;
}

export function Exclusions({ policy, setPolicy }: Props) {
  return (
    <Section id="exclusions" title="Exclusions" desc="Identifiers that must not appear in any automatic chain.">
      <div className={`${ROW} sm:items-center`}>
        <div className="font-mono text-[12px]">exclude-models</div>
        <div className="flex flex-wrap gap-[6px]">
          {policy.excludeModels.map((m) => (
            <span key={m} className="rounded-[5px] bg-chip px-2 py-[3px] font-mono text-[12px]">
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className={`${ROW} sm:items-center`}>
        <div className="font-mono text-[12px]">exclude-efforts</div>
        <div className="flex flex-wrap gap-[6px]">
          {(['xhigh', 'max'] as const).map((v) => {
            const on = policy.excludeEfforts.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setPolicy((p) => {
                    p.excludeEfforts = on ? p.excludeEfforts.filter((x) => x !== v) : [...p.excludeEfforts, v];
                  })
                }
                className={`cursor-pointer rounded-[5px] border px-[10px] py-[3px] font-mono text-[12px] touch:min-h-[40px] touch:min-w-[64px] touch:px-4 ${
                  on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
