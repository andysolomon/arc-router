import { useCallback, useState } from 'react';
import { ORIG } from '../data/policy';
import { clonePolicy } from '../lib/policy';
import { getItem, KEYS, removeItem, setItem } from '../lib/storage';
import type { Policy, PolicyUpdater } from '../types';

function isPolicy(x: unknown): x is Policy {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  const parent = p.parent as Record<string, unknown> | undefined;
  return (
    !!parent && typeof parent.pi === 'string' && typeof parent.cc === 'string' &&
    Array.isArray(p.tail) && !!p.phases && typeof p.phases === 'object' && !!p.workloads && typeof p.workloads === 'object' &&
    Array.isArray(p.excludeModels) && Array.isArray(p.excludeEfforts)
  );
}

function loadPolicy(): Policy {
  try {
    const parsed: unknown = JSON.parse(getItem(KEYS.policy) ?? 'null');
    if (isPolicy(parsed)) return parsed;
  } catch {
    /* corrupt or missing */
  }
  return clonePolicy(ORIG);
}

export function usePolicy() {
  const [policy, setState] = useState<Policy>(loadPolicy);

  /** Apply `fn` to a deep copy; the previous policy object is never mutated. */
  const setPolicy = useCallback<PolicyUpdater>(
    (fn) => {
      const next = clonePolicy(policy);
      fn(next);
      setItem(KEYS.policy, JSON.stringify(next));
      setState(next);
    },
    [policy],
  );

  const reset = useCallback(() => {
    removeItem(KEYS.policy);
    setState(clonePolicy(ORIG));
  }, []);

  return { policy, setPolicy, reset };
}
