import type { ReactNode } from 'react';
import { BACKEND_DOT } from '../../lib/colors';

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'muted';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-chip text-ink',
  ok: 'bg-add-bg text-add-ink',
  warn: 'bg-chip text-warn',
  bad: 'bg-del-bg text-del-ink',
  info: 'border border-line bg-surface text-ink',
  muted: 'bg-chip text-muted',
};

interface Props {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
  mono?: boolean;
}

/** Compact semantic badge: status, verdict, or identifier. */
export function Badge({ tone = 'neutral', title, children, mono = true }: Props) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-[5px] px-[7px] py-[2px] text-[11px] leading-[1.4] ${mono ? 'font-mono' : ''} ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function BackendDot({ backend }: { backend: string | null }) {
  return <span className="inline-block h-[7px] w-[7px] flex-none rounded-full" style={{ background: backend ? BACKEND_DOT[backend] ?? 'var(--faint)' : 'var(--faint)' }} />;
}
