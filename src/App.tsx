import { useCallback, useMemo, useState } from 'react';
import { BenchPage } from './components/bench/BenchPage';
import { Header } from './components/Header';
import { RouterPage } from './components/router/RouterPage';
import { usePolicy } from './hooks/usePolicy';
import { useTheme } from './hooks/useTheme';
import { todayISO } from './lib/format';
import { isDirty, POLICY_DATE } from './lib/policy';
import { getItem, KEYS, setItem } from './lib/storage';
import type { Tab } from './types';

function initialTab(): Tab {
  const t = getItem(KEYS.tab);
  return t === 'router' ? 'router' : 'bench';
}

export default function App() {
  const [tab, setTabState] = useState<Tab>(initialTab);
  const { theme, toggle } = useTheme();
  const { policy, setPolicy, reset } = usePolicy();

  const setTab = useCallback((t: Tab) => {
    setItem(KEYS.tab, t);
    setTabState(t);
  }, []);

  const dirty = useMemo(() => isDirty(policy), [policy]);
  const updatedDate = dirty ? todayISO() : POLICY_DATE;

  return (
    <div className="min-h-screen bg-bg font-sans text-[14px] leading-normal text-ink">
      <Header tab={tab} onTab={setTab} theme={theme} onToggleTheme={toggle} updatedDate={updatedDate} />
      {tab === 'bench' ? (
        <BenchPage policy={policy} theme={theme} />
      ) : (
        <RouterPage policy={policy} setPolicy={setPolicy} reset={reset} updatedDate={updatedDate} />
      )}
    </div>
  );
}
