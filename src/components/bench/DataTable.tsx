import { useState } from 'react';
import { BENCH } from '../../data/bench';
import { modelColor } from '../../lib/colors';
import { fmtChains, fmtCost } from '../../lib/format';
import type { BenchModel, BenchPoint, SortDir, SortKey, TableView, Theme, Usage } from '../../types';
import { Segmented } from '../Segmented';

interface Props {
  theme: Theme;
  hover: string | null;
  setHover: (h: string | null) => void;
  clearHover: () => void;
  usage: Usage;
}

interface Row {
  m: BenchModel;
  p: BenchPoint;
  key: string;
}

const VIEW_OPTS = [
  ['all', 'All efforts'],
  ['best', 'Best per model'],
] as const;

const HEADERS: [SortKey, string, 'left' | 'right'][] = [
  ['name', 'Model', 'left'],
  ['score', 'Index', 'right'],
  ['cost', 'Cost / task', 'right'],
  ['speed', 'Speed', 'right'],
  ['binds', 'arc binding', 'left'],
  ['routed', 'Routed in', 'right'],
];

const GRID = 'grid grid-cols-[minmax(200px,1.5fr)_64px_92px_80px_minmax(170px,1.2fr)_88px] gap-3';

function cmp(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export function DataTable({ theme, hover, setHover, clearHover, usage }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<TableView>('all');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>(-1);

  const onSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(k);
      setSortDir(k === 'name' || k === 'binds' || k === 'cost' ? 1 : -1);
    }
  };

  const rows: Row[] =
    view === 'best'
      ? BENCH.map((m) => {
          const p = [...m.pts].sort((a, b) => b[1] - a[1] || (a[2] ?? 0) - (b[2] ?? 0))[0];
          return { m, p, key: `${m.id}@${p[0]}` };
        })
      : BENCH.flatMap((m) => m.pts.map((p) => ({ m, p, key: `${m.id}@${p[0]}` })));

  const sk: Record<SortKey, (r: Row) => number | string> = {
    score: (r) => r.p[1],
    cost: (r) => r.p[2] ?? 999,
    speed: (r) => r.p[3] ?? -1,
    name: (r) => r.m.name,
    routed: (r) => usage[r.key] ?? 0,
    binds: (r) => r.m.binds,
  };
  const get = sk[sortKey];
  rows.sort((a, b) => cmp(get(a), get(b)) * sortDir || b.p[1] - a.p[1]);

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-[14px]">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex cursor-pointer items-center gap-[6px] p-0 text-[13px] font-medium text-ink"
        >
          <span className="text-[10px] text-muted">{open ? '▼' : '▶'}</span>Data table
        </button>
        {open && (
          <>
            <Segmented options={VIEW_OPTS} value={view} onChange={setView} />
            <span className="font-mono text-[12px] text-muted">{rows.length} configs</span>
          </>
        )}
      </div>
      {open && (
        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <div className="min-w-[820px]">
            <div className={`${GRID} border-b border-line px-4 py-[10px] text-[12px] text-muted`}>
              {HEADERS.map(([k, label, align]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onSort(k)}
                  className={`cursor-pointer p-0 ${sortKey === k ? 'text-ink' : 'text-muted'} ${align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {label}
                  {sortKey === k ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}
                </button>
              ))}
            </div>
            {rows.map(({ m, p, key }) => {
              const n = usage[key] ?? 0;
              return (
                <div
                  key={key}
                  onMouseEnter={() => setHover(key)}
                  onMouseLeave={clearHover}
                  className={`${GRID} items-center border-b border-line2 px-4 py-[9px] ${hover === key ? 'bg-bg' : 'bg-transparent'}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: modelColor(m.id, theme) }} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium">{m.name}</span>
                    <span className="rounded bg-chip px-[6px] py-px font-mono text-[11px] text-muted2">{p[0]}</span>
                  </div>
                  <div className="text-right font-mono font-medium">{p[4] ? p[1] + '*' : p[1]}</div>
                  <div className="text-right font-mono">{fmtCost(p[2])}</div>
                  <div className="text-right font-mono">{p[3] != null ? p[3] + ' t/s' : '—'}</div>
                  <div className="flex min-w-0 items-center gap-[6px] font-mono text-[12px]">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{m.binds}</span>
                  </div>
                  <div className={`text-right font-mono text-[12px] ${n ? 'text-ink' : 'text-muted'}`}>{n ? fmtChains(n) : '—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {open && (
        <p className="m-0 max-w-[820px] text-pretty text-[12.5px] text-muted">
          Each model shows low and high (medium is never routed); GPT-6 Luna, GPT-5.6 Luna, GLM 5.3 Flash, and DeepSeek V4.1 Flash also
          show max. Muse Spark 1.3 is published at xhigh and max only (the router binds xhigh). Rows appear only where Artificial Analysis publishes that effort, so several OpenCode Go models have a single row.
          MiniMax M3 is published as one configuration with no effort levels. Kimi K3 is published at low and max only; its low score is
          an estimate (*) with no cost, so it appears in the table and speed chart but not the cost chart. Not on the leaderboard:
          GPT-5.5, Opus 4.8, Cursor Composer 2.5, Cursor Auto, Muse Spark 1.2, and GLM 5.2. Speed is blank where Artificial Analysis
          hasn't published it.
        </p>
      )}
    </div>
  );
}
