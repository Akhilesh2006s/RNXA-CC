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
    <main className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 lg:space-y-6 lg:p-6 lg:pb-12">
      <header className="border-b border-gold/20 pb-3 lg:pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-gold-bright sm:text-2xl">{title}</h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">{description}</p>
      </header>
      {children}
    </main>
  );
}

