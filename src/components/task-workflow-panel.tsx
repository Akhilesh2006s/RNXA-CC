"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { apiClient } from "@/lib/api-client";
import { appToast } from "@/lib/app-toast";
import { toastApiError } from "@/components/ui/toast-handler";
import {
  allSubtasksDone,
  getPrimaryAction,
  isAllowedTaskTransition,
  subtaskProgress,
  TASK_WORKFLOW,
  WORKFLOW_LABELS,
  type SubtaskRow
} from "@/lib/task-workflow";

type TaskWorkflowPanelProps = {
  taskId: string;
  status: string;
  subtasks?: SubtaskRow[];
  compact?: boolean;
  onChanged: () => void;
  onAddSubtask?: (title: string) => Promise<void>;
  onToggleSubtask?: (subtaskId: string, done: boolean) => Promise<void>;
};

export function TaskWorkflowPanel({
  taskId,
  status,
  subtasks = [],
  compact = false,
  onChanged,
  onAddSubtask,
  onToggleSubtask
}: TaskWorkflowPanelProps) {
  const [forceCompleteOpen, setForceCompleteOpen] = useState(false);
  const [stepDraft, setStepDraft] = useState("");
  const [addingStep, setAddingStep] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; force?: boolean }) =>
      apiClient.patch(`/tasks/${taskId}/status`, payload),
    onSuccess: (_d, vars) => {
      onChanged();
      if (vars.status === "Completed") {
        appToast.success("Task marked as done");
      } else {
        appToast.success("Status updated");
      }
    },
    onError: (err) => toastApiError(err, "Could not update status")
  });

  const currentIdx = TASK_WORKFLOW.indexOf(status as (typeof TASK_WORKFLOW)[number]);
  const progress = subtaskProgress(subtasks);
  const primary = getPrimaryAction(status);
  const isDone = status === "Completed" || status === "Archived";

  function requestTransition(nextStatus: string, force = false) {
    if (nextStatus === "Completed" && !allSubtasksDone(subtasks) && !force) {
      setForceCompleteOpen(true);
      return;
    }
    statusMutation.mutate({ status: nextStatus, force });
  }

  async function handleAddStep() {
    if (!onAddSubtask || !stepDraft.trim()) return;
    setAddingStep(true);
    try {
      await onAddSubtask(stepDraft.trim());
      setStepDraft("");
      onChanged();
    } finally {
      setAddingStep(false);
    }
  }

  return (
    <div className="space-y-3">
      {!compact && !isDone ? (
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {TASK_WORKFLOW.map((step, i) => {
            const stepIdx = i;
            const isPast = currentIdx > stepIdx;
            const isCurrent = status === step;
            const isFuture = currentIdx >= 0 && stepIdx > currentIdx;

            return (
              <div key={step} className="flex min-w-0 flex-1 items-center">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                      isPast
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                        : isCurrent
                          ? "border-gold-bright bg-gold/15 text-gold-bright"
                          : "border-gold/20 bg-surface-lift text-muted"
                    }`}
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </div>
                  <span
                    className={`max-w-[4.5rem] truncate text-center text-[9px] font-medium leading-tight ${
                      isCurrent ? "text-gold-bright" : isFuture ? "text-muted/60" : "text-muted"
                    }`}
                  >
                    {WORKFLOW_LABELS[step]}
                  </span>
                </div>
                {i < TASK_WORKFLOW.length - 1 ? (
                  <div
                    className={`mx-0.5 h-0.5 min-w-[12px] flex-1 rounded ${
                      isPast ? "bg-emerald-500/50" : "bg-gold/15"
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {status === "Blocked" ? (
        <p className="flex items-center gap-1.5 rounded-md border border-red-500/25 bg-red-950/20 px-2.5 py-1.5 text-xs text-red-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Blocked — resolve the blocker, then resume work.
        </p>
      ) : null}

      {(subtasks.length > 0 || onAddSubtask) && !isDone ? (
        <div className="space-y-2 rounded-md border border-gold/10 bg-surface-card/50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Steps to complete
            </p>
            {progress ? (
              <span className="text-[10px] text-muted">
                {progress.done}/{progress.total} ({progress.pct}%)
              </span>
            ) : null}
          </div>
          {progress ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-lift">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          ) : null}
          <ul className="space-y-1">
            {subtasks.map((st) => (
              <li key={st._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-gold"
                  checked={st.done}
                  disabled={!onToggleSubtask}
                  onChange={(e) => onToggleSubtask?.(st._id, e.target.checked)}
                />
                <span className={st.done ? "line-through text-muted" : "text-ink-secondary"}>
                  {st.title}
                </span>
              </li>
            ))}
          </ul>
          {onAddSubtask ? (
            <div className="flex gap-2">
              <input
                className="input-field flex-1 py-1.5 text-xs"
                placeholder="Add a step…"
                value={stepDraft}
                onChange={(e) => setStepDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleAddStep()}
              />
              <button
                type="button"
                className="btn-ghost shrink-0 px-2 py-1 text-xs"
                disabled={!stepDraft.trim() || addingStep}
                onClick={() => void handleAddStep()}
              >
                Add
              </button>
            </div>
          ) : null}
          {progress && progress.pct === 100 && status === "In Progress" ? (
            <p className="text-[11px] text-gold-bright">All steps done — ready for review.</p>
          ) : null}
        </div>
      ) : null}

      {!isDone ? (
        <div className="flex flex-wrap gap-2">
          {primary && isAllowedTaskTransition(status, primary.status) ? (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                primary.status === "Completed"
                  ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                  : "border border-gold/30 bg-gold/12 text-gold-bright hover:bg-gold/20"
              }`}
              disabled={statusMutation.isPending}
              onClick={() => requestTransition(primary.status)}
            >
              {primary.status === "Completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : null}
              {primary.label}
            </button>
          ) : null}

          {status !== "Blocked" && !["Completed", "Archived"].includes(status) ? (
            <button
              type="button"
              className="rounded-lg border border-red-500/25 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"
              disabled={statusMutation.isPending}
              onClick={() => requestTransition("Blocked")}
            >
              Mark blocked
            </button>
          ) : null}

          {currentIdx > 0 && status !== "Blocked" ? (
            <button
              type="button"
              className="rounded-lg border border-gold/15 px-3 py-1.5 text-xs text-muted hover:text-ink disabled:opacity-50"
              disabled={statusMutation.isPending}
              onClick={() => {
                const prev = TASK_WORKFLOW[currentIdx - 1];
                if (prev && isAllowedTaskTransition(status, prev)) {
                  requestTransition(prev);
                }
              }}
            >
              ← Back
            </button>
          ) : null}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Completed
        </p>
      )}

      <ConfirmationDialog
        open={forceCompleteOpen}
        title="Complete with open steps?"
        message="Some checklist steps are not done yet. Mark this task as done anyway?"
        confirmLabel="Mark as done"
        isLoading={statusMutation.isPending}
        onCancel={() => !statusMutation.isPending && setForceCompleteOpen(false)}
        onConfirm={() => {
          setForceCompleteOpen(false);
          statusMutation.mutate({ status: "Completed", force: true });
        }}
      />
    </div>
  );
}
