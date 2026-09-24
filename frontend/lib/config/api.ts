/**
 * API Configuration for NER-Connect AI Frontend
 * 
 * Directs browser requests through trusted Next.js BFF proxy routes
 * which attach authenticated user identity and handle server-to-server token auth.
 */

export const API_CONFIG = {
  /**
   * Relative BFF base URL for client-side fetches.
   * Empty string uses the same Next.js host origin.
   */
  bffBaseUrl: "",

  /**
   * Direct Go backend URL for server-side fetches.
   */
  backendUrl: process.env.BACKEND_API_URL || "http://127.0.0.1:8080",

  /**
   * Internal bearer token for server-to-server Go API calls.
   * NEVER exposed to the browser.
   */
  apiToken: process.env.API_TOKEN || "",

  /**
   * Deterministic demonstration mode toggle.
   */
  isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",

  /**
   * Canonical BFF route endpoints.
   */
  endpoints: {
    analyze: "/api/v1/routes/analyze",
    compareSupplied: "/api/v1/routes/compare",
    bookmarks: "/api/v1/bookmarks",
    bookmarkDetail: (id: string) => `/api/v1/bookmarks/${encodeURIComponent(id)}`,
    bookmarkRecalculate: (id: string) => `/api/v1/bookmarks/${encodeURIComponent(id)}/recalculate`,
    healthReady: "/health/ready",
    locations: "/api/v1/locations",
  },

  /**
   * Request timeout in milliseconds.
   */
  timeoutMs: 15000,

  /**
   * Maximum retry count for transient network failures (excludes 4xx errors).
   */
  maxRetries: 1,
} as const;
