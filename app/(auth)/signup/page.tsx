"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/ui/auth-shell";
import { useAuth } from "@/features/auth/AuthProvider";
import { signup } from "@/features/auth/auth-api";

export default function SignupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Founder");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: async () => {
      setErrorMsg("");
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/dashboard");
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message ||
          err.response?.statusText ||
          err.message
        : err instanceof Error
          ? err.message
          : "Sign up failed";
      setErrorMsg(typeof msg === "string" ? msg : "Sign up failed");
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your RNXA workspace"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gold-bright hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg("");
          signupMutation.mutate({ name, email, password, role });
        }}
      >
        {errorMsg ? (
          <p
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            role="alert"
          >
            {errorMsg}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-medium uppercase tracking-wide text-muted">
            Full name
          </label>
          <input
            id="name"
            className="input-field"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            id="email"
            className="input-field"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted">
            Password
          </label>
          <input
            id="password"
            className="input-field"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="role" className="text-xs font-medium uppercase tracking-wide text-muted">
            Role
          </label>
          <select
            id="role"
            className="input-field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {["Founder", "CEO", "HR", "Finance", "Sales", "Operations", "Employee"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
