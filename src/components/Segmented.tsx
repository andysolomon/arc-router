interface Props<T extends string> {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}

/** Small segmented control: surface bg, active option ink bg / bg text. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex gap-[2px] rounded-lg border border-line bg-surface p-[3px]">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`cursor-pointer whitespace-nowrap rounded-[5px] px-[10px] py-1 text-[12px] ${
            value === v ? 'bg-ink text-bg' : 'bg-transparent text-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
