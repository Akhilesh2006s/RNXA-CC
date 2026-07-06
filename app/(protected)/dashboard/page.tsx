"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CreditCard,
  Flame,
  Target,
  Users,
  Wallet
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from "recharts";
import { PageShell } from "@/components/page-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { apiClient } from "@/lib/api-client";
import { formatInr } from "@/lib/format-inr";
import { useIsDarkTheme } from "@/features/theme/use-is-dark-theme";

type Kpis = {
  totalRevenue: number;
  monthlyRevenue: number;
  burnRate: number;
  runwayRemainingMonths: number;
  totalExpenses: number;
  pendingPayments: number;
  leads: number;
  convertedClients: number;
  activeEmployees: number;
  pendingTasks: number;
  overdueTasks: number;
};

type Charts = {
  monthlyExpenses: { month: string; total: number }[];
  monthlyLeads: { month: string; count: number }[];
  taskStatusBreakdown: { status: string; count: number }[];
};

const PIE_COLORS = ["#5aff3a", "#39ff14", "#2dd412", "#2e2973", "#8a94b8", "#121f4d"];

function useKpis() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Kpis }>("/dashboard/kpis");
      return data.data;
    }
  });
}

function useCharts() {
  return useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Charts }>("/dashboard/charts");
      return data.data;
    }
  });
}

export default function DashboardPage() {
  const kpiQuery = useKpis();
  const chartsQuery = useCharts();
  const isDark = useIsDarkTheme();

  const chartTooltipStyle = {
    background: isDark ? "#0c1538" : "#ffffff",
    border: isDark ? "1px solid rgba(57,255,20,0.25)" : "1px solid rgba(46,41,115,0.15)",
    borderRadius: "8px",
    color: isDark ? "#eef1fb" : "#2e2973"
  } as const;

  const gridStroke = isDark ? "rgba(57,255,20,0.1)" : "rgba(46,41,115,0.1)";
  const axisStroke = isDark ? "#8a94b8" : "#5c6494";

  const k = kpiQuery.data;

  const cards: Array<{
    title: string;
    value: string;
    icon: LucideIcon;
    hint?: string;
    accent?: "default" | "warning" | "success";
  }> = [
    {
      title: "Monthly revenue",
      value: formatInr(k?.monthlyRevenue ?? 0),
      icon: Wallet,
      hint: "Paid invoice flows this month",
      accent: "success"
    },
    {
      title: "Burn (this month)",
      value: formatInr(k?.burnRate ?? 0),
      icon: Flame,
      hint: "Expense outflows"
    },
    {
      title: "Pending payments",
      value: formatInr(k?.pendingPayments ?? 0),
      icon: CreditCard,
      hint: "Payroll & AR watchlist"
    },
    {
      title: "Runway (rough)",
      value: `${k?.runwayRemainingMonths ?? 0} mo`,
      icon: BarChart3,
      hint: "Revenue ÷ burn heuristic"
    },
    { title: "Open leads", value: `${k?.leads ?? 0}`, icon: Target, hint: "Active pipeline count" },
    { title: "Clients", value: `${k?.convertedClients ?? 0}`, icon: Building2, hint: "CRM clients" },
    { title: "Team", value: `${k?.activeEmployees ?? 0}`, icon: Users, hint: "Employees on file" },
    { title: "Pending tasks", value: `${k?.pendingTasks ?? 0}`, icon: BarChart3 },
    {
      title: "Overdue tasks",
      value: `${k?.overdueTasks ?? 0}`,
      icon: AlertTriangle,
      accent: (k?.overdueTasks ?? 0) > 0 ? "warning" : "default"
    }
  ];

  const comboBars = chartsQuery.data
    ? chartsQuery.data.monthlyExpenses.map((row, i) => ({
        month: row.month,
        expenses: row.total,
        leads: chartsQuery.data!.monthlyLeads[i]?.count ?? 0
      }))
    : [];

  const taskBreakdown = chartsQuery.data?.taskStatusBreakdown ?? [];

  return (
    <PageShell
      title="Executive Control Center"
      description="Real-time KPIs across revenue, pipeline, team, and operations."
    >
      {kpiQuery.isLoading ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28" />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="chart-card">
          <p className="mb-4 text-sm font-medium text-ink-secondary">Expense vs lead volume</p>
          {chartsQuery.isLoading ? (
            <LoadingSkeleton className="h-[260px]" />
          ) : comboBars.length === 0 ? (
            <p className="flex h-[260px] items-center justify-center text-sm text-muted">No chart data yet</p>
          ) : (
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comboBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" stroke={axisStroke} fontSize={11} tickLine={false} />
                  <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="expenses" name="Expenses (₹)" fill="#39ff14" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" name="Leads" fill="#2e2973" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="chart-card">
          <p className="mb-4 text-sm font-medium text-ink-secondary">Tasks by status</p>
          {chartsQuery.isLoading ? (
            <LoadingSkeleton className="h-[260px]" />
          ) : taskBreakdown.length === 0 ? (
            <p className="flex h-[260px] items-center justify-center text-sm text-muted">No tasks yet</p>
          ) : (
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={taskBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={(props) => {
                      const name = String(props.name ?? "");
                      const value = props.value ?? 0;
                      return `${name} (${value})`;
                    }}
                  >
                    {taskBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
