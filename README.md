# Arc Router

The **control plane** for ARC routing: inspect, simulate, replay, and edit the
`runner-routing-v4` policy that the [arc-orchestrator](https://github.com/andysolomon/arc-orchestrator)
runtime executes. Static SPA (Vite, React 18, strict TypeScript, Tailwind CSS v3), no backend.

arc-router never executes models, spawns workers, or authenticates to a provider.
It answers *what would ARC do, why, and how would routing change under a
different policy* — with the same routing functions the runtime runs.

## Source of truth

Every routing fact in this app comes from arc-orchestrator's shared routing
contract, `packages/routing-core`, vendored under `src/routing-core/` by
`npm run sync:routing-core` (see `src/routing-core/MANIFEST.json` for the
source commit and per-file digests). The app loads:

| Artifact | Origin | Content |
| --- | --- | --- |
| `generated/routing-policy.json` | `arc-orchestrator routing export` | the parsed `arc-model-policy` block with its digest |
| `generated/model-registry.json` | same | the model registry (identity, transport, efforts, maturity) |
| `generated/capability-snapshot.json` | same | DeepSWE / CursorBench capability evidence and cost priors |
| `generated/arc-model-policy.md` | same | the synchronized policy document, for patch generation |
| `*.ts` | `packages/routing-core/src` (browser-safe entry) | the parser, validator, stack compiler, capability floor, `select()`, workload profiler, evaluator, replay |

Nothing under `src/routing-core` is hand-edited, and no hand-authored policy
copy remains in this repository. `npm test` verifies the vendored copy against
its manifest and the shared validators; `npm run check:routing-core` verifies it
against a sibling arc-orchestrator checkout.

The Artificial Analysis leaderboard rows in `src/data/bench.ts` are editorial
visualization data, joined to the registry and snapshot at runtime; they are
not routing authority, and unknown capability or cost stays unknown.

## Surfaces

- **Benchmarks** — Intelligence Index vs cost/speed scatter; the table joins each
  row with its registry rung, capability bands and benchmark provenance, cost
  prior, effort support, maturity, and the chains the draft policy routes to.
- **Policy Studio** — edit parent defaults, phase and workload chains, the
  emergency tail, and exclusions with live routing-core validation; inspect
  bindings and routing constraints.
- **Simulator** — define a synthetic context (phase, evidence or explicit class,
  availability, quota, budget, override, route pin) and evaluate it with
  `evaluateRouting`: workload classification, floor, the executing traversal with
  a verdict per rung, and the capability-rung `select()` proxy.
- **Traces** — load `runs.jsonl` / `routing-trace-v2.jsonl` (or
  `arc-orchestrator runs --json`), filter by model, phase, class, status, and
  search; inspect a trace's observed record, workload profile, v2 selection
  block, and its reconstructed decision path under the canonical policy.
- **Replay** — replay every loaded traversal under the canonical policy and the
  draft: selection changes, fallback rate, refusals, unavailable routes, budget
  violations, estimated cost, band/provider/workload distributions, all labelled
  observed / proxy / estimate. No quality change is claimed.
- **Diff & Export** — semantic changes (lead changed, rung added/removed,
  effort changed, exclusions, parent defaults), the block diff, and exports:
  canonical JSON, the generated `arc-model-policy` block, a Markdown summary,
  and a unified patch against `policy/arc-model-policy.md`.

Traces and drafts stay in this browser (IndexedDB / localStorage). A draft is
keyed to the canonical digest it was edited from and is discarded when the
canonical policy changes.

## Setup

```sh
nvm use                     # Node 20+
npm install
npm run sync:routing-core   # needs ../arc-orchestrator (or ARC_ORCHESTRATOR_DIR)
npm run dev                 # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run build` | Typecheck, then `vite build` → `dist/` |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm test` | Vitest: vendored parity, browser safety, control-plane logic |
| `npm run sync:routing-core` | Vendor routing-core and the generated artifacts |
| `npm run check:routing-core` | Fail if the vendored copy is stale |

## Applying a policy change

1. Export the patch (or block) from Diff & Export and apply it to arc-pi
   `policy/arc-model-policy.md`.
2. `npm run policy:sync` in arc-pi; `bun run generate:surfaces` and
   `bun run routing-core:export` in arc-orchestrator.
3. `npm run sync:routing-core` here; commit all repositories together.

## Deploy

Static SPA; `vercel.json` rewrites every path to `/`. Framework preset Vite,
build `npm run build`, output `dist`.
