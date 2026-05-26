export function PageShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="space-y-6 p-6 pb-12">
      <header className="border-b border-gold/20 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gold-bright">{title}</h1>
        <p className="text-sm text-muted mt-1">{description}</p>
      </header>
      {children}
    </main>
  );
}

