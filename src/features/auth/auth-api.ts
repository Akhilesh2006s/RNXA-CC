import { apiClient } from "@/lib/api-client";
import type { AuthUser } from "./types";

type AuthResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
  };
};

export async function signup(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const { data } = await apiClient.post<AuthResponse>("/auth/signup", payload);
  return data.data.user;
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data.data.user;
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Still clear client session if API fails (network / CORS / expired cookie)
  }
}

/** Clears React Query auth cache so UI treats user as signed out immediately. */
export function clearAuthSession(queryClient: {
  setQueryData: (key: readonly string[], data: null) => void;
  removeQueries: (opts: { queryKey: readonly string[] }) => void;
}) {
  queryClient.setQueryData(["auth", "me"], null);
  queryClient.removeQueries({ queryKey: ["auth"] });
}

export async function getMe() {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");
  return data.data.user;
}

