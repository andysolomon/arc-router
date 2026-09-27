// Policy Diff & Export: semantic changes between the canonical policy and the
// draft, the line-level fenced block diff, and downloadable artifacts:
// canonical JSON, the generated arc-model-policy block, a Markdown summary, and
// a unified patch against the synchronized policy document. Nothing here
// mutates arc-orchestrator; artifacts are inputs to a pull request.

import { useEffect, useMemo, useState } from 'react';
import { CANONICAL } from '../../canonical';
import { useCopy } from '../../hooks/useCopy';
import { digest } from '../../lib/digest';
import { shortDigest, todayISO } from '../../lib/format';
import { setUpdated } from '../../lib/policy-state';
import type { PolicyUpdater } from '../../hooks/usePolicy';
import { canonicalPolicyJson, diffPolicies, exportPolicyBundle, groupChangesByScope, renderPolicyLines, type PolicyIssue, type RoutingPolicy } from '../../routing-core/index';
import { Badge } from '../ui/Badge';
import { Button, EmptyState, Panel } from '../ui/Controls';

interface Props {
  draft: RoutingPolicy;
  setPolicy: PolicyUpdater;
  dirty: boolean;
  issues: PolicyIssue[];
}

type DiffKind = 'same' | 'del' | 'add' | 'fold';

function lineDiff(current: string[], candidate: string[]): Array<{ kind: DiffKind; text: string }> {
  const keyOf = (line: string) => line.split(':')[0]!;
  const currentByKey = new Map(current.map((line) => [keyOf(line), line] as const));
  const out: Array<{ kind: DiffKind; text: string }> = [];
  for (const line of candidate) {
    if (line === '§FOLD') {
      out.push({ kind: 'fold', text: '… binding and surface lines' });
      continue;
    }
    const previous = currentByKey.get(keyOf(line));
    if (previous === line) out.push({ kind: 'same', text: line });
    else {
      if (previous) out.push({ kind: 'del', text: previous });
      out.push({ kind: 'add', text: line });
    }
  }
  return out;
}

const LINE_STYLE: Record<DiffKind, { prefix: string; className: string }> = {
  same: { prefix: '', className: 'text-ink' },
  del: { prefix: '−', className: 'bg-del-bg text-del-ink' },
  add: { prefix: '+', className: 'bg-add-bg text-add-ink' },
  fold: { prefix: '', className: 'italic text-muted' },
};

