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

export function Header({ tab, onTab, theme, onToggleTheme, updatedDate }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-7 border-b border-line bg-surface px-8 py-[14px]">
      <div className="flex items-baseline gap-[10px]">
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em]">arc router</span>
        <span className="whitespace-nowrap font-mono text-[12px] text-muted">runner-routing-v4</span>
      </div>
      <nav className="flex gap-[2px] rounded-lg border border-line bg-bg p-[3px]">
        {TABS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => onTab(v)}
            className={`cursor-pointer whitespace-nowrap rounded-md px-3 py-[5px] text-[13px] font-medium ${
              tab === v ? 'bg-surface text-ink shadow-tab' : 'bg-transparent text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex flex-wrap items-center gap-4 font-mono text-[12px] text-muted">
        <button
          type="button"
          onClick={onToggleTheme}
          className="cursor-pointer whitespace-nowrap rounded-md border border-line bg-surface px-[10px] py-[3px] text-[12px] text-ink"
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <span className="whitespace-nowrap">policy updated {updatedDate}</span>
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
