// Policy Studio: inspect and edit every part of a runner-routing policy with
// live routing-core validation. The draft is persisted in this browser only and
// keyed to the canonical digest it was edited from.

import { useMemo, useState } from 'react';
import { CANONICAL } from '../../canonical';
import { chainRefs, effortsFor, getChain, moveRung, rungOptions, setExcludedEfforts, setExcludedModels, setParentDefault, setRungEffort, withChain, type ChainRef } from '../../lib/policy-state';
import type { PolicyUpdater } from '../../hooks/usePolicy';
import { EFFORT_LEVELS, chainLabel, chainPath, validateChain, type Effort, type PolicyIssue, type RoutingPolicy } from '../../routing-core/index';
import { Badge, BackendDot } from '../ui/Badge';
import { Button, Panel, Select, TABLE_CELL, TABLE_HEAD, TextInput } from '../ui/Controls';
import { ROW, Section } from '../ui/Section';

interface Props {
  policy: RoutingPolicy;
  setPolicy: PolicyUpdater;
  reset: () => void;
  dirty: boolean;
  issues: PolicyIssue[];
  staleDraftDropped: boolean;
}

const SECTIONS: [string, string][] = [
  ['parent', 'Parent'],
  ['phases', 'Phases'],
  ['workloads', 'Workloads'],
  ['tail', 'Tail'],
  ['exclusions', 'Exclusions'],
  ['bindings', 'Bindings'],
  ['constraints', 'Constraints'],
];

const PARENT_MODELS = ['openai-codex/gpt-6.1-sol', 'openai-codex/gpt-6-luna', 'anthropic/claude-sonnet-5-5', 'anthropic/claude-fable-5-1', 'anthropic/claude-opus-5-5', 'anthropic/claude-opus-4-8'];

