import { useState } from 'react';
import { CANONICAL } from '../../canonical';
import type { BenchJoinRow } from '../../lib/bench-join';
import { modelColor } from '../../lib/colors';
import { fmtBand, fmtChains, fmtCost, fmtUsd } from '../../lib/format';
import type { SortDir, SortKey, TableView, Theme } from '../../types';
import { Segmented } from '../Segmented';
import { Badge } from '../ui/Badge';

interface Props {
  theme: Theme;
  hover: string | null;
  setHover: (h: string | null) => void;
  clearHover: () => void;
  rows: BenchJoinRow[];
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
  ['band', 'Capability', 'left'],
  ['binds', 'Registry rung', 'left'],
  ['routed', 'Routed in', 'right'],
];

const GRID = 'grid grid-cols-[minmax(200px,1.5fr)_56px_84px_72px_minmax(220px,1.4fr)_minmax(190px,1.2fr)_110px] gap-3';

function cmp(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function bestBand(row: BenchJoinRow): number {
  return Math.max(row.bands.swe ?? -1, row.bands.agenticEdit ?? -1);
}

export function DataTable({ theme, hover, setHover, clearHover, rows: allRows }: Props) {
  const [open, setOpen] = useState(true);
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

  const rows =
    view === 'best'
      ? [...new Map(allRows.map((row) => [row.bench.id, row] as const)).keys()].map((id) => {
          const candidates = allRows.filter((row) => row.bench.id === id);
          return [...candidates].sort((a, b) => b.point[1] - a.point[1] || (a.point[2] ?? 0) - (b.point[2] ?? 0))[0]!;
        })
      : [...allRows];

  const sk: Record<SortKey, (r: BenchJoinRow) => number | string> = {
    score: (r) => r.point[1],
    cost: (r) => r.point[2] ?? 999,
    speed: (r) => r.point[3] ?? -1,
    name: (r) => r.bench.name,
    routed: (r) => r.routedIn,
    binds: (r) => r.rungId ?? '~',
    band: (r) => bestBand(r),
  };
  const get = sk[sortKey];
  rows.sort((a, b) => cmp(get(a), get(b)) * sortDir || b.point[1] - a.point[1]);

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-[14px]">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex cursor-pointer items-center gap-[6px] p-0 text-[13px] font-medium text-ink">
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
          <div className="min-w-[1040px]">
            <div className={`${GRID} border-b border-line px-4 py-[10px] text-[12px] text-muted`}>
              {HEADERS.map(([k, label, align]) => (
                <button key={k} type="button" onClick={() => onSort(k)} className={`cursor-pointer p-0 ${sortKey === k ? 'text-ink' : 'text-muted'} ${align === 'right' ? 'text-right' : 'text-left'}`}>
                  {label}
                  {sortKey === k ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}
                </button>
              ))}
            </div>
            {rows.map((row) => {
              const { bench: m, point: p, key } = row;
              const n = row.routedIn;
              const measurement = row.measurements[0] ?? null;
              return (
                <div key={key} onMouseEnter={() => setHover(key)} onMouseLeave={clearHover} className={`${GRID} items-center border-b border-line2 px-4 py-[9px] ${hover === key ? 'bg-bg' : 'bg-transparent'}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: modelColor(m.id, theme) }} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium">{m.name}</span>
                    <span className="rounded bg-chip px-[6px] py-px font-mono text-[11px] text-muted2">{p[0]}</span>
                  </div>
                  <div className="text-right font-mono font-medium">{p[4] ? p[1] + '*' : p[1]}</div>
                  <div className="text-right font-mono">{fmtCost(p[2])}</div>
                  <div className="text-right font-mono">{p[3] != null ? p[3] + ' t/s' : '—'}</div>
                  <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11.5px]">
                    {row.snapshotRung ? (
                      <>
                        <Badge tone={row.bands.swe != null ? 'info' : 'muted'} title="DeepSWE (swe axis)">swe {fmtBand(row.bands.swe)}</Badge>
                        <Badge tone={row.bands.agenticEdit != null ? 'info' : 'muted'} title="CursorBench (agentic-edit axis)">edit {fmtBand(row.bands.agenticEdit)}</Badge>
                        <span className="font-mono text-[10.5px] text-muted" title={measurement?.sourceUrl ?? undefined}>{measurement ? `${measurement.source} · ${measurement.retrievedAt}` : ''}</span>
                        <span className="font-mono text-[10.5px] text-muted">{row.costPriorUsd != null ? `prior ${fmtUsd(row.costPriorUsd)}` : 'cost prior unknown'}</span>
                      </>
                    ) : (
                      <Badge tone="muted" title="Not in the capability snapshot: unknown capability, not low capability">unranked in {CANONICAL.snapshot.snapshotVersion.split('+')[0]}</Badge>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-[2px] font-mono text-[11.5px]">
                    {row.resolution ? (
                      <>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{row.rungId}</span>
                        <span className="text-[10.5px] text-muted">{row.resolution.entry.transportBackend} · {row.maturity} · efforts {row.efforts.join('/')}{row.priceBand ? ` · ${row.priceBand}` : ''}</span>
                      </>
                    ) : (
                      <Badge tone="warn" mono={false}>not in registry (not routable)</Badge>
                    )}
                  </div>
                  <div className={`text-right font-mono text-[12px] ${n ? 'text-ink' : 'text-muted'}`} title={row.chains.join(', ') || undefined}>{n ? fmtChains(n) : '—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {open && (
        <p className="m-0 max-w-[880px] text-pretty text-[12.5px] text-muted">
          Index, cost per task, and speed are Artificial Analysis leaderboard figures (editorial). Capability bands, benchmark source, retrieval date, and cost priors come from the runtime's capability snapshot; a row without a snapshot rung is unranked, which is not the same as low capability, and a missing cost prior is unknown, not cheap. Registry rung shows the transport, maturity, and selectable efforts from the model registry; a leaderboard row that is not in the registry cannot be routed. Rows marked * are leaderboard estimates.
        </p>
      )}
    </div>
  );
}
