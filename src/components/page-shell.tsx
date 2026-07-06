import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  actions,
  children
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="min-w-0 flex-1">
          <p className="page-eyebrow">RNXA Digital</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
