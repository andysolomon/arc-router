import { modelInfo } from '../data/models';

export function efforts(id: string): string[] {
  const b = modelInfo(id).backend;
  if (id === 'cursor-grok-4.7-high') return ['high'];
  if (id === 'gpt-6-luna') return ['low', 'medium', 'high', 'max'];
  if (b === 'claude' || b === 'codex') return ['low', 'medium', 'high'];
  if (b === 'minimax') return ['low', 'medium', 'high'];
  return ['none'];
}

export function defaultEffort(id: string): string {
  const e = efforts(id);
  if (id === 'gpt-6-luna') return 'max';
  return e.includes('high') ? 'high' : e[0];
}
