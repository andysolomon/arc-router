import { useCallback, useState } from 'react';
import { CANONICAL } from './canonical';
import { BenchPage } from './components/bench/BenchPage';
import { DiffPage } from './components/diff/DiffPage';
import { Header } from './components/Header';
import { ReplayPage } from './components/replay/ReplayPage';
import { SimulatorPage } from './components/simulator/SimulatorPage';
import { StudioPage } from './components/studio/StudioPage';
import { TracesPage } from './components/traces/TracesPage';
import { usePolicy } from './hooks/usePolicy';
import { useTheme } from './hooks/useTheme';
import { useTraces } from './hooks/useTraces';
import { getItem, KEYS, setItem } from './lib/storage';
import type { Tab } from './types';

const TABS: Tab[] = ['bench', 'studio', 'simulator', 'traces', 'replay', 'diff'];

function initialTab(): Tab {
  const stored = getItem(KEYS.tab);
  // 'router' was the pre-control-plane name of the policy editor.
  if (stored === 'router') return 'studio';
  return TABS.includes(stored as Tab) ? (stored as Tab) : 'bench';
}

export default function App() {
  const [tab, setTabState] = useState<Tab>(initialTab);
  const { theme, toggle } = useTheme();
  const { policy, setPolicy, reset, dirty, issues, invalid, staleDraftDropped } = usePolicy();
  const traces = useTraces();

  const setTab = useCallback((next: Tab) => {
    setItem(KEYS.tab, next);
    setTabState(next);
  }, []);

  return (
    <div className="min-h-screen bg-bg font-sans text-[14px] leading-normal text-ink">
      <Header tab={tab} onTab={setTab} theme={theme} onToggleTheme={toggle} dirty={dirty} invalid={invalid} />
      {CANONICAL.loadErrors.length > 0 && tab !== 'studio' && (
        <div className="border-b border-warnline bg-del-bg px-4 py-2 text-[12.5px] text-del-ink sm:px-6 lg:px-8">
          Canonical routing artifacts failed validation: {CANONICAL.loadErrors.join('; ')}. Re-run <code className="font-mono">npm run sync:routing-core</code>.
        </div>
      )}
      {tab === 'bench' && <BenchPage policy={policy} theme={theme} />}
      {tab === 'studio' && <StudioPage policy={policy} setPolicy={setPolicy} reset={reset} dirty={dirty} issues={issues} staleDraftDropped={staleDraftDropped} />}
      {tab === 'simulator' && <SimulatorPage draft={policy} dirty={dirty} />}
      {tab === 'traces' && <TracesPage traces={traces} />}
      {tab === 'replay' && <ReplayPage traces={traces} draft={policy} dirty={dirty} />}
      {tab === 'diff' && <DiffPage draft={policy} setPolicy={setPolicy} dirty={dirty} issues={issues} />}
    </div>
  );
}
