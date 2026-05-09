"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiClient } from "@/lib/api-client";
import { formatInr } from "@/lib/format-inr";

type PortfolioProject = {
  _id?: string;
  name: string;
  status: string;
  description?: string;
  createdAt?: string;
};

type LeanTask = {
  _id: string;
  title: string;
  status: string;
  priority?: string;
  linkedProject?: string;
  updatedAt?: string;
};

type ClientDoc = {
  _id: string;
  company: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  paymentStatus?: string;
  projectSummary?: string;
  supportStatus?: string;
};

type HubPayload = {
  client: ClientDoc;
  summary: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
  };
  projects: {
    name: string;
    portfolio: PortfolioProject | null;
    activeWork: LeanTask[];
    completedWork: LeanTask[];
  }[];
};

function TaskChip({ task }: { task: LeanTask }) {
  return (
    <button
      type="button"
      className={`block w-full text-left truncate rounded px-2 py-1 text-[11px] ${
        task.status === "Overdue"
          ? "bg-red-950/50 text-red-200"
          : "bg-surface-lift text-ink hover:bg-surface-input"
      }`}
      title={`${task.title} · ${task.status}`}
    >
      {task.title}
    </button>
  );
}

export default function ClientHubPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const qc = useQueryClient();

  const [projectName, setProjectName] = useState("");
  const [projectStatus, setProjectStatus] = useState<
    "Planning" | "Active" | "On Hold" | "Completed"
  >("Active");
  const [projectNotes, setProjectNotes] = useState("");

  const hubQuery = useQuery({
    queryKey: ["clients", "hub", clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: HubPayload }>(`/sales/clients/${clientId}/hub`);
      return data.data;
    },
    enabled: Boolean(clientId)
  });

  const addProjectMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/sales/clients/${clientId}/projects`, {
        name: projectName.trim(),
        status: projectStatus,
        description: projectNotes || undefined
      }),
    onSuccess: () => {
      setProjectName("");
      setProjectNotes("");
      void qc.invalidateQueries({ queryKey: ["clients", "hub", clientId] });
      void qc.invalidateQueries({ queryKey: ["sales", "clients"] });
      void qc.invalidateQueries({ queryKey: ["clients", "list"] });
    }
  });

  const h = hubQuery.data;

  return (
    <PageShell
      title={h?.client.company ?? "Client hub"}
      description="Portfolio rows from CRM plus work grouped by linked project on action items."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/clients" className="text-muted hover:text-white">
          ← All clients
        </Link>
        {h && (
          <span className="text-muted">
            {h.client.contactPerson}
            {h.client.email ? ` · ${h.client.email}` : ""}
          </span>
        )}
      </div>

      {hubQuery.isLoading && <p className="text-muted">Loading hub…</p>}
      {hubQuery.isError && (
        <p className="text-red-400">Could not load this client (permission or invalid id).</p>
      )}

      {h && (
        <>
          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            {[
              { label: "Tasks (all)", value: h.summary.totalTasks },
              { label: "Active", value: h.summary.activeTasks },
              { label: "Completed / archived", value: h.summary.completedTasks },
              { label: "Deal", value: formatInr(h.client.dealValue ?? 0) }
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-gold/20 bg-surface-card p-4 space-y-1"
              >
                <p className="text-[11px] uppercase text-muted">{c.label}</p>
                <p className="text-2xl font-semibold">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gold/20 bg-surface-card p-4 mb-8 space-y-3">
            <p className="text-sm font-medium text-ink">Record a portfolio project</p>
            <p className="text-xs text-muted">
              Link tasks to this name from Action Management (“Linked project”) and optionally tie
              tasks to this client (“Linked client”) to show them here.
            </p>
            <div className="grid gap-2 md:grid-cols-4">
              <input
                className="rounded-lg bg-surface-lift px-3 py-2 text-sm md:col-span-2"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <select
                className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
                value={projectStatus}
                onChange={(e) =>
                  setProjectStatus(e.target.value as typeof projectStatus)
                }
              >
                {(["Planning", "Active", "On Hold", "Completed"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
                placeholder="Notes"
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={!projectName.trim() || addProjectMutation.isPending}
              className="rounded-lg bg-gold-cta font-semibold shadow-gold hover:brightness-110 px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => addProjectMutation.mutate()}
            >
              {addProjectMutation.isPending ? "Adding…" : "Add portfolio project"}
            </button>
            {addProjectMutation.isError && (
              <p className="text-xs text-red-400">Insufficient role or validation error.</p>
            )}
          </div>

          <div className="space-y-4">
            {h.projects.map((row) => (
              <section
                key={row.name}
                className="rounded-xl border border-gold/20 bg-surface-card p-4 space-y-4"
              >
                <header className="flex flex-wrap items-baseline gap-3 justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{row.name}</h2>
                    {row.portfolio && (
                      <p className="text-xs text-muted mt-1">
                        Portfolio status: <span className="text-ink-secondary">{row.portfolio.status}</span>
                        {row.portfolio.description ? ` · ${row.portfolio.description}` : ""}
                      </p>
                    )}
                    {!row.portfolio && (
                      <p className="text-xs text-amber-500/90 mt-1">
                        Not in portfolio list · add above or rename to match Linked project text.
                      </p>
                    )}
                  </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted mb-2">
                      Active / in-flight
                    </p>
                    <div className="space-y-1 min-h-[2rem]">
                      {row.activeWork.length ? (
                        row.activeWork.map((t) => (
                          <TaskChip key={t._id} task={t} />
                        ))
                      ) : (
                        <p className="text-xs text-muted/80">No open items.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gold/90 mb-2">
                      Completed & archived (what we’ve done)
                    </p>
                    <div className="space-y-1 min-h-[2rem]">
                      {row.completedWork.length ? (
                        row.completedWork.map((t) => (
                          <TaskChip key={t._id} task={t} />
                        ))
                      ) : (
                        <p className="text-xs text-muted/80">Nothing shipped here yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            {!h.projects.length && (
              <p className="text-sm text-muted">
                No projects yet — add a portfolio project or create tasks linked to this client with
                a “Linked project” name.
              </p>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
