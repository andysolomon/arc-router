// Routing Simulator: a synthetic context evaluated by the production routing
// engine (routing-core `evaluateRouting`), under the canonical policy and,
// when a draft exists, the draft policy side by side.

import { useEffect, useMemo, useState } from 'react';
import { CANONICAL } from '../../canonical';
import { contextFromForm, DEFAULT_FORM, EMPTY_EVIDENCE, PRESETS, ALL_BACKENDS, type SimulatorForm } from '../../lib/simulator';
import { getItem, KEYS, setItem } from '../../lib/storage';
import { evaluateRouting, explainEvaluation, WORKLOAD_CLASSES, WORKLOAD_PROFILE_THRESHOLDS, type RoutingPolicy, type TaskPhase } from '../../routing-core/index';
import { Segmented } from '../Segmented';
import { Badge } from '../ui/Badge';
import { Button, Checkbox, Field, Panel, Select, TextInput } from '../ui/Controls';
import { DecisionPath } from '../decision/DecisionPath';

interface Props {
  draft: RoutingPolicy;
  dirty: boolean;
}

const PHASES: TaskPhase[] = ['explore', 'research', 'plan', 'implement', 'verify', 'deploy', 'analyze'];

function loadForm(): SimulatorForm {
  try {
    const parsed = JSON.parse(getItem(KEYS.simulator) ?? 'null') as SimulatorForm | null;
    if (parsed && typeof parsed === 'object' && typeof parsed.phase === 'string') return { ...DEFAULT_FORM, ...parsed, evidence: { ...EMPTY_EVIDENCE, ...parsed.evidence } };
  } catch {
    /* ignore */
  }
  return DEFAULT_FORM;
}

const NUMERIC: Array<[keyof SimulatorForm['evidence'], string, string]> = [
  ['relevantFiles', 'relevant files', `≥${WORKLOAD_PROFILE_THRESHOLDS.volume.relevantFilesMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.volume.relevantFilesHeavy} heavy`],
  ['packages', 'packages affected', `≥${WORKLOAD_PROFILE_THRESHOLDS.volume.packagesMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.volume.packagesHeavy} heavy`],
  ['languages', 'languages', 'informational'],
  ['dependencyDepth', 'dependency depth', `≥${WORKLOAD_PROFILE_THRESHOLDS.difficulty.dependencyDepthMedium} medium difficulty`],
  ['estimatedFiles', 'estimated files changed', `≥${WORKLOAD_PROFILE_THRESHOLDS.volume.estimatedFilesMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.volume.estimatedFilesHeavy} heavy · ≥${WORKLOAD_PROFILE_THRESHOLDS.difficulty.estimatedFilesMedium} raises difficulty`],
  ['estimatedLines', 'estimated lines changed', `≥${WORKLOAD_PROFILE_THRESHOLDS.volume.estimatedLinesMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.volume.estimatedLinesHeavy} heavy`],
  ['previousFailures', 'previous failed attempts', `${WORKLOAD_PROFILE_THRESHOLDS.difficulty.previousFailuresMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.difficulty.previousFailuresHard} hard`],
  ['failingTests', 'failing tests', `≥${WORKLOAD_PROFILE_THRESHOLDS.difficulty.failingTestsMedium} medium difficulty`],
  ['toolCalls', 'tool calls so far', `≥${WORKLOAD_PROFILE_THRESHOLDS.volume.toolCallsMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.volume.toolCallsHeavy} heavy`],
  ['independentWorkstreams', 'independent workstreams', `≥${WORKLOAD_PROFILE_THRESHOLDS.volume.workstreamsMedium} medium · ≥${WORKLOAD_PROFILE_THRESHOLDS.volume.workstreamsHeavy} heavy`],
  ['sessionTokens', 'session tokens', 'recorded only'],
];

const FLAGS: Array<[keyof SimulatorForm['evidence'], string, 'hard' | 'medium']> = [
  ['architectureChange', 'architecture change', 'hard'],
  ['schemaChange', 'schema change / migration', 'hard'],
  ['authBoundary', 'authentication boundary', 'hard'],
  ['securitySensitive', 'security sensitive', 'hard'],
  ['concurrency', 'concurrency behavior', 'hard'],
  ['distributedState', 'distributed state', 'hard'],
  ['crossLanguage', 'cross-language', 'hard'],
  ['apiBoundary', 'public API boundary', 'medium'],
  ['crossPackage', 'cross-package', 'medium'],
  ['unfamiliarFramework', 'unfamiliar framework', 'medium'],
  ['unclearOwnership', 'unclear ownership', 'medium'],
];

