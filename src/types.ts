export type Backend = 'claude' | 'codex' | 'composer' | 'opencode' | 'minimax';
export type Tab = 'bench' | 'router';
export type Theme = 'light' | 'dark';
export type Metric = 'cost' | 'speed';
export type Scale = 'linear' | 'log';
export type TableView = 'all' | 'best';
export type SortKey = 'name' | 'score' | 'cost' | 'speed' | 'binds' | 'routed';
export type SortDir = 1 | -1;

/** [effort, Intelligence Index, $ per task, output tokens/s | null, estimated?] */
export type BenchPoint = [string, number, number | null, number | null, boolean?];

export interface BenchModel {
  id: string;
  name: string;
  backend: Backend;
  binds: string;
  pts: BenchPoint[];
}

/** [id, label, backend] */
export type ModelTuple = [string, string, Backend];

export interface ModelInfo {
  id: string;
  label: string;
  backend: Backend;
}

export interface Policy {
  parent: { pi: string; cc: string };
  tail: string[];
  phases: Record<string, string[]>;
  workloads: Record<string, string[]>;
  excludeModels: string[];
  excludeEfforts: string[];
}

export type ListPath = { kind: 'tail' } | { kind: 'phases' | 'workloads'; key: string };

/** `model@effort` bench key -> number of distinct chains routing to it */
export type Usage = Record<string, number>;

export interface Lookup {
  m: BenchModel;
  p: BenchPoint;
}

export type PolicyUpdater = (fn: (draft: Policy) => void) => void;
