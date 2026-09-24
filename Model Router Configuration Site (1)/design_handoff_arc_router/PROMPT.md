# Prompt: Implement the Arc Router prototype

Paste everything below this line into Claude Code (or another coding agent) from the root of a new, empty repository. The bundled `Arc Router.dc.html` is the design reference and the source of truth for data, layout, and behavior.

---

## Task

Build a production web app that reproduces `Arc Router.dc.html` (in this folder) with this stack:

- **Node 20+**, **TypeScript** (strict), **Vite**, **React 18**, **Tailwind CSS v3**
- Deployed to **Vercel** as a static SPA (`vite build`, output `dist/`)
- No UI component libraries. No chart library: the chart is a hand-built SVG, as in the reference.
- Fonts: Geist and Geist Mono from Google Fonts (weights 400/500/600 and 400/500).

The HTML file is a design reference, not code to ship. Recreate it in the stack above. Read it fully before starting: the `<script data-dc-script>` block holds every dataset, constant, and rule you need (`BENCH`, `MODELS`, `RMAP`, `PAL`, `COLORS`, `ORIG`, `BINDINGS`, `PARENT_MODELS`, `PHASES`, `WORKLOADS`, effort rules, validation, diff and digest generation). Port these verbatim into `src/data/*.ts` and `src/lib/*.ts`; do not invent or alter values.

## Fidelity

High fidelity. Match the reference pixel-for-pixel at 1200px and 1440px widths, and match all interactions. Where the reference uses inline styles, translate to Tailwind utilities; where a value has no Tailwind equivalent (oklch colors, 10.5px type, 1.5px borders), extend `tailwind.config.ts` or use arbitrary values.

## Project structure

```
src/
  main.tsx
  App.tsx                     tab state, theme, layout shell
  components/
    Header.tsx                brand, tab switcher, theme toggle, policy date, repo link
    bench/
      BenchPage.tsx
      Chart.tsx               SVG scatter with polylines, dots, rings, labels, tooltip
      Legend.tsx
      DataTable.tsx
    router/
      RouterPage.tsx
      ParentDefaults.tsx
      ChainGroup.tsx          Phases / Implement workloads / Emergency tail
      Rung.tsx
      Exclusions.tsx
      PolicyPanel.tsx         diff, digest, copy, reset, apply steps
  data/
    bench.ts                  BENCH, PAL, PROVIDERS, LEGEND, COLORS
    models.ts                 MODELS, RMAP, PARENT_MODELS, PHASES, WORKLOADS
    policy.ts                 ORIG, BINDINGS
  lib/
    efforts.ts                efforts(id), defaultEffort(id)
    lookup.ts                 lookup(rung), usage(policy)
    validate.ts               rungIssue, validate
    policy.ts                 genLines, fullBlock, diff
    digest.ts                 sha256 via crypto.subtle, first 12 hex chars
    scale.ts                  linear/log x-scale, nice ticks, y-scale
    labels.ts                 collision-avoiding label placement
    storage.ts                localStorage helpers
  hooks/
    usePolicy.ts              policy state + persistence
    useTheme.ts
    useResizeWidth.ts         ResizeObserver on the chart container
  types.ts
```

## Design tokens

Define these as CSS variables in `src/index.css` on `:root` and `:root[data-theme="dark"]`, then expose them to Tailwind via `theme.extend.colors` using `var(--x)`. Copy the exact oklch values from the `<style>` block in the reference:

`--bg --surface --line --grid --line2 --chip --ink --muted --muted2 --body2 --faint --underline --dash --warn --warnline --add-bg --add-ink --del-bg --del-ink --danger`

Also set `color-scheme` per theme. Base font: Geist 14px / 1.5, `-webkit-font-smoothing: antialiased`. Links: `--ink`, underlined, offset 2px, underline color `--underline`, hover `--ink`.

Type scale used: 28/600/-0.025em (h1), 16/600/-0.01em (h2), 15/600 (brand), 13 and 12.5 (body-small), 12 and 11.5 and 11 mono (meta), 10.5 mono uppercase 0.06em (legend provider). Radii: 4, 5, 6, 7, 8, 10. Borders 1px `--line`; segmented controls 1px border, 8px radius, 3px padding, 2px gap.

## Screens

### Shared header
Flex row, gap 28, padding 14×32, bottom border, surface background, wraps. Left: brand "arc router" (15/600) + "runner-routing-v4" mono 12 muted. Tab switcher (Benchmarks / Router config) as a segmented control; active tab has surface bg, ink text, and shadow `0 1px 2px oklch(0.21 0.01 95 / 0.18-equivalent), 0 0 0 1px var(--line)`. Right cluster (mono 12 muted): theme toggle button ("Dark mode"/"Light mode"), "policy updated {date}", repo link `andysolomon/arc-orchestrator` → https://github.com/andysolomon/arc-orchestrator. Hide the repo link under 950px viewport width. The date is the `updated:` value of the generated block: `2026-09-23` while the policy matches `ORIG`, otherwise today (ISO date).

