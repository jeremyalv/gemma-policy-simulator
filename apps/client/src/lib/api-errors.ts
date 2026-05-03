/**
 * API error helpers — classify errors thrown by `apiFetch` / `apiFetchWithMeta`.
 *
 * The frontend talks to the backend through one client (`api/client.ts`) which
 * throws `ApiError` instances with a structured `code` and `httpStatus`. UI
 * components frequently need to answer one specific question: "is this a
 * backend connectivity problem (so I should show 'API not responding')?" or
 * "is this a normal application error (validation, not found, etc.)?"
 *
 * This module centralizes that classification so it does not get re-invented
 * (and string-matched) across every catch block in the app.
 */

import { ApiError } from './envelope'

/**
 * Error codes that indicate the backend cannot be reached or returned an
 * unparseable response (typically: network failure, HTML error page from a
 * proxy, or service-worker not registered).
 */
export const BACKEND_DOWN_CODES = ['PARSE_ERROR', 'NETWORK_ERROR'] as const

/**
 * HTTP statuses that indicate the backend is up but the endpoint is not
 * functioning — treated as "backend down" from the user's perspective.
 */
export const BACKEND_DOWN_HTTP_STATUSES = [500, 501, 502, 503, 504] as const

/**
 * Standard user-facing message for backend-down errors. Keep one canonical
 * string so the wording stays consistent across the app.
 */
export const BACKEND_DOWN_MESSAGE =
  'The API server is not responding. Make sure the backend is running, then try again.'

/**
 * Returns true if the error indicates a backend connectivity problem,
 * as opposed to a normal application error (validation, not found, etc.).
 *
 * Prefers structured checks on `ApiError` (code + httpStatus). Falls back
 * to a string match only when given a plain Error (e.g. thrown manually).
 */
export function isBackendDownError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      (BACKEND_DOWN_CODES as readonly string[]).includes(err.code) ||
      (BACKEND_DOWN_HTTP_STATUSES as readonly number[]).includes(err.httpStatus)
    )
  }
  if (err instanceof Error) {
    return /non-JSON|PARSE_ERROR|NETWORK_ERROR|backend/i.test(err.message)
  }
  return false
}

/**
 * Returns a user-facing message string. Prefers BACKEND_DOWN_MESSAGE for
 * connectivity problems, otherwise the error's own message, with a fallback.
 */
export function userMessageFor(err: unknown, fallback: string): string {
  if (isBackendDownError(err)) return BACKEND_DOWN_MESSAGE
  if (err instanceof Error && err.message) return err.message
  return fallback
}
