import axios from "axios";

/** Backend mounts routes under `app.use("/api/v1", apiRouter)`. */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, "") ?? "";
  if (!trimmed) return "";
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

const envBase =
  normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000/api/v1" : "");

const baseURL = envBase;

if (!baseURL && typeof window !== "undefined") {
  console.warn(
    "[api-client] NEXT_PUBLIC_API_BASE_URL is unset — API calls may fail. Set full origin (Railway hostname is OK; `/api/v1` is appended if missing)."
  );
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true
});

