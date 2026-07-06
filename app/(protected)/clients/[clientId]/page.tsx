"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, CheckCircle2, CircleDot, PauseCircle, Pencil, UserRound } from "lucide-react";
import { ClientFinancePanel } from "@/components/client-finance-panel";
import { ClientProjectTasks, type ClientHubTask } from "@/components/client-project-tasks";
import { PageShell } from "@/components/page-shell";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toastApiError } from "@/components/ui/toast-handler";
import { apiClient } from "@/lib/api-client";
import { appToast } from "@/lib/app-toast";
import { formatInr } from "@/lib/format-inr";

const PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed"] as const;

type ProjectUpdate = {
  _id: string;
  note: string;
  reportDate?: string;
  createdAt?: string;
};

type PortfolioProject = {
  _id?: string;
  name: string;
  status: string;
  description?: string;
  scope?: string;
  startDate?: string;
  targetEndDate?: string;
  completedAt?: string;
  managerName?: string;
  managerEmployeeId?: string;
  createdAt?: string;
  updatedAt?: string;
  updates?: ProjectUpdate[];
};

type EmployeeOption = {
  _id: string;
  name: string;
  role?: string;
  department?: string;
};

type LeanTask = ClientHubTask;

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

function formatReportDay(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return iso;
  }
}

function statusStyles(status: string) {
  switch (status) {
    case "Active":
      return "border-gold/40 bg-gold/10 text-gold-bright";
    case "Completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "On Hold":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    default:
      return "border-gold/20 bg-surface-lift text-muted";
  }
}

