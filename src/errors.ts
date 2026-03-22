/**
 * @wordorb/sdk — Error classes
 */

import type { ApiErrorBody } from "./types.js";

/**
 * Base error for all Word Orb API failures.
 */
export class WordOrbError extends Error {
  /** HTTP status code */
  public readonly status: number;
  /** Machine-readable error code from the API */
  public readonly code: string;
  /** Server-assigned trace ID for support requests */
  public readonly traceId?: string;
  /** Whether the request can be retried */
  public readonly retryable: boolean;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error || `Word Orb API error (${status})`);
    this.name = "WordOrbError";
    this.status = status;
    this.code = body.code || "unknown";
    this.traceId = body.trace_id;
    this.retryable = body.retryable ?? false;
  }
}

/**
 * Thrown when the daily rate limit is exceeded (HTTP 429).
 */
export class RateLimitError extends WordOrbError {
  /** Seconds until the rate limit resets */
  public readonly retryAfter: number;

  constructor(status: number, body: ApiErrorBody, retryAfter: number) {
    super(status, { ...body, retryable: true });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when authentication fails (HTTP 401 / 403).
 */
export class AuthError extends WordOrbError {
  constructor(status: number, body: ApiErrorBody) {
    super(status, { ...body, retryable: false });
    this.name = "AuthError";
  }
}
