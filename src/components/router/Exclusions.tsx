import type { Policy, PolicyUpdater } from '../../types';

interface Props {
  policy: Policy;
  setPolicy: PolicyUpdater;
}

const ROW = 'grid grid-cols-[140px_minmax(0,1fr)] items-center gap-4 border-t border-line py-3';

export function Exclusions({ policy, setPolicy }: Props) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">Exclusions</h2>
      <p className="mb-2 mt-0 text-[13px] text-muted">Identifiers that must not appear in any automatic chain.</p>
      <div className={ROW}>
        <div className="font-mono text-[12px]">exclude-models</div>
        <div className="flex flex-wrap gap-[6px]">
          {policy.excludeModels.map((m) => (
            <span key={m} className="rounded-[5px] bg-chip px-2 py-[3px] font-mono text-[12px]">
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className={ROW}>
        <div className="font-mono text-[12px]">exclude-efforts</div>
        <div className="flex flex-wrap gap-[6px]">
          {(['xhigh', 'max'] as const).map((v) => {
            const on = policy.excludeEfforts.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() =>
                  setPolicy((p) => {
                    p.excludeEfforts = on ? p.excludeEfforts.filter((x) => x !== v) : [...p.excludeEfforts, v];
                  })
                }
                className={`cursor-pointer rounded-[5px] border px-[10px] py-[3px] font-mono text-[12px] ${
                  on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
