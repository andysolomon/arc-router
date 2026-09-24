import { COLORS } from '../../data/bench';
import { modelInfo } from '../../data/models';
import { efforts } from '../../lib/efforts';
import { fmtCost } from '../../lib/format';
import { lookup } from '../../lib/lookup';
import { rungIssue } from '../../lib/validate';
import type { Policy } from '../../types';

interface Props {
  index: number;
  rung: string;
  policy: Policy;
  /** rung string occurs more than once in its chain */
  duplicate?: boolean;
  onEffort: (effort: string) => void;
  onLeft: () => void;
  onRight: () => void;
  onRemove: () => void;
}

const BTN = 'cursor-pointer bg-transparent px-[3px] py-0 text-[13px] leading-none text-muted';

export function Rung({ index, rung, policy, duplicate = false, onEffort, onLeft, onRight, onRemove }: Props) {
  const [id, eff] = rung.split('@');
  const M = modelInfo(id);
  const ef = efforts(id);
  const lk = lookup(rung);
  // Warn border for a rung issue, or for a duplicate rung (which validate() reports on the chain).
  const flagged = rungIssue(rung, policy) !== null || duplicate;

  return (
    <div
      className={`flex min-w-[168px] flex-col gap-1 rounded-[7px] border bg-surface py-[7px] pl-[10px] pr-[6px] ${
        flagged ? 'border-warnline' : 'border-line'
      }`}
    >
      <div className="flex items-center gap-[6px]">
        <span className="font-mono text-[10.5px] text-muted">{index}</span>
        <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: COLORS[M.backend] }} />
        <span className="whitespace-nowrap text-[13px] font-medium">{M.label}</span>
        <span className="flex-1" />
        <button type="button" onClick={onLeft} title="Move earlier" className={`${BTN} hover:text-ink`}>
          ‹
        </button>
        <button type="button" onClick={onRight} title="Move later" className={`${BTN} hover:text-ink`}>
          ›
        </button>
        <button type="button" onClick={onRemove} title="Remove rung" className={`${BTN} hover:text-danger`}>
          ×
        </button>
      </div>
      <div className="flex items-center gap-2 pl-4">
        {ef.length > 1 ? (
          <select
            value={eff}
            onChange={(e) => onEffort(e.target.value)}
            className="rounded border border-line bg-bg px-[2px] py-px font-mono text-[11.5px]"
          >
            {ef.map((e) => (
              <option key={e} value={e}>
                @{e}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-mono text-[11.5px] text-muted2">@{eff}</span>
        )}
        <span
          title={
            lk
              ? `Artificial Analysis: ${lk.m.name} @${lk.p[0]}, Intelligence Index ${lk.p[1]}`
              : 'Not on the Artificial Analysis leaderboard'
          }
          className="whitespace-nowrap font-mono text-[11.5px] text-muted"
        >
          {lk ? `${lk.p[1]} · ${fmtCost(lk.p[2])}` : 'not on AA'}
        </span>
      </div>
    </div>
  );
}
