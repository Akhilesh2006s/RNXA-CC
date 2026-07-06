"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { apiClient } from "@/lib/api-client";
import { formatInr } from "@/lib/format-inr";

type ClientRow = {
  _id: string;
  company: string;
  contactPerson: string;
  dealValue?: number;
  paymentStatus?: string;
};

function paymentBadge(status?: string) {
  if (status === "Paid") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

export default function ClientsListPage() {
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["clients", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { items: ClientRow[] } }>(
        "/sales/clients?limit=200&sortOrder=desc"
      );
      return data.data.items;
    }
  });

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q)
    );
  }, [query.data, search]);

  const totalDealValue = useMemo(
    () => filtered.reduce((sum, c) => sum + (c.dealValue ?? 0), 0),
    [filtered]
  );

  return (
    <PageShell
      title="Clients"
      description="Browse accounts and open a client hub for projects, tasks, and finance."
      actions={
        query.data?.length ? (
          <div className="flex items-center gap-2 rounded-xl border border-gold/15 bg-surface-card px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-gold" aria-hidden />
            <span className="font-semibold text-gold-bright">{query.data.length}</span>
            <span className="text-muted">clients</span>
          </div>
        ) : null
      }
    >
      {query.isLoading ? (
        <LoadingSkeleton className="h-64" />
      ) : !query.data?.length ? (
        <EmptyState
          title="No clients yet"
          description="Convert a lead from Proposal Sent or Negotiation on Sales CRM to create your first client."
          action={
            <Link href="/sales" className="btn-ghost inline-block">
              Go to Sales CRM →
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                className="input-field pl-9 text-sm"
                placeholder="Search company or contact…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <p className="text-sm text-muted">
              Showing <span className="font-medium text-ink">{filtered.length}</span> ·{" "}
              <span className="font-medium text-gold-bright">{formatInr(totalDealValue)}</span> total
              deal value
            </p>
          </div>

          <div className="data-table-wrap">
            <ScrollContainer ariaLabel="Clients list" className="data-table-scroll">
              <table className="data-table">
                <thead className="sticky top-0 z-10 bg-surface-card shadow-[0_1px_0_rgba(57,255,20,0.12)]">
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th className="text-right">Deal value</th>
                    <th>Payment</th>
                    <th className="w-[140px]" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c._id} className="group">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/15 bg-surface-lift text-gold">
                            <Building2 className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="font-medium text-ink">{c.company}</span>
                        </div>
                      </td>
                      <td className="text-muted">{c.contactPerson}</td>
                      <td className="text-right font-medium text-gold-bright">
                        {formatInr(c.dealValue ?? 0)}
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${paymentBadge(c.paymentStatus)}`}
                        >
                          {c.paymentStatus ?? "Pending"}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/clients/${c._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gold/20 bg-surface-lift px-2.5 py-1.5 text-xs font-medium text-gold-bright transition group-hover:border-gold/35 group-hover:bg-surface-input"
                        >
                          Open hub
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="p-10 text-center text-sm text-muted">No clients match your search.</p>
              )}
            </ScrollContainer>
          </div>
        </div>
      )}
    </PageShell>
  );
}
