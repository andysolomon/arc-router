import type { ModelInfo, ModelTuple } from '../types';

export const MODELS: ModelTuple[] = [
  ['fable-5.1', 'CC Fable 5.1', 'claude'], ['gpt-6-sol', 'Codex Sol 6', 'codex'], ['gpt-6-luna', 'Codex Luna 6', 'codex'], ['gpt-5.5', 'Codex GPT-5.5', 'codex'],
  ['opus-5.5', 'CC Opus 5.5', 'claude'], ['opus-4.8', 'CC Opus 4.8', 'claude'], ['cursor-grok-4.7-high', 'Cursor Grok 4.7 High', 'composer'],
  ['minimax-m3', 'MiniMax M3', 'minimax'], ['composer-2.5', 'Cursor Composer 2.5', 'composer'], ['cursor-auto', 'Cursor Auto', 'composer'],
  ['opencode-go-glm-5.3-flash', 'Go GLM 5.3 Flash', 'opencode'], ['opencode-go-glm-5.3', 'Go GLM 5.3', 'opencode'],
  ['opencode-go-deepseek-v4-pro', 'Go DeepSeek V4 Pro', 'opencode'], ['opencode-go-deepseek-v4-flash', 'Go DeepSeek V4 Flash', 'opencode'],
  ['opencode-go-kimi-k3', 'Go Kimi K3', 'opencode'], ['opencode-go-qwen3.8-max', 'Go Qwen 3.8 Max', 'opencode'],
  ['opencode-go-muse-spark-1.2-contributor', 'Go Muse Spark 1.2', 'opencode'], ['opencode-go-glm-5.2', 'Go GLM 5.2', 'opencode'],
  ['opencode-go-kimi-k2.7-code', 'Go Kimi K2.7 Code', 'opencode'], ['opencode-go-grok-4.6', 'Go Grok 4.6', 'opencode'],
  ['opencode-go-gpt-5.6-luna', 'Go Luna 5.6', 'opencode'],
];

/** router model id -> bench `id` or `id@effort` */
export const RMAP: Record<string, string> = {
  'fable-5.1': 'fable-5.1', 'gpt-6-sol': 'gpt-6-sol', 'gpt-6-luna': 'gpt-6-luna', 'opus-5.5': 'opus-5.5', 'cursor-grok-4.7-high': 'grok-4.7@high',
  'minimax-m3': 'minimax-m3@default', 'opencode-go-glm-5.3': 'glm-5.3@max', 'opencode-go-glm-5.3-flash': 'glm-5.3-flash@max', 'opencode-go-deepseek-v4-flash': 'deepseek-v4-flash@max', 'opencode-go-gpt-5.6-luna': 'gpt-5.6-luna@max',
  'opencode-go-kimi-k3': 'kimi-k3@max', 'opencode-go-deepseek-v4-pro': 'deepseek-v4-pro@max',
};

export const PHASES = ['explore', 'research', 'plan', 'verify', 'deploy'];

export const WORKLOADS = ['hard-heavy', 'hard-medium', 'hard-light', 'medium-heavy', 'medium-medium', 'medium-light', 'easy-heavy', 'easy-medium', 'easy-light'];

export const PARENT_MODELS = ['openai-codex/gpt-6-sol', 'openai-codex/gpt-6-luna', 'openai-codex/gpt-5.5', 'anthropic/claude-fable-5-1', 'anthropic/claude-opus-5-5', 'anthropic/claude-opus-4-8'];

export const PARENT_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

export function modelInfo(id: string): ModelInfo {
  const m = MODELS.find((x) => x[0] === id);
  return m ? { id: m[0], label: m[1], backend: m[2] } : { id, label: id, backend: 'opencode' };
}
