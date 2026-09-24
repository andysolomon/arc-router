import { useEffect, useRef, useState, type RefObject } from 'react';

/** Observes the element's content width with a ResizeObserver. */
export function useResizeWidth<T extends HTMLElement>(initial = 960): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w) setWidth((prev) => (Math.abs(w - prev) > 1 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}
