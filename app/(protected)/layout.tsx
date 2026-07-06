"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Calendar,
  CheckCircle,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Receipt,
  Settings,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Video,
  Wallet
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { clearAuthSession, logout } from "@/features/auth/auth-api";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/action-items", label: "Action Management", icon: CheckSquare },
  { href: "/completed-items", label: "Completed Items", icon: CheckCircle },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/sales", label: "Sales CRM", icon: TrendingUp },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/employees", label: "Employees", icon: UserCog },
  { href: "/operations", label: "Operations", icon: Settings },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/visitors", label: "Visitors", icon: UserCheck },
  { href: "/activity-log", label: "Activity log", icon: Activity },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/documents", label: "Documents", icon: FileText }
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Stable shell for SSR + first client paint (avoids hydration mismatch / extension DOM noise).
  if (!mounted) {
    return <div className="min-h-screen bg-surface" suppressHydrationWarning aria-busy="true" />;
  }

  if (isLoading) {
    return (
      <div
        className="min-h-screen grid place-items-center bg-surface text-muted"
        suppressHydrationWarning
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold-bright" />
          <p className="text-sm">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-surface" suppressHydrationWarning aria-hidden />;
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div className="grid h-dvh max-h-dvh min-h-0 overflow-hidden grid-cols-1 md:grid-cols-[64px_1fr] lg:grid-cols-[260px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden border-r border-gold/20 bg-surface-card/95 text-ink shadow-[inset_-1px_0_0_rgba(46,41,115,0.15)] backdrop-blur-xl dark:shadow-[inset_-1px_0_0_rgba(57,255,20,0.1)] transition-transform duration-300 ease-in-out w-72 p-4 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:h-full md:max-h-dvh md:w-auto md:translate-x-0 md:p-2 lg:w-[260px] lg:p-4`}
        >
          <div className="mb-6 flex shrink-0 items-start justify-between gap-2 md:mb-4 md:flex-col md:items-center md:gap-3 lg:mb-6 lg:flex-row lg:items-start">
            <div className="min-w-0 md:hidden lg:block">
              <h1 className="text-lg font-semibold tracking-tight">
                <span className="text-ink">RN</span>
                <span className="text-gold-bright">XA</span>
                <span className="text-ink"> Digital</span>
              </h1>
              <p className="text-xs text-muted">Startup Operating System</p>
            </div>
            <div className="hidden flex-col items-center md:flex lg:hidden">
              <span className="text-base font-bold">
                <span className="text-ink">RN</span>
                <span className="text-gold-bright">XA</span>
              </span>
            </div>
            <div className="flex shrink-0 items-start gap-2 md:flex-col md:items-center lg:flex-row lg:items-start">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>

          <nav
            aria-label="Main navigation"
            className="sidebar-nav-scroll min-h-0 flex-1 space-y-1 pr-1 md:space-y-2 md:pr-0.5 lg:pr-1"
          >
            {navItems.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 md:justify-center md:px-2 lg:justify-start lg:px-3 ${
                    active
                      ? "border border-gold/30 bg-gold/12 text-gold-bright shadow-gold"
                      : "text-muted hover:border hover:border-gold/15 hover:bg-surface-input/60 hover:text-gold-bright"
                  }`}
                >
                  {item.icon && <item.icon size={18} className="shrink-0" />}
                  <span className="md:hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="mt-4 hidden shrink-0 rounded-lg border border-gold/15 bg-surface-lift/50 px-3 py-2.5 lg:block">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.role}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              await logout();
              clearAuthSession(queryClient);
              router.replace("/login");
            }}
            title="Logout"
            className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-gold/25 px-3 py-2 text-sm text-muted hover:bg-surface-input/80 hover:text-gold-bright dark:hover:bg-surface-lift md:px-2 lg:justify-start lg:px-3"
          >
            <LogOut size={16} className="shrink-0" />
            <span className="md:hidden lg:inline">Logout</span>
          </button>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-gold/20 bg-surface-card px-4 md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-muted hover:bg-surface-input/80 hover:text-gold-bright"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold">
              <span className="text-ink">RN</span>
              <span className="text-gold-bright">XA</span>
              <span className="text-ink"> Digital</span>
            </span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 pb-safe md:pb-0">
            {children}
          </div>

          <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-gold/20 bg-surface-card md:hidden">
            {navItems.slice(0, 5).map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors ${
                    active ? "text-gold-bright" : "text-muted hover:text-gold-bright"
                  }`}
                >
                  {item.icon && <item.icon size={20} />}
                  <span className="max-w-[52px] truncate text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-muted hover:text-gold-bright"
            >
              <MoreHorizontal size={20} />
              <span>More</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

