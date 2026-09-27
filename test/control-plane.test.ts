// The control plane's own logic: policy editing helpers, the benchmark join,
// simulator context construction, trace rows/filters, and the end-to-end
// simulate → diff → export flow over the vendored canonical data.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { BENCH } from '../src/data/bench';
import { benchPointForRung, joinBench, resolveBenchModel, usageByBenchKey } from '../src/lib/bench-join';
import { chainRefs, getChain, moveRung, rungOptions, rungUsage, setRungEffort, withChain } from '../src/lib/policy-state';
import { contextFromForm, DEFAULT_FORM, EMPTY_EVIDENCE, evidenceFromForm } from '../src/lib/simulator';
import { EMPTY_FILTER, filterRows, mergeTraces, parseTraceText, traceRow } from '../src/lib/traces-store';
import {
  diffPolicies,
  evaluateRouting,
  explainEvaluation,
  exportPolicyBundle,
  groupReplayableTraces,
  parseCapabilitySnapshot,
  replayTraces,
  validatePolicy,
  type CapabilitySnapshot,
  type ModelDefinition,
  type RoutingPolicyDocument,
} from '../src/routing-core/index';

const core = resolve(__dirname, '../src/routing-core/generated');
const policy = (JSON.parse(readFileSync(resolve(core, 'routing-policy.json'), 'utf8')) as RoutingPolicyDocument).policy;
const registry = (JSON.parse(readFileSync(resolve(core, 'model-registry.json'), 'utf8')) as { entries: ModelDefinition[] }).entries;
const snapshotParsed = parseCapabilitySnapshot(JSON.parse(readFileSync(resolve(core, 'capability-snapshot.json'), 'utf8')), { entries: registry, nowMs: 0 });
const snapshot: CapabilitySnapshot = snapshotParsed.ok ? snapshotParsed.snapshot : (() => { throw new Error('snapshot invalid'); })();
const NOW_MS = Date.parse('2026-09-26T00:00:00Z');

describe('policy editing helpers', () => {
  test('withChain returns a new policy and leaves the original untouched', () => {
    const ref = chainRefs().find((entry) => entry.kind === 'workload' && entry.key === 'hard-medium')!;
    const before = getChain(policy, ref);
    const next = withChain(policy, ref, (chain) => moveRung(chain, 0, 1));
    expect(getChain(policy, ref)).toEqual(before);
    expect(getChain(next, ref)[0]).toBe(before[1]);
    expect(getChain(next, ref)[1]).toBe(before[0]);
    expect(setRungEffort(before, 0, 'low')[0]).toBe('gpt-6-sol@low');
  });

  test('rung options are bound, registry-available, not excluded, with selectable efforts', () => {
    const options = rungOptions(policy, registry);
    expect(options.some((option) => option.stableId === 'sonnet-5')).toBe(false);
    const grok = options.find((option) => option.stableId === 'cursor-grok-4.7-high')!;
    expect(grok.efforts).toEqual(['high']);
    expect(grok.defaultEffort).toBe('high');
    const luna = options.find((option) => option.stableId === 'gpt-6-luna')!;
    expect(luna.defaultEffort).toBe('max');
    const glm = options.find((option) => option.stableId === 'opencode-go-glm-5.3')!;
    expect(glm.efforts).toEqual(['none']);
  });

  test('rung usage counts distinct chains per rung', () => {
    const usage = rungUsage(policy);
    expect(usage.get('composer-2.5@none')).toBe(1); // tail only
    expect(usage.get('cursor-grok-4.7-high@high')).toBeGreaterThan(5);
  });
});

