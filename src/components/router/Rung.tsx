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
  isFirst: boolean;
  isLast: boolean;
  onEffort: (effort: string) => void;
  onLeft: () => void;
  onRight: () => void;
  onRemove: () => void;
}

// Icon buttons: compact on fine pointers, 40px square tap targets on touch.
const BTN =
  'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-transparent text-[14px] leading-none text-muted ' +
  'hover:bg-chip disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent touch:h-10 touch:w-10 touch:text-[17px]';

export function Rung({ index, rung, policy, duplicate = false, isFirst, isLast, onEffort, onLeft, onRight, onRemove }: Props) {
  const [id, eff] = rung.split('@');
  const M = modelInfo(id);
  const ef = efforts(id);
  const lk = lookup(rung);
  // Warn border for a rung issue, or for a duplicate rung (which validate() reports on the chain).
  const flagged = rungIssue(rung, policy) !== null || duplicate;

  return (
    <li
      className={`flex w-full min-w-0 flex-col gap-1 rounded-[7px] border bg-surface py-[7px] pl-[10px] pr-1 sm:w-auto sm:min-w-[176px] ${
        flagged ? 'border-warnline' : 'border-line'
      }`}
    >
      <div className="flex min-w-0 items-center gap-[6px]">
        <span className="w-[10px] flex-none font-mono text-[10.5px] text-muted">{index}</span>
        <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: COLORS[M.backend] }} />
        <span className="min-w-0 truncate text-[13px] font-medium sm:whitespace-nowrap">{M.label}</span>
        <span className="flex-1" />
        {/* Chains stack vertically on phones, so reorder reads as up/down there and left/right when rungs flow inline. */}
        <button type="button" onClick={onLeft} disabled={isFirst} aria-label={`Move ${M.label} earlier`} title="Move earlier" className={`${BTN} hover:text-ink`}>
          <span className="sm:hidden">↑</span>
          <span className="hidden sm:inline">‹</span>
        </button>
        <button type="button" onClick={onRight} disabled={isLast} aria-label={`Move ${M.label} later`} title="Move later" className={`${BTN} hover:text-ink`}>
          <span className="sm:hidden">↓</span>
          <span className="hidden sm:inline">›</span>
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${M.label}`} title="Remove rung" className={`${BTN} hover:text-danger`}>
          ×
        </button>
      </div>
      <div className="flex items-center gap-2 pl-4">
        {ef.length > 1 ? (
          <select
            value={eff}
            onChange={(e) => onEffort(e.target.value)}
            aria-label={`${M.label} effort`}
            // 16px on touch devices stops iOS Safari from zooming the page when the select gains focus.
            className="rounded border border-line bg-bg px-[2px] py-px font-mono text-[11.5px] touch:text-[16px] touch:min-h-[40px] touch:px-2"
          >
            {ef.map((e) => (
              <option key={e} value={e}>
                @{e}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-mono text-[12.5px] text-muted2 sm:text-[11.5px]">@{eff}</span>
        )}
        <span
          title={
            lk
              ? `Artificial Analysis: ${lk.m.name} @${lk.p[0]}, Intelligence Index ${lk.p[1]}`
              : 'Not on the Artificial Analysis leaderboard'
          }
          className="whitespace-nowrap font-mono text-[12px] text-muted sm:text-[11.5px]"
        >
          {lk ? `${lk.p[1]} · ${fmtCost(lk.p[2])}` : 'not on AA'}
        </span>
      </div>
    </li>
  );
}
