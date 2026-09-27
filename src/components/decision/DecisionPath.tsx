// Visualizes one routing evaluation as the decision path the runtime walks:
// phase → workload class → capability floor → the ordered stack with a verdict
// per rung → the selection. Below it, the capability-rung layer (`select()`)
// is shown separately and labelled as a routing proxy, because it does not
// dispatch today. Shared by the Simulator and the Trace Explorer.

import { Badge, BackendDot, type BadgeTone } from '../ui/Badge';
import { KeyValue, Panel, TABLE_CELL, TABLE_HEAD } from '../ui/Controls';
import { fmtBand, fmtUsd } from '../../lib/format';
import type { CandidateVerdict, CandidateVerdictKind, ExplainedDecision, RoutingEvaluation, TraversalStatus } from '../../routing-core/index';

interface Props {
  evaluation: RoutingEvaluation;
  explained: ExplainedDecision;
  compact?: boolean;
}

const STATUS_TONE: Record<TraversalStatus, BadgeTone> = {
  selected: 'ok',
  runnable: 'info',
  unavailable: 'bad',
  'not-runnable': 'muted',
  ineligible: 'bad',
  'quota-exhausted': 'bad',
  'unknown-model': 'bad',
};

const VERDICT_TONE: Record<CandidateVerdictKind, BadgeTone> = {
  selected: 'ok',
  eligible: 'info',
  unavailable: 'bad',
  rejected: 'bad',
  pruned: 'muted',
  'budget-constrained': 'warn',
  unranked: 'warn',
  'not-runnable': 'muted',
  ineligible: 'bad',
};