export function StudioPage({ policy, setPolicy, reset, dirty, issues, staleDraftDropped }: Props) {
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const options = useMemo(() => rungOptions(policy, CANONICAL.registry), [policy]);

  const phaseRefs = chainRefs().filter((ref) => ref.kind === 'phase');
  const workloadRefs = chainRefs().filter((ref) => ref.kind === 'workload');

  return (
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-8 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-10 lg:px-8 lg:pt-10">
      <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">Policy Studio</h1>
          <p className="m-0 max-w-[720px] text-pretty text-[13.5px] text-muted sm:text-[14px]">
            Edits a draft of <span className="font-mono text-[12.5px]">{CANONICAL.policy.label}</span> (updated {CANONICAL.source.updated}). Rung order is fallback order; fallback is availability-only. Every edit is validated against the registry and the policy grammar as you type.
          </p>
          {staleDraftDropped && <div className="rounded-md border border-warnline px-3 py-2 text-[12.5px] text-warn">A saved draft from an older canonical policy was discarded because the canonical digest changed.</div>}
          {CANONICAL.loadErrors.length > 0 && (
            <div className="rounded-md border border-warnline bg-del-bg px-3 py-2 text-[12.5px] text-del-ink">
              Canonical artifacts failed validation: {CANONICAL.loadErrors.join('; ')}
            </div>
          )}
        </div>

        <SectionNav />

        <Section id="parent" title="Parent defaults" desc="The model each parent surface launches with.">
          {Object.entries(policy.parentDefaults).map(([surface, parent]) => (
            <div key={surface} className={`${ROW} sm:items-center`}>
              <div className="flex items-baseline gap-2 sm:block">
                <div className="font-medium">{surface}</div>
                <div className="font-mono text-[11px] text-muted">parent-default {surface}</div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap">
                <Select
                  value={`${parent.provider}/${parent.model}`}
                  aria-label={`${surface} model`}
                  onChange={(event) => {
                    const [provider, model] = event.target.value.split('/') as [string, string];
                    setPolicy((draft) => setParentDefault(draft, surface, { provider, model, effort: parent.effort }));
                  }}
                >
                  {[...new Set([...PARENT_MODELS, `${parent.provider}/${parent.model}`])].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Select>
                <Select value={parent.effort} aria-label={`${surface} effort`} onChange={(event) => setPolicy((draft) => setParentDefault(draft, surface, { ...parent, effort: event.target.value as Effort }))}>
                  {EFFORT_LEVELS.filter((effort) => effort !== 'none').map((effort) => (
                    <option key={effort} value={effort}>@{effort}</option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </Section>

        <ChainSection id="phases" title="Phase routes" desc="Worker chains per lifecycle phase. Analyze is parent-local and has no chain. Task, malformed-output, and verification failures on any rung are terminal." refs={phaseRefs} policy={policy} setPolicy={setPolicy} options={options} lockedRows={[{ label: 'analyze', sub: 'parent-local' }]} />
        <ChainSection id="workloads" title="Workload routes" desc="Implement chains keyed by the nine canonical workload classes (difficulty × volume). The Workload Profiler derives the class from evidence; an explicit class wins." refs={workloadRefs} policy={policy} setPolicy={setPolicy} options={options} />
        <ChainSection id="tail" title="Emergency fallback tail" desc="Availability-only rungs appended to every automatic stack. The last rung is terminal." refs={[{ kind: 'tail' }]} policy={policy} setPolicy={setPolicy} options={options} />

        <Section id="exclusions" title="Exclusions" desc="Identifiers that must not appear in any automatic chain.">
          <div className={`${ROW} sm:items-center`}>
            <div className="font-mono text-[12px]">exclude-models</div>
            <div className="flex flex-wrap items-center gap-[6px]">
              {policy.excludedModels.map((model) => (
                <span key={model} className="flex items-center gap-1 rounded-[5px] bg-chip px-2 py-[3px] font-mono text-[12px]">
                  {model}
                  <button type="button" aria-label={`stop excluding ${model}`} onClick={() => setPolicy((draft) => setExcludedModels(draft, draft.excludedModels.filter((entry) => entry !== model)))} className="cursor-pointer text-muted hover:text-danger">×</button>
                </span>
              ))}
              <AddExcludedModel onAdd={(model) => setPolicy((draft) => setExcludedModels(draft, [...new Set([...draft.excludedModels, model])]))} />
            </div>
          </div>
          <div className={`${ROW} sm:items-center`}>
            <div className="font-mono text-[12px]">exclude-efforts</div>
            <div className="flex flex-wrap gap-[6px]">
              {(['low', 'medium', 'high', 'xhigh', 'max'] as const).map((effort) => {
                const on = policy.excludedEfforts.includes(effort);
                return (
                  <button
                    key={effort}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPolicy((draft) => setExcludedEfforts(draft, on ? draft.excludedEfforts.filter((entry) => entry !== effort) : [...draft.excludedEfforts, effort]))}
                    className={`cursor-pointer rounded-[5px] border px-[10px] py-[3px] font-mono text-[12px] touch:min-h-[40px] touch:min-w-[64px] touch:px-4 ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted'}`}
                  >
                    {effort}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <BindingsSection policy={policy} />
        <ConstraintsSection />
      </div>

      <ValidationPanel errors={errors} warnings={warnings} dirty={dirty} onReset={reset} />
    </main>
  );
}

function SectionNav() {
  return (
    <nav aria-label="Sections" className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
      <ul className="scrollbar-none m-0 flex list-none gap-[6px] overflow-x-auto p-0">
        {SECTIONS.map(([id, label]) => (
          <li key={id} className="flex-none">
            <a href={`#${id}`} className="inline-flex min-h-[32px] items-center rounded-full border border-line bg-surface px-3 text-[12.5px] text-muted2 no-underline touch:min-h-[40px]">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface ChainSectionProps {
  id: string;
  title: string;
  desc: string;
  refs: ChainRef[];
  policy: RoutingPolicy;
  setPolicy: PolicyUpdater;
  options: ReturnType<typeof rungOptions>;
  lockedRows?: Array<{ label: string; sub: string }>;
}

function ChainSection({ id, title, desc, refs, policy, setPolicy, options, lockedRows = [] }: ChainSectionProps) {
  const tailText = policy.emergencyTail.map((rung) => rung).join(' · ') || 'none';
  return (
    <Section id={id} title={title} desc={desc}>
      {lockedRows.map((row) => (
        <div key={row.label} className={`${ROW} sm:py-[14px]`}>
          <div className="flex items-baseline gap-2 sm:block">
            <div className="font-medium">{row.label}</div>
            <div className="font-mono text-[11px] text-muted">{row.sub}</div>
          </div>
          <div className="text-[13px] text-muted sm:py-[6px]">Parent-local. The parent runs analyze itself and never delegates.</div>
        </div>
      ))}
      {refs.map((ref) => (
        <ChainRow key={chainPath(ref)} chainRef={ref} policy={policy} setPolicy={setPolicy} options={options} tailText={ref.kind === 'tail' ? null : tailText} />
      ))}
    </Section>
  );
}

function ChainRow({ chainRef, policy, setPolicy, options, tailText }: { chainRef: ChainRef; policy: RoutingPolicy; setPolicy: PolicyUpdater; options: ReturnType<typeof rungOptions>; tailText: string | null }) {
  const chain = getChain(policy, chainRef);
  const issues = useMemo(() => validateChain(policy, chainRef, { registry: CANONICAL.registry }), [policy, chainRef]);
  const issueAt = (index: number) => issues.filter((issue) => issue.path === `${chainPath(chainRef)}[${index}]`);
  const label = chainRef.kind === 'tail' ? 'tail' : chainRef.key;
  const edit = (fn: (list: string[]) => string[]) => setPolicy((draft) => withChain(draft, chainRef, fn));
  return (
    <div className={`${ROW} sm:py-[14px]`}>
      <div className="flex items-baseline gap-2 sm:block">
        <div className="font-medium">{chainRef.kind === 'workload' ? label.replace('-', ' · ') : label}</div>
        <div className="font-mono text-[11px] text-muted">{chainLabel(chainRef)}</div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <ol className="m-0 flex list-none flex-col items-stretch gap-[6px] p-0 sm:flex-row sm:flex-wrap">
          {chain.map((rung, index) => {
            const at = rung.lastIndexOf('@');
            const stableId = rung.slice(0, at);
            const effort = rung.slice(at + 1);
            const option = options.find((candidate) => candidate.stableId === stableId);
            const efforts = effortsFor(stableId, policy, CANONICAL.registry);
            const rungIssues = issueAt(index);
            const entry = CANONICAL.registry.find((row) => row.stableId === stableId);
            return (
              <li key={`${index}-${rung}`} className={`flex w-full min-w-0 flex-col gap-1 rounded-[7px] border bg-surface py-[7px] pl-[10px] pr-1 sm:w-auto sm:min-w-[176px] ${rungIssues.length ? 'border-warnline' : 'border-line'}`} title={rungIssues.map((issue) => issue.message).join('\n') || undefined}>
                <div className="flex min-w-0 items-center gap-[6px]">
                  <span className="w-[10px] flex-none font-mono text-[10.5px] text-muted">{index + 1}</span>
                  <BackendDot backend={entry?.transportBackend ?? null} />
                  <span className="min-w-0 truncate text-[13px] font-medium sm:whitespace-nowrap">{option?.label ?? policy.surfaces[stableId]?.name ?? stableId}</span>
                  <span className="flex-1" />
                  <RungButton label="earlier" disabled={index === 0} onClick={() => edit((list) => moveRung(list, index, index - 1))}>‹</RungButton>
                  <RungButton label="later" disabled={index === chain.length - 1} onClick={() => edit((list) => moveRung(list, index, index + 1))}>›</RungButton>
                  <RungButton label="remove" danger onClick={() => edit((list) => list.filter((_, position) => position !== index))}>×</RungButton>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  {efforts.length > 1 ? (
                    <select value={effort} aria-label={`${stableId} effort`} onChange={(event) => edit((list) => setRungEffort(list, index, event.target.value as Effort))} className="rounded border border-line bg-bg px-[2px] py-px font-mono text-[11.5px] touch:min-h-[40px] touch:px-2 touch:text-[16px]">
                      {[...new Set([...efforts, effort])].map((candidate) => (
                        <option key={candidate} value={candidate}>@{candidate}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-[12.5px] text-muted2 sm:text-[11.5px]">@{effort}</span>
                  )}
                  <span className="font-mono text-[11px] text-muted">{entry ? entry.transportBackend : 'not in registry'}</span>
                  {rungIssues.length > 0 && <Badge tone="bad">{rungIssues.length} issue{rungIssues.length === 1 ? '' : 's'}</Badge>}
                </div>
              </li>
            );
          })}
          <li className="flex sm:self-center">
            <select
              value=""
              aria-label={`add rung to ${label}`}
              onChange={(event) => {
                const stableId = event.target.value;
                event.target.value = '';
                const option = options.find((candidate) => candidate.stableId === stableId);
                if (option) edit((list) => [...list, `${stableId}@${option.defaultEffort}`]);
              }}
              className="w-full cursor-pointer rounded-[7px] border border-dashed border-dash bg-transparent px-2 py-[6px] text-[12.5px] text-muted2 sm:w-auto touch:min-h-[44px] touch:text-[16px]"
            >
              <option value="">+ Add rung</option>
              {options.map((option) => (
                <option key={option.stableId} value={option.stableId}>{option.label} · {option.backend}</option>
              ))}
            </select>
          </li>
        </ol>
        {tailText && <div className="font-mono text-[11px] text-muted">then tail → {tailText}</div>}
        {issues.map((issue) => (
          <div key={`${issue.path}-${issue.code}-${issue.message}`} className={`text-[12.5px] ${issue.severity === 'error' ? 'text-del-ink' : 'text-warn'}`}>
            <span className="font-mono text-[11px]">{issue.code}</span> {issue.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function RungButton({ label, disabled = false, danger = false, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-transparent text-[14px] leading-none text-muted hover:bg-chip disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent touch:h-10 touch:w-10 touch:text-[17px] ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function AddExcludedModel({ onAdd }: { onAdd: (model: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim().toLowerCase();
        if (trimmed) onAdd(trimmed);
        setValue('');
      }}
    >
      <TextInput value={value} onChange={(event) => setValue(event.target.value)} placeholder="stable id" aria-label="exclude model" className="w-[140px]" />
      <Button onClick={() => { const trimmed = value.trim().toLowerCase(); if (trimmed) onAdd(trimmed); setValue(''); }}>Exclude</Button>
    </form>
  );
}

function BindingsSection({ policy }: { policy: RoutingPolicy }) {
  return (
    <Section id="bindings" title="Provider / model bindings" desc="Public route bases and the registry identities they pin. Bindings come from the policy document and are verified against the registry; edit them in arc-pi, not here.">
      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TABLE_HEAD}>base</th>
              <th className={TABLE_HEAD}>surface</th>
              <th className={TABLE_HEAD}>stable id</th>
              <th className={TABLE_HEAD}>provider model id</th>
              <th className={TABLE_HEAD}>backend</th>
              <th className={TABLE_HEAD}>effort</th>
              <th className={TABLE_HEAD}>registry</th>
            </tr>
          </thead>
          <tbody>
            {policy.routeBindings.map((binding) => {
              const entry = CANONICAL.registry.find((row) => row.stableId === binding.stableId);
              const surface = policy.surfaces[binding.stableId];
              return (
                <tr key={binding.base}>
                  <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{binding.base}</td>
                  <td className={TABLE_CELL}>{surface?.name ?? '—'}{surface?.fixedEffort ? <Badge tone="muted">fixed {surface.fixedEffort}</Badge> : null}</td>
                  <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{binding.stableId}</td>
                  <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{binding.providerModelId}</td>
                  <td className={TABLE_CELL}><span className="flex items-center gap-2"><BackendDot backend={binding.backend} />{binding.backend}</span></td>
                  <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{binding.defaultEffort ?? (entry?.fixedEffort ?? '—')}</td>
                  <td className={TABLE_CELL}>{entry ? <Badge tone={entry.maturity === 'available' ? 'ok' : 'warn'}>{entry.maturity}</Badge> : <Badge tone="bad">missing</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ConstraintsSection() {
  return (
    <Section id="constraints" title="Routing constraints" desc="Fixed contract facts the runtime enforces; shown so a policy edit can be judged against them.">
      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TABLE_HEAD}>capability route</th>
              <th className={TABLE_HEAD}>mode</th>
              <th className={TABLE_HEAD}>sandbox</th>
              <th className={TABLE_HEAD}>output contract</th>
              <th className={TABLE_HEAD}>phases</th>
            </tr>
          </thead>
          <tbody>
            {CANONICAL.capabilityRoutes.map((route) => (
              <tr key={route.id}>
                <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{route.id}</td>
                <td className={TABLE_CELL}>{route.mode}</td>
                <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{route.sandbox}</td>
                <td className={`${TABLE_CELL} font-mono text-[11.5px]`}>{route.outputContract}</td>
                <td className={`${TABLE_CELL} text-muted`}>{route.id.startsWith('explore') ? 'explore, research, plan' : route.id.startsWith('implement') ? 'implement, deploy' : route.id.startsWith('check') ? 'verify' : 'opus-review surface'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="m-0 mt-3 list-disc pl-5 text-[12.5px] text-muted">
        <li>Fallback is availability-only: a completed result, a quality concern, or a validation failure never advances a stack.</li>
        <li>Explicit route pins execute one candidate and never inherit the automatic chains or the tail.</li>
        <li>Budget policy {`budget-limits/v1`}: a root cost ceiling of $10 and a $2.50 dispatch reservation; quota is ordering input, never an admission gate.</li>
        <li>Capability snapshot {CANONICAL.snapshot.snapshotVersion} (bands of width {CANONICAL.snapshot.bandWidth}); unknown capability is never treated as low.</li>
      </ul>
    </Section>
  );
}

function ValidationPanel({ errors, warnings, dirty, onReset }: { errors: PolicyIssue[]; warnings: PolicyIssue[]; dirty: boolean; onReset: () => void }) {
  return (
    <aside aria-label="Validation" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <Panel
        title="Validation"
        actions={
          <>
            <Badge tone={errors.length ? 'bad' : 'ok'}>{errors.length ? `${errors.length} error${errors.length === 1 ? '' : 's'}` : 'valid'}</Badge>
            {warnings.length > 0 && <Badge tone="warn">{warnings.length} warning{warnings.length === 1 ? '' : 's'}</Badge>}
          </>
        }
      >
        <div className="flex flex-col gap-2 px-[14px] py-3 text-[12.5px]">
          {errors.length === 0 && warnings.length === 0 && <span className="text-muted">The draft satisfies the policy grammar and the registry.</span>}
          {[...errors, ...warnings].map((issue) => (
            <div key={`${issue.path}-${issue.code}-${issue.message}`} className={issue.severity === 'error' ? 'text-del-ink' : 'text-warn'}>
              <span className="font-mono text-[11px]">{issue.path}</span> — {issue.message}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line px-[14px] py-3">
          <Button onClick={onReset} disabled={!dirty}>Reset to canonical</Button>
          <span className="self-center text-[12px] text-muted">{dirty ? 'draft differs from canonical' : 'matches canonical'}</span>
        </div>
      </Panel>
      <div className="text-[12.5px] text-muted">
        Simulate the draft on the Simulator tab, replay it against real traces on Replay, and export it on Diff &amp; Export. Nothing here writes to arc-orchestrator; exports are artifacts for a pull request.
      </div>
    </aside>
  );
}
