import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStoredTraces, mergeTraces, parseTraceText, saveStoredTraces, traceRow, type StoredTrace, type TraceRow } from '../lib/traces-store';

export interface ImportResult {
  added: number;
  invalid: number;
  firstError: string | null;
}

export function useTraces() {
  const [records, setRecords] = useState<StoredTrace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    loadStoredTraces().then((stored) => {
      if (!alive) return;
      setRecords(stored);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: StoredTrace[]) => {
    setRecords(next);
    saveStoredTraces(next).then((ok) => setPersisted(ok));
  }, []);

  const importText = useCallback(
    (text: string): ImportResult => {
      const parsed = parseTraceText(text);
      const merged = mergeTraces(records, parsed.records);
      persist(merged);
      return { added: merged.length - records.length, invalid: parsed.invalid.length, firstError: parsed.invalid[0]?.error ?? null };
    },
    [records, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const rows = useMemo<TraceRow[]>(() => records.map(traceRow), [records]);

  return { records, rows, loaded, persisted, importText, clear };
}