export function SimulatorPage({ draft, dirty }: Props) {
  const [form, setForm] = useState<SimulatorForm>(loadForm);
  const [which, setWhich] = useState<'canonical' | 'draft'>('canonical');
  // The clock is an input: fixed when the form last changed, so the evaluation
  // is a pure function of what is on screen.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setItem(KEYS.simulator, JSON.stringify(form));
  }, [form]);

  const update = (patch: Partial<SimulatorForm>) => {
    setNowMs(Date.now());
    setForm((current) => ({ ...current, ...patch }));
  };
  const updateEvidence = (patch: Partial<SimulatorForm['evidence']>) => update({ evidence: { ...form.evidence, ...patch } });

  const context = useMemo(() => contextFromForm(form, nowMs), [form, nowMs]);
  const canonical = useMemo(() => {
    const evaluation = evaluateRouting({ policy: CANONICAL.policy, registry: CANONICAL.registry, snapshot: CANONICAL.snapshot, context });
    return { evaluation, explained: explainEvaluation(evaluation, CANONICAL.registry, CANONICAL.policy) };
  }, [context]);
  const draftResult = useMemo(() => {
    if (!dirty) return null;
    const evaluation = evaluateRouting({ policy: draft, registry: CANONICAL.registry, snapshot: CANONICAL.snapshot, context });
    return { evaluation, explained: explainEvaluation(evaluation, CANONICAL.registry, draft) };
  }, [context, draft, dirty]);
  const differs = draftResult != null && draftResult.evaluation.traversal?.selected?.rungId !== canonical.evaluation.traversal?.selected?.rungId;
  const shown = which === 'draft' && draftResult ? draftResult : canonical;

  const isImplement = form.phase === 'implement';
  const evidenceMode = isImplement && form.classMode === 'evidence';
  const toggleBackend = (list: 'unavailable' | 'degraded', backend: (typeof ALL_BACKENDS)[number]) => {
    const current = form[list];
    update({ [list]: current.includes(backend) ? current.filter((entry) => entry !== backend) : [...current, backend] } as Partial<SimulatorForm>);
  };

  return (
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-6 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-10">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">Routing simulator</h1>
          <p className="m-0 text-pretty text-[13.5px] text-muted">
            Define a synthetic routing context and evaluate it with the same routing-core functions the runtime executes: workload profiler, candidate stacks, capability floor, availability view, and <code className="font-mono text-[12px]">select()</code>.
          </p>
        </div>

        <Panel title="Preset" actions={<Button onClick={() => update({ ...DEFAULT_FORM })}>Reset</Button>}>
          <div className="flex flex-wrap gap-[6px] px-[14px] py-3">
            {PRESETS.map((preset) => (
              <Button key={preset.name} onClick={() => update({ ...preset.form })}>{preset.name}</Button>
            ))}
          </div>
        </Panel>

        <Panel title="Task">
          <div className="grid grid-cols-2 gap-3 px-[14px] py-3">
            <Field label="phase">
              <Select value={form.phase} onChange={(event) => update({ phase: event.target.value as TaskPhase })}>
                {PHASES.map((phase) => (
                  <option key={phase} value={phase}>{phase}{phase === 'analyze' ? ' (parent-local)' : ''}</option>
                ))}
              </Select>
            </Field>
            {isImplement && (
              <Field label="workload class from">
                <Select value={form.classMode} onChange={(event) => update({ classMode: event.target.value as SimulatorForm['classMode'] })}>
                  <option value="evidence">evidence (profiler)</option>
                  <option value="explicit">explicit class</option>
                </Select>
              </Field>
            )}
            {isImplement && form.classMode === 'explicit' && (
              <Field label="workload class">
                <Select value={form.workloadClass} onChange={(event) => update({ workloadClass: event.target.value as SimulatorForm['workloadClass'] })}>
                  {WORKLOAD_CLASSES.map((klass) => (
                    <option key={klass} value={klass}>{klass}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="explicit route pin" hint="e.g. sol-implement">
              <TextInput value={form.requestedAlias} onChange={(event) => update({ requestedAlias: event.target.value })} placeholder="none" />
            </Field>
          </div>
        </Panel>

        {evidenceMode && (
          <Panel title="Workload evidence" actions={<span className="font-mono text-[10.5px] text-muted">workload-profile/v1 thresholds</span>}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-[14px] py-3">
              {NUMERIC.map(([key, label, hint]) => (
                <Field key={key} label={label} hint={hint}>
                  <TextInput inputMode="numeric" value={String(form.evidence[key])} onChange={(event) => updateEvidence({ [key]: event.target.value } as Partial<SimulatorForm['evidence']>)} placeholder="—" />
                </Field>
              ))}
              <Field label="existing model" hint="recorded only">
                <TextInput value={form.evidence.existingModel} onChange={(event) => updateEvidence({ existingModel: event.target.value })} placeholder="—" />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-x-3 border-t border-line px-[14px] py-3 sm:grid-cols-2">
              {FLAGS.map(([key, label, tier]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox label={label} checked={Boolean(form.evidence[key])} onChange={(next) => updateEvidence({ [key]: next } as Partial<SimulatorForm['evidence']>)} />
                  <Badge tone={tier === 'hard' ? 'bad' : 'warn'}>{tier}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="Runtime state">
          <div className="flex flex-col gap-3 px-[14px] py-3">
            <div className="text-[12px] text-muted">unavailable backends (observed now)</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {ALL_BACKENDS.map((backend) => (
                <Checkbox key={backend} label={backend} checked={form.unavailable.includes(backend)} onChange={() => toggleBackend('unavailable', backend)} />
              ))}
            </div>
            <div className="text-[12px] text-muted">degraded backends (timeouts; ordering only)</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {ALL_BACKENDS.map((backend) => (
                <Checkbox key={backend} label={backend} checked={form.degraded.includes(backend)} onChange={() => toggleBackend('degraded', backend)} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="remaining cost budget (USD)" hint="blank = fresh root budget">
                <TextInput inputMode="decimal" value={form.remainingCost} onChange={(event) => update({ remainingCost: event.target.value })} placeholder="10" />
              </Field>
              <Field label="exhausted quota pools" hint="comma separated">
                <TextInput value={form.quotaExhaustedPools} onChange={(event) => update({ quotaExhaustedPools: event.target.value })} placeholder="none" />
              </Field>
              <Field label="model override" hint="registry label">
                <TextInput value={form.overrideModel} onChange={(event) => update({ overrideModel: event.target.value })} placeholder="none" />
              </Field>
              <Field label="override effort">
                <Select value={form.overrideEffort} onChange={(event) => update({ overrideEffort: event.target.value as SimulatorForm['overrideEffort'] })}>
                  <option value="">any</option>
                  {['none', 'low', 'medium', 'high', 'xhigh', 'max'].map((effort) => (
                    <option key={effort} value={effort}>{effort}</option>
                  ))}
                </Select>
              </Field>
              <Field label="exclude implementer (verify independence)" hint="stable id">
                <TextInput value={form.excludedStableId} onChange={(event) => update({ excludedStableId: event.target.value })} placeholder="none" />
              </Field>
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            options={[['canonical', 'Current policy'], ['draft', dirty ? 'Draft policy' : 'Draft (no changes)']] as const}
            value={which}
            onChange={(value) => setWhich(value)}
          />
          {draftResult && (
            <Badge tone={differs ? 'warn' : 'ok'} mono={false}>
              {differs ? `draft selects ${draftResult.evaluation.traversal?.selected?.rungId ?? 'none'} instead of ${canonical.evaluation.traversal?.selected?.rungId ?? 'none'}` : 'draft selects the same rung'}
            </Badge>
          )}
          <span className="font-mono text-[11px] text-muted">snapshot {CANONICAL.snapshot.snapshotVersion} · now {new Date(nowMs).toISOString()}</span>
        </div>
        <div className="text-[15px] font-semibold">{shown.explained.headline}</div>
        <DecisionPath evaluation={shown.evaluation} explained={shown.explained} />
        <details className="rounded-[10px] border border-line bg-surface">
          <summary className="cursor-pointer px-[14px] py-[9px] text-[12.5px] font-medium">Routing context (JSON)</summary>
          <pre className="m-0 max-h-[360px] overflow-auto px-[14px] pb-3 font-mono text-[11px] leading-[1.5]">{JSON.stringify(context, null, 2)}</pre>
        </details>
      </div>
    </main>
  );
}
