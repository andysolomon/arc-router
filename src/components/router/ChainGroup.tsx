import { MODELS } from '../../data/models';
import { defaultEffort } from '../../lib/efforts';
import { getList } from '../../lib/policy';
import { validate } from '../../lib/validate';
import type { ListPath, Policy } from '../../types';
import type { EditList } from './RouterPage';
import { Rung } from './Rung';
import { ROW, Section } from './Section';

export interface ChainSpec {
  key: string;
  label: string;
  sub: string;
  /** undefined = locked (parent-local) */
  path?: ListPath;
  hasTail: boolean;
}

interface Props {
  id: string;
  title: string;
  desc: string;
  chains: ChainSpec[];
  policy: Policy;
  editList: EditList;
  tailText: string;
}

export function ChainGroup({ id, title, desc, chains, policy, editList, tailText }: Props) {
  return (
    <Section id={id} title={title} desc={desc}>
      {chains.map((c) => (
        <div key={c.key} className={`${ROW} sm:py-[14px]`}>
          <div className="flex items-baseline gap-2 sm:block">
            <div className="font-medium">{c.label}</div>
            <div className="font-mono text-[11px] text-muted">{c.sub}</div>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            {c.path ? (
              <EditableChain path={c.path} hasTail={c.hasTail} policy={policy} editList={editList} tailText={tailText} />
            ) : (
              <div className="text-[13px] text-muted sm:py-[6px]">Parent-local. The parent runs analyze itself and never delegates.</div>
            )}
          </div>
        </div>
      ))}
    </Section>
  );
}

interface ChainProps {
  path: ListPath;
  hasTail: boolean;
  policy: Policy;
  editList: EditList;
  tailText: string;
}

function EditableChain({ path, hasTail, policy, editList, tailText }: ChainProps) {
  const list = getList(policy, path);
  const warnings = validate(list, path.kind === 'tail', policy);

  return (
    <>
      {/* Phones: one full-width rung per line, in fallback order. Wider: rungs flow inline. */}
      <ol className="m-0 flex list-none flex-col items-stretch gap-[6px] p-0 sm:flex-row sm:flex-wrap">
        {list.map((r, i) => (
          <Rung
            key={`${i}-${r}`}
            index={i + 1}
            rung={r}
            policy={policy}
            duplicate={list.indexOf(r) !== list.lastIndexOf(r)}
            isFirst={i === 0}
            isLast={i === list.length - 1}
            onEffort={(v) =>
              editList(path, (l) => {
                l[i] = r.split('@')[0] + '@' + v;
              })
            }
            onLeft={() =>
              i > 0 &&
              editList(path, (l) => {
                [l[i - 1], l[i]] = [l[i], l[i - 1]];
              })
            }
            onRight={() =>
              i < list.length - 1 &&
              editList(path, (l) => {
                [l[i + 1], l[i]] = [l[i], l[i + 1]];
              })
            }
            onRemove={() =>
              editList(path, (l) => {
                l.splice(i, 1);
              })
            }
          />
        ))}
        <li className="flex sm:self-center">
          <select
            value=""
            aria-label="Add rung"
            onChange={(e) => {
              const id = e.target.value;
              e.target.value = '';
              if (id) {
                editList(path, (l) => {
                  l.push(id + '@' + defaultEffort(id));
                });
              }
            }}
            className="w-full cursor-pointer rounded-[7px] border border-dashed border-dash bg-transparent px-2 py-[6px] text-[12.5px] text-muted2 sm:w-auto touch:min-h-[44px] touch:text-[16px]"
          >
            <option value="">+ Add rung</option>
            {MODELS.map((m) => (
              <option key={m[0]} value={m[0]}>
                {m[1]}
              </option>
            ))}
          </select>
        </li>
      </ol>
      {hasTail && <div className="font-mono text-[11px] text-muted">then tail → {tailText}</div>}
      {warnings.map((w) => (
        <div key={w} className="text-[12.5px] text-warn">
          {w}
        </div>
      ))}
    </>
  );
}
