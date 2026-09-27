#!/usr/bin/env node
// Vendor the shared ARC routing contract from arc-orchestrator into this repo.
//
//   npm run sync:routing-core            # copy from ../arc-orchestrator (or $ARC_ORCHESTRATOR_DIR)
//   npm run sync:routing-core -- --check # fail if the vendored copy is stale
//
// arc-router is a static SPA and consumes the routing contract at build time:
// the browser-safe sources of packages/routing-core/src (everything except the
// Node-only runtime entry) and the canonical generated artifacts
// (routing-policy.json, model-registry.json, capability-snapshot.json,
// manifest.json) are copied verbatim under src/routing-core/. MANIFEST.json
// records the source commit and a SHA-256 per file so the vendored copy can be
// verified without an arc-orchestrator checkout. Nothing under src/routing-core
// is hand-edited; the runtime repository is the source of truth.

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const routerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(process.env.ARC_ORCHESTRATOR_DIR ?? join(routerRoot, "..", "arc-orchestrator"));
const corePackage = join(sourceRoot, "packages", "routing-core");
const targetRoot = join(routerRoot, "src", "routing-core");
const check = process.argv.includes("--check");

export const SYNC_MANIFEST_CONTRACT = "arc-router-routing-core-sync/v1";
const RUNTIME_ONLY_FILES = new Set(["runtime.ts"]);
// A vendored source may not reach for Node, Bun, the environment, or the clock.
const FORBIDDEN_PATTERNS = [
  /from\s+["']node:/,
  /from\s+["'](fs|path|crypto|child_process|os)["']/,
  /\bBun\./,
  /\bprocess\.env\b/,
  /\bDate\.now\(/,
  /\brequire\(/,
];

// Comments may mention Node or the clock (usually to say they are forbidden);
// only code is scanned.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sourceCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: sourceRoot, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

function collect() {
  if (!existsSync(corePackage)) {
    throw new Error(`arc-orchestrator routing-core not found at ${corePackage}; set ARC_ORCHESTRATOR_DIR`);
  }
  const files = new Map();
  for (const name of readdirSync(join(corePackage, "src")).sort()) {
    if (!name.endsWith(".ts") || RUNTIME_ONLY_FILES.has(name)) continue;
    const text = readFileSync(join(corePackage, "src", name), "utf8");
    const code = stripComments(text);
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(code)) {
        throw new Error(`refusing to vendor ${name}: matches browser-unsafe pattern ${pattern}`);
      }
    }
    files.set(name, text);
  }
  for (const name of readdirSync(join(corePackage, "generated")).sort()) {
    if (!name.endsWith(".json") && !name.endsWith(".md")) continue;
    files.set(join("generated", name), readFileSync(join(corePackage, "generated", name), "utf8"));
  }
  return files;
}

function manifestFor(files, commit) {
  const vocabulary = files.get("vocabulary.ts") ?? "";
  const version = /ROUTING_CORE_VERSION = "([^"]+)"/.exec(vocabulary)?.[1] ?? null;
  const artifacts = JSON.parse(files.get(join("generated", "manifest.json")) ?? "{}");
  return {
    contract: SYNC_MANIFEST_CONTRACT,
    routingCore: version,
    sourceCommit: commit,
    policy: artifacts.policy ?? null,
    snapshotVersion: artifacts.snapshotVersion ?? null,
    files: Object.fromEntries([...files.entries()].map(([name, text]) => [name, sha256(text)])),
  };
}

function readVendored() {
  const manifestPath = join(targetRoot, "MANIFEST.json");
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

const files = collect();
const commit = sourceCommit();
const manifest = manifestFor(files, commit);

if (check) {
  const vendored = readVendored();
  const problems = [];
  if (!vendored) {
    problems.push("src/routing-core/MANIFEST.json is missing");
  } else {
    for (const [name, digest] of Object.entries(manifest.files)) {
      const path = join(targetRoot, name);
      if (!existsSync(path)) {
        problems.push(`${name} is missing from the vendored copy`);
      } else if (sha256(readFileSync(path, "utf8")) !== digest) {
        problems.push(`${name} differs from arc-orchestrator`);
      }
    }
    for (const name of Object.keys(vendored.files ?? {})) {
      if (!(name in manifest.files)) problems.push(`${name} is vendored but no longer exists upstream`);
    }
  }
  if (problems.length > 0) {
    console.error(`sync-routing-core: vendored routing-core is stale:\n  ${problems.join("\n  ")}\nRun npm run sync:routing-core.`);
    process.exit(1);
  }
  console.log(`sync-routing-core: vendored copy matches arc-orchestrator${commit ? ` (${commit.slice(0, 12)})` : ""}`);
  process.exit(0);
}

rmSync(targetRoot, { recursive: true, force: true });
for (const [name, text] of files) {
  const path = join(targetRoot, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
writeFileSync(
  join(targetRoot, "README.md"),
  `# Vendored routing-core\n\nVENDORED — do not edit. Every file here is copied verbatim from\n\`arc-orchestrator/packages/routing-core\` by \`npm run sync:routing-core\`; the\nruntime repository is the single source of truth for routing policy, model\nmetadata, capability evidence, selection, and trace schemas. \`MANIFEST.json\`\nrecords the source commit and a SHA-256 per file; \`npm run sync:routing-core -- --check\`\nverifies the copy against a sibling checkout, and \`npm test\` verifies the\nmanifest against the files without one.\n`,
);
writeFileSync(join(targetRoot, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`sync-routing-core: vendored ${files.size} files into ${relative(routerRoot, targetRoot)}${commit ? ` from ${commit.slice(0, 12)}` : ""}`);
