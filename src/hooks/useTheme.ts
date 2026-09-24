import { useCallback, useEffect, useState } from 'react';
import { getItem, KEYS, setItem } from '../lib/storage';
import type { Theme } from '../types';

function initialTheme(): Theme {
  const stored = getItem(KEYS.theme);
  if (stored === 'dark' || stored === 'light') return stored;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setItem(KEYS.theme, next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
