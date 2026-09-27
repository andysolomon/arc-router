// Trace corpus for the Trace Explorer and Counterfactual Replay: parsing of
// pasted or uploaded runner output (runs.jsonl, routing-trace-v2.jsonl, or
// `arc-orchestrator runs --json`), row summaries, filtering, and persistence in
// IndexedDB (per browser, never uploaded anywhere).

import {
  legacyOf,
  parseTraceJsonl,
  phaseOfTrace,
  type ReadRoutingTrace,
  type TaskPhase,
  type WorkloadClass,
} from '../routing-core/index';

export type StoredTrace = Exclude<ReadRoutingTrace, { kind: 'invalid' }>;

export interface TraceRow {
  id: string;
  kind: 'v2' | 'legacy';
  timestamp: string;
  phase: TaskPhase;
  mode: string;
  workloadClass: string | null;
  model: string;
  stableId: string | null;
  backend: string;
  effort: string | null;
  status: string;
  label: string | null;
  fallback: boolean;
  traversalId: string | null;
  candidateIndex: number | null;
  hasSelection: boolean;
  hasProfile: boolean;
  profiledClass: string | null;
  read: StoredTrace;
}

export function traceRow(read: StoredTrace): TraceRow {
  const legacy = legacyOf(read);
  const v2 = read.kind === 'v2' ? read.record : null;
  const profile = v2?.workload_profile ?? legacy.workload_profile ?? null;
  return {
    id: legacy.run_id,
    kind: read.kind,
    timestamp: legacy.timestamp,
    phase: phaseOfTrace(legacy),
    mode: legacy.mode,
    workloadClass: legacy.workload_class ?? null,
    model: legacy.model,
    stableId: v2?.serving.stable_id ?? null,
    backend: legacy.backend,
    effort: legacy.effort ?? null,
    status: legacy.status,
    label: legacy.label,
    fallback: Boolean(legacy.fallback_of) || (v2?.traversal.candidate_index ?? 0) > 0,
    traversalId: v2?.traversal.traversal_id ?? null,
    candidateIndex: v2?.traversal.candidate_index ?? null,
    hasSelection: v2?.selection != null,
    hasProfile: profile != null,
    profiledClass: profile?.workload_class ?? null,
    read,
  };
}

export interface TraceFilter {
  search: string;
  model: string;
  phase: TaskPhase | '';
  workloadClass: WorkloadClass | '';
  status: string;
  kind: 'all' | 'v2' | 'legacy';
}

export const EMPTY_FILTER: TraceFilter = { search: '', model: '', phase: '', workloadClass: '', status: '', kind: 'all' };

export function filterRows(rows: readonly TraceRow[], filter: TraceFilter): TraceRow[] {
  const search = filter.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.model && row.model !== filter.model && row.stableId !== filter.model) return false;
    if (filter.phase && row.phase !== filter.phase) return false;
    if (filter.workloadClass && row.workloadClass !== filter.workloadClass) return false;
    if (filter.status && row.status !== filter.status) return false;
    if (filter.kind !== 'all' && row.kind !== filter.kind) return false;
    if (search) {
      const haystack = [row.id, row.model, row.stableId ?? '', row.label ?? '', row.phase, row.workloadClass ?? '', row.backend, row.status, row.traversalId ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function distinct<T>(rows: readonly TraceRow[], pick: (row: TraceRow) => T | null | undefined): T[] {
  const values = new Set<T>();
  for (const row of rows) {
    const value = pick(row);
    if (value != null && value !== ('' as unknown as T)) values.add(value);
  }
  return [...values].sort();
}

export function parseTraceText(text: string): { records: StoredTrace[]; invalid: Array<{ line: number; error: string }> } {
  const parsed = parseTraceJsonl(text);
  return { records: parsed.records, invalid: parsed.invalid };
}

/** Records de-duplicated by run id (v2 wins over a legacy copy of the same run). */
export function mergeTraces(existing: readonly StoredTrace[], incoming: readonly StoredTrace[]): StoredTrace[] {
  const byId = new Map<string, StoredTrace>();
  for (const read of [...existing, ...incoming]) {
    const id = `${legacyOf(read).run_id}`;
    const current = byId.get(id);
    if (!current || (current.kind === 'legacy' && read.kind === 'v2')) byId.set(id, read);
  }
  return [...byId.values()].sort((a, b) => legacyOf(b).timestamp.localeCompare(legacyOf(a).timestamp));
}

// ---------------------------------------------------------------------------
// IndexedDB persistence (best effort). Absent storage degrades to memory only.
// ---------------------------------------------------------------------------

const DB_NAME = 'arc-router';
const STORE = 'traces';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadStoredTraces(): Promise<StoredTrace[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get('corpus');
      request.onsuccess = () => {
        const value = request.result as unknown;
        if (!Array.isArray(value)) return resolve([]);
        const records: StoredTrace[] = [];
        for (const item of value) {
          const parsed = parseTraceJsonl(JSON.stringify(item));
          records.push(...parsed.records);
        }
        resolve(records);
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function saveStoredTraces(records: readonly StoredTrace[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(records.map((read) => read.record), 'corpus');
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
