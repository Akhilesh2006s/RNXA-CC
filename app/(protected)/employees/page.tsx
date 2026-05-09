"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageShell } from "@/components/page-shell";
import { apiClient } from "@/lib/api-client";
import { toastApiError } from "@/components/ui/toast-handler";
import { appToast } from "@/lib/app-toast";

type Employee = {
  _id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  joiningDate: string;
  payrollStatus?: string;
  attendanceRate?: number;
  emergencyContact?: { name: string; phone: string; relation: string };
};

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    role: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    ecName: "",
    ecPhone: "",
    ecRelation: "Spouse"
  });

  const listQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { items: Employee[] } }>("/employees?limit=100");
      return data.data.items;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/employees", {
        name: form.name,
        email: form.email,
        department: form.department,
        role: form.role,
        joiningDate: form.joiningDate,
        emergencyContact: {
          name: form.ecName,
          phone: form.ecPhone,
          relation: form.ecRelation
        }
      });
    },
    onSuccess: () => {
      setForm((f) => ({ ...f, name: "", email: "", department: "", role: "" }));
      void qc.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      setRemoveId(null);
      void qc.invalidateQueries({ queryKey: ["employees"] });
      appToast.success("Employee removed");
    },
    onError: (err) => toastApiError(err, "Could not remove employee")
  });

  return (
    <PageShell
      title="Employee management"
      description="Directory backed by /employees. Create requires HR/CEO/Founder/Operations."
    >
      <div className="rounded-xl border border-gold/20 bg-surface-card p-4 space-y-2">
        <p className="text-sm text-ink-secondary">Add employee</p>
        <div className="grid md:grid-cols-3 gap-2">
          <input
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          />
          <input
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            placeholder="Role / title"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            value={form.joiningDate}
            onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-2 pt-2 border-t border-gold/20">
          <input
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            placeholder="Emergency contact name"
            value={form.ecName}
            onChange={(e) => setForm((f) => ({ ...f, ecName: e.target.value }))}
          />
          <input
            className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
            placeholder="Emergency phone"
            value={form.ecPhone}
            onChange={(e) => setForm((f) => ({ ...f, ecPhone: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">Relation</span>
            <input
              className="rounded-lg bg-surface-lift px-3 py-2 text-sm"
              placeholder="e.g. Spouse"
              value={form.ecRelation}
              onChange={(e) => setForm((f) => ({ ...f, ecRelation: e.target.value }))}
            />
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg bg-gold-cta font-semibold shadow-gold hover:brightness-110 px-4 py-2 text-sm disabled:opacity-50"
          disabled={
            !form.name ||
            !form.email ||
            !form.department ||
            !form.role ||
            !form.ecName ||
            !form.ecPhone ||
            createMutation.isPending
          }
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Saving…" : "Create employee"}
        </button>
        {createMutation.isError && (
          <p className="text-xs text-amber-500">Create failed — check your role or validation errors in the network tab.</p>
        )}
      </div>

      <div className="rounded-xl border border-gold/20 bg-surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-gold/20">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Dept</th>
              <th className="p-3">Role</th>
              <th className="p-3 min-w-[140px]">Emergency</th>
              <th className="p-3">Joined</th>
              <th className="p-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {listQuery.data?.map((e) => (
              <tr key={e._id} className="border-b border-gold/15">
                <td className="p-3">{e.name}</td>
                <td className="p-3 text-muted">{e.email}</td>
                <td className="p-3">{e.department}</td>
                <td className="p-3">{e.role}</td>
                <td className="p-3 text-xs align-top">
                  {e.emergencyContact ? (
                    <div className="space-y-1">
                      <p className="text-ink-secondary">{e.emergencyContact.name}</p>
                      <p className="text-muted">{e.emergencyContact.phone}</p>
                      <p className="text-ink-secondary">
                        <span className="font-medium text-muted">Relation:</span>{" "}
                        {e.emergencyContact.relation}
                      </p>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-muted">
                  {e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : "—"}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    onClick={() => setRemoveId(e._id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!listQuery.data?.length && !listQuery.isLoading && (
          <p className="text-sm text-muted p-6 text-center">No employees loaded.</p>
        )}
      </div>

      <ConfirmationDialog
        open={Boolean(removeId)}
        title="Remove employee?"
        message="This action cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Remove"
        destructive
        isLoading={deleteMutation.isPending}
        onCancel={() => !deleteMutation.isPending && setRemoveId(null)}
        onConfirm={() => removeId && deleteMutation.mutate(removeId)}
      />
    </PageShell>
  );
}