function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusStyles(status)}`}>
      {status}
    </span>
  );
}

type ProjectFormValues = {
  name: string;
  status: string;
  description: string;
  scope: string;
  startDate: string;
  targetEndDate: string;
  managerEmployeeId: string;
};

function emptyProjectForm(): ProjectFormValues {
  return {
    name: "",
    status: "Planning",
    description: "",
    scope: "",
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: "",
    managerEmployeeId: ""
  };
}

function EditProjectModal({
  open,
  initial,
  employees,
  isLoading,
  onSave,
  onClose
}: {
  open: boolean;
  initial: ProjectFormValues | null;
  employees: EmployeeOption[];
  isLoading: boolean;
  onSave: (payload: ProjectFormValues) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [form, setForm] = useState<ProjectFormValues>(emptyProjectForm());

  useEffect(() => {
    if (!open || !initial) return;
    setForm(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined" || !open || !initial) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => !isLoading && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gold/35 bg-surface-card p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)] space-y-4"
      >
        <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
          Edit project
        </h2>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Project name</label>
            <input
              className="input-field text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Website redesign"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Status</label>
              <select
                className="input-field text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Start date</label>
              <input
                type="date"
                className="input-field text-sm"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Target end date</label>
            <input
              type="date"
              className="input-field text-sm"
              value={form.targetEndDate}
              onChange={(e) => setForm((f) => ({ ...f, targetEndDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Scope / deliverables</label>
            <textarea
              className="input-field min-h-[72px] text-sm"
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
              placeholder="What we're building for the client"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Project manager</label>
            <select
              className="input-field text-sm"
              value={form.managerEmployeeId}
              onChange={(e) => setForm((f) => ({ ...f, managerEmployeeId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                  {emp.role ? ` · ${emp.role}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Internal notes</label>
            <textarea
              className="input-field min-h-[72px] text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Team notes, links, context"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={isLoading} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary w-auto px-5"
            disabled={isLoading || !form.name.trim()}
            onClick={() => onSave(form)}
          >
            {isLoading ? "Saving…" : "Save project"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditUpdateModal({
  open,
  initial,
  isLoading,
  onSave,
  onClose
}: {
  open: boolean;
  initial: { note: string; reportDate: string } | null;
  isLoading: boolean;
  onSave: (payload: { note: string; reportDate: string }) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const [reportDate, setReportDate] = useState("");

  useEffect(() => {
    if (!open || !initial) return;
    setNote(initial.note);
    setReportDate(initial.reportDate.slice(0, 10));
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined" || !open || !initial) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => !isLoading && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-utitle`}
        className="relative z-10 w-full max-w-md rounded-xl border border-gold/35 bg-surface-card p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)] space-y-4"
      >
        <h2 id={`${id}-utitle`} className="text-base font-semibold text-ink">
          Edit daily update
        </h2>
        <div className="space-y-2">
          <label className="text-[11px] text-muted">Day</label>
          <input
            type="date"
            className="w-full rounded-lg bg-surface-lift px-3 py-2 text-sm"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
          <label className="text-[11px] text-muted">Update</label>
          <textarea
            className="w-full rounded-lg bg-surface-lift px-3 py-2 text-sm min-h-[100px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today?"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gold/35 px-4 py-2 text-sm disabled:opacity-50"
            disabled={isLoading}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-gold-cta px-4 py-2 text-sm font-semibold text-black shadow-gold hover:brightness-110 disabled:opacity-50"
            disabled={isLoading || !note.trim()}
            onClick={() => onSave({ note: note.trim(), reportDate })}
          >
            {isLoading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClientHubPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const qc = useQueryClient();

  const [projectForm, setProjectForm] = useState<ProjectFormValues>(emptyProjectForm);
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, { note: string; date: string }>>({});

  const [editProject, setEditProject] = useState<{ projectId: string } & ProjectFormValues | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [editUpdate, setEditUpdate] = useState<{
    projectId: string;
    updateId: string;
    note: string;
    reportDate: string;
  } | null>(null);
  const [deleteUpdate, setDeleteUpdate] = useState<{ projectId: string; updateId: string } | null>(
    null
  );

  const invalidateHub = () => {
    void qc.invalidateQueries({ queryKey: ["clients", "hub", clientId] });
    void qc.invalidateQueries({ queryKey: ["sales", "clients"] });
    void qc.invalidateQueries({ queryKey: ["clients", "list"] });
    void qc.invalidateQueries({ queryKey: ["clients", "projects-picker"] });
  };

  const employeesQuery = useQuery({
    queryKey: ["employees", "picker"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { items: EmployeeOption[] } }>(
        "/employees?limit=200&sortOrder=asc"
      );
      return data.data.items;
    }
  });

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
        name: projectForm.name.trim(),
        status: projectForm.status,
        description: projectForm.description || undefined,
        scope: projectForm.scope || undefined,
        startDate: projectForm.startDate || undefined,
        targetEndDate: projectForm.targetEndDate || undefined,
        managerEmployeeId: projectForm.managerEmployeeId || null
      }),
    onSuccess: () => {
      setProjectForm(emptyProjectForm());
      invalidateHub();
      appToast.success("Project linked to client — pick it in Action Management to assign tasks");
    },
    onError: (err) => toastApiError(err, "Could not add project")
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (vars: { projectId: string } & ProjectFormValues) => {
      await apiClient.patch(`/sales/clients/${clientId}/projects/${vars.projectId}`, {
        name: vars.name,
        status: vars.status,
        description: vars.description,
        scope: vars.scope,
        startDate: vars.startDate || null,
        targetEndDate: vars.targetEndDate || null,
        managerEmployeeId: vars.managerEmployeeId || null
      });
    },
    onSuccess: () => {
      setEditProject(null);
      invalidateHub();
      appToast.success("Project updated");
    },
    onError: (err) => toastApiError(err, "Could not update project")
  });

  const quickStatusMutation = useMutation({
    mutationFn: async (vars: { projectId: string; status: (typeof PROJECT_STATUSES)[number] }) => {
      await apiClient.patch(`/sales/clients/${clientId}/projects/${vars.projectId}`, {
        status: vars.status
      });
    },
    onSuccess: (_d, vars) => {
      invalidateHub();
      appToast.success(`Project marked ${vars.status}`);
    },
    onError: (err) => toastApiError(err, "Could not update status")
  });

  function portfolioToForm(p: PortfolioProject): ProjectFormValues {
    return {
      name: p.name,
      status: p.status,
      description: p.description ?? "",
      scope: p.scope ?? "",
      startDate: p.startDate ? p.startDate.slice(0, 10) : p.createdAt ? p.createdAt.slice(0, 10) : "",
      targetEndDate: p.targetEndDate ? p.targetEndDate.slice(0, 10) : "",
      managerEmployeeId: p.managerEmployeeId ? String(p.managerEmployeeId) : ""
    };
  }

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/sales/clients/${clientId}/projects/${projectId}`);
    },
    onSuccess: () => {
      setDeleteProjectId(null);
      invalidateHub();
      appToast.success("Project removed");
    },
    onError: (err) => toastApiError(err, "Could not delete project")
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (vars: { projectId: string; note: string; reportDate: string }) => {
      await apiClient.post(`/sales/clients/${clientId}/projects/${vars.projectId}/updates`, {
        note: vars.note,
        reportDate: vars.reportDate
      });
    },
    onSuccess: (_d, vars) => {
      setUpdateDrafts((d) => {
        const next = { ...d };
        delete next[vars.projectId];
        return next;
      });
      invalidateHub();
      appToast.success("Update logged");
    },
    onError: (err) => toastApiError(err, "Could not add update")
  });

  const patchUpdateMutation = useMutation({
    mutationFn: async (vars: {
      projectId: string;
      updateId: string;
      note: string;
      reportDate: string;
    }) => {
      await apiClient.patch(
        `/sales/clients/${clientId}/projects/${vars.projectId}/updates/${vars.updateId}`,
        { note: vars.note, reportDate: vars.reportDate }
      );
    },
    onSuccess: () => {
      setEditUpdate(null);
      invalidateHub();
      appToast.success("Update saved");
    },
    onError: (err) => toastApiError(err, "Could not save update")
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: async (vars: { projectId: string; updateId: string }) => {
      await apiClient.delete(
        `/sales/clients/${clientId}/projects/${vars.projectId}/updates/${vars.updateId}`
      );
    },
    onSuccess: () => {
      setDeleteUpdate(null);
      invalidateHub();
      appToast.success("Update removed");
    },
    onError: (err) => toastApiError(err, "Could not delete update")
  });

  const h = hubQuery.data;

  return (
    <PageShell
      title={h?.client.company ?? "Client hub"}
      description="Portfolio projects with scope, dates, daily updates, and task rollups."
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
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <ClientFinancePanel
            clientId={clientId}
            projectNames={h.projects.map((p) => p.name)}
          />

          <div className="chart-card mb-8 space-y-4">
            <div>
              <p className="text-sm font-medium text-ink-secondary">Add client project</p>
              <p className="mt-1 text-xs text-muted">
                Projects are linked to this client and appear in Action Management for task assignment.
                Assign a project manager so the team knows who owns delivery.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Project name</label>
                <input
                  className="input-field text-sm"
                  placeholder="e.g. Mobile app v1"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Status</label>
                <select
                  className="input-field text-sm"
                  value={projectForm.status}
                  onChange={(e) =>
                    setProjectForm((f) => ({ ...f, status: e.target.value as typeof projectForm.status }))
                  }
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Start date</label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Target end</label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={projectForm.targetEndDate}
                  onChange={(e) => setProjectForm((f) => ({ ...f, targetEndDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Project manager</label>
                <select
                  className="input-field text-sm"
                  value={projectForm.managerEmployeeId}
                  onChange={(e) =>
                    setProjectForm((f) => ({ ...f, managerEmployeeId: e.target.value }))
                  }
                >
                  <option value="">Select manager…</option>
                  {(employeesQuery.data ?? []).map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                      {emp.role ? ` · ${emp.role}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Scope / deliverables</label>
                <input
                  className="input-field text-sm"
                  placeholder="What we're building for the client"
                  value={projectForm.scope}
                  onChange={(e) => setProjectForm((f) => ({ ...f, scope: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Internal notes</label>
                <input
                  className="input-field text-sm"
                  placeholder="Team context, links, blockers"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!projectForm.name.trim() || addProjectMutation.isPending}
              className="btn-primary w-auto px-5 py-2 text-sm"
              onClick={() => addProjectMutation.mutate()}
            >
              {addProjectMutation.isPending ? "Adding…" : "Add project"}
            </button>
          </div>

          <div className="space-y-4">
            {h.projects.map((row) => {
              const pid = row.portfolio?._id;
              const defaultDraft = {
                note: "",
                date: new Date().toISOString().slice(0, 10)
              };
              const draft = pid ? (updateDrafts[pid] ?? defaultDraft) : defaultDraft;

              const sortedUpdates = [...(row.portfolio?.updates ?? [])].sort((a, b) => {
                const ta = a.reportDate ? new Date(a.reportDate).getTime() : 0;
                const tb = b.reportDate ? new Date(b.reportDate).getTime() : 0;
                return tb - ta;
              });

              return (
                <section
                  key={row.name}
                  className="chart-card space-y-4"
                >
                  <header className="flex flex-wrap items-start gap-4 justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-ink">{row.name}</h2>
                        {row.portfolio ? <ProjectStatusBadge status={row.portfolio.status} /> : null}
                        {row.portfolio?.managerName ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gold/15 bg-surface-lift px-2.5 py-0.5 text-[11px] text-ink-secondary">
                            <UserRound className="h-3 w-3 text-gold/70" aria-hidden />
                            {row.portfolio.managerName}
                          </span>
                        ) : null}
                      </div>

                      {row.portfolio ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/action-items?clientId=${clientId}&project=${encodeURIComponent(row.name)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gold/25 bg-surface-lift px-2.5 py-1 text-xs font-medium text-gold-bright hover:bg-surface-input"
                          >
                            Assign task in Action Management →
                          </Link>
                        </div>
                      ) : null}

                      {row.portfolio ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg border border-gold/10 bg-surface/60 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Started</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-secondary">
                              <Calendar className="h-3.5 w-3.5 text-gold/60" aria-hidden />
                              {formatReportDay(row.portfolio.startDate ?? row.portfolio.createdAt)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gold/10 bg-surface/60 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Target end</p>
                            <p className="mt-0.5 text-sm text-ink-secondary">
                              {formatReportDay(row.portfolio.targetEndDate)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gold/10 bg-surface/60 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Completed</p>
                            <p className="mt-0.5 text-sm text-ink-secondary">
                              {row.portfolio.status === "Completed"
                                ? formatReportDay(row.portfolio.completedAt ?? row.portfolio.updatedAt)
                                : "—"}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gold/10 bg-surface/60 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Tasks</p>
                            <p className="mt-0.5 text-sm text-ink-secondary">
                              {row.activeWork.length} active · {row.completedWork.length} done
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {row.portfolio?.scope ? (
                        <div className="rounded-lg border border-gold/10 bg-surface/40 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted">Scope</p>
                          <p className="mt-1 text-sm text-ink-secondary whitespace-pre-wrap">{row.portfolio.scope}</p>
                        </div>
                      ) : null}

                      {row.portfolio?.description ? (
                        <p className="text-xs text-muted">
                          <span className="font-medium text-ink-secondary">Notes:</span> {row.portfolio.description}
                        </p>
                      ) : null}

                      {!row.portfolio && (
                        <p className="text-xs text-amber-500/90">
                          Not in portfolio — add a project above or match this name in Action Management.
                        </p>
                      )}
                    </div>

                    {pid ? (
                      <div className="flex shrink-0 flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {row.portfolio!.status !== "Active" && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] font-medium text-gold-bright hover:bg-gold/15 disabled:opacity-50"
                              disabled={quickStatusMutation.isPending}
                              onClick={() => quickStatusMutation.mutate({ projectId: pid, status: "Active" })}
                            >
                              <CircleDot className="h-3 w-3" aria-hidden />
                              Mark active
                            </button>
                          )}
                          {row.portfolio!.status !== "Completed" && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50"
                              disabled={quickStatusMutation.isPending}
                              onClick={() => quickStatusMutation.mutate({ projectId: pid, status: "Completed" })}
                            >
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                              Mark completed
                            </button>
                          )}
                          {row.portfolio!.status !== "On Hold" && row.portfolio!.status !== "Completed" && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-[11px] text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                              disabled={quickStatusMutation.isPending}
                              onClick={() => quickStatusMutation.mutate({ projectId: pid, status: "On Hold" })}
                            >
                              <PauseCircle className="h-3 w-3" aria-hidden />
                              On hold
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-ink-secondary hover:bg-surface-lift"
                            onClick={() =>
                              setEditProject({
                                projectId: pid,
                                ...portfolioToForm(row.portfolio!)
                              })
                            }
                          >
                            <Pencil className="h-3 w-3" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                            onClick={() => setDeleteProjectId(pid)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </header>

                  {pid ? (
                    <div className="rounded-lg border border-gold/15 bg-surface p-3 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Daily updates
                      </p>
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted">Day</span>
                          <input
                            type="date"
                            className="rounded-lg bg-surface-lift px-2 py-1.5 text-xs"
                            value={draft.date}
                            onChange={(e) =>
                              setUpdateDrafts((prev) => ({
                                ...prev,
                                [pid]: { ...draft, date: e.target.value }
                              }))
                            }
                          />
                        </div>
                        <input
                          className="flex-1 min-w-[12rem] rounded-lg bg-surface-lift px-3 py-2 text-sm"
                          placeholder="Today’s note (stand-up, blockers, shipped work…)"
                          value={draft.note}
                          onChange={(e) =>
                            setUpdateDrafts((prev) => ({
                              ...prev,
                              [pid]: { ...draft, note: e.target.value }
                            }))
                          }
                        />
                        <button
                          type="button"
                          disabled={!draft.note.trim() || addUpdateMutation.isPending}
                          className="rounded-lg bg-gold-cta px-3 py-2 text-xs font-semibold text-black shadow-gold hover:brightness-110 disabled:opacity-50"
                          onClick={() =>
                            addUpdateMutation.mutate({
                              projectId: pid,
                              note: draft.note.trim(),
                              reportDate: draft.date
                            })
                          }
                        >
                          {addUpdateMutation.isPending ? "Saving…" : "Add update"}
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {sortedUpdates.map((u) => (
                          <li
                            key={u._id}
                            className="flex flex-wrap gap-2 items-start justify-between rounded-md border border-gold/10 bg-surface-card px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-muted mb-0.5">
                                {formatReportDay(u.reportDate)}
                              </p>
                              <p className="text-sm text-ink-secondary whitespace-pre-wrap">{u.note}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                className="text-xs text-gold-bright hover:underline"
                                onClick={() =>
                                  setEditUpdate({
                                    projectId: pid,
                                    updateId: u._id,
                                    note: u.note,
                                    reportDate: u.reportDate
                                      ? new Date(u.reportDate).toISOString()
                                      : new Date().toISOString()
                                  })
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:underline"
                                onClick={() => setDeleteUpdate({ projectId: pid, updateId: u._id })}
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        ))}
                        {!sortedUpdates.length && (
                          <li className="text-xs text-muted/80">No updates yet — log the first one above.</li>
                        )}
                      </ul>
                    </div>
                  ) : null}

                  <ClientProjectTasks
                    clientId={clientId}
                    projectName={row.name}
                    activeTasks={row.activeWork}
                    completedTasks={row.completedWork}
                    hubQueryKey={["clients", "hub", clientId]}
                  />
                </section>
              );
            })}

            {!h.projects.length && (
              <p className="text-sm text-muted">
                No projects yet — add a portfolio project or create tasks linked to this client with
                a “Linked project” name.
              </p>
            )}
          </div>
        </>
      )}

      <EditProjectModal
        open={Boolean(editProject)}
        employees={employeesQuery.data ?? []}
        initial={
          editProject
            ? {
                name: editProject.name,
                status: editProject.status,
                description: editProject.description,
                scope: editProject.scope,
                startDate: editProject.startDate,
                targetEndDate: editProject.targetEndDate,
                managerEmployeeId: editProject.managerEmployeeId
              }
            : null
        }
        isLoading={updateProjectMutation.isPending}
        onClose={() => !updateProjectMutation.isPending && setEditProject(null)}
        onSave={(payload) =>
          editProject &&
          updateProjectMutation.mutate({
            projectId: editProject.projectId,
            ...payload
          })
        }
      />

      <EditUpdateModal
        open={Boolean(editUpdate)}
        initial={
          editUpdate ? { note: editUpdate.note, reportDate: editUpdate.reportDate } : null
        }
        isLoading={patchUpdateMutation.isPending}
        onClose={() => !patchUpdateMutation.isPending && setEditUpdate(null)}
        onSave={(payload) =>
          editUpdate &&
          patchUpdateMutation.mutate({
            projectId: editUpdate.projectId,
            updateId: editUpdate.updateId,
            note: payload.note,
            reportDate: payload.reportDate
          })
        }
      />

      <ConfirmationDialog
        open={Boolean(deleteProjectId)}
        title="Delete portfolio project?"
        message="Tasks linked to this project name are not deleted — only the portfolio row is removed."
        destructive
        confirmLabel="Delete"
        isLoading={deleteProjectMutation.isPending}
        onCancel={() => !deleteProjectMutation.isPending && setDeleteProjectId(null)}
        onConfirm={() => deleteProjectId && deleteProjectMutation.mutate(deleteProjectId)}
      />

      <ConfirmationDialog
        open={Boolean(deleteUpdate)}
        title="Delete this update?"
        message="This daily log entry will be permanently removed."
        destructive
        confirmLabel="Delete"
        isLoading={deleteUpdateMutation.isPending}
        onCancel={() => !deleteUpdateMutation.isPending && setDeleteUpdate(null)}
        onConfirm={() =>
          deleteUpdate && deleteUpdateMutation.mutate(deleteUpdate)
        }
      />
    </PageShell>
  );
}
