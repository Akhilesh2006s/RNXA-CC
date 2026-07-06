"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  LayoutGrid,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { StatCard } from "@/components/ui/stat-card";
import { PageShell } from "@/components/page-shell";
import { apiClient } from "@/lib/api-client";
import { appToast } from "@/lib/app-toast";
import { toastApiError } from "@/components/ui/toast-handler";
import { formatInr } from "@/lib/format-inr";

type Lead = {
  _id?: string;
  id?: string;
  company: string;
  contactPerson: string;
  stage: string;
  estimatedDealValue?: number;
  email?: string;
  phone?: string;
  source?: string;
  convertedClientId?: string | null;
};

type Client = {
  _id: string;
  company: string;
  contactPerson: string;
  dealValue?: number;
  paymentStatus?: string;
};

type TabId = "pipeline" | "insights" | "clients";

const STAGE_FLOW = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation"
] as const;

const PIPELINE = [...STAGE_FLOW, "Won", "Lost"] as const;

const STAGE_STYLE: Record<string, { dot: string; header: string; border: string }> = {
  "New Lead": { dot: "bg-sky-400", header: "text-sky-300", border: "border-sky-500/25" },
  Contacted: { dot: "bg-cyan-400", header: "text-cyan-300", border: "border-cyan-500/25" },
  Qualified: { dot: "bg-violet-400", header: "text-violet-300", border: "border-violet-500/25" },
  "Proposal Sent": { dot: "bg-amber-400", header: "text-amber-300", border: "border-amber-500/25" },
  Negotiation: { dot: "bg-orange-400", header: "text-orange-300", border: "border-orange-500/25" },
  Won: { dot: "bg-emerald-400", header: "text-emerald-300", border: "border-emerald-500/25" },
  Lost: { dot: "bg-red-400/80", header: "text-red-300/90", border: "border-red-500/20" }
};

function leadId(lead: Lead): string {
  const raw = lead._id ?? lead.id;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.$oid === "string") return obj.$oid;
  }
  return "";
}

function getNextStage(current: string): (typeof STAGE_FLOW)[number] | null {
  const idx = STAGE_FLOW.indexOf(current as (typeof STAGE_FLOW)[number]);
  if (idx === -1 || idx >= STAGE_FLOW.length - 1) return null;
  return STAGE_FLOW[idx + 1];
}

function leadCanAdvance(lead: Lead): boolean {
  if (lead.convertedClientId) return false;
  if (lead.stage === "Lost" || lead.stage === "Won") return false;
  return getNextStage(lead.stage) !== null;
}

function leadCanConvert(lead: Lead): boolean {
  if (lead.convertedClientId) return false;
  return lead.stage === "Proposal Sent" || lead.stage === "Negotiation";
}

function leadCanMarkLost(lead: Lead): boolean {
  if (lead.convertedClientId) return false;
  return lead.stage !== "Lost" && lead.stage !== "Won";
}

