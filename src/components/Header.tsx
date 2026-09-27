import { CANONICAL } from '../canonical';
import { shortDigest } from '../lib/format';
import type { Tab, Theme } from '../types';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  theme: Theme;
  onToggleTheme: () => void;
  dirty: boolean;
  invalid: boolean;
}

const TABS: [Tab, string][] = [
  ['bench', 'Benchmarks'],
  ['studio', 'Policy Studio'],
  ['simulator', 'Simulator'],
  ['traces', 'Traces'],
  ['replay', 'Replay'],
  ['diff', 'Diff & Export'],
];

/**
 * Phones: brand and theme toggle on one row, horizontally scrolling tabs beneath.
 * sm+: single row; the policy digest and source commit appear as width allows.
 */
export function Header({ tab, onTab, theme, onToggleTheme, dirty, invalid }: Props) {
  const nextTheme = theme === 'dark' ? 'Light mode' : 'Dark mode';
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-line bg-surface px-4 py-3 sm:flex sm:flex-wrap sm:gap-6 sm:px-6 sm:py-[12px] lg:px-8">
      <div className="flex min-w-0 items-baseline gap-[10px]">
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em]">arc router</span>
        <span className="truncate font-mono text-[12px] text-muted">{CANONICAL.policy.label} · control plane</span>
      </div>
      <nav className="scrollbar-none col-span-2 row-start-2 flex gap-[2px] overflow-x-auto rounded-lg border border-line bg-bg p-[3px] sm:row-start-auto">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => onTab(value)}
            className={`flex-none cursor-pointer whitespace-nowrap rounded-md px-3 py-[5px] text-[13px] font-medium touch:min-h-[40px] ${
              tab === value ? 'bg-surface text-ink shadow-tab' : 'bg-transparent text-muted'
            }`}
          >
            {label}
            {value === 'studio' && dirty && <span className={`ml-[6px] inline-block h-[6px] w-[6px] rounded-full ${invalid ? 'bg-danger' : 'bg-add-ink'}`} />}
          </button>
        ))}
      </nav>
      <div className="hidden flex-1 sm:block" />
      <div className="col-start-2 row-start-1 flex items-center gap-4 font-mono text-[12px] text-muted">
        <button type="button" onClick={onToggleTheme} aria-label={nextTheme} className="cursor-pointer whitespace-nowrap rounded-md border border-line bg-surface px-[10px] py-[3px] text-[12px] text-ink touch:min-h-[40px]">
          {nextTheme}
        </button>
        <span className="hidden whitespace-nowrap sm:inline" title={`canonical policy digest ${CANONICAL.source.digest}`}>
          policy {CANONICAL.source.updated} · {shortDigest(CANONICAL.source.digest)}
        </span>
        <a href="https://github.com/andysolomon/arc-orchestrator" target="_blank" rel="noreferrer" className="hidden whitespace-nowrap text-muted min-[1100px]:inline" title={CANONICAL.sync.sourceCommit ?? undefined}>
          arc-orchestrator{CANONICAL.sync.sourceCommit ? `@${CANONICAL.sync.sourceCommit.slice(0, 7)}` : ''}
        </a>
      </div>
    </header>
  );
}
