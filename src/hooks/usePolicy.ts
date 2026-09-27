import { useCallback, useEffect, useMemo, useState } from 'react';
import { CANONICAL } from '../canonical';
import {
  clonePolicy,
  policiesEqual,
  validatePolicy,
  policyHasErrors,
  type PolicyIssue,
  type RoutingPolicy,
} from '../routing-core/index';
import { getItem, KEYS, removeItem, setItem } from '../lib/storage';

interface Draft {
  canonicalDigest: string;
  policy: RoutingPolicy;
}

function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<Draft>;
  return typeof draft.canonicalDigest === 'string' && !!draft.policy && typeof draft.policy === 'object' && typeof (draft.policy as RoutingPolicy).label === 'string';
}

/** A draft is only reusable against the canonical policy it was edited from. */
function loadDraft(): { policy: RoutingPolicy; staleDraftDropped: boolean } {
  try {
    const parsed: unknown = JSON.parse(getItem(KEYS.policy) ?? 'null');
    if (isDraft(parsed)) {
      if (parsed.canonicalDigest === CANONICAL.source.digest) return { policy: parsed.policy, staleDraftDropped: false };
      removeItem(KEYS.policy);
      return { policy: clonePolicy(CANONICAL.policy), staleDraftDropped: true };
    }
  } catch {
    /* corrupt or missing */
  }
  return { policy: clonePolicy(CANONICAL.policy), staleDraftDropped: false };
}

export type PolicyUpdater = (fn: (draft: RoutingPolicy) => RoutingPolicy) => void;

export function usePolicy() {
  const [initial] = useState(loadDraft);
  const [policy, setState] = useState<RoutingPolicy>(initial.policy);
  const [staleDraftDropped, setStaleDraftDropped] = useState(initial.staleDraftDropped);

  const setPolicy = useCallback<PolicyUpdater>((fn) => {
    setState((current) => fn(current));
  }, []);

  useEffect(() => {
    if (policiesEqual(policy, CANONICAL.policy)) {
      removeItem(KEYS.policy);
    } else {
      setItem(KEYS.policy, JSON.stringify({ canonicalDigest: CANONICAL.source.digest, policy } satisfies Draft));
    }
  }, [policy]);

  const reset = useCallback(() => {
    removeItem(KEYS.policy);
    setState(clonePolicy(CANONICAL.policy));
    setStaleDraftDropped(false);
  }, []);

  const replace = useCallback((next: RoutingPolicy) => {
    setState(clonePolicy(next));
  }, []);

  const dirty = useMemo(() => !policiesEqual(policy, CANONICAL.policy), [policy]);
  const issues = useMemo<PolicyIssue[]>(() => validatePolicy(policy, { registry: CANONICAL.registry }), [policy]);
  const invalid = useMemo(() => policyHasErrors(issues), [issues]);

  return { policy, setPolicy, replace, reset, dirty, issues, invalid, staleDraftDropped };
}
