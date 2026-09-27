// Parity: this control plane runs on the artifacts arc-orchestrator exported,
// verified here without an arc-orchestrator checkout. The vendored manifest
// must match the files, the policy digest must match its canonical JSON, and
// the shared validators must accept the canonical data.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  WORKLOAD_CLASSES,
  canonicalPolicyJson,
  compileCandidateStacks,
  parsePolicyDocument,
  policyHasErrors,
  renderPolicyBlock,
  parsePolicyBlock,
  validateModelRegistry,
  validatePolicy,
  type RoutingPolicyDocument,
} from '../src/routing-core/index';

const core = resolve(__dirname, '../src/routing-core');
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(core, 'MANIFEST.json'), 'utf8')) as { contract: string; routingCore: string; files: Record<string, string>; policy: { digest: string; label: string } };
const policyDocument = JSON.parse(readFileSync(resolve(core, 'generated/routing-policy.json'), 'utf8')) as RoutingPolicyDocument;
const registry = JSON.parse(readFileSync(resolve(core, 'generated/model-registry.json'), 'utf8')) as { entries: Parameters<typeof validateModelRegistry>[0] };
const artifacts = JSON.parse(readFileSync(resolve(core, 'generated/manifest.json'), 'utf8')) as { policy: { digest: string }; files: Record<string, string> };

describe('vendored routing-core parity', () => {
  test('every vendored file matches its manifest digest and nothing is unlisted', () => {
    const listed = Object.keys(manifest.files).sort();
    for (const name of listed) {
      expect(sha256(readFileSync(resolve(core, name), 'utf8')), name).toBe(manifest.files[name]);
    }
    const onDisk = [...readdirSync(core).filter((name) => name.endsWith('.ts')), ...readdirSync(resolve(core, 'generated')).map((name) => `generated/${name}`)].sort();
    expect(onDisk).toEqual(listed);
    expect(manifest.contract).toBe('arc-router-routing-core-sync/v1');
  });

  test('the generated artifacts agree with the orchestrator manifest', () => {
    for (const [name, digest] of Object.entries(artifacts.files)) {
      expect(sha256(readFileSync(resolve(core, 'generated', name), 'utf8')), name).toBe(digest);
    }
    expect(artifacts.policy.digest).toBe(policyDocument.source.digest);
    expect(manifest.policy.digest).toBe(policyDocument.source.digest);
  });

  test('the policy digest is the SHA-256 of its canonical JSON (arc-pi digest rule)', () => {
    expect(sha256(canonicalPolicyJson(policyDocument.policy))).toBe(policyDocument.source.digest);
    expect(policyDocument.contract).toBe('arc-routing-policy/v1');
  });

  test('the vendored policy document parses to the vendored policy object', () => {
    const markdown = readFileSync(resolve(core, 'generated/arc-model-policy.md'), 'utf8');
    expect(parsePolicyDocument(markdown)).toEqual(policyDocument.policy);
    expect(parsePolicyBlock(renderPolicyBlock(policyDocument.policy))).toEqual(policyDocument.policy);
  });

  test('canonical policy and registry validate with the shared validators', () => {
    const issues = validatePolicy(policyDocument.policy, { registry: registry.entries });
    expect(issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(policyHasErrors(issues)).toBe(false);
    const stacks = compileCandidateStacks(policyDocument.policy);
    expect(validateModelRegistry(registry.entries, stacks).errors).toEqual([]);
    expect(Object.keys(policyDocument.policy.workloadChains)).toEqual([...WORKLOAD_CLASSES]);
  });

  test('no hand-authored policy copy remains in this repository', () => {
    const src = resolve(__dirname, '../src');
    for (const name of ['data/models.ts', 'data/policy.ts', 'lib/policy.ts', 'lib/validate.ts', 'lib/lookup.ts', 'lib/efforts.ts']) {
      expect(() => readFileSync(resolve(src, name)), name).toThrow();
    }
  });
});
