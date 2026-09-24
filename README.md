# Arc Router

Benchmarks explorer and router-configuration editor for the `runner-routing-v4` policy. Built from the
`Arc Router.dc.html` design reference with Vite, React 18, TypeScript (strict) and Tailwind CSS v3. Static SPA, no backend.

## Setup

```sh
nvm use          # Node 20 (.nvmrc)
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run build`     | Typecheck, then `vite build` → `dist/` |
| `npm run preview`   | Serve the production build locally    |
| `npm run typecheck` | `tsc -b` with no emit                 |
| `npm run lint`      | ESLint (typescript-eslint + hooks)    |

## Layout

- `src/data/` — datasets and constants ported verbatim from the reference (`BENCH`, `MODELS`, `RMAP`, `PAL`, `COLORS`, `ORIG`, `BINDINGS`, …).
- `src/lib/` — domain rules: efforts, lookup and usage, validation, policy line generation and diff, SHA-256 digest, chart scales, label placement, storage helpers.
- `src/components/bench/` — Benchmarks page: hand-built SVG scatter, legend, data table.
- `src/components/router/` — Router config page: parent defaults, chains, rungs, exclusions, policy diff panel.
- `src/hooks/` — policy state with localStorage persistence, theme, chart resize.

Responsive behavior (Router config):

- **< 640px:** chain rows stack (label above rungs), rungs are a full-width vertical list with ↑/↓ reorder, and a fixed bottom bar shows change/warning status with **Copy block**.
- **640–1023px:** label column returns and rungs flow inline; the section nav and bottom bar remain.
- **≥ 1024px:** two-column grid with the policy panel sticky and capped to the viewport.
- Tap targets and control text size follow the input device through a `touch:` variant (`@media (pointer: coarse)`): 40–44px targets, and 16px select text so iOS doesn't zoom on focus.

State persisted in `localStorage`: `arc-router-tab`, `arc-router-theme`, `arc-router-policy`.

## Deploy to Vercel

The app is a static SPA. `vercel.json` rewrites every path to `/` so deep links resolve.

```sh
npm i -g vercel
vercel           # preview deployment
vercel --prod    # production
```

Or import the repository in the Vercel dashboard: framework preset **Vite**, build command `npm run build`,
output directory `dist`.
