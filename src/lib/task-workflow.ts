export const TASK_WORKFLOW = ["Pending", "In Progress", "In Review", "Completed"] as const;

export type TaskWorkflowStatus = (typeof TASK_WORKFLOW)[number];

export const WORKFLOW_LABELS: Record<TaskWorkflowStatus, string> = {
  Pending: "To Do",
  "In Progress": "In Progress",
  "In Review": "In Review",
  Completed: "Done"
};

export type SubtaskRow = { _id: string; title: string; done: boolean };

export function workflowIndex(status: string) {
  return TASK_WORKFLOW.indexOf(status as TaskWorkflowStatus);
}

export function isAllowedTaskTransition(from: string, to: string) {
  if (from === to) return true;
  if (to === "Archived") return from === "Completed";
  if (to === "Overdue") return !["Completed", "Archived"].includes(from);
  if (to === "Blocked") return ["Pending", "In Progress", "In Review", "Overdue"].includes(from);
  if (from === "Blocked") return to === "In Progress" || to === "Pending";
  if (from === "Overdue") return to === "In Progress" || to === "Pending";
  if (from === "Completed" || from === "Archived") return false;

  const fromIdx = workflowIndex(from);
  const toIdx = workflowIndex(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return Math.abs(toIdx - fromIdx) === 1;
}

export function getNextWorkflowStatus(current: string): TaskWorkflowStatus | null {
  const idx = workflowIndex(current);
  if (idx === -1 || idx >= TASK_WORKFLOW.length - 1) return null;
  return TASK_WORKFLOW[idx + 1];
}

export function getPrimaryAction(current: string): { label: string; status: string } | null {
  if (current === "Blocked") return { label: "Resume work", status: "In Progress" };
  if (current === "Overdue") return { label: "Resume work", status: "In Progress" };
  if (current === "Completed" || current === "Archived") return null;

  const next = getNextWorkflowStatus(current);
  if (!next) return null;

  const labels: Record<string, string> = {
    "In Progress": "Start work",
    "In Review": "Send to review",
    Completed: "Mark as done"
  };
  return { label: labels[next] ?? `Move to ${WORKFLOW_LABELS[next as TaskWorkflowStatus]}`, status: next };
}

export function allSubtasksDone(subtasks?: SubtaskRow[]) {
  const list = subtasks ?? [];
  return list.length === 0 || list.every((s) => s.done);
}

export function subtaskProgress(subtasks?: SubtaskRow[]) {
  const list = subtasks ?? [];
  if (!list.length) return null;
  const done = list.filter((s) => s.done).length;
  return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
}
