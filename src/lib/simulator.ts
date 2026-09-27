// Simulator form model: a synthetic routing context a user can edit, and its
// translation into the shared RoutingContext. The evaluation itself is
// routing-core's `evaluateRouting`; nothing routing-related lives here.

import {
  BACKENDS,
  type Backend,
  type Effort,
  type RoutingContext,
  type TaskPhase,
  type WorkloadClass,
  type WorkloadEvidence,
  budgetStateFor,
  unavailableObservations,
} from '../routing-core/index';

export type ClassMode = 'explicit' | 'evidence';

export interface SimulatorForm {
  phase: TaskPhase;
  classMode: ClassMode;
  workloadClass: WorkloadClass;
  evidence: {
    relevantFiles: string;
    packages: string;
    languages: string;
    dependencyDepth: string;
    crossPackage: boolean;
    estimatedFiles: string;
    estimatedLines: string;
    apiBoundary: boolean;
    schemaChange: boolean;
    architectureChange: boolean;
    authBoundary: boolean;
    securitySensitive: boolean;
    concurrency: boolean;
    distributedState: boolean;
    unfamiliarFramework: boolean;
    crossLanguage: boolean;
    unclearOwnership: boolean;
    previousFailures: string;
    failingTests: string;
    toolCalls: string;
    independentWorkstreams: string;
    sessionTokens: string;
    existingModel: string;
  };
  unavailable: Backend[];
  degraded: Backend[];
  quotaExhaustedPools: string;
  remainingCost: string;
  overrideModel: string;
  overrideEffort: Effort | '';
  requestedAlias: string;
  excludedStableId: string;
}

export const EMPTY_EVIDENCE: SimulatorForm['evidence'] = {
  relevantFiles: '',
  packages: '',
  languages: '',
  dependencyDepth: '',
  crossPackage: false,
  estimatedFiles: '',
  estimatedLines: '',
  apiBoundary: false,
  schemaChange: false,
  architectureChange: false,
  authBoundary: false,
  securitySensitive: false,
  concurrency: false,
  distributedState: false,
  unfamiliarFramework: false,
  crossLanguage: false,
  unclearOwnership: false,
  previousFailures: '',
  failingTests: '',
  toolCalls: '',
  independentWorkstreams: '',
  sessionTokens: '',
  existingModel: '',
};

export const DEFAULT_FORM: SimulatorForm = {
  phase: 'implement',
  classMode: 'evidence',
  workloadClass: 'medium-medium',
  evidence: { ...EMPTY_EVIDENCE, relevantFiles: '9', packages: '2', crossPackage: true, estimatedFiles: '6', authBoundary: true },
  unavailable: [],
  degraded: [],
  quotaExhaustedPools: '',
  remainingCost: '',
  overrideModel: '',
  overrideEffort: '',
  requestedAlias: '',
  excludedStableId: '',
};

function num(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function flag(value: boolean): true | undefined {
  return value ? true : undefined;
}

function compact<T extends object>(value: T): T | undefined {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return entries.length === 0 ? undefined : (Object.fromEntries(entries) as T);
}

export function evidenceFromForm(form: SimulatorForm): WorkloadEvidence | null {
  const e = form.evidence;
  const scope = compact({ relevantFiles: num(e.relevantFiles), packages: num(e.packages), languages: num(e.languages), dependencyDepth: num(e.dependencyDepth), crossPackage: flag(e.crossPackage) });
  const change = compact({
    estimatedFiles: num(e.estimatedFiles),
    estimatedLines: num(e.estimatedLines),
    apiBoundary: flag(e.apiBoundary),
    schemaChange: flag(e.schemaChange),
    architectureChange: flag(e.architectureChange),
    authBoundary: flag(e.authBoundary),
    securitySensitive: flag(e.securitySensitive),
    concurrency: flag(e.concurrency),
    distributedState: flag(e.distributedState),
    unfamiliarFramework: flag(e.unfamiliarFramework),
    crossLanguage: flag(e.crossLanguage),
    unclearOwnership: flag(e.unclearOwnership),
  });
  const execution = compact({ previousFailures: num(e.previousFailures), failingTests: num(e.failingTests), toolCalls: num(e.toolCalls), independentWorkstreams: num(e.independentWorkstreams) });
  const session = compact({ tokens: num(e.sessionTokens), existingModel: e.existingModel.trim() || undefined });
  const evidence = compact({ scope, change, execution, session });
  return evidence ? { phase: form.phase, ...evidence } : null;
}

export function contextFromForm(form: SimulatorForm, nowMs: number): RoutingContext {
  const observations = [
    ...unavailableObservations(form.unavailable, nowMs, 'provider_outage'),
    ...unavailableObservations(form.degraded, nowMs, 'timeout'),
  ];
  const pools = form.quotaExhaustedPools
    .split(',')
    .map((pool) => pool.trim())
    .filter(Boolean)
    .map((pool) => ({ pool, remainingFraction: 0, resetsAtMs: null, observedAtMs: nowMs }));
  const remaining = num(form.remainingCost);
  const isImplement = form.phase === 'implement';
  return {
    phase: form.phase,
    workloadClass: isImplement && form.classMode === 'explicit' ? form.workloadClass : null,
    evidence: isImplement && form.classMode === 'evidence' ? evidenceFromForm(form) : null,
    requestedAlias: form.requestedAlias.trim() || null,
    override: form.overrideModel.trim() ? { model: form.overrideModel.trim(), effort: form.overrideEffort || null } : null,
    availability: { backends: observations, quotaPools: pools },
    budget: remaining === undefined ? null : budgetStateFor({ remaining: { cost: remaining } }),
    excludedStableId: form.excludedStableId.trim() || null,
    nowMs,
    taskIdentity: 'arc-router-simulator',
  };
}

export const ALL_BACKENDS: readonly Backend[] = BACKENDS;

export interface SimulatorPreset {
  name: string;
  form: SimulatorForm;
}

export const PRESETS: SimulatorPreset[] = [
  { name: 'Auth change across packages', form: DEFAULT_FORM },
  {
    name: 'Small style fix',
    form: { ...DEFAULT_FORM, evidence: { ...EMPTY_EVIDENCE, relevantFiles: '2', estimatedFiles: '1', estimatedLines: '12' } },
  },
  {
    name: 'Schema migration, Codex down',
    form: { ...DEFAULT_FORM, evidence: { ...EMPTY_EVIDENCE, relevantFiles: '30', packages: '3', crossPackage: true, estimatedFiles: '12', schemaChange: true, apiBoundary: true }, unavailable: ['codex'] },
  },
  { name: 'Verify phase, tight budget', form: { ...DEFAULT_FORM, phase: 'verify', remainingCost: '0.5' } },
  { name: 'Explicit hard-heavy', form: { ...DEFAULT_FORM, classMode: 'explicit', workloadClass: 'hard-heavy', evidence: { ...EMPTY_EVIDENCE } } },
];
