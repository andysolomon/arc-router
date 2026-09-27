import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  desc: string;
  children: ReactNode;
}

/** Label column beside content from `sm`; stacked (label above content) on phones. */
export const ROW = 'grid grid-cols-1 gap-2 border-t border-line py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4';

/** Router config section. `scroll-mt` keeps anchored headings clear of the sticky section nav. */
export function Section({ id, title, desc, children }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-16 flex-col gap-1 lg:scroll-mt-6">
      <h2 id={`${id}-h`} className="m-0 text-[16px] font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      <p className="mb-2 mt-0 text-pretty text-[13px] text-muted">{desc}</p>
      {children}
    </section>
  );
}
