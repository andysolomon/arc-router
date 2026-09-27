import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, ButtonHTMLAttributes } from 'react';

export const SELECT = 'min-w-0 rounded-md border border-line bg-surface px-2 py-[5px] font-mono text-[12.5px] touch:min-h-[44px] touch:text-[16px]';
export const INPUT = 'min-w-0 rounded-md border border-line bg-surface px-2 py-[5px] font-mono text-[12.5px] touch:min-h-[44px] touch:text-[16px]';
export const BUTTON = 'cursor-pointer whitespace-nowrap rounded-md px-[12px] py-[6px] text-[13px] touch:min-h-[44px] disabled:cursor-default disabled:opacity-40';
export const PRIMARY = `${BUTTON} bg-ink font-medium text-bg`;
export const SECONDARY = `${BUTTON} border border-line bg-surface text-ink`;

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${SELECT} ${props.className ?? ''}`} />;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} ${props.className ?? ''}`} />;
}

export function Button({ primary = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" {...props} className={`${primary ? PRIMARY : SECONDARY} ${props.className ?? ''}`} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] text-muted">
      <span className="flex items-baseline gap-2">
        <span>{label}</span>
        {hint && <span className="font-mono text-[10.5px] text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] touch:min-h-[40px]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-[14px] w-[14px] accent-[var(--ink)]" />
      <span>{label}</span>
    </label>
  );
}

export function Panel({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center gap-[10px] border-b border-line px-[14px] py-[9px]">
          {title && <span className="text-[12.5px] font-medium">{title}</span>}
          <span className="flex-1" />
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function KeyValue({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-[5px] text-[12.5px]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <span className="font-mono text-[11.5px] text-muted">{key}</span>
          <span className="min-w-0 break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-[14px] py-6 text-center text-[13px] text-muted">{children}</div>;
}

export const TABLE_HEAD = 'border-b border-line px-3 py-[7px] text-left font-mono text-[11px] font-normal text-muted';
export const TABLE_CELL = 'border-b border-line2 px-3 py-[6px] align-top text-[12.5px]';
