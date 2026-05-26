"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { logout } from "@/features/auth/auth-api";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/action-items", label: "Action Management" },
  { href: "/completed-items", label: "Completed Items" },
  { href: "/calendar", label: "Calendar" },
  { href: "/sales", label: "Sales CRM" },
  { href: "/clients", label: "Clients" },
  { href: "/expenses", label: "Expenses" },
  { href: "/finance", label: "Finance" },
  { href: "/employees", label: "Employees" },
  { href: "/operations", label: "Operations" },
  { href: "/meetings", label: "Meetings" },
  { href: "/visitors", label: "Visitors" },
  { href: "/activity-log", label: "Activity log" },
  { href: "/notifications", label: "Notifications" },
  { href: "/documents", label: "Documents" }
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  // Stable shell for SSR + first client paint (avoids hydration mismatch / extension DOM noise).
  if (!mounted) {
    return <div className="min-h-screen bg-surface" suppressHydrationWarning aria-busy="true" />;
  }

  if (isLoading) {
    return (
      <div
        className="min-h-screen grid place-items-center bg-surface text-muted text-sm"
        suppressHydrationWarning
      >
        Loading session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-surface" suppressHydrationWarning aria-hidden />;
  }

  return (
    <div className="grid h-dvh max-h-dvh min-h-0 grid-cols-[260px_1fr] overflow-hidden">
      <aside className="relative z-30 flex min-h-0 flex-col border-r border-gold/20 bg-surface-card p-4 text-ink shadow-[inset_-1px_0_0_rgba(46,41,115,0.15)] dark:shadow-[inset_-1px_0_0_rgba(57,255,20,0.1)]">
        <div className="mb-6 flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              <span className="text-ink">RN</span>
              <span className="text-gold-bright">XA</span>
              <span className="text-ink"> Digital</span>
            </h1>
            <p className="text-xs text-muted">Startup Operating System</p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-gold/15 text-gold-bright border border-gold/30 shadow-gold"
                  : "text-muted hover:bg-surface-input/80 dark:hover:bg-surface-card hover:text-gold-bright"
              }`}
            >
              {item.label}
            </Link>
          );
          })}
        </nav>
        <button
          onClick={async () => {
            await logout();
            queryClient.removeQueries({ queryKey: ["auth", "me"] });
            router.push("/login");
          }}
          className="mt-4 w-full shrink-0 rounded-lg border border-gold/25 px-3 py-2 text-sm text-muted hover:bg-surface-input/80 dark:hover:bg-surface-lift hover:text-gold-bright"
        >
          Logout
        </button>
      </aside>
      <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden bg-surface">{children}</div>
    </div>
  );
}

