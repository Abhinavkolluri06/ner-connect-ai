/**
 * Authoritative Typed API Client for NER-Connect AI
 *
 * All network calls funnel through this client, guaranteeing request ID propagation,
 * error normalization, and response contract validation.
 */

import { API_CONFIG } from "../config/api.ts";
import type {
  ApiErrorResponse,
  BackendAnalyzeResponse,
  Bookmark,
  BookmarkListResponse,
  RecalculateBookmarkResponse,
  RouteRequest,
  RouteResponse,
  SaveBookmarkRequest,
  VehicleDimensions,
} from "../types.ts";
import { normalizeRequest, transformToRouteResponse } from "./validators.ts";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function requestJson<T>(
  url: string,
  init: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? API_CONFIG.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Link caller-supplied signal if provided
  if (options?.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errPayload = data as ApiErrorResponse | null;
      const code = errPayload?.error?.code || `HTTP_${response.status}`;
      const message = errPayload?.error?.message || `Request failed with status ${response.status}`;
      const requestId = errPayload?.error?.request_id || response.headers.get("X-Request-ID") || undefined;

      throw new ApiError(code, message, response.status, requestId, data);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timer);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("TIMEOUT", `Request exceeded timeout of ${timeoutMs}ms`, 504);
    }

    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError("NETWORK_ERROR", message, 503);
  }
}

// ============================================================================
// Public API Methods
// ============================================================================

/**
 * Executes authoritative route planning and risk analysis.
 */
export async function analyzeRoutes(
  request: RouteRequest,
  dimensions?: VehicleDimensions,
  options?: RequestOptions,
): Promise<RouteResponse> {
  const payload = normalizeRequest(request, dimensions);
  const raw = await requestJson<BackendAnalyzeResponse>(
    API_CONFIG.endpoints.analyze,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );

  return transformToRouteResponse(raw, request);
}

/**
 * Saves a route assessment bookmark.
 */
export async function saveBookmark(
  request: SaveBookmarkRequest,
  options?: RequestOptions,
): Promise<Bookmark> {
  return requestJson<Bookmark>(
    API_CONFIG.endpoints.bookmarks,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    options,
  );
}

/**
 * Lists bookmarks belonging to the authenticated user.
 */
export async function listBookmarks(
  params?: { limit?: number; offset?: number },
  options?: RequestOptions,
): Promise<BookmarkListResponse> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));

  const url = `${API_CONFIG.endpoints.bookmarks}${query.toString() ? `?${query.toString()}` : ""}`;
  return requestJson<BookmarkListResponse>(
    url,
    { method: "GET" },
    options,
  );
}

/**
 * Retrieves a single bookmark and its saved assessment snapshot.
 */
export async function getBookmark(
  bookmarkId: string,
  options?: RequestOptions,
): Promise<Bookmark> {
  return requestJson<Bookmark>(
    API_CONFIG.endpoints.bookmarkDetail(bookmarkId),
    { method: "GET" },
    options,
  );
}

/**
 * Deletes a bookmark belonging to the authenticated user.
 */
export async function deleteBookmark(
  bookmarkId: string,
  options?: RequestOptions,
): Promise<{ status: string; bookmark_id: string }> {
  return requestJson<{ status: string; bookmark_id: string }>(
    API_CONFIG.endpoints.bookmarkDetail(bookmarkId),
    { method: "DELETE" },
    options,
  );
}

/**
 * Renames an existing bookmark.
 */
export async function renameBookmark(
  bookmarkId: string,
  name: string,
  options?: RequestOptions,
): Promise<Bookmark> {
  return requestJson<Bookmark>(
    API_CONFIG.endpoints.bookmarkDetail(bookmarkId),
    {
      method: "PATCH",
      body: JSON.stringify({ name }),
    },
    options,
  );
}

/**
 * Recalculates a saved bookmark with current live weather and hazard conditions.
 */
export async function recalculateBookmark(
  bookmarkId: string,
  options?: RequestOptions,
): Promise<RecalculateBookmarkResponse> {
  return requestJson<RecalculateBookmarkResponse>(
    API_CONFIG.endpoints.bookmarkRecalculate(bookmarkId),
    { method: "POST" },
    options,
  );
}

/**
 * Checks system readiness and dependency health statuses.
 */
export async function checkServiceHealth(
  options?: RequestOptions,
): Promise<{ status: string; dependencies?: Record<string, unknown> }> {
  return requestJson<{ status: string; dependencies?: Record<string, unknown> }>(
    API_CONFIG.endpoints.healthReady,
    { method: "GET" },
    options,
  );
}
