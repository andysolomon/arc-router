import { useCallback, useMemo, useState } from 'react';
import { usage as computeUsage } from '../../lib/lookup';
import type { Metric, Policy, Scale, Theme } from '../../types';
import { Segmented } from '../Segmented';
import { Chart } from './Chart';
import { DataTable } from './DataTable';
import { Legend } from './Legend';

interface Props {
  policy: Policy;
  theme: Theme;
}

const METRIC_OPTS = [
  ['cost', 'Cost per task'],
  ['speed', 'Output speed'],
] as const;

const SCALE_OPTS = [
  ['linear', 'Linear'],
  ['log', 'Log'],
] as const;

const METRIC_LABEL: Record<Metric, string> = { cost: 'cost per task', speed: 'output speed' };

export function BenchPage({ policy, theme }: Props) {
  const [metric, setMetric] = useState<Metric>('cost');
  const [scale, setScale] = useState<Scale>('linear');
  const [hover, setHoverState] = useState<string | null>(null);
  const usage = useMemo(() => computeUsage(policy), [policy]);

  const setHover = useCallback((h: string | null) => setHoverState(h), []);
  const clearHover = useCallback(() => setHoverState((h) => (h ? null : h)), []);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-7 px-8 pb-24 pt-10">
      <div className="flex flex-col gap-[14px]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 flex-[1_1_auto] text-[28px] font-semibold leading-[1.2] tracking-[-0.025em]">
            Intelligence Index vs {METRIC_LABEL[metric]}
          </h1>
          <Segmented options={METRIC_OPTS} value={metric} onChange={setMetric} />
          <Segmented options={SCALE_OPTS} value={scale} onChange={setScale} />
        </div>
        <Legend theme={theme} hover={hover} setHover={setHover} clearHover={clearHover} />
      </div>

      <div className="flex flex-col gap-[6px]">
        <Chart
          metric={metric}
          scale={scale}
          theme={theme}
          hover={hover}
          setHover={setHover}
          clearHover={clearHover}
          usage={usage}
        />
        <p className="mb-0 mt-[6px] text-pretty text-[13px] text-muted">
          Each dot is one reasoning effort level, low to max. Dashed lines are lower-cost siblings in the same family. Ringed dots are
          rungs the current router config routes to. Hover a dot, line, or name for its values. Data:{' '}
          <a href="https://artificialanalysis.ai/models#intelligence" target="_blank" rel="noreferrer">
            Artificial Analysis
          </a>
          , Sep 2026.
        </p>
      </div>

      <DataTable theme={theme} hover={hover} setHover={setHover} clearHover={clearHover} usage={usage} />
    </main>
  );
}