Persist active tab (`arc-router-tab`), theme (`arc-router-theme`), and policy (`arc-router-policy`) in localStorage. Theme defaults to `prefers-color-scheme`.

### Benchmarks
Main column max-width 1200, padding 40 32 96, gap 28.

Title row: h1 "Intelligence Index vs {cost per task | output speed}", metric segmented control (Cost per task / Output speed), scale segmented control (Linear / Log). Active option: ink bg, bg-colored text.

Legend: grouped by provider (`PAL[id][2]`), provider name mono 10.5 uppercase muted; each model item shows a 16px line swatch (solid, or dashed when `PAL[id][1] === 1`) with a 6px dot, then the name 12/500. Hovering an item highlights that model.

Chart (`Chart.tsx`):
- Container width from ResizeObserver; W = max(360, width); H = 360 if W < 640 else 480. Margins ml 44, mr 12, mt 8, mb 48.
- X metric index: cost = `pts[i][2]`, speed = `pts[i][3]`; skip points where the value is null.
- Linear scale: nice step from max/5 (1, 2, 2.5, 5, 10 × 10^k); domain 0..ceil(max×1.04/step)×step. Log scale: cost domain 0.003..12 with ticks 0.01 0.03 0.1 0.3 1 3 10; speed domain 30..260 with ticks 30 50 100 200.
- Y: ylo = max(0, floor(min/10)×10 − 5), yhi = ceil((max+1)/10)×10, ticks every 10.
- Tick labels: x formatted `$v` or `v t/s`; positioned as absolutely placed HTML divs (mono 11 muted), y labels right-aligned at ml−8, x labels centered at plot bottom +14. Axis title centered at H−10; y title "Intelligence Index" above the chart, left-padded by ml.
- Per model with ≥2 plotted points: polyline (1.5px, 2.5px when hovered; dasharray `5 4` for siblings) plus an invisible 14px hit-stroke polyline for hover.
- Dots: r 5 for the last (highest effort) point, 3.5 otherwise, +1.5 when hovered; fill = model color; stroke `--bg` 1.5px. A ring (r 8.5, 1.25px) around any dot whose `model@effort` key appears in the current policy's `usage()` map (toggleable via a `ringRouted` prop, default on).
- Model color: `oklch(L 0.15 hue)` with hue from `PAL[id][0]`, L 0.6 light / 0.75 dark.
- Hover dims all other models to opacity 0.28.
- Labels: one per model at its last point, 12px, weight 500 (600 when hovered), colored. Place with the greedy collision search from the reference: candidates dy ∈ [−16,16,0,−32,32,…,±120] × dx ∈ [12,28,44] × side ∈ [right,left]; reject if outside plot, overlapping a placed label, or overlapping any dot's 20×20 box. If none fits, hide the label (opacity 0, pointer-events none) and show it only while that model is hovered.
- Tooltip (ink bg, bg text, radius 8, padding 10×12, min-width 200, shadow) anchored to the hovered dot: flips below when cy < 190; horizontal anchor 0% / −50% / −100% based on cx near left/right edges. Rows: Intelligence (append " (estimated)" when `pts[i][4]` is true), Cost / task, Output speed ("no data" when null), arc binding, Routed in ("N chain(s)" or "not routed").
- Caption paragraph under the chart (copy verbatim from the reference, including the Artificial Analysis link).

Data table (collapsed by default, caret ▶/▼): when open, show view segmented control (All efforts / Best per model) and "{n} configs" count. Table has min-width 820, columns `minmax(200px,1.5fr) 64px 92px 80px minmax(170px,1.2fr) 88px`, gap 12, row padding 9×16, header sortable (click toggles direction; default directions: name/binds/cost ascending, others descending; secondary sort by Index desc). Row: color dot, name, effort chip (mono 11, chip bg), Index (`*` suffix when estimated), cost (`$0.0045` style below 0.01, else two decimals, `—` when null), speed (`N t/s` or `—`), binding, Routed in (`N chain(s)` in ink or `—` muted). Hovering a row highlights the chart. Footnote paragraph copied verbatim.

### Router config
Main max-width 1440, padding 40 32 96, two columns: editor `flex: 1 1 640px` and sticky aside `flex: 1 1 400px; max-width 560px; top 24px`; wraps on narrow widths.

Intro h1 "Router configuration" and the description paragraph (verbatim).

