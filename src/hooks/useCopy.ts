import { useCallback, useEffect, useRef, useState } from 'react';

/** Copy `text` to the clipboard; `copied` stays true for a moment after each copy. */
export function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(() => {
    try {
      navigator.clipboard.writeText(text).catch(() => {
        /* clipboard denied */
      });
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [text]);

  return { copied, copy };
}
