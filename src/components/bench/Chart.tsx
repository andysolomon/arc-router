import { useMemo } from 'react';
import { BENCH, PAL } from '../../data/bench';
import { useResizeWidth } from '../../hooks/useResizeWidth';
import { modelColor } from '../../lib/colors';
import { fmtChains, fmtCost } from '../../lib/format';
import { placeLabels, type Box, type LabelInput } from '../../lib/labels';
import { xScale, yScale } from '../../lib/scale';
import type { BenchModel, BenchPoint, Metric, Scale, Theme, Usage } from '../../types';

interface Props {
  metric: Metric;
  scale: Scale;
  theme: Theme;
  hover: string | null;
  setHover: (h: string | null) => void;
  clearHover: () => void;
  usage: Usage;
  /** Ring dots whose `model@effort` is routed by the current policy (default on). */
  ringRouted?: boolean;
}

interface Pt {
  m: BenchModel;
  p: BenchPoint;
  x: number;
  key: string;
}

const ML = 44;
const MR = 12;
const MT = 8;
const MB = 48;

const AXIS_LABEL: Record<Metric, string> = { cost: 'Cost per task (USD)', speed: 'Output speed (tokens/s)' };

export function Chart({ metric, scale, theme, hover, setHover, clearHover, usage, ringRouted = true }: Props) {
  const [ref, width] = useResizeWidth<HTMLDivElement>(960);
  const W = Math.max(360, width);
  const H = W < 640 ? 360 : 480;
  const pw = W - ML - MR;
  const ph = H - MT - MB;
  const mi = metric === 'speed' ? 3 : 2;
  const fmtX = (v: number) => (metric === 'cost' ? '$' + v : v + ' t/s');

  const geo = useMemo(() => {
    const all: Pt[] = [];
    const byModel = new Map<string, Pt[]>();
    for (const m of BENCH) {
      const ps: Pt[] = [];
      for (const p of m.pts) {
        const x = p[mi];
        if (x != null) {
          const pt: Pt = { m, p, x, key: `${m.id}@${p[0]}` };
          all.push(pt);
          ps.push(pt);
        }
      }
      byModel.set(m.id, ps);
    }
    const { X, ticks: xt } = xScale(metric, scale, all.map((a) => a.x), ML, pw);
    const { Y, ticks: yt } = yScale(all.map((a) => a.p[1]), MT, ph);
    const xTicks = xt.map((v) => ({ v, x: X(v) }));
    const yTicks = yt.map((v) => ({ v, y: Y(v) }));
    const series = [...byModel.values()]
      .filter((ps) => ps.length > 1)
      .map((ps) => ({ m: ps[0].m, points: ps.map((a) => `${X(a.x).toFixed(1)},${Y(a.p[1]).toFixed(1)}`).join(' ') }));
    const dots = all.map((a) => {
      const ps = byModel.get(a.m.id) ?? [];
      return { ...a, cx: X(a.x), cy: Y(a.p[1]), last: ps[ps.length - 1] === a };
    });
    const obstacles: Box[] = dots.map((d) => ({ x0: d.cx - 10, y0: d.cy - 10, x1: d.cx + 10, y1: d.cy + 10 }));
    const labelInputs: LabelInput[] = [...byModel.values()]
      .filter((ps) => ps.length > 0)
      .map((ps) => {
        const last = ps[ps.length - 1];
        return { id: last.m.id, text: last.m.name, cx: X(last.x), cy: Y(last.p[1]), w: last.m.name.length * 7.2 + 4 };
      });
    const labels = placeLabels(labelInputs, obstacles, { x0: ML, y0: MT, x1: ML + pw, y1: MT + ph });
    return { X, Y, xTicks, yTicks, series, dots, labels };
  }, [metric, scale, mi, pw, ph]);

  const hovM = hover ? hover.split('@')[0] : null;
  const dim = (id: string) => (hovM && hovM !== id ? 0.28 : 1);

  let tip: {
    left: number;
    top: number;
    transform: string;
    name: string;
    effort: string;
    score: string;
    cost: string;
    speed: string;
    binds: string;
    routed: string;
  } | null = null;
  if (hover) {
    const [mid, eff] = hover.split('@');
    const m = BENCH.find((b) => b.id === mid);
    const p = m?.pts.find((x) => x[0] === eff);
    const xv = p ? p[mi] : null;
    if (m && p && xv != null) {
      const cx = geo.X(xv);
      const cy = geo.Y(p[1]);
      const n = usage[hover] ?? 0;
      const tx = cx < 120 ? '0%' : cx > W - 140 ? '-100%' : '-50%';
      const below = cy < 190;
      tip = {
        left: cx,
        top: below ? cy + 16 : cy - 14,
        transform: `translate(${tx}, ${below ? '0' : '-100%'})`,
        name: m.name,
        effort: p[0],
        score: p[4] ? p[1] + ' (estimated)' : String(p[1]),
        cost: fmtCost(p[2]),
        speed: p[3] != null ? p[3] + ' t/s' : 'no data',
        binds: m.binds,
        routed: n ? fmtChains(n) : 'not routed',
      };
    }
  }

  const tickLabel = 'pointer-events-none absolute whitespace-nowrap font-mono text-[11px] text-muted';

  return (
    <>
      <div className="font-mono text-[11px] text-muted" style={{ paddingLeft: ML }}>
        Intelligence Index
      </div>
      <div ref={ref} onMouseLeave={clearHover} className="relative min-h-[340px] w-full">
        <svg width={W} height={H} className="block font-mono">
          <rect x={ML} y={MT} width={pw} height={ph} style={{ fill: 'none', stroke: 'var(--line)', strokeWidth: 1 }} />
          {geo.yTicks.map((t) => (
            <line key={`y${t.v}`} x1={ML} x2={ML + pw} y1={t.y} y2={t.y} style={{ stroke: 'var(--grid)', strokeWidth: 1 }} />
          ))}
          {geo.xTicks.map((t) => (
            <line key={`x${t.v}`} x1={t.x} x2={t.x} y1={MT} y2={MT + ph} style={{ stroke: 'var(--grid)', strokeWidth: 1 }} />
          ))}
          {geo.series.map((s) => (
            <g key={s.m.id}>
              <polyline
                points={s.points}
                style={{
                  fill: 'none',
                  stroke: modelColor(s.m.id, theme),
                  strokeWidth: hovM === s.m.id ? 2.5 : 1.5,
                  strokeDasharray: (PAL[s.m.id] ?? [])[1] ? '5 4' : 'none',
                  opacity: dim(s.m.id),
                  pointerEvents: 'none',
                }}
              />
              <polyline
                points={s.points}
                onMouseEnter={() => setHover(s.m.id + '@')}
                onMouseLeave={clearHover}
                style={{ fill: 'none', stroke: 'rgba(0,0,0,0)', strokeWidth: 14, pointerEvents: 'stroke', cursor: 'pointer' }}
              />
            </g>
          ))}
          {geo.dots.map((d) => {
            const color = modelColor(d.m.id, theme);
            return (
              <g key={d.key}>
                <circle
                  cx={d.cx}
                  cy={d.cy}
                  r={8.5}
                  style={{ fill: 'none', stroke: color, strokeWidth: 1.25, opacity: ringRouted && usage[d.key] ? dim(d.m.id) : 0 }}
                />
                <circle
                  cx={d.cx}
                  cy={d.cy}
                  r={(d.last ? 5 : 3.5) + (hover === d.key ? 1.5 : 0)}
                  onMouseEnter={() => setHover(d.key)}
                  onMouseLeave={clearHover}
                  style={{ fill: color, stroke: 'var(--bg)', strokeWidth: 1.5, cursor: 'pointer', opacity: dim(d.m.id) }}
                />
              </g>
            );
          })}
        </svg>

        {geo.yTicks.map((t) => (
          <div key={`yl${t.v}`} className={tickLabel} style={{ left: ML - 8, top: t.y, transform: 'translate(-100%,-50%)' }}>
            {t.v}
          </div>
        ))}
        {geo.xTicks.map((t) => (
          <div key={`xl${t.v}`} className={tickLabel} style={{ left: t.x, top: MT + ph + 14, transform: 'translate(-50%,-50%)' }}>
            {fmtX(t.v)}
          </div>
        ))}
        {geo.labels.map((l) => (
          <div
            key={l.id}
            onMouseEnter={() => setHover(l.id + '@')}
            onMouseLeave={clearHover}
            className="absolute cursor-pointer whitespace-nowrap py-[3px] text-[12px] leading-none"
            style={{
              left: l.x,
              top: l.y,
              transform: l.side < 0 ? 'translate(-100%,-50%)' : 'translate(0,-50%)',
              fontWeight: hovM === l.id ? 600 : 500,
              color: modelColor(l.id, theme),
              opacity: l.hidden ? (hovM === l.id ? 1 : 0) : dim(l.id),
              pointerEvents: l.hidden ? 'none' : 'auto',
            }}
          >
            {l.text}
          </div>
        ))}
        <div className={tickLabel} style={{ left: ML + pw / 2, top: H - 10, transform: 'translate(-50%,-50%)' }}>
          {AXIS_LABEL[metric]}
        </div>

        {tip && (
          <div
            className="pointer-events-none absolute min-w-[200px] rounded-lg bg-ink px-3 py-[10px] text-[12px] leading-[1.55] text-bg shadow-tip"
            style={{ left: tip.left, top: tip.top, transform: tip.transform }}
          >
            <div className="text-[13px] font-semibold">
              {tip.name} <span className="font-mono font-normal opacity-70">@{tip.effort}</span>
            </div>
            <div className="mt-1 grid grid-cols-[auto_auto] gap-x-[14px] font-mono">
              <span className="opacity-70">Intelligence</span>
              <span>{tip.score}</span>
              <span className="opacity-70">Cost / task</span>
              <span>{tip.cost}</span>
              <span className="opacity-70">Output speed</span>
              <span>{tip.speed}</span>
              <span className="opacity-70">arc binding</span>
              <span>{tip.binds}</span>
              <span className="opacity-70">Routed in</span>
              <span>{tip.routed}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
