import type { Backend, BenchModel } from '../types';

export const COLORS: Record<Backend, string> = {
  claude: 'oklch(0.62 0.14 45)',
  codex: 'oklch(0.58 0.14 255)',
  composer: 'oklch(0.6 0.13 160)',
  opencode: 'oklch(0.57 0.14 315)',
  minimax: 'oklch(0.66 0.13 95)',
};

/** id -> [hue, dashed (1) | solid (0), provider] */
export const PAL: Record<string, [number, 0 | 1, string]> = {
  'opus-5.5': [40, 0, 'Anthropic'],
  'fable-5.1': [88, 0, 'Anthropic'],
  'gpt-6-sol': [255, 0, 'OpenAI'],
  'gpt-6-luna': [300, 0, 'OpenAI'],
  'gpt-5.6-luna': [300, 1, 'OpenAI'],
  'grok-4.7': [10, 0, 'xAI'],
  'glm-5.3': [145, 0, 'Z.ai'],
  'glm-5.3-flash': [145, 1, 'Z.ai'],
  'kimi-k3': [335, 0, 'Moonshot'],
  'deepseek-v4-pro': [205, 0, 'DeepSeek'],
  'deepseek-v4-flash': [205, 1, 'DeepSeek'],
  'minimax-m3': [60, 0, 'MiniMax'],
  'muse-spark-1.3': [175, 0, 'Meta'],
};

export const PROVIDERS = ['Anthropic', 'OpenAI', 'xAI', 'Z.ai', 'Moonshot', 'DeepSeek', 'MiniMax', 'Meta'];

export const LEGEND: [Backend, string][] = [
  ['claude', 'Claude'],
  ['codex', 'Codex'],
  ['composer', 'Cursor'],
  ['opencode', 'OpenCode Go'],
  ['minimax', 'MiniMax'],
];

// [effort, Intelligence Index, $ per task, output tokens/s | null]  Source: Artificial Analysis leaderboard, Sep 2026
export const BENCH: BenchModel[] = [
  { id: 'opus-5.5', name: 'Claude Opus 5.5', backend: 'claude', binds: 'opus-5.5', pts: [['low', 42, 0.55, 94], ['high', 54, 1.82, 91]] },
  { id: 'fable-5.1', name: 'Claude Fable 5.1', backend: 'claude', binds: 'fable-5.1', pts: [['low', 47, 2.37, 54], ['high', 51, 3.91, 55]] },
  { id: 'gpt-6-sol', name: 'GPT-6 Sol', backend: 'codex', binds: 'gpt-6-sol', pts: [['low', 34, 0.13, null], ['high', 43, 0.37, null]] },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', backend: 'codex', binds: 'gpt-6-luna', pts: [['low', 21, 0.0045, null], ['high', 32, 0.03, null], ['max', 37, 0.07, null]] },
  { id: 'grok-4.7', name: 'Grok 4.7', backend: 'composer', binds: 'cursor-grok-4.7-high', pts: [['high', 46, 2.73, 47]] },
  { id: 'minimax-m3', name: 'MiniMax M3', backend: 'minimax', binds: 'minimax-m3', pts: [['default', 29, 0.51, 118]] },
  { id: 'glm-5.3', name: 'GLM 5.3', backend: 'opencode', binds: 'glm-5.3', pts: [['max', 45, 2.01, 57]] },
  { id: 'glm-5.3-flash', name: 'GLM 5.3 Flash', backend: 'opencode', binds: 'glm-5.3-flash', pts: [['max', 42, 0.25, 66]] },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4.1 Flash', backend: 'opencode', binds: 'deepseek-v4-flash', pts: [['max', 39, 0.27, 219]] },
  { id: 'kimi-k3', name: 'Kimi K3', backend: 'opencode', binds: 'go-kimi-k3', pts: [['low', 34, null, 37, true], ['max', 44, 2.0, 38]] },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', backend: 'opencode', binds: 'deepseek-v4-pro', pts: [['max', 36, 0.67, 67]] },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', backend: 'opencode', binds: 'go-luna', pts: [['low', 21, 0.01, 131], ['high', 32, 0.04, 132], ['max', 37, 0.18, 145]] },
  { id: 'muse-spark-1.3', name: 'Muse Spark 1.3', backend: 'opencode', binds: 'muse-spark-1.3', pts: [['xhigh', 45, 1.37, 228], ['max', 48, 1.6, 219]] },
];
