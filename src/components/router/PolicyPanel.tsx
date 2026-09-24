import { useEffect, useState } from 'react';
import { digest } from '../../lib/digest';
import type { Diff, DiffKind } from '../../lib/policy';

interface Props {
  diff: Diff;
  warnCount: number;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}

const LINE_STYLE: Record<DiffKind, { prefix: string; className: string }> = {
  same: { prefix: '', className: 'bg-transparent text-ink' },
  del: { prefix: '−', className: 'bg-del-bg text-del-ink' },
  add: { prefix: '+', className: 'bg-add-bg text-add-ink' },
  fold: { prefix: '', className: 'bg-transparent italic text-muted' },
};

const CODE = 'font-mono text-[12px]';

const BUTTON = 'cursor-pointer rounded-md px-[14px] py-[7px] text-[13px] touch:min-h-[44px] max-sm:flex-1';

export function PolicyPanel({ diff: { lines, changes, full }, warnCount, copied, onCopy, onReset }: Props) {
  const [hash, setHash] = useState('…');

  useEffect(() => {
    let alive = true;
    digest(full).then((h) => {
      if (alive) setHash(h);
    });
    return () => {
      alive = false;
    };
  }, [full]);

  return (
    // lg+: sticky beside the editor, capped to the viewport so the copy/reset footer is always reachable.
    <aside id="policy" aria-label="Generated policy" className="flex min-w-0 scroll-mt-16 flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-line bg-surface">
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
          <span title="SHA-256 of the generated block" className="font-mono text-[11px] text-muted max-sm:basis-full">
            sha256 {hash}
          </span>
        </div>
        <div className="max-h-[60vh] min-h-0 overflow-auto py-[10px] font-mono text-[11.5px] leading-[1.65] lg:max-h-none lg:flex-1">
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
          <button type="button" onClick={onCopy} className={`${BUTTON} bg-ink font-medium text-bg`}>
            {copied ? 'Copied' : 'Copy block'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className={`${BUTTON} border border-line bg-surface text-ink`}
          >
            Reset to main
          </button>
        </div>
      </div>
      <div className="flex flex-none flex-col gap-2 text-[13px]">
        <div className="font-semibold">Apply to arc-orchestrator</div>
        <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-y-2 text-body2">
          <span className="font-mono text-muted">1</span>
          <span>
            Replace the fenced block in arc-pi <code className={`${CODE} break-all`}>policy/arc-model-policy.md</code>
          </span>
          <span className="font-mono text-muted">2</span>
          <span>
            <code className={`${CODE} break-all`}>npm run policy:sync</code> in arc-pi
          </span>
          <span className="font-mono text-muted">3</span>
          <span>
            <code className={`${CODE} break-all`}>bun run generate:surfaces</code> in arc-orchestrator
          </span>
          <span className="font-mono text-muted">4</span>
          <span>Commit both repositories together. A digest mismatch between them is rejected.</span>
        </div>
      </div>
    </aside>
  );
}
