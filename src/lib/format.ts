export function fmtCost(c: number | null | undefined): string {
  return c == null ? '—' : '$' + (c < 0.01 ? c : c.toFixed(2));
}

export function fmtChains(n: number): string {
  return `${n} chain${n > 1 ? 's' : ''}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtUsd(c: number | null | undefined, digits = 2): string {
  return c == null ? 'unknown' : '$' + c.toFixed(digits);
}

export function fmtPct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function fmtBand(band: number | null | undefined): string {
  return band == null ? 'unranked' : `band ${band}`;
}

export function shortDigest(digest: string | null | undefined, length = 12): string {
  return digest ? digest.slice(0, length) : 'n/a';
}

export function fmtTimestamp(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}
