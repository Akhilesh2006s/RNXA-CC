"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Receipt, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toastApiError } from "@/components/ui/toast-handler";
import { apiClient } from "@/lib/api-client";
import { appToast } from "@/lib/app-toast";
import { formatInr } from "@/lib/format-inr";

type CostLog = {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  linkedProject?: string;
  billable?: boolean;
  notes?: string;
};

type InvoiceRow = {
  _id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  status: string;
  items?: Array<{ description: string; quantity: number; rate: number }>;
};

type PaymentRow = {
  _id: string;
  invoiceId: string;
  invoiceNumber?: string | null;
  amount: number;
  method?: string;
  paidAt?: string;
  notes?: string;
};

type FinancePayload = {
  summary: {
    dealValue: number;
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
    totalCosts: number;
    paymentStatus: string;
  };
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  costLogs: CostLog[];
};

const COST_CATEGORIES = ["Labor", "Materials", "Software", "Hosting", "Travel", "Other"] as const;

function formatDay(iso?: string) {
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

function invoiceStatusClass(status: string) {
  if (status === "Paid") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "Overdue") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (status === "Partially Paid") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-gold/20 bg-surface-lift text-muted";
}

export function ClientFinancePanel({
  clientId,
  projectNames = []
}: {
  clientId: string;
  projectNames?: string[];
}) {
  const qc = useQueryClient();
  const financeKey = ["clients", "finance", clientId];

  const [costTitle, setCostTitle] = useState("");
  const [costCategory, setCostCategory] = useState<(typeof COST_CATEGORIES)[number]>("Other");
  const [costAmount, setCostAmount] = useState("");
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [costProject, setCostProject] = useState("");
  const [costNotes, setCostNotes] = useState("");

  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [lineDesc, setLineDesc] = useState("Professional services");
  const [qty, setQty] = useState("1");
  const [rate, setRate] = useState("");
  const [gstPercent, setGstPercent] = useState("18");

  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank transfer");
  const [payNotes, setPayNotes] = useState("");

  const financeQuery = useQuery({
    queryKey: financeKey,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: FinancePayload }>(
        `/sales/clients/${clientId}/finance`
      );
      return data.data;
    }
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: financeKey });

  const addCostMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/sales/clients/${clientId}/costs`, {
        title: costTitle.trim(),
        category: costCategory,
        amount: Number(costAmount),
        date: new Date(costDate).toISOString(),
        linkedProject: costProject,
        notes: costNotes.trim(),
        visibleToClient: true
      });
    },
    onSuccess: () => {
      setCostTitle("");
      setCostAmount("");
      setCostNotes("");
      invalidate();
      appToast.success("Cost logged for client");
    },
    onError: (err) => toastApiError(err, "Could not log cost")
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      await apiClient.delete(`/sales/clients/${clientId}/costs/${costId}`);
    },
    onSuccess: () => {
      invalidate();
      appToast.success("Cost removed");
    },
    onError: (err) => toastApiError(err, "Could not remove cost")
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/finance/invoices", {
        clientId,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        gstPercent: Number(gstPercent),
        items: [{ description: lineDesc.trim(), quantity: Number(qty), rate: Number(rate) }]
      });
    },
    onSuccess: () => {
      setRate("");
      invalidate();
      appToast.success("Invoice created for client");
    },
    onError: (err) => toastApiError(err, "Could not create invoice")
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/finance/invoices/${payInvoiceId}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
        notes: payNotes.trim()
      });
    },
    onSuccess: () => {
      setPayInvoiceId("");
      setPayAmount("");
      setPayNotes("");
      invalidate();
      appToast.success("Payment recorded");
    },
    onError: (err) => toastApiError(err, "Could not record payment")
  });

  const data = financeQuery.data;
  const unpaidInvoices =
    data?.invoices.filter((inv) => inv.status !== "Paid" && inv.total > inv.paidAmount) ?? [];

  function onSelectInvoiceForPayment(invoiceId: string) {
    setPayInvoiceId(invoiceId);
    const inv = data?.invoices.find((i) => i._id === invoiceId);
    if (inv) {
      const remaining = Math.max(inv.total - inv.paidAmount, 0);
      setPayAmount(String(remaining || ""));
    }
  }

  return (
    <section className="chart-card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <IndianRupee className="h-5 w-5 text-gold" aria-hidden />
            Client finance
          </h2>
          <p className="mt-1 text-sm text-muted">
            Log costs, raise invoices, and record payments — all tied to this client so they stay
            informed.
          </p>
        </div>
        {data && (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              data.summary.paymentStatus === "Paid"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            {data.summary.paymentStatus === "Paid" ? "Fully paid" : "Payment pending"}
          </span>
        )}
      </div>

      {financeQuery.isLoading && <p className="text-sm text-muted">Loading finance…</p>}
      {financeQuery.isError && (
        <p className="text-sm text-red-400">Could not load finance for this client.</p>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Deal value", value: formatInr(data.summary.dealValue) },
              { label: "Total invoiced", value: formatInr(data.summary.totalInvoiced) },
              { label: "Collected", value: formatInr(data.summary.totalPaid) },
              { label: "Outstanding", value: formatInr(data.summary.outstanding) },
              { label: "Costs logged", value: formatInr(data.summary.totalCosts) }
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-gold/15 bg-surface/60 p-3 space-y-1"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted">{c.label}</p>
                <p className="text-lg font-semibold text-ink">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <form
              className="rounded-xl border border-gold/15 bg-surface/40 p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!costTitle.trim() || !costAmount) return;
                addCostMutation.mutate();
              }}
            >
              <p className="text-sm font-medium text-ink-secondary">Log cost</p>
              <input
                className="input-field w-full"
                placeholder="Title (e.g. Hosting — March)"
                value={costTitle}
                onChange={(e) => setCostTitle(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input-field"
                  value={costCategory}
                  onChange={(e) =>
                    setCostCategory(e.target.value as (typeof COST_CATEGORIES)[number])
                  }
                >
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  placeholder="Amount (₹)"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="input-field"
                  value={costDate}
                  onChange={(e) => setCostDate(e.target.value)}
                />
                <select
                  className="input-field"
                  value={costProject}
                  onChange={(e) => setCostProject(e.target.value)}
                >
                  <option value="">No project</option>
                  {projectNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="input-field min-h-[60px] w-full resize-y"
                placeholder="Notes for the client (optional)"
                value={costNotes}
                onChange={(e) => setCostNotes(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={addCostMutation.isPending}
              >
                {addCostMutation.isPending ? "Saving…" : "Log cost"}
              </button>
            </form>

            <form
              className="rounded-xl border border-gold/15 bg-surface/40 p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!rate) return;
                createInvoiceMutation.mutate();
              }}
            >
              <p className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
                <Receipt className="h-4 w-4" aria-hidden />
                Create invoice
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted grid gap-1">
                  Issue date
                  <input
                    type="date"
                    className="input-field"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </label>
                <label className="text-xs text-muted grid gap-1">
                  Due date
                  <input
                    type="date"
                    className="input-field"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              </div>
              <input
                className="input-field w-full"
                placeholder="Line description"
                value={lineDesc}
                onChange={(e) => setLineDesc(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  placeholder="Qty"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="Rate (₹)"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-field"
                  placeholder="GST %"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? "Creating…" : "Create invoice"}
              </button>
            </form>

            <form
              className="rounded-xl border border-gold/15 bg-surface/40 p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!payInvoiceId || !payAmount) return;
                payMutation.mutate();
              }}
            >
              <p className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
                <Wallet className="h-4 w-4" aria-hidden />
                Record payment
              </p>
              <select
                className="input-field w-full"
                value={payInvoiceId}
                onChange={(e) => onSelectInvoiceForPayment(e.target.value)}
                required
              >
                <option value="">Select invoice…</option>
                {unpaidInvoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} — {formatInr(inv.total - inv.paidAmount)} due
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input-field w-full"
                placeholder="Amount (₹)"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
              <input
                className="input-field w-full"
                placeholder="Method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              />
              <textarea
                className="input-field min-h-[60px] w-full resize-y"
                placeholder="Payment notes (optional)"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={payMutation.isPending || !unpaidInvoices.length}
              >
                {payMutation.isPending ? "Recording…" : "Record payment"}
              </button>
              {!unpaidInvoices.length && (
                <p className="text-xs text-muted">No open invoices — create one first.</p>
              )}
            </form>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink-secondary">Cost log</h3>
              {!data.costLogs.length ? (
                <p className="text-xs text-muted">No costs logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.costLogs.map((row) => (
                    <li
                      key={row._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/10 bg-surface/50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{row.title}</p>
                        <p className="text-xs text-muted">
                          {row.category}
                          {row.linkedProject ? ` · ${row.linkedProject}` : ""} · {formatDay(row.date)}
                          {row.notes ? ` — ${row.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gold-bright">{formatInr(row.amount)}</span>
                        <button
                          type="button"
                          className="rounded p-1 text-muted hover:text-red-400"
                          aria-label="Remove cost"
                          onClick={() => deleteCostMutation.mutate(row._id)}
                          disabled={deleteCostMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-ink-secondary">Invoices</h3>
              {!data.invoices.length ? (
                <p className="text-xs text-muted">No invoices yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gold/10">
                  <table className="data-table w-full text-sm">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Issued</th>
                        <th>Due</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((inv) => (
                        <tr key={inv._id}>
                          <td className="font-medium">{inv.invoiceNumber}</td>
                          <td>{formatDay(inv.issueDate)}</td>
                          <td>{formatDay(inv.dueDate)}</td>
                          <td>{formatInr(inv.total)}</td>
                          <td>{formatInr(inv.paidAmount)}</td>
                          <td>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] ${invoiceStatusClass(inv.status)}`}
                            >
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-ink-secondary">Payments</h3>
              {!data.payments.length ? (
                <p className="text-xs text-muted">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.payments.map((p) => (
                    <li
                      key={p._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/10 bg-surface/50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-ink">
                          {formatInr(p.amount)}
                          {p.invoiceNumber ? ` · ${p.invoiceNumber}` : ""}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDay(p.paidAt)}
                          {p.method ? ` · ${p.method}` : ""}
                          {p.notes ? ` — ${p.notes}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
