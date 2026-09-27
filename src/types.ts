import type { Backend } from './routing-core/index';

export type Tab = 'bench' | 'studio' | 'simulator' | 'traces' | 'replay' | 'diff';
export type Theme = 'light' | 'dark';
export type Metric = 'cost' | 'speed';
export type Scale = 'linear' | 'log';
export type TableView = 'all' | 'best';
export type SortKey = 'name' | 'score' | 'cost' | 'speed' | 'binds' | 'routed' | 'band';
export type SortDir = 1 | -1;

/** [effort, Intelligence Index, $ per task, output tokens/s | null, estimated?] */
export type BenchPoint = [string, number, number | null, number | null, boolean?];

/** One Artificial Analysis leaderboard row: editorial benchmark data, not routing authority. */
export interface BenchModel {
  id: string;
  name: string;
  backend: Backend;
  /** Policy binding base or registry stable id this leaderboard row corresponds to. */
  binds: string;
  pts: BenchPoint[];
}

/** `model@effort` bench key -> number of distinct chains routing to it */
export type Usage = Record<string, number>;
