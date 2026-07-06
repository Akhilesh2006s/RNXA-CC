"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { TaskWorkflowPanel } from "@/components/task-workflow-panel";
import { apiClient } from "@/lib/api-client";
import { appToast } from "@/lib/app-toast";
import { toastApiError } from "@/components/ui/toast-handler";
import type { SubtaskRow } from "@/lib/task-workflow";

export type ClientHubTask = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  linkedProject?: string;
  updatedAt?: string;
  comments?: Array<{ _id: string; message: string; createdAt: string }>;
  subtasks?: SubtaskRow[];
};

function formatDue(iso?: string) {
  if (!iso) return "No due date";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

function isOverdue(task: ClientHubTask) {
  if (!task.dueDate || task.status === "Completed" || task.status === "Archived") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

function statusClass(status: string) {
  if (status === "Completed" || status === "Archived")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "Overdue" || status === "Blocked") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (status === "In Review") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  if (status === "In Progress") return "border-gold/30 bg-gold/10 text-gold-bright";
  return "border-gold/15 bg-surface-lift text-muted";
}

function TaskCard({ task, onChanged }: { task: ClientHubTask; onChanged: () => void }) {
  const [progressDraft, setProgressDraft] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  const commentMutation = useMutation({
    mutationFn: () => apiClient.post(`/tasks/${task._id}/comments`, { message: progressDraft.trim() }),
    onSuccess: () => {
      setProgressDraft("");
      setShowProgress(false);
      onChanged();
      appToast.success("Progress logged");
    },
    onError: (err) => toastApiError(err, "Could not add update")
  });

  const latestComment = task.comments?.length
    ? [...task.comments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  return (
    <article
      className={`rounded-lg border p-3 space-y-3 ${
        isOverdue(task) ? "border-red-500/25 bg-red-950/10" : "border-gold/15 bg-surface/50"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-ink">{task.title}</h4>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(task.status)}`}
          >
            {task.status}
          </span>
          {task.priority ? (
            <span className="text-[10px] uppercase tracking-wide text-muted">{task.priority}</span>
          ) : null}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Calendar className="h-3 w-3 shrink-0" aria-hidden />
          <span className={isOverdue(task) ? "font-medium text-red-400" : ""}>
            Due {formatDue(task.dueDate)}
          </span>
        </p>
      </div>

      {task.description ? (
        <div className="rounded-md border border-gold/10 bg-surface-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">What we&apos;re doing</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-secondary">{task.description}</p>
        </div>
      ) : null}

      <TaskWorkflowPanel
        taskId={task._id}
        status={task.status}
        subtasks={task.subtasks}
        compact={task.status === "Completed" || task.status === "Archived"}
        onChanged={onChanged}
        onAddSubtask={async (title) => {
          await apiClient.post(`/tasks/${task._id}/subtasks`, { title });
        }}
        onToggleSubtask={async (subtaskId, done) => {
          await apiClient.patch(`/tasks/${task._id}/subtasks/${subtaskId}`, { done });
        }}
      />

      {latestComment ? (
        <div className="rounded-md border border-gold/10 bg-surface-card/40 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Latest progress</p>
          <p className="mt-0.5 text-xs text-muted">{new Date(latestComment.createdAt).toLocaleString()}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-secondary">{latestComment.message}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-gold-bright hover:underline"
          onClick={() => setShowProgress((v) => !v)}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
          {showProgress ? "Cancel update" : "Log progress"}
        </button>
        <Link
          href={`/action-items?taskId=${task._id}`}
          className="text-xs text-muted hover:text-gold-bright hover:underline"
        >
          Full details →
        </Link>
      </div>

      {showProgress ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input-field flex-1 text-sm"
            placeholder="What happened today? Blockers, shipped work, next steps…"
            value={progressDraft}
            onChange={(e) => setProgressDraft(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary w-auto shrink-0 px-4 py-2 text-xs"
            disabled={!progressDraft.trim() || commentMutation.isPending}
            onClick={() => commentMutation.mutate()}
          >
            {commentMutation.isPending ? "Saving…" : "Save update"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function ClientProjectTasks({
  clientId,
  projectName,
  activeTasks,
  completedTasks,
  hubQueryKey
}: {
  clientId: string;
  projectName: string;
  activeTasks: ClientHubTask[];
  completedTasks: ClientHubTask[];
  hubQueryKey: readonly string[];
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [stepDraft, setStepDraft] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: hubQueryKey });
    void qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: { _id: string } }>("/tasks", {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority,
        type: "One-time",
        linkedClientId: clientId,
        linkedProject: projectName
      });
      const taskId = data.data._id;
      if (stepDraft.trim() && taskId) {
        await apiClient.post(`/tasks/${taskId}/subtasks`, { title: stepDraft.trim() });
      }
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDueDate("");
      setStepDraft("");
      setPriority("Medium");
      invalidate();
      appToast.success("Task assigned with workflow steps");
    },
    onError: (err) => toastApiError(err, "Could not create task")
  });

  return (
    <div className="space-y-4 rounded-lg border border-gold/15 bg-surface/30 p-4">
      <div>
        <p className="text-sm font-medium text-ink-secondary">Project tasks</p>
        <p className="mt-0.5 text-xs text-muted">
          Jira-style flow: To Do → In Progress → In Review → Done. Add checklist steps and complete them
          before marking done.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Task</label>
          <input
            className="input-field text-sm"
            placeholder="e.g. Design homepage mockups"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Due date</label>
          <input
            type="date"
            className="input-field text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Priority</label>
          <select
            className="input-field text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Action plan</label>
          <textarea
            className="input-field min-h-[72px] text-sm"
            placeholder="What we're doing about this task"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            First checklist step (optional)
          </label>
          <input
            className="input-field text-sm"
            placeholder="e.g. Gather requirements, Create wireframes…"
            value={stepDraft}
            onChange={(e) => setStepDraft(e.target.value)}
          />
        </div>
      </div>
      <button
        type="button"
        className="btn-primary w-auto px-5 py-2 text-sm"
        disabled={!title.trim() || createMutation.isPending}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? "Assigning…" : "Assign task to this project"}
      </button>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Active & in progress ({activeTasks.length})
        </p>
        {activeTasks.length ? (
          activeTasks.map((t) => <TaskCard key={t._id} task={t} onChanged={invalidate} />)
        ) : (
          <p className="text-xs text-muted/80">No active tasks for this project yet.</p>
        )}
      </div>

      {completedTasks.length > 0 ? (
        <div className="space-y-2 border-t border-gold/10 pt-3">
          <button
            type="button"
            className="text-xs font-medium text-gold-bright hover:underline"
            onClick={() => setShowCompleted((v) => !v)}
          >
            {showCompleted ? "Hide" : "Show"} completed ({completedTasks.length})
          </button>
          {showCompleted
            ? completedTasks.map((t) => <TaskCard key={t._id} task={t} onChanged={invalidate} />)
            : null}
        </div>
      ) : null}
    </div>
  );
}
