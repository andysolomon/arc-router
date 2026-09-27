// Counterfactual Replay: every loaded trace is evaluated under the canonical
// policy and the draft, and the two are compared. Provenance is labelled on
// every number: observed (from the trace), proxy (predicted traversal), or
// estimate (snapshot cost priors). No quality claim is made.

import { useDeferredValue, useMemo, useState } from 'react';
import { CANONICAL } from '../../canonical';
import { fmtPct, fmtUsd } from '../../lib/format';
import type { useTraces } from '../../hooks/useTraces';
import { groupReplayableTraces, replayTraces, type PolicyMetrics, type ReplayReport, type RoutingPolicy } from '../../routing-core/index';
import { Badge, BackendDot } from '../ui/Badge';
import { Checkbox, EmptyState, Panel, TABLE_CELL, TABLE_HEAD } from '../ui/Controls';

interface Props {
  traces: ReturnType<typeof useTraces>;
  draft: RoutingPolicy;
  dirty: boolean;
}

function delta(a: number, b: number, format: (value: number) => string = String): { text: string; tone: 'ok' | 'bad' | 'muted' } {
  const diff = b - a;
  if (diff === 0) return { text: '±0', tone: 'muted' };
  return { text: `${diff > 0 ? '+' : ''}${format(diff)}`, tone: diff > 0 ? 'bad' : 'ok' };
}

