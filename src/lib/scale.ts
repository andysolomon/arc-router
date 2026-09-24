import type { Metric, Scale } from '../types';

export interface XScale {
  X: (v: number) => number;
  ticks: number[];
}

export interface YScale {
  Y: (v: number) => number;
  ylo: number;
  yhi: number;
  ticks: number[];
}

/** Nice step from max/5: 1, 2, 2.5, 5 or 10 × 10^k. */
export function niceStep(max: number): number {
  const r = max / 5;
  const e = Math.pow(10, Math.floor(Math.log10(r)));
  const f = r / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}

export function xScale(metric: Metric, scale: Scale, values: number[], ml: number, pw: number): XScale {
  if (scale === 'log') {
    const [d0, d1] = metric === 'cost' ? [0.003, 12] : [30, 260];
    const X = (v: number) => ml + ((Math.log(v) - Math.log(d0)) / (Math.log(d1) - Math.log(d0))) * pw;
    return { X, ticks: metric === 'cost' ? [0.01, 0.03, 0.1, 0.3, 1, 3, 10] : [30, 50, 100, 200] };
  }
  const mx = Math.max(...values);
  const step = niceStep(mx);
  const d1 = Math.ceil((mx * 1.04) / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= d1 + 1e-9; v += step) ticks.push(+v.toFixed(4));
  return { X: (v: number) => ml + (v / d1) * pw, ticks };
}

export function yScale(values: number[], mt: number, ph: number): YScale {
  const ylo = Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 5);
  const yhi = Math.ceil((Math.max(...values) + 1) / 10) * 10;
  const Y = (v: number) => mt + (1 - (v - ylo) / (yhi - ylo)) * ph;
  const ticks: number[] = [];
  for (let v = Math.ceil(ylo / 10) * 10; v <= yhi; v += 10) ticks.push(v);
  return { Y, ylo, yhi, ticks };
}
