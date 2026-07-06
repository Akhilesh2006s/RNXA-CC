import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: "default" | "warning" | "success";
};

const accentStyles = {
  default: "text-gold/70",
  warning: "text-amber-400/90",
  success: "text-gold-bright"
};

export function StatCard({ title, value, icon: Icon, hint, accent = "default" }: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{title}</p>
        <div className={`rounded-lg border border-gold/15 bg-surface-lift/60 p-2 ${accentStyles[accent]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-gold-bright">{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] leading-relaxed text-muted/90">{hint}</p> : null}
    </div>
  );
}