function distribution(record: Record<string, number>): string {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key} ${count}`)
    .join(' · ') || '—';
}

export function ReplayPage({ traces, draft, dirty }: Props) {
  const [changedOnly, setChangedOnly] = useState(true);
  const deferredDraft = useDeferredValue(draft);
  const [nowMs] = useState(() => Date.now());

  const replayable = useMemo(() => groupReplayableTraces(traces.records), [traces.records]);
  const report = useMemo<ReplayReport | null>(() => {
    if (replayable.length === 0) return null;
    return replayTraces(replayable, { current: CANONICAL.policy, candidate: deferredDraft }, CANONICAL.registry, CANONICAL.snapshot, { nowMs });
  }, [replayable, deferredDraft, nowMs]);

  const rows = useMemo(() => (report ? (changedOnly ? report.rows.filter((row) => row.changed) : report.rows) : []), [report, changedOnly]);

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">Counterfactual replay</h1>
        <p className="m-0 max-w-[760px] text-pretty text-[13.5px] text-muted">
          Historical traces replayed against the canonical policy and the draft with the production routing engine. {dirty ? '' : 'The draft currently equals the canonical policy; edit it in Policy Studio to see a counterfactual.'}
        </p>
      </div>

      {!report ? (
        <Panel><EmptyState>Load traces on the Traces tab first.</EmptyState></Panel>
      ) : (
        <>
          <Panel title={`${report.rows.length} traversal${report.rows.length === 1 ? '' : 's'} · ${report.changes} selection change${report.changes === 1 ? '' : 's'}`} actions={<Badge tone={report.proxyFidelity.comparable ? 'info' : 'muted'} mono={false}>proxy reproduces observed selection {report.proxyFidelity.matched}/{report.proxyFidelity.comparable}</Badge>}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TABLE_HEAD}>metric</th>
                    <th className={TABLE_HEAD}>provenance</th>
                    <th className={TABLE_HEAD}>current policy</th>
                    <th className={TABLE_HEAD}>draft policy</th>
                    <th className={TABLE_HEAD}>delta</th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow label="fallback rate" provenance="proxy" current={fmtPct(report.current.fallbackRate)} candidate={fmtPct(report.candidate.fallbackRate)} d={delta(report.current.fallbackRate, report.candidate.fallbackRate, (v) => fmtPct(v))} />
                  <MetricRow label="fallbacks" provenance="proxy" current={report.current.fallbacks} candidate={report.candidate.fallbacks} d={delta(report.current.fallbacks, report.candidate.fallbacks)} />
                  <MetricRow label="refusals" provenance="proxy" current={report.current.refusals} candidate={report.candidate.refusals} d={delta(report.current.refusals, report.candidate.refusals)} />
                  <MetricRow label="unavailable routes (stack exhausted)" provenance="proxy" current={report.current.unavailableRoutes} candidate={report.candidate.unavailableRoutes} d={delta(report.current.unavailableRoutes, report.candidate.unavailableRoutes)} />
                  <MetricRow label="budget violations" provenance="estimate" current={report.current.budgetViolations} candidate={report.candidate.budgetViolations} d={delta(report.current.budgetViolations, report.candidate.budgetViolations)} />
                  <MetricRow label="estimated cost (priced selections)" provenance="estimate" current={`${fmtUsd(report.current.estimatedCost.usd)} · ${report.current.estimatedCost.priced} priced, ${report.current.estimatedCost.unpriced} unpriced`} candidate={`${fmtUsd(report.candidate.estimatedCost.usd)} · ${report.candidate.estimatedCost.priced} priced, ${report.candidate.estimatedCost.unpriced} unpriced`} d={delta(report.current.estimatedCost.usd, report.candidate.estimatedCost.usd, (v) => fmtUsd(v))} />
                  <MetricRow label="model selection" provenance="proxy" current={distribution(report.current.selections)} candidate={distribution(report.candidate.selections)} />
                  <MetricRow label="provider distribution" provenance="proxy" current={distribution(report.current.backends)} candidate={distribution(report.candidate.backends)} />
                  <MetricRow label="capability bands" provenance="benchmark evidence" current={distribution(report.current.bands)} candidate={distribution(report.candidate.bands)} />
                  <MetricRow label="workload distribution" provenance="observed" current={distribution(report.current.workloads)} candidate={distribution(report.candidate.workloads)} />
                </tbody>
              </table>
            </div>
            <ul className="m-0 list-disc py-3 pl-8 pr-[14px] text-[12px] text-muted">
              {report.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Panel>

          <Panel title="Per-traversal outcomes" actions={<Checkbox label="changed only" checked={changedOnly} onChange={setChangedOnly} />}>
            {rows.length === 0 ? (
              <EmptyState>No traversal changes selection under the draft.</EmptyState>
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={TABLE_HEAD}>traversal</th>
                      <th className={TABLE_HEAD}>phase / class</th>
                      <th className={TABLE_HEAD}>observed</th>
                      <th className={TABLE_HEAD}>current (proxy)</th>
                      <th className={TABLE_HEAD}>draft (proxy)</th>
                      <th className={TABLE_HEAD}>est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 500).map((row) => (
                      <tr key={row.trace.id} className={row.changed ? 'bg-add-bg/40' : ''}>
                        <td className={`${TABLE_CELL} font-mono text-[11px]`}>{row.trace.id}</td>
                        <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{row.trace.phase}{row.trace.workloadClass ? ` / ${row.trace.workloadClass}` : ''}</td>
                        <td className={TABLE_CELL}>
                          <span className="flex items-center gap-2"><BackendDot backend={row.trace.observed.backend} /><span className="font-mono text-[11.5px]">{row.trace.observed.selectedStableId ?? row.trace.observed.status}</span>{row.trace.observed.fallbacks > 0 && <Badge tone="warn">{row.trace.observed.fallbacks} fallback</Badge>}</span>
                        </td>
                        <td className={TABLE_CELL}><Outcome outcome={row.current} /></td>
                        <td className={TABLE_CELL}><Outcome outcome={row.candidate} /></td>
                        <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{row.current.estimatedUsd == null ? '?' : fmtUsd(row.current.estimatedUsd)} → {row.candidate.estimatedUsd == null ? '?' : fmtUsd(row.candidate.estimatedUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 500 && <div className="px-[14px] py-2 text-[12px] text-muted">Showing the first 500 of {rows.length} rows.</div>}
              </div>
            )}
          </Panel>
        </>
      )}
    </main>
  );
}

function Outcome({ outcome }: { outcome: ReplayReport['rows'][number]['current'] }) {
  if (outcome.refused) return <Badge tone="bad">{outcome.error ?? 'refused'}</Badge>;
  if (outcome.exhausted) return <Badge tone="bad">stack exhausted</Badge>;
  return (
    <span className="flex flex-wrap items-center gap-1">
      <BackendDot backend={outcome.backend} />
      <span className="font-mono text-[11.5px]">{outcome.selectedRungId}</span>
      {outcome.fallback && <Badge tone="warn">#{(outcome.index ?? 0) + 1}</Badge>}
      {outcome.budgetViolation && <Badge tone="bad">over budget</Badge>}
    </span>
  );
}

function MetricRow({ label, provenance, current, candidate, d }: { label: string; provenance: string; current: string | number; candidate: string | number; d?: { text: string; tone: 'ok' | 'bad' | 'muted' } }) {
  return (
    <tr>
      <td className={`${TABLE_CELL} font-medium`}>{label}</td>
      <td className={TABLE_CELL}><Badge tone="muted" mono={false}>{provenance}</Badge></td>
      <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{current}</td>
      <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{candidate}</td>
      <td className={TABLE_CELL}>{d ? <Badge tone={d.tone}>{d.text}</Badge> : '—'}</td>
    </tr>
  );
}

export type { PolicyMetrics };
