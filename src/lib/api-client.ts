import axios from "axios";

/** Production Railway API host (browser uses this when NEXT_PUBLIC_* is unset at build time). */
const DEFAULT_PRODUCTION_ORIGIN =
  "https://founder-os-backend-production-48a7.up.railway.app";

/** Backend mounts routes under `app.use("/api/v1", apiRouter)`. */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, "") ?? "";
  if (!trimmed) return "";
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

const envBase =
  normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api/v1"
    : normalizeApiBaseUrl(DEFAULT_PRODUCTION_ORIGIN));

const baseURL = envBase;

if (!baseURL && typeof window !== "undefined") {
  console.warn(
    "[api-client] API base URL is empty — set NEXT_PUBLIC_API_BASE_URL at build time, or rely on defaults."
  );
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true
});