Each section: h2 16/600, description 13 muted, then rows in a 2-column grid `140px minmax(0,1fr)`, gap 16, top border per row.

- **Parent defaults**: ARC Pi (`parent-default pi`) and Claude Code (`parent-default claude-code`), each with a model `<select>` (options `PARENT_MODELS`) and effort select (low/medium/high/xhigh/max, rendered `@x`). Mono 12.5, padding 6×8, border, radius 6.
- **Phases**: first row `analyze` is locked with the text "Parent-local. The parent runs analyze itself and never delegates." Then explore, research, plan, verify, deploy.
- **Implement workloads**: nine rows, label `hard · heavy` etc., sub `workload hard-heavy`.
- **Emergency tail**: one row `tail`, sub `all stacks`, no "then tail" line.
- **Rung card**: min-width 168, padding 7 6 7 10, radius 7, surface bg, border `--line` (or `--warnline` when `rungIssue()` returns a message). Row 1: index (mono 10.5 muted), 7px backend color dot (`COLORS[backend]`), label 13/500, spacer, then ‹ › × buttons (muted, hover ink; × hover danger). Row 2 (padding-left 16): effort as a small select when the model has >1 effort, else a static `@effort` label; then the stat `"{index} · ${cost}"` from `lookup()` or `not on AA`, with a title tooltip.
- After the rungs: a dashed "+ Add rung" `<select>` listing `MODELS` labels; choosing one appends `id@defaultEffort(id)` and resets the select. Then `then tail → A · B · C` (mono 11 muted) for phase and workload chains. Then one warning line per `validate()` message in `--warn`.
- **Exclusions**: `exclude-models` as read-only chips; `exclude-efforts` as toggle buttons for `xhigh` and `max` (on = ink bg / bg text).

All edits go through an immutable update of the policy object, persisted to localStorage.

**Policy panel (aside)**: card with header (mono 12 "arc-model-policy", "{n} line(s) changed" in add-ink or "matches main" muted, "{n} warning(s)" in warn when >0, spacer, `sha256 {12 hex}`), a scrollable diff body (mono 11.5 / 1.65, max-height 56vh) and a footer with "Copy block" (ink button, shows "Copied" for 1.6s) and "Reset to main".

Diff algorithm: `genLines(policy, updatedDate)` produces lines in order: `policy:`, `updated:`, `supersedes:`, `fallback:`, `parent-local:`, two `parent-default` lines, a fold marker, `tail:`, five `phase` lines, nine `workload` lines, `exclude-models:`, `exclude-efforts:`. Compare each to the `ORIG` line with the same key (text before the first `:`). Unchanged → plain line; changed → `−` old line (del bg/ink) then `+` new line (add bg/ink). The fold marker renders as an italic muted line "… {BINDINGS.length} binding and surface lines, unchanged". The full block (for digest and clipboard) expands the fold to the `BINDINGS` lines; clipboard text is wrapped in a ```` ```arc-model-policy ```` fence. Digest = SHA-256 of the full block, first 12 hex chars, computed asynchronously.

Below the card, "Apply to arc-orchestrator" with the four numbered steps (verbatim from the reference).

## Domain rules (port exactly)

- `efforts(id)`: `cursor-grok-4.7-high` → [high]; `gpt-6-luna` → [low, medium, high, max]; claude/codex/minimax backends → [low, medium, high]; everything else → [none].
- `defaultEffort(id)`: `gpt-6-luna` → max; else high if available, else first.
- `rungIssue(rung)`: excluded model; `cursor-auto` explicit-only; excluded effort (except Luna@max); `max` on anything but Luna.
- `validate(list, isTail)`: empty-chain message (tail vs. chain variant), duplicate rung, plus each rung issue; de-duplicated.
- `usage(policy)`: counts, per `model@effort` bench key, the number of distinct chains (phases, workloads, tail) that route to it, resolving through `RMAP`.

## Acceptance checklist

- `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint` all pass with zero errors.
- Light and dark themes match the reference; theme, tab, and policy survive reload.
- Hovering any dot, line, legend item, label, or table row highlights the same model everywhere.
- Log/speed view shows DeepSeek V4.1 Flash (219 t/s) inside the plot.
- Resetting the policy returns "matches main", zero warnings, and header date 2026-09-23.
- Adding `opencode-go-glm-5.3` twice to a chain produces a duplicate warning and an orange rung border.
- Copy block writes a fenced block whose SHA-256 prefix equals the digest shown.
- Deploys on Vercel with a `vercel.json` SPA rewrite (`{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`).

## Deliverables

Repository with `package.json` scripts (`dev`, `build`, `preview`, `typecheck`, `lint`), `tailwind.config.ts`, `postcss.config.js`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.nvmrc` (20), and a short README with setup and deploy steps.