function download(name: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DiffPage({ draft, setPolicy, dirty, issues }: Props) {
  const [hash, setHash] = useState<string>('…');
  const [view, setView] = useState<'block' | 'json' | 'markdown' | 'patch'>('block');

  useEffect(() => {
    let alive = true;
    digest(canonicalPolicyJson(draft), 64).then((value) => alive && setHash(value));
    return () => {
      alive = false;
    };
  }, [draft]);

  const semantic = useMemo(() => diffPolicies(CANONICAL.policy, draft), [draft]);
  const bundle = useMemo(
    () => exportPolicyBundle({ current: CANONICAL.policy, candidate: draft, digest: hash, currentDocument: CANONICAL.policyDocument, registry: CANONICAL.registry }),
    [draft, hash],
  );
  const lines = useMemo(() => lineDiff(renderPolicyLines(CANONICAL.policy, { foldBindings: true }), renderPolicyLines(draft, { foldBindings: true })), [draft]);
  const invalid = issues.some((issue) => issue.severity === 'error');

  const artifacts = {
    block: { name: 'arc-model-policy.block.md', text: '```arc-model-policy\n' + bundle.block + '\n```', label: 'Generated policy block' },
    json: { name: 'routing-policy.json', text: bundle.json, label: 'Canonical policy JSON' },
    markdown: { name: `routing-policy-change-${draft.updated}.md`, text: bundle.markdown, label: 'Markdown summary' },
    patch: { name: 'arc-model-policy.patch', text: bundle.patch ?? '', label: 'Unified patch (arc-pi policy/arc-model-policy.md)' },
  } as const;
  const current = artifacts[view];
  const { copied, copy } = useCopy(current.text);

  return (
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-6 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-10">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">Policy diff &amp; export</h1>
          <p className="m-0 max-w-[720px] text-pretty text-[13.5px] text-muted">
            Canonical <span className="font-mono text-[12px]">{shortDigest(CANONICAL.source.digest)}</span> ({CANONICAL.source.updated}) versus the draft <span className="font-mono text-[12px]">{shortDigest(hash)}</span> ({draft.updated}).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={dirty ? 'info' : 'muted'} mono={false}>{dirty ? `${semantic.changes.length} semantic change${semantic.changes.length === 1 ? '' : 's'}` : 'no changes'}</Badge>
            <Badge tone={invalid ? 'bad' : 'ok'} mono={false}>{invalid ? 'draft has validation errors' : 'draft validates'}</Badge>
            {dirty && draft.updated === CANONICAL.policy.updated && (
              <Button onClick={() => setPolicy((policy) => setUpdated(policy, todayISO()))}>Stamp updated: {todayISO()}</Button>
            )}
          </div>
        </div>

        <Panel title="Semantic changes">
          {semantic.identical ? (
            <EmptyState>The draft is identical to the canonical policy.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3 px-[14px] py-3">
              {groupChangesByScope(semantic).map((group) => (
                <div key={group.scope}>
                  <div className="mb-1 font-mono text-[11.5px] text-muted">{group.scope}</div>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {group.changes.map((change) => (
                      <li key={`${change.kind}-${change.path}-${change.summary}`} className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
                        <Badge tone={change.kind.includes('removed') ? 'bad' : change.kind.includes('added') ? 'ok' : 'info'}>{change.kind}</Badge>
                        <span>{change.summary.replace(/^[^:]+: /, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="arc-model-policy block diff">
          <div className="max-h-[60vh] overflow-auto py-[10px] font-mono text-[11.5px] leading-[1.65]">
            {lines.map((line, index) => {
              const style = LINE_STYLE[line.kind];
              return (
                <div key={index} className={`flex gap-2 px-[14px] ${style.className}`}>
                  <span className="w-2 flex-none select-none">{style.prefix}</span>
                  <span className="whitespace-pre-wrap break-words">{line.text}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
        <Panel
          title="Export"
          actions={
            <>
              <Button onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
              <Button primary onClick={() => download(current.name, current.text)} disabled={view === 'patch' && !bundle.patch}>Download</Button>
            </>
          }
        >
          <div className="flex flex-wrap gap-[6px] border-b border-line px-[14px] py-3">
            {(Object.keys(artifacts) as Array<keyof typeof artifacts>).map((key) => (
              <button key={key} type="button" onClick={() => setView(key)} className={`cursor-pointer rounded-[5px] border px-[10px] py-[3px] text-[12px] touch:min-h-[40px] ${view === key ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted'}`}>
                {artifacts[key].label}
              </button>
            ))}
          </div>
          {invalid && <div className="border-b border-line bg-del-bg px-[14px] py-2 text-[12px] text-del-ink">The draft has validation errors; exported artifacts are marked invalid and must not be applied.</div>}
          <pre className="m-0 max-h-[70vh] overflow-auto px-[14px] py-3 font-mono text-[11px] leading-[1.55]">{current.text || (view === 'patch' ? 'No patch: the canonical policy document is unavailable.' : '')}</pre>
        </Panel>
        <div className="flex flex-col gap-2 text-[13px]">
          <div className="font-semibold">Apply to the runtime plane</div>
          <ol className="m-0 grid grid-cols-[18px_minmax(0,1fr)] gap-y-2 pl-0 text-body2">
            <span className="font-mono text-muted">1</span>
            <span>Apply the patch (or replace the fenced block) in arc-pi <code className="font-mono text-[12px]">policy/arc-model-policy.md</code>.</span>
            <span className="font-mono text-muted">2</span>
            <span><code className="font-mono text-[12px]">npm run policy:sync</code> in arc-pi, then <code className="font-mono text-[12px]">bun run generate:surfaces</code> and <code className="font-mono text-[12px]">bun run routing-core:export</code> in arc-orchestrator.</span>
            <span className="font-mono text-muted">3</span>
            <span><code className="font-mono text-[12px]">npm run sync:routing-core</code> here, then commit all repositories together. A digest mismatch between them is rejected.</span>
          </ol>
        </div>
      </div>
    </main>
  );
}
