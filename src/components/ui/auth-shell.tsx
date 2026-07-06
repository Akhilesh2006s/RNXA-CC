"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

type AuthShellProps = {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, footer, children }: AuthShellProps) {
  return (
    <main className="auth-bg relative flex min-h-screen items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-orb auth-orb-a" />
        <div className="auth-orb auth-orb-b" />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-ink">RN</span>
              <span className="text-gold-bright">XA</span>
              <span className="text-ink"> Digital</span>
            </h1>
          </Link>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Startup Operating System
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <header className="mb-6 space-y-1">
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
            <p className="text-sm text-muted">{subtitle}</p>
          </header>
          {children}
        </div>

        {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
      </div>
    </main>
  );
}