describe('benchmark join', () => {
  test('resolves leaderboard rows through bindings and stable ids, and reports unregistered models', () => {
    const kimi = BENCH.find((row) => row.id === 'kimi-k3')!;
    expect(resolveBenchModel(kimi, policy, registry)?.stableId).toBe('opencode-go-kimi-k3');
    const grok = BENCH.find((row) => row.id === 'grok-4.7')!;
    expect(resolveBenchModel(grok, policy, registry)?.stableId).toBe('cursor-grok-4.7-high');
    const muse = BENCH.find((row) => row.id === 'muse-spark-1.3')!;
    expect(resolveBenchModel(muse, policy, registry)).toBeNull();
  });

  test('bench points map to registry rungs: fixed effort, no-effort transports, and effort ladders', () => {
    const grok = registry.find((row) => row.stableId === 'cursor-grok-4.7-high')!;
    expect(benchPointForRung(BENCH.find((row) => row.id === 'grok-4.7')!, grok, 'high')?.[0]).toBe('high');
    const glm = registry.find((row) => row.stableId === 'opencode-go-glm-5.3')!;
    expect(benchPointForRung(BENCH.find((row) => row.id === 'glm-5.3')!, glm, 'none')?.[0]).toBe('max');
    const luna = registry.find((row) => row.stableId === 'gpt-6-luna')!;
    expect(benchPointForRung(BENCH.find((row) => row.id === 'gpt-6-luna')!, luna, 'max')?.[0]).toBe('max');
    expect(benchPointForRung(BENCH.find((row) => row.id === 'gpt-6-luna')!, luna, 'medium')).toBeNull();
  });

  test('usage and snapshot bands are joined per row; unknown stays unknown', () => {
    const usage = usageByBenchKey(policy, registry, BENCH);
    expect(usage['gpt-6-luna@max']).toBeGreaterThan(0);
    expect(usage['glm-5.3@max']).toBeGreaterThan(0);
    const rows = joinBench(BENCH, policy, registry, snapshot);
    const gpt55 = rows.find((row) => row.key === 'gpt-5.6-luna@low');
    expect(gpt55?.resolution?.stableId).toBe('opencode-go-gpt-5.6-luna');
    const opus = rows.find((row) => row.key === 'opus-5.5@high')!;
    expect(opus.snapshotRung).toBeNull(); // snapshot retains historical opus-5, not 5.5
    expect(opus.bands).toEqual({ swe: null, agenticEdit: null });
    expect(opus.costPriorUsd).toBeNull();
    const muse = rows.find((row) => row.key === 'muse-spark-1.3@max')!;
    expect(muse.resolution).toBeNull();
    expect(muse.routedIn).toBe(0);
  });
});

describe('simulator', () => {
  test('the default form profiles to hard-medium and evaluates with the shared engine', () => {
    const context = contextFromForm(DEFAULT_FORM, NOW_MS);
    expect(context.workloadClass).toBeNull();
    expect(context.evidence?.change?.authBoundary).toBe(true);
    const evaluation = evaluateRouting({ policy, registry, snapshot, context });
    expect(evaluation.error).toBeNull();
    expect(evaluation.workloadClass).toBe('hard-medium');
    expect(evaluation.traversal?.selected?.rungId).toBe('gpt-6-sol@high');
    const explained = explainEvaluation(evaluation, registry, policy);
    expect(explained.headline).toBe('Selected: Codex Sol @ high');
  });

  test('blank evidence yields no evidence object; unavailable backends become observations; budget is injected', () => {
    expect(evidenceFromForm({ ...DEFAULT_FORM, evidence: { ...EMPTY_EVIDENCE } })).toBeNull();
    const context = contextFromForm({ ...DEFAULT_FORM, unavailable: ['codex'], remainingCost: '0.5', classMode: 'explicit', workloadClass: 'hard-heavy' }, NOW_MS);
    expect(context.availability?.backends?.[0]).toEqual({ backend: 'codex', classification: 'provider_outage', observedAtMs: NOW_MS });
    expect(context.budget?.remaining.cost).toBe(0.5);
    expect(context.workloadClass).toBe('hard-heavy');
    expect(context.evidence).toBeNull();
  });
});

