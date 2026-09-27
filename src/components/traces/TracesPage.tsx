// Trace Explorer: real routing traces (runs.jsonl / routing-trace-v2.jsonl /
// `arc-orchestrator runs --json`) loaded into this browser, filtered, and
// inspected. The detail view shows what the trace recorded and reconstructs the
// decision path under the canonical policy with routing-core.

import { useMemo, useState } from 'react';
import { CANONICAL } from '../../canonical';
import { fmtTimestamp } from '../../lib/format';
import { distinct, EMPTY_FILTER, filterRows, type TraceFilter, type TraceRow } from '../../lib/traces-store';
import type { useTraces } from '../../hooks/useTraces';
import { contextForTrace, evaluateRouting, explainEvaluation, groupReplayableTraces, legacyOf, type TaskPhase, type WorkloadClass } from '../../routing-core/index';
import { Badge, BackendDot } from '../ui/Badge';
import { Button, EmptyState, KeyValue, Panel, Select, TABLE_CELL, TABLE_HEAD, TextInput } from '../ui/Controls';
import { DecisionPath } from '../decision/DecisionPath';

interface Props {
  traces: ReturnType<typeof useTraces>;
}

const STATUS_TONE = { completed: 'ok', blocked: 'warn', error: 'bad' } as const;

export function TracesPage({ traces }: Props) {
  const [filter, setFilter] = useState<TraceFilter>(EMPTY_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const rows = traces.rows;
  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);
  const selected = filtered.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId) ?? null;

  const importText = (text: string) => {
    const result = traces.importText(text);
    setNotice(`${result.added} new record${result.added === 1 ? '' : 's'} added${result.invalid ? `, ${result.invalid} line${result.invalid === 1 ? '' : 's'} skipped (${result.firstError})` : ''}.`);
    setPasted('');
  };

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">Trace Explorer</h1>
        <p className="m-0 max-w-[760px] text-pretty text-[13.5px] text-muted">
          Load <code className="font-mono text-[12px]">~/.arc-orchestrator/traces/runs.jsonl</code> or <code className="font-mono text-[12px]">routing-trace-v2.jsonl</code> (or the output of <code className="font-mono text-[12px]">arc-orchestrator runs --json</code>). Traces stay in this browser's IndexedDB and are never uploaded.
        </p>
      </div>

      <Panel
        title={`Corpus · ${rows.length} record${rows.length === 1 ? '' : 's'}`}
        actions={
          <>
            <label className="cursor-pointer whitespace-nowrap rounded-md border border-line bg-surface px-[12px] py-[6px] text-[13px] touch:min-h-[44px]">
              Upload JSONL
              <input
                type="file"
                accept=".jsonl,.json,.txt"
                multiple
                className="hidden"
                onChange={async (event) => {
                  const files = [...(event.target.files ?? [])];
                  const texts = await Promise.all(files.map((file) => file.text()));
                  if (texts.length) importText(texts.join('\n'));
                  event.target.value = '';
                }}
              />
            </label>
            <Button onClick={() => traces.clear()} disabled={rows.length === 0}>Clear</Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 px-[14px] py-3">
          <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder="…or paste JSONL / JSON here" rows={3} className="w-full rounded-md border border-line bg-bg px-2 py-1 font-mono text-[11.5px]" />
          <div className="flex flex-wrap items-center gap-3">
            <Button primary onClick={() => pasted.trim() && importText(pasted)} disabled={!pasted.trim()}>Import pasted</Button>
            {notice && <span className="text-[12px] text-muted">{notice}</span>}
            {traces.persisted === false && <Badge tone="warn" mono={false}>IndexedDB unavailable: corpus is in memory only</Badge>}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,560px)]">
        <Panel title={`${filtered.length} of ${rows.length} traces`}>
          <div className="grid grid-cols-2 gap-2 border-b border-line px-[14px] py-3 sm:grid-cols-3 lg:grid-cols-6">
            <TextInput value={filter.search} onChange={(event) => setFilter({ ...filter, search: event.target.value })} placeholder="search" aria-label="search traces" className="col-span-2 sm:col-span-3 lg:col-span-2" />
            <Select value={filter.phase} aria-label="phase filter" onChange={(event) => setFilter({ ...filter, phase: event.target.value as TaskPhase | '' })}>
              <option value="">any phase</option>
              {distinct(rows, (row) => row.phase).map((phase) => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </Select>
            <Select value={filter.workloadClass} aria-label="workload filter" onChange={(event) => setFilter({ ...filter, workloadClass: event.target.value as WorkloadClass | '' })}>
              <option value="">any class</option>
              {distinct(rows, (row) => row.workloadClass).map((klass) => (
                <option key={klass} value={klass}>{klass}</option>
              ))}
            </Select>
            <Select value={filter.model} aria-label="model filter" onChange={(event) => setFilter({ ...filter, model: event.target.value })}>
              <option value="">any model</option>
              {distinct(rows, (row) => row.model).map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </Select>
            <Select value={filter.status} aria-label="status filter" onChange={(event) => setFilter({ ...filter, status: event.target.value })}>
              <option value="">any status</option>
              {distinct(rows, (row) => row.status).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </div>
          {filtered.length === 0 ? (
            <EmptyState>{rows.length === 0 ? 'No traces loaded.' : 'No traces match the filters.'}</EmptyState>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TABLE_HEAD}>time</th>
                    <th className={TABLE_HEAD}>phase</th>
                    <th className={TABLE_HEAD}>class</th>
                    <th className={TABLE_HEAD}>model</th>
                    <th className={TABLE_HEAD}>status</th>
                    <th className={TABLE_HEAD}>evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedId(row.id)} className={`cursor-pointer ${selected?.id === row.id ? 'bg-bg' : 'hover:bg-bg'}`}>
                      <td className={`${TABLE_CELL} whitespace-nowrap font-mono text-[11px]`}>{fmtTimestamp(row.timestamp)}</td>
                      <td className={TABLE_CELL}>{row.phase}</td>
                      <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{row.workloadClass ?? '—'}</td>
                      <td className={TABLE_CELL}><span className="flex items-center gap-2"><BackendDot backend={row.backend} /><span className="font-mono text-[11.5px]">{row.model}</span>{row.effort && <span className="font-mono text-[10.5px] text-muted">@{row.effort}</span>}</span></td>
                      <td className={TABLE_CELL}><Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE] ?? 'neutral'}>{row.status}</Badge>{row.fallback && <Badge tone="warn">fallback</Badge>}</td>
                      <td className={TABLE_CELL}>
                        <span className="flex flex-wrap gap-1">
                          <Badge tone="muted">{row.kind}</Badge>
                          {row.hasSelection && <Badge tone="info">select()</Badge>}
                          {row.hasProfile && <Badge tone="info">profile</Badge>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {selected ? <TraceDetail row={selected} rows={rows} /> : <Panel title="Trace detail"><EmptyState>Select a trace to inspect its decision path.</EmptyState></Panel>}
      </div>
    </main>
  );
}

function TraceDetail({ row, rows }: { row: TraceRow; rows: TraceRow[] }) {
  const legacy = legacyOf(row.read);
  const v2 = row.read.kind === 'v2' ? row.read.record : null;
  const profile = v2?.workload_profile ?? legacy.workload_profile ?? null;

  // Reconstruct the traversal this record belongs to, then evaluate its context
  // under the canonical policy with the same engine the runtime shadows.
  const replay = useMemo(() => {
    const group = row.traversalId ? rows.filter((other) => other.traversalId === row.traversalId) : rows.filter((other) => other.id === row.id || legacyOf(other.read).fallback_of === row.id);
    const traces = groupReplayableTraces(group.map((other) => other.read));
    const trace = traces[0];
    if (!trace) return null;
    const context = contextForTrace(trace, Date.parse(legacy.timestamp) || 0);
    const evaluation = evaluateRouting({ policy: CANONICAL.policy, registry: CANONICAL.registry, snapshot: CANONICAL.snapshot, context });
    return { trace, evaluation, explained: explainEvaluation(evaluation, CANONICAL.registry, CANONICAL.policy) };
  }, [row, rows, legacy.timestamp]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Panel title="Observed" actions={<span className="font-mono text-[11px] text-muted">{row.id}</span>}>
        <div className="px-[14px] py-3">
          <KeyValue
            rows={[
              ['timestamp', fmtTimestamp(legacy.timestamp)],
              ['phase / mode', `${row.phase} / ${legacy.mode}`],
              ['workload class', legacy.workload_class ?? '—'],
              ['backend / model', <span className="flex items-center gap-2"><BackendDot backend={legacy.backend} />{legacy.backend} / <span className="font-mono">{legacy.model}</span>{legacy.effort ? <span className="font-mono text-muted">@{legacy.effort}</span> : null}</span>],
              ['status', <Badge tone={STATUS_TONE[legacy.status] ?? 'neutral'}>{legacy.status}</Badge>],
              ['sandbox', legacy.sandbox],
              ['label', legacy.label ?? '—'],
              ['task class', legacy.task_class ?? '—'],
              ['routing policy', legacy.routing_policy ?? '—'],
              ['tokens', legacy.tokens ? `${legacy.tokens.total_tokens} total` : 'unknown'],
              ['duration', `${legacy.duration_ms} ms`],
              ['error', legacy.error ?? '—'],
              ['fallback of', legacy.fallback_of ?? '—'],
            ]}
          />
        </div>
      </Panel>

      {profile && (
        <Panel title="Workload profile" actions={<Badge tone={profile.disagreement ? 'warn' : 'ok'}>{profile.class_source}</Badge>}>
          <div className="px-[14px] py-3">
            <KeyValue
              rows={[
                ['classified', `${profile.workload_class} (${profile.difficulty} × ${profile.volume})`],
                ['routed class', profile.routed_class ?? '—'],
                ['disagreement', profile.disagreement ? `explicit ${profile.disagreement.explicit} vs profiled ${profile.disagreement.profiled}` : 'none'],
                ['evidence', profile.evidence_coverage.join(', ') || '—'],
                ['reasons', <ul className="m-0 list-disc pl-4">{profile.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>],
              ]}
            />
          </div>
        </Panel>
      )}

      {v2 && (
        <Panel title="orchestrator-routing-trace/v2">
          <div className="px-[14px] py-3">
            <KeyValue
              rows={[
                ['route', `${v2.route.requested_public_alias ?? 'automatic'} → ${v2.route.canonical_capability_route ?? '—'}`],
                ['models', `requested ${v2.models.requested ?? '—'} · candidate ${v2.models.candidate ?? '—'} · attempted ${v2.models.attempted ?? '—'} · selected ${v2.models.selected ?? '—'}`],
                ['serving', `${v2.serving.provider ?? '—'} / ${v2.serving.provider_model_id ?? '—'} via ${v2.serving.transport_backend ?? '—'}`],
                ['traversal', `candidate ${v2.traversal.candidate_index ?? '—'} of ${v2.traversal.stack_size ?? '—'} · attempt ${v2.traversal.attempt_index ?? '—'} · ${v2.traversal.traversal_id ?? '—'}`],
                ['failure', v2.failure.normalized_class ? `${v2.failure.normalized_class}${v2.failure.fallback_source ? ` · ${v2.failure.fallback_source} → ${v2.failure.fallback_destination}` : ''}` : 'none'],
                ['budget (root cost)', `${v2.budgets.root.cost.consumed} consumed · ${v2.budgets.root.cost.remaining ?? '—'} remaining (${v2.budgets.root.cost.measurement ?? 'known'})`],
                ['versions', `policy ${v2.versions.policy} · registry ${v2.versions.registry} · trace ${v2.versions.routing_trace}${v2.versions.routing_core ? ` · ${v2.versions.routing_core}` : ''}`],
              ]}
            />
          </div>
          {v2.selection && (
            <div className="border-t border-line px-[14px] py-3">
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-medium">
                select() block <Badge tone={v2.selection.executed ? 'ok' : 'warn'}>{v2.selection.executed ? 'executed' : 'shadow'}</Badge>
                <Badge tone={v2.selection.outcome === 'selected' ? 'ok' : 'bad'}>{v2.selection.outcome}</Badge>
              </div>
              <KeyValue
                rows={[
                  ['eligible', v2.selection.eligible.join(', ') || '—'],
                  ['rejected', v2.selection.rejected.map((entry) => `${entry.rung_id} (${entry.reason})`).join(', ') || '—'],
                  ['pruned', v2.selection.pruned.map((entry) => `${entry.rung_id} ← ${entry.dominated_by}`).join(', ') || '—'],
                  ['budget constrained', v2.selection.budget_constrained.join(', ') || '—'],
                  ['unranked', v2.selection.unranked.join(', ') || '—'],
                  ['floor', `${v2.selection.requested_floor} → ${v2.selection.effective_floor}${v2.selection.floor_lowered ? ' (lowered)' : ''}`],
                  ['truncated', Object.entries(v2.selection.truncated).filter(([, count]) => count > 0).map(([key, count]) => `${key} +${count}`).join(', ') || 'complete'],
                ]}
              />
            </div>
          )}
        </Panel>
      )}

      {replay && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="font-medium">Decision path under the canonical policy</span>
            <Badge tone="muted" mono={false}>reconstructed from {replay.trace.sources} record{replay.trace.sources === 1 ? '' : 's'}</Badge>
            {replay.trace.observed.unavailableBackends.length > 0 && <Badge tone="warn">unavailable: {replay.trace.observed.unavailableBackends.join(', ')}</Badge>}
            {replay.evaluation.traversal?.selected && replay.trace.observed.selectedStableId && (
              <Badge tone={replay.evaluation.traversal.selected.stableId === replay.trace.observed.selectedStableId ? 'ok' : 'warn'} mono={false}>
                {replay.evaluation.traversal.selected.stableId === replay.trace.observed.selectedStableId ? 'matches observed selection' : `observed ${replay.trace.observed.selectedStableId}`}
              </Badge>
            )}
          </div>
          <DecisionPath evaluation={replay.evaluation} explained={replay.explained} compact />
        </div>
      )}
    </div>
  );
}
