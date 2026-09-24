import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        grid: 'var(--grid)',
        line2: 'var(--line2)',
        chip: 'var(--chip)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        muted2: 'var(--muted2)',
        body2: 'var(--body2)',
        faint: 'var(--faint)',
        underline: 'var(--underline)',
        dash: 'var(--dash)',
        warn: 'var(--warn)',
        warnline: 'var(--warnline)',
        'add-bg': 'var(--add-bg)',
        'add-ink': 'var(--add-ink)',
        'del-bg': 'var(--del-bg)',
        'del-ink': 'var(--del-ink)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ["'Geist'", 'system-ui', 'sans-serif'],
        mono: ["'Geist Mono'", 'monospace'],
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      boxShadow: {
        tab: '0 1px 2px oklch(0.21 0.01 95 / 0.08), 0 0 0 1px var(--line)',
        tip: '0 6px 24px oklch(0.21 0.01 95 / 0.18)',
      },
    },
  },
  plugins: [
    // Size tap targets by input type, not viewport: coarse pointers (phones, tablets) get 44px targets.
    plugin(({ addVariant }) => {
      addVariant('touch', '@media (pointer: coarse)');
    }),
  ],
} satisfies Config;