describe('studio → diff → export', () => {
  test('an edit shows up as a semantic change, validates, and exports a patch against the vendored document', () => {
    const ref = chainRefs().find((entry) => entry.kind === 'workload' && entry.key === 'hard-medium')!;
    const draft = withChain(policy, ref, (chain) => ['opus-5.5@high', ...chain.slice(1)]);
    const diff = diffPolicies(policy, draft);
    expect(diff.changes.map((change) => change.kind)).toContain('lead-changed');
    const issues = validatePolicy(draft, { registry });
    expect(issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    const bundle = exportPolicyBundle({ current: policy, candidate: draft, digest: 'deadbeef', currentDocument: readFileSync(resolve(core, 'arc-model-policy.md'), 'utf8'), registry });
    expect(bundle.valid).toBe(true);
    expect(bundle.patch).toContain('+workload hard-medium: opus-5.5@high');
    expect(bundle.markdown).toContain('lead changed gpt-6-sol@high → opus-5.5@high');
  });

  test('an invalid edit is reported immediately, never silently accepted', () => {
    const ref = chainRefs().find((entry) => entry.kind === 'phase' && entry.key === 'verify')!;
    const draft = withChain(policy, ref, (chain) => [...chain, 'haiku-4.5@low']);
    const issues = validatePolicy(draft, { registry });
    expect(issues.some((issue) => issue.code === 'excluded-model' && issue.path === 'phaseChains.verify[5]')).toBe(true);
    expect(exportPolicyBundle({ current: policy, candidate: draft, digest: 'x', registry }).valid).toBe(false);
  });
});

describe('traces and replay', () => {
  const legacy = {
    schema: 4, run_id: 'run-x1', timestamp: '2026-09-20T00:00:00.000Z', backend: 'codex', mode: 'implement', phase: 'implement', model: 'gpt-6-sol', sandbox: 'workspace-write', project: 'abc123def456', label: 'demo', task_class: null, workload_class: 'hard-medium', route_rationale: null, duration_ms: 10, status: 'error', exit_code: 1, changed_files: null, tokens: null, budget: null, error: 'codex unavailable', failure_class: 'backend_unavailable', outage_reason: 'usage_limit',
  };
  const recovered = { ...legacy, run_id: 'run-x2', backend: 'composer', model: 'cursor-grok-4.7-high', status: 'completed', exit_code: 0, error: null, fallback_of: 'run-x1', failure_class: undefined, outage_reason: undefined };

  test('parses pasted JSONL and a runs --json array, merges by run id, and filters rows', () => {
    const parsed = parseTraceText([JSON.stringify(legacy), 'garbage', JSON.stringify([recovered])].join('\n'));
    expect(parsed.records).toHaveLength(2);
    expect(parsed.invalid).toHaveLength(1);
    const merged = mergeTraces(parsed.records, parsed.records);
    expect(merged).toHaveLength(2);
    const rows = merged.map(traceRow);
    expect(filterRows(rows, { ...EMPTY_FILTER, status: 'completed' })).toHaveLength(1);
    expect(filterRows(rows, { ...EMPTY_FILTER, search: 'grok' })).toHaveLength(1);
    expect(filterRows(rows, { ...EMPTY_FILTER, workloadClass: 'hard-medium' })).toHaveLength(2);
    expect(rows.find((row) => row.id === 'run-x2')?.fallback).toBe(true);
  });

  test('replay compares canonical and draft over a reconstructed traversal', () => {
    const parsed = parseTraceText([JSON.stringify(legacy), JSON.stringify(recovered)].join('\n'));
    const traces = groupReplayableTraces(parsed.records);
    expect(traces).toHaveLength(1);
    expect(traces[0]!.observed.unavailableBackends).toEqual(['codex']);
    const ref = chainRefs().find((entry) => entry.kind === 'workload' && entry.key === 'hard-medium')!;
    const draft = withChain(policy, ref, (chain) => ['opus-5.5@high', ...chain]);
    const report = replayTraces(traces, { current: policy, candidate: draft }, registry, snapshot, { nowMs: NOW_MS });
    expect(report.rows[0]!.current.selectedRungId).toBe('cursor-grok-4.7-high@high');
    expect(report.rows[0]!.candidate.selectedRungId).toBe('opus-5.5@high');
    expect(report.changes).toBe(1);
    expect(report.current.fallbacks).toBe(1);
    expect(report.candidate.fallbacks).toBe(0);
  });
});
