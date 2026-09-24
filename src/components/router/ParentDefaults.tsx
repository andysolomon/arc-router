import { PARENT_EFFORTS, PARENT_MODELS } from '../../data/models';
import type { Policy, PolicyUpdater } from '../../types';
import { ROW, Section } from './Section';

interface Props {
  policy: Policy;
  setPolicy: PolicyUpdater;
}

const ROWS: [string, 'pi' | 'cc', string][] = [
  ['ARC Pi', 'pi', 'pi'],
  ['Claude Code', 'cc', 'claude-code'],
];

// 16px text on touch devices prevents iOS focus zoom; selects share the row evenly there.
const SELECT =
  'min-w-0 rounded-md border border-line bg-surface px-2 py-[6px] font-mono text-[12.5px] touch:min-h-[44px] touch:text-[16px]';

export function ParentDefaults({ policy, setPolicy }: Props) {
  return (
    <Section id="parent" title="Parent defaults" desc="The model each parent surface launches with.">
      {ROWS.map(([label, k, key]) => {
        const [model, effort] = policy.parent[k].split('@');
        return (
          <div key={k} className={`${ROW} sm:items-center`}>
            <div className="flex items-baseline gap-2 sm:block">
              <div className="font-medium">{label}</div>
              <div className="font-mono text-[11px] text-muted">parent-default {key}</div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap">
              <select
                value={model}
                aria-label={`${label} model`}
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
                aria-label={`${label} effort`}
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
    </Section>
  );
}
