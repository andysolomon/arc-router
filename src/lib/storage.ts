export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export const KEYS = {
  tab: 'arc-router-tab',
  theme: 'arc-router-theme',
  // v2: drafts are keyed to the canonical digest they were edited from.
  policy: 'arc-router-policy-draft-v2',
  simulator: 'arc-router-simulator-v1',
} as const;