function Node({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: BadgeTone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[112px] flex-none font-mono text-[11px] text-muted">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

export function DecisionPath({ evaluation, explained, compact = false }: Props) {
  if (evaluation.error) {
    return (
      <Panel title="Decision path">
        <div className="px-[14px] py-3 text-[13px]">
          <Badge tone="bad">{evaluation.error.code}</Badge>
          <p className="mb-0 mt-2 text-muted">{evaluation.error.message}</p>
        </div>
      </Panel>
    );
  }
  const floor = evaluation.floor;
  const profile = evaluation.workloadProfile;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Panel title="Decision path" actions={<span className="font-mono text-[11px] text-muted">{evaluation.policyLabel}</span>}>
        <div className="flex flex-col gap-[6px] px-[14px] py-3">
          <Node label="phase" value={evaluation.phase} />
          {evaluation.phase === 'implement' && (
            <Node
              label="workload class"
              value={evaluation.workloadClass ? `${evaluation.workloadClass} (${evaluation.workloadClassSource})` : 'pinned route'}
              tone={evaluation.classDisagreement ? 'warn' : 'neutral'}
            />
          )}
          {profile && !compact && (
            <div className="ml-[120px] flex flex-col gap-1 text-[12px] text-muted">
              <span>
                profiler: <span className="font-mono text-ink">{profile.workloadClass}</span> ({profile.difficulty} × {profile.volume})
                {evaluation.classDisagreement && <span className="text-warn"> · disagrees with the explicit class</span>}
              </span>
              <ul className="m-0 list-disc pl-4">
                {profile.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          <Node label="capability route" value={evaluation.route?.id ?? '-'} />
          <Node
            label="capability floor"
            value={floor ? `band ≥ ${floor.capabilityFloor}${floor.derived.derivedFrom ? ` · from ${floor.derived.derivedFrom.rungId}` : ' · lead unranked'}` : '-'}
            tone={floor && floor.capabilityFloor > 0 ? 'info' : 'muted'}
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="w-[112px] flex-none font-mono text-[11px] text-muted">stack</span>
            <span className="text-[11px] text-muted">{evaluation.stack?.automaticFallback ? 'availability-only fallback, in order' : 'explicit pin, no fallback'}</span>
          </div>
          <ol className="m-0 ml-[120px] flex list-none flex-col gap-[3px] p-0">
            {evaluation.traversal?.steps.map((step) => (
              <li key={step.rungId} className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-[3px] ${step.status === 'selected' ? 'bg-add-bg' : ''}`}>
                <span className="w-[14px] font-mono text-[10.5px] text-muted">{step.index + 1}</span>
                <BackendDot backend={step.backend} />
                <span className="text-[12.5px] font-medium">{step.displayName}</span>
                <span className="font-mono text-[11px] text-muted">@{step.effort}</span>
                {step.inTail && <Badge tone="muted">tail</Badge>}
                <Badge tone={STATUS_TONE[step.status]}>{step.status}</Badge>
                <span className="font-mono text-[11px] text-muted">{fmtBand(step.band)}{step.estimatedUsd != null ? ` · ~${fmtUsd(step.estimatedUsd)}` : ''}</span>
                {!compact && step.status !== 'runnable' && <span className="basis-full pl-[22px] text-[11.5px] text-muted sm:basis-auto sm:pl-0">{step.reasons.join('; ')}</span>}
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-[112px] flex-none font-mono text-[11px] text-muted">selected</span>
            <Badge tone={evaluation.traversal?.selected ? 'ok' : 'bad'}>{evaluation.traversal?.selected ? `${evaluation.traversal.selected.rungId}` : 'none'}</Badge>
            {evaluation.traversal && evaluation.traversal.availabilitySkips > 0 && <span className="text-[11.5px] text-muted">{evaluation.traversal.availabilitySkips} rung{evaluation.traversal.availabilitySkips === 1 ? '' : 's'} skipped for availability</span>}
          </div>
        </div>
      </Panel>

      <Panel title="Why">
        <ul className="m-0 flex list-disc flex-col gap-1 py-3 pl-8 pr-[14px] text-[12.5px]">
          {explained.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Panel>

      {!compact && evaluation.selection && (
        <Panel
          title="Capability-rung selection (select())"
          actions={<Badge tone="warn" mono={false}>routing proxy · not executing</Badge>}
        >
          <div className="px-[14px] pt-3">
            <KeyValue
              rows={[
                ['outcome', <Badge tone={evaluation.selection.outcome === 'selected' ? 'ok' : 'bad'}>{evaluation.selection.outcome === 'selected' ? 'selected' : `refused: ${evaluation.selection.reason}`}</Badge>],
                ['axis', evaluation.selection.explanation.axis],
                ['floor', `requested ${evaluation.selection.explanation.requestedFloor} · effective ${evaluation.selection.explanation.effectiveFloor}${evaluation.selection.explanation.floorLowered ? ' (lowered)' : ''}`],
                ['snapshot', evaluation.selection.explanation.snapshotVersion],
                ['budget', `${fmtUsd(evaluation.budget.remaining.cost)} remaining`],
              ]}
            />
          </div>
          <CandidateTable verdicts={explained.selection} />
        </Panel>
      )}
    </div>
  );
}

export function CandidateTable({ verdicts }: { verdicts: CandidateVerdict[] }) {
  if (verdicts.length === 0) {
    return <div className="px-[14px] py-3 text-[12px] text-muted">No candidates evaluated.</div>;
  }
  return (
    <div className="overflow-x-auto pt-2">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TABLE_HEAD}>rung</th>
            <th className={TABLE_HEAD}>verdict</th>
            <th className={TABLE_HEAD}>band</th>
            <th className={TABLE_HEAD}>est. cost</th>
            <th className={TABLE_HEAD}>reason</th>
          </tr>
        </thead>
        <tbody>
          {verdicts.map((verdict) => (
            <tr key={`${verdict.rungId}-${verdict.verdict}`}>
              <td className={`${TABLE_CELL} whitespace-nowrap`}>
                <span className="flex items-center gap-2">
                  <BackendDot backend={verdict.backend} />
                  <span className="font-medium">{verdict.displayName}</span>
                  <span className="font-mono text-[11px] text-muted">@{verdict.effort}</span>
                  {verdict.stackIndex != null && <span className="font-mono text-[10.5px] text-faint">#{verdict.stackIndex + 1}</span>}
                </span>
              </td>
              <td className={TABLE_CELL}><Badge tone={VERDICT_TONE[verdict.verdict]}>{verdict.verdict}</Badge></td>
              <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{fmtBand(verdict.band)}</td>
              <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{verdict.estimatedUsd == null ? '—' : fmtUsd(verdict.estimatedUsd)}</td>
              <td className={`${TABLE_CELL} text-muted`}>{verdict.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
