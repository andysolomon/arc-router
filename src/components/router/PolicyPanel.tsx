import { useEffect, useMemo, useRef, useState } from 'react';
import { digest } from '../../lib/digest';
import { diff, type DiffKind } from '../../lib/policy';
import type { Policy } from '../../types';

interface Props {
  policy: Policy;
  updatedDate: string;
  warnCount: number;
  onReset: () => void;
}

const LINE_STYLE: Record<DiffKind, { prefix: string; className: string }> = {
  same: { prefix: '', className: 'bg-transparent text-ink' },
  del: { prefix: '−', className: 'bg-del-bg text-del-ink' },
  add: { prefix: '+', className: 'bg-add-bg text-add-ink' },
  fold: { prefix: '', className: 'bg-transparent italic text-muted' },
};

const CODE = 'font-mono text-[12px]';

export function PolicyPanel({ policy, updatedDate, warnCount, onReset }: Props) {
  const { lines, changes, full } = useMemo(() => diff(policy, updatedDate), [policy, updatedDate]);
  const [hash, setHash] = useState('…');
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    let alive = true;
    digest(full).then((h) => {
      if (alive) setHash(h);
    });
    return () => {
      alive = false;
    };
  }, [full]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copyBlock = () => {
    try {
      navigator.clipboard.writeText('```arc-model-policy\n' + full + '\n```').catch(() => {
        /* clipboard denied */
      });
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <aside className="sticky top-6 flex min-w-0 max-w-[560px] flex-[1_1_400px] flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-[10px] border-b border-line px-[14px] py-3">
          <span className="font-mono text-[12px] font-medium">arc-model-policy</span>
          <span className={`text-[12px] ${changes ? 'text-add-ink' : 'text-muted'}`}>
            {changes ? `${changes} line${changes > 1 ? 's' : ''} changed` : 'matches main'}
          </span>
          {warnCount > 0 && (
            <span className="text-[12px] text-warn">
              {warnCount} warning{warnCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="flex-1" />
          <span title="SHA-256 of the generated block" className="font-mono text-[11px] text-muted">
            sha256 {hash}
          </span>
        </div>
        <div className="max-h-[56vh] overflow-auto py-[10px] font-mono text-[11.5px] leading-[1.65]">
          {lines.map((l, i) => {
            const s = LINE_STYLE[l.kind];
            return (
              <div key={i} className={`flex gap-2 px-[14px] ${s.className}`}>
                <span className="w-2 flex-none select-none">{s.prefix}</span>
                <span className="whitespace-pre-wrap break-words">{l.text}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 border-t border-line px-[14px] py-3">
          <button
            type="button"
            onClick={copyBlock}
            className="cursor-pointer rounded-md bg-ink px-[14px] py-[7px] text-[13px] font-medium text-bg"
          >
            {copied ? 'Copied' : 'Copy block'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-md border border-line bg-surface px-[14px] py-[7px] text-[13px] text-ink"
          >
            Reset to main
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="font-semibold">Apply to arc-orchestrator</div>
        <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-y-2 text-body2">
          <span className="font-mono text-muted">1</span>
          <span>
            Replace the fenced block in arc-pi <code className={CODE}>policy/arc-model-policy.md</code>
          </span>
          <span className="font-mono text-muted">2</span>
          <span>
            <code className={CODE}>npm run policy:sync</code> in arc-pi
          </span>
          <span className="font-mono text-muted">3</span>
          <span>
            <code className={CODE}>bun run generate:surfaces</code> in arc-orchestrator
          </span>
          <span className="font-mono text-muted">4</span>
          <span>Commit both repositories together. A digest mismatch between them is rejected.</span>
        </div>
      </div>
    </aside>
  );
}
