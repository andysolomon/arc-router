// Everything the SPA imports from routing-core must be browser-safe: no Node
// built-ins, no Bun globals, no environment or clock reads. The vendoring
// script refuses such files; this test holds the line on what was vendored.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const core = resolve(__dirname, '../src/routing-core');

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`])\/\/.*$/gm, '$1');
}

describe('browser-safe routing-core', () => {
  test('vendored sources import nothing from Node or Bun and never read the clock or environment', () => {
    const files = readdirSync(core).filter((name) => name.endsWith('.ts'));
    expect(files).not.toContain('runtime.ts');
    for (const name of files) {
      const code = stripComments(readFileSync(resolve(core, name), 'utf8'));
      expect(code, name).not.toMatch(/from\s+["']node:/);
      expect(code, name).not.toMatch(/from\s+["'](fs|path|crypto|child_process|os)["']/);
      expect(code, name).not.toMatch(/\bBun\./);
      expect(code, name).not.toMatch(/\bprocess\.env\b/);
      expect(code, name).not.toMatch(/\bDate\.now\(/);
      expect(code, name).not.toMatch(/\brequire\(/);
    }
  });

  test('the barrel loads and exposes the control-plane entry points', async () => {
    const core = await import('../src/routing-core/index');
    for (const name of ['evaluateRouting', 'explainEvaluation', 'replayTraces', 'diffPolicies', 'validatePolicy', 'profileWorkload', 'readRoutingTrace', 'renderPolicyBlock', 'exportPolicyBundle'] as const) {
      expect(typeof core[name], name).toBe('function');
    }
  });
});
