import type { Tab, Theme } from '../types';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  theme: Theme;
  onToggleTheme: () => void;
  updatedDate: string;
}

const TABS: [Tab, string][] = [
  ['bench', 'Benchmarks'],
  ['router', 'Router config'],
];

/**
 * Phones: brand and theme toggle on one row, full-width tabs beneath.
 * sm+: single row; the policy date and repo link appear as width allows.
 */
export function Header({ tab, onTab, theme, onToggleTheme, updatedDate }: Props) {
  const nextTheme = theme === 'dark' ? 'Light mode' : 'Dark mode';
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-line bg-surface px-4 py-3 sm:flex sm:flex-wrap sm:gap-7 sm:px-6 sm:py-[14px] lg:px-8">
      <div className="flex min-w-0 items-baseline gap-[10px]">
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em]">arc router</span>
        <span className="truncate font-mono text-[12px] text-muted">runner-routing-v4</span>
      </div>
      <nav className="col-span-2 row-start-2 flex gap-[2px] rounded-lg border border-line bg-bg p-[3px] sm:row-start-auto">
        {TABS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-current={tab === v ? 'page' : undefined}
            onClick={() => onTab(v)}
            className={`flex-1 cursor-pointer whitespace-nowrap rounded-md px-3 py-[5px] text-[13px] font-medium sm:flex-none touch:min-h-[40px] ${
              tab === v ? 'bg-surface text-ink shadow-tab' : 'bg-transparent text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="hidden flex-1 sm:block" />
      <div className="col-start-2 row-start-1 flex items-center gap-4 font-mono text-[12px] text-muted">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={nextTheme}
          className="cursor-pointer whitespace-nowrap rounded-md border border-line bg-surface px-[10px] py-[3px] text-[12px] text-ink touch:min-h-[40px]"
        >
          {nextTheme}
        </button>
        <span className="hidden whitespace-nowrap sm:inline">policy updated {updatedDate}</span>
        <a
          href="https://github.com/andysolomon/arc-orchestrator"
          target="_blank"
          rel="noreferrer"
          className="hidden whitespace-nowrap text-muted min-[950px]:inline"
        >
          andysolomon/arc-orchestrator
        </a>
      </div>
    </header>
  );
}
