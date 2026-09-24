import { PARENT_EFFORTS, PARENT_MODELS } from '../../data/models';
import type { Policy, PolicyUpdater } from '../../types';

interface Props {
  policy: Policy;
  setPolicy: PolicyUpdater;
}

const ROWS: [string, 'pi' | 'cc', string][] = [
  ['ARC Pi', 'pi', 'pi'],
  ['Claude Code', 'cc', 'claude-code'],
];

const SELECT = 'rounded-md border border-line bg-surface px-2 py-[6px] font-mono text-[12.5px]';

export function ParentDefaults({ policy, setPolicy }: Props) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">Parent defaults</h2>
      <p className="mb-2 mt-0 text-[13px] text-muted">The model each parent surface launches with.</p>
      {ROWS.map(([label, k, key]) => {
        const [model, effort] = policy.parent[k].split('@');
        return (
          <div key={k} className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-4 border-t border-line py-3">
            <div>
              <div className="font-medium">{label}</div>
              <div className="font-mono text-[11px] text-muted">parent-default {key}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={model}
                onChange={(e) => {
                  const v = e.target.value;
                  setPolicy((p) => {
                    p.parent[k] = v + '@' + effort;
                  });
                }}
                className={SELECT}
              >
                {PARENT_MODELS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                value={effort}
                onChange={(e) => {
                  const v = e.target.value;
                  setPolicy((p) => {
                    p.parent[k] = model + '@' + v;
                  });
                }}
                className={SELECT}
              >
                {PARENT_EFFORTS.map((o) => (
                  <option key={o} value={o}>
                    @{o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </section>
  );
}
