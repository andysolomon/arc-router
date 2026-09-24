export function fmtCost(c: number | null | undefined): string {
  return c == null ? '—' : '$' + (c < 0.01 ? c : c.toFixed(2));
}

export function fmtChains(n: number): string {
  return `${n} chain${n > 1 ? 's' : ''}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
