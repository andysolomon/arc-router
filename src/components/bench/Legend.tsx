import { BENCH, PAL, PROVIDERS } from '../../data/bench';
import { modelColor } from '../../lib/colors';
import type { Theme } from '../../types';

interface Props {
  theme: Theme;
  hover: string | null;
  setHover: (h: string | null) => void;
  clearHover: () => void;
}

export function Legend({ theme, hover, setHover, clearHover }: Props) {
  const hovM = hover ? hover.split('@')[0] : null;
  const groups = PROVIDERS.map((provider) => ({
    provider,
    items: BENCH.filter((m) => (PAL[m.id] ?? [])[2] === provider),
  })).filter((g) => g.items.length);

  return (
    <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2">
      {groups.map((g) => (
        <div key={g.provider} className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted">{g.provider}</span>
          {g.items.map((m) => {
            const color = modelColor(m.id, theme);
            const dashed = PAL[m.id][1] === 1;
            return (
              <span
                key={m.id}
                onMouseEnter={() => setHover(m.id + '@')}
                onMouseLeave={clearHover}
                className="flex cursor-pointer items-center gap-[6px] whitespace-nowrap text-[12px] font-medium"
                style={{ opacity: hovM && hovM !== m.id ? 0.28 : 1 }}
              >
                <span
                  className="relative h-0 w-4"
                  style={{ borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}` }}
                >
                  <span
                    className="absolute left-[5px] top-[-3.75px] h-[6px] w-[6px] rounded-full"
                    style={{ background: color }}
                  />
                </span>
                {m.name}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