function LeadCard({
  lead,
  onAdvance,
  onConvert,
  onMarkLost,
  onDelete,
  isBusy,
  isConverting,
  isDeleting
}: {
  lead: Lead;
  onAdvance: (id: string, nextStage: string) => void;
  onConvert: (id: string) => void;
  onMarkLost: (id: string) => void;
  onDelete: (id: string) => void;
  isBusy: boolean;
  isConverting: boolean;
  isDeleting: boolean;
}) {
  const id = leadId(lead);
  const next = getNextStage(lead.stage);

  if (!id) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-400">
        Invalid lead id — refresh the page
      </div>
    );
  }

  if (lead.convertedClientId) {
    return (
      <article className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
        <p className="text-sm font-semibold text-ink">{lead.company}</p>
        <p className="text-xs text-muted">{lead.contactPerson}</p>
        <p className="mt-2 text-xs font-medium text-emerald-400">Converted to client</p>
      </article>
    );
  }

  if (lead.stage === "Won" || lead.stage === "Lost") {
    return (
      <article className="rounded-xl border border-gold/10 bg-surface/40 p-3.5 opacity-80">
        <p className="text-sm font-semibold text-ink">{lead.company}</p>
        <p className="text-xs text-muted">{lead.contactPerson}</p>
        {lead.estimatedDealValue != null && (
          <p className="mt-1 text-xs text-gold-bright">{formatInr(lead.estimatedDealValue)}</p>
        )}
        <p className="mt-2 text-xs text-muted">{lead.stage === "Won" ? "Deal won" : "Marked lost"}</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-gold/15 bg-surface/70 p-3.5 shadow-sm transition hover:border-gold/30 hover:bg-surface-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{lead.company}</p>
          <p className="truncate text-xs text-muted">{lead.contactPerson}</p>
          {lead.email ? <p className="mt-0.5 truncate text-[11px] text-muted/80">{lead.email}</p> : null}
        </div>
        {lead.estimatedDealValue != null && (
          <span className="shrink-0 rounded-md bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold-bright">
            {formatInr(lead.estimatedDealValue)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-gold/10 pt-3">
        {next && leadCanAdvance(lead) ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold/25 bg-surface-lift px-2.5 py-2 text-xs font-medium text-gold-bright transition hover:bg-surface-input disabled:opacity-50"
            disabled={isBusy}
            onClick={() => onAdvance(id, next)}
          >
            Move to {next}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}

        {leadCanConvert(lead) ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-cta px-2.5 py-2 text-xs font-semibold shadow-gold transition hover:brightness-110 disabled:opacity-50"
            disabled={isConverting}
            onClick={() => onConvert(id)}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Convert to client
          </button>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {leadCanMarkLost(lead) ? (
            <button
              type="button"
              className="text-[11px] text-red-400/90 transition hover:text-red-300 disabled:opacity-50"
              disabled={isBusy}
              onClick={() => onMarkLost(id)}
            >
              Mark lost
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="text-[11px] text-muted transition hover:text-red-400 disabled:opacity-50"
            disabled={isDeleting}
            onClick={() => onDelete(id)}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function PipelineColumn({
  stage,
  leads,
  onAdvance,
  onConvert,
  onMarkLost,
  onDelete,
  isBusy,
  isConverting,
  isDeleting
}: {
  stage: string;
  leads: Lead[];
  onAdvance: (id: string, nextStage: string) => void;
  onConvert: (id: string) => void;
  onMarkLost: (id: string) => void;
  onDelete: (id: string) => void;
  isBusy: boolean;
  isConverting: boolean;
  isDeleting: boolean;
}) {
  const style = STAGE_STYLE[stage] ?? STAGE_STYLE["New Lead"];

  return (
    <div className={`flex w-[260px] shrink-0 flex-col rounded-xl border bg-surface/60 ${style.border}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-gold/10 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
          <p className={`truncate text-xs font-semibold uppercase tracking-wide ${style.header}`}>
            {stage}
          </p>
        </div>
        <span className="rounded-full bg-surface-lift px-2 py-0.5 text-[11px] font-medium text-muted">
          {leads.length}
        </span>
      </div>
      <ScrollContainer ariaLabel={`${stage} leads`} className="min-h-0 flex-1 px-2 py-2">
        <div className="space-y-2.5 pb-2">
          {leads.map((lead) => (
            <LeadCard
              key={leadId(lead) || `${lead.company}-${lead.contactPerson}`}
              lead={lead}
              onAdvance={onAdvance}
              onConvert={onConvert}
              onMarkLost={onMarkLost}
              onDelete={onDelete}
              isBusy={isBusy}
              isConverting={isConverting}
              isDeleting={isDeleting}
            />
          ))}
          {!leads.length && <p className="py-8 text-center text-[11px] text-muted/70">Empty</p>}
        </div>
      </ScrollContainer>
    </div>
  );
}

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("pipeline");
  const [showAddLead, setShowAddLead] = useState(false);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [estimatedDealValue, setEstimatedDealValue] = useState("");
  const [lostReasonDraft, setLostReasonDraft] = useState("");
  const [leadPendingDelete, setLeadPendingDelete] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: ["sales", "leads"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { items: Lead[] } }>(
        "/sales/leads?limit=200&sortOrder=desc"
      );
      return data.data.items;
    }
  });

  const clientsQuery = useQuery({
    queryKey: ["sales", "clients"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { items: Client[] } }>(
        "/sales/clients?limit=200&sortOrder=desc"
      );
      return data.data.items;
    }
  });

  const analyticsQuery = useQuery({
    queryKey: ["sales", "analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        data: {
          funnel: Array<{ stage: string; count: number }>;
          conversionRate: number;
          wins: number;
          losses: number;
          lostReasons: Array<{ reason: string; count: number }>;
          revenueForecast: number;
          openDealCount: number;
          salesLeaderboard: Array<{ userId?: string; name: string; wins: number; revenue: number }>;
        };
      }>("/sales/analytics/summary");
      return data.data;
    }
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales", "leads"] }),
      queryClient.invalidateQueries({ queryKey: ["sales", "clients"] }),
      queryClient.invalidateQueries({ queryKey: ["sales", "analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["finance"] }),
      queryClient.invalidateQueries({ queryKey: ["clients"] })
    ]);

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/sales/leads", {
        company,
        contactPerson,
        email: email || undefined,
        estimatedDealValue: estimatedDealValue ? Number(estimatedDealValue) : undefined
      });
    },
    onSuccess: () => {
      void invalidate();
      setCompany("");
      setContactPerson("");
      setEmail("");
      setEstimatedDealValue("");
      setShowAddLead(false);
      appToast.success("Lead added to New Lead stage");
    },
    onError: (err) => toastApiError(err, "Could not create lead")
  });

  const stageMutation = useMutation({
    mutationFn: async (payload: { id: string; stage: string; lostReason?: string }) => {
      await apiClient.patch(`/sales/leads/${payload.id}/stage`, {
        stage: payload.stage,
        lostReason: payload.lostReason
      });
    },
    onSuccess: () => {
      void invalidate();
      appToast.success("Lead stage updated");
    },
    onError: (err) => toastApiError(err, "Could not update stage")
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/sales/leads/${id}/convert`, { force: false });
    },
    onSuccess: () => {
      void invalidate();
      appToast.success("Lead converted to client");
    },
    onError: (err) => toastApiError(err, "Convert only allowed from Proposal Sent or Negotiation")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales/leads/${id}`);
    },
    onSuccess: () => {
      setLeadPendingDelete(null);
      void invalidate();
      appToast.success("Lead removed from pipeline");
    },
    onError: (err) => toastApiError(err, "Could not delete lead")
  });

  function advanceLead(id: string, nextStage: string) {
    stageMutation.mutate({ id, stage: nextStage });
  }

  function markLeadLost(id: string) {
    stageMutation.mutate({
      id,
      stage: "Lost",
      lostReason: lostReasonDraft.trim().length >= 2 ? lostReasonDraft : "No reason captured"
    });
  }

  const filteredLeads = useMemo(() => {
    const items = leadsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.contactPerson.toLowerCase().includes(q) ||
        (l.email?.toLowerCase().includes(q) ?? false)
    );
  }, [leadsQuery.data, search]);

  const columns = useMemo(
    () =>
      PIPELINE.map((stage) => ({
        stage,
        leads: filteredLeads.filter((l) => l.stage === stage)
      })),
    [filteredLeads]
  );

  const isBusy = stageMutation.isPending || convertMutation.isPending;
  const analytics = analyticsQuery.data;

  const tabs: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
    { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
    { id: "insights", label: "Insights", icon: BarChart3 },
    { id: "clients", label: "Clients", icon: Users }
  ];

  return (
    <PageShell
      title="Sales CRM"
      description="Track leads through your pipeline and convert winning deals into clients."
      actions={
        analytics ? (
          <div className="hidden items-center gap-3 rounded-xl border border-gold/15 bg-surface-card px-4 py-2 text-sm sm:flex">
            <span className="text-muted">Open deals</span>
            <span className="font-semibold text-gold-bright">{analytics.openDealCount}</span>
            <span className="text-muted/50">·</span>
            <span className="font-semibold text-ink">{formatInr(analytics.revenueForecast)}</span>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-gold/15 bg-surface-card p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-gold/15 text-gold-bright shadow-sm"
                  : "text-muted hover:bg-surface-lift hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {id === "clients" && clientsQuery.data?.length ? (
                <span className="rounded-full bg-surface-lift px-1.5 py-0.5 text-[10px] text-muted">
                  {clientsQuery.data.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "pipeline" && (
          <div className="flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row">
            <label className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                className="input-field pl-9 text-sm"
                placeholder="Search leads…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary inline-flex w-auto shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm"
              onClick={() => setShowAddLead((v) => !v)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {showAddLead ? "Close" : "New lead"}
            </button>
          </div>
        )}
      </div>

      {tab === "pipeline" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gold/10 bg-surface/50 px-3 py-2.5 text-xs text-muted">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
            {STAGE_FLOW.map((stage, i) => (
              <span key={stage} className="inline-flex items-center gap-1.5">
                <span className="rounded-md border border-gold/15 bg-surface-card px-2 py-0.5 font-medium text-ink-secondary">
                  {stage}
                </span>
                {i < STAGE_FLOW.length - 1 ? (
                  <ChevronRight className="h-3 w-3 text-gold/40" aria-hidden />
                ) : null}
              </span>
            ))}
            <span className="ml-1 text-muted/80">· convert in Proposal or Negotiation</span>
          </div>

          {showAddLead && (
            <div className="chart-card space-y-4">
              <div>
                <p className="text-sm font-semibold text-ink">Add new lead</p>
                <p className="text-xs text-muted">Starts at New Lead. Advance one stage at a time.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className="input-field text-sm"
                  placeholder="Company *"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <input
                  className="input-field text-sm"
                  placeholder="Contact person *"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
                <input
                  className="input-field text-sm"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="input-field text-sm"
                  type="number"
                  placeholder="Est. deal value (₹)"
                  value={estimatedDealValue}
                  onChange={(e) => setEstimatedDealValue(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="grid flex-1 gap-1 text-xs text-muted">
                  Lost reason preset (optional — used when marking lost)
                  <input
                    className="input-field text-sm"
                    placeholder="e.g. Price, timing, competitor"
                    value={lostReasonDraft}
                    onChange={(e) => setLostReasonDraft(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary w-auto shrink-0 px-6 py-2.5 text-sm"
                  disabled={!company || !contactPerson || createLeadMutation.isPending}
                  onClick={() => createLeadMutation.mutate()}
                >
                  {createLeadMutation.isPending ? "Adding…" : "Create lead"}
                </button>
              </div>
            </div>
          )}

          {leadsQuery.isLoading ? (
            <div className="chart-card py-16 text-center text-sm text-muted">Loading pipeline…</div>
          ) : (
            <div className="chart-card overflow-hidden p-0">
              <ScrollContainer horizontal ariaLabel="Sales pipeline board" className="max-w-full">
                <div className="flex min-h-[520px] min-w-[1180px] gap-3 p-4">
                  {columns.map((column) => (
                    <PipelineColumn
                      key={column.stage}
                      stage={column.stage}
                      leads={column.leads}
                      onAdvance={advanceLead}
                      onConvert={(id) => convertMutation.mutate(id)}
                      onMarkLost={markLeadLost}
                      onDelete={setLeadPendingDelete}
                      isBusy={isBusy}
                      isConverting={convertMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              </ScrollContainer>
            </div>
          )}
        </div>
      )}

      {tab === "insights" && analyticsQuery.isLoading && (
        <div className="chart-card py-16 text-center text-sm text-muted">Loading insights…</div>
      )}

      {tab === "insights" && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Win rate"
              value={`${analytics.conversionRate}%`}
              icon={TrendingUp}
              hint={`${analytics.wins} won · ${analytics.losses} lost`}
              accent="success"
            />
            <StatCard
              title="Pipeline forecast"
              value={formatInr(analytics.revenueForecast)}
              hint={`${analytics.openDealCount} open deals`}
              icon={BarChart3}
            />
            <StatCard
              title="Converted clients"
              value={String(clientsQuery.data?.length ?? 0)}
              hint="From won / converted leads"
              icon={Building2}
            />
          </div>

          <div className="chart-card">
            <p className="mb-4 text-sm font-semibold text-ink-secondary">Pipeline funnel</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {analytics.funnel.map((f) => {
                const max = Math.max(...analytics.funnel.map((x) => x.count), 1);
                const pct = Math.round((f.count / max) * 100);
                const style = STAGE_STYLE[f.stage];
                return (
                  <div
                    key={f.stage}
                    className={`rounded-xl border bg-surface/50 p-3 ${style?.border ?? "border-gold/15"}`}
                  >
                    <div className="flex items-center gap-2">
                      {style ? <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> : null}
                      <p className="line-clamp-2 text-[11px] font-medium text-muted">{f.stage}</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-ink">{f.count}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-lift">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold-dim via-gold to-gold-bright"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="chart-card">
              <p className="mb-3 text-sm font-semibold text-ink-secondary">Top closers</p>
              <div className="space-y-2">
                {analytics.salesLeaderboard.slice(0, 5).map((row, idx) => (
                  <div
                    key={row.userId ? String(row.userId) : `rep-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-gold/10 bg-surface/50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-ink">{row.name}</span>
                    <span className="text-xs text-muted">
                      {row.wins} wins · {formatInr(row.revenue)}
                    </span>
                  </div>
                ))}
                {!analytics.salesLeaderboard.length && (
                  <p className="text-xs text-muted">No closed deals yet.</p>
                )}
              </div>
            </div>

            <div className="chart-card">
              <p className="mb-3 text-sm font-semibold text-ink-secondary">Lost reasons</p>
              <div className="flex flex-wrap gap-2">
                {analytics.lostReasons.map((r) => (
                  <span
                    key={r.reason}
                    className="rounded-full border border-gold/15 bg-surface-lift px-3 py-1 text-xs text-ink-secondary"
                  >
                    {r.reason} · {r.count}
                  </span>
                ))}
                {!analytics.lostReasons.length && (
                  <span className="text-xs text-muted">No losses logged yet.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "clients" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Accounts converted from the pipeline. Open a hub for projects, tasks, and finance.
          </p>
          <div className="data-table-wrap">
            <ScrollContainer ariaLabel="Converted clients" className="data-table-scroll">
              <table className="data-table">
                <thead className="sticky top-0 z-10 bg-surface-card shadow-[0_1px_0_rgba(57,255,20,0.12)]">
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th className="text-right">Deal value</th>
                    <th>Payment</th>
                    <th className="w-[120px]" />
                  </tr>
                </thead>
                <tbody>
                  {clientsQuery.data?.map((c) => (
                    <tr key={c._id} className="group">
                      <td className="font-medium text-ink">{c.company}</td>
                      <td className="text-muted">{c.contactPerson}</td>
                      <td className="text-right font-medium text-gold-bright">
                        {formatInr(c.dealValue ?? 0)}
                      </td>
                      <td>
                        <span className="inline-flex rounded-full border border-gold/20 bg-surface-lift px-2 py-0.5 text-xs">
                          {c.paymentStatus ?? "Pending"}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/clients/${c._id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gold-bright hover:underline"
                        >
                          Hub
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!clientsQuery.data?.length && (
                <p className="p-10 text-center text-sm text-muted">
                  No clients yet — convert a lead from Proposal Sent or Negotiation.
                </p>
              )}
            </ScrollContainer>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(leadPendingDelete)}
        title="Delete lead?"
        message="This lead will be removed from the pipeline. Connected client records are not deleted."
        destructive
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onCancel={() => !deleteMutation.isPending && setLeadPendingDelete(null)}
        onConfirm={() => leadPendingDelete && deleteMutation.mutate(leadPendingDelete)}
      />
    </PageShell>
  );
}
