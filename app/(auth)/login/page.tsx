"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/ui/auth-shell";
import { useAuth } from "@/features/auth/AuthProvider";
import { login } from "@/features/auth/auth-api";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("Rnxadigital@gmail.com");
  const [password, setPassword] = useState("Rnxastone");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const loginMutation = useMutation({
    mutationFn: login,
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
          : "Login failed";
      setErrorMsg(typeof msg === "string" ? msg : "Login failed");
    }
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace"
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="font-medium text-gold-bright hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg("");
          loginMutation.mutate({ email, password });
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
            autoComplete="current-password"
          />
        </div>
        <button className="btn-primary" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
