import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ensure the browser bundle always knows the Railway API host, even when Vercel
 * "Environment Variables" does not define `NEXT_PUBLIC_API_BASE_URL` (avoids `/auth/*` → same-origin 404).
 * Dashboard env still overrides this at build time when set.
 */
const DEFAULT_PUBLIC_API_ORIGIN = "https://rnxa-cc-backend-production.up.railway.app";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prevent Next from using repo root (parent package-lock) as Turbopack root.
  turbopack: {
    root: webRoot
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: (
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:5000/api/v1"
        : DEFAULT_PUBLIC_API_ORIGIN)
    ).replace(/\/+$/, "")
  }
};

export default nextConfig;
