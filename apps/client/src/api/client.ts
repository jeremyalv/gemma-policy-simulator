/**
 * SIMS API Base Client
 *
 * Thin fetch wrapper that:
 * 1. Prepends the API base URL
 * 2. Injects default headers (Content-Type, Idempotency-Key)
 * 3. Parses the response envelope
 * 4. Throws ApiError on error envelopes or non-OK HTTP status
 *
 * All endpoint modules import `apiFetch` from here — never use fetch() directly.
 */

import { unwrap, ApiError, type AnyEnvelope } from '@/lib/envelope'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/v1'

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  // Typed JSON body — will be serialized automatically
  json?: unknown
  // If provided, sent as Idempotency-Key header
  idempotencyKey?: string
}

/**
 * Core fetch function — always returns unwrapped data T.
 * Throws ApiError on any failure.
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { json, idempotencyKey, ...rest } = options
  const rawBody = (options as RequestInit).body

  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rawBody,
  })

  // CSV export endpoint returns raw text — handle separately
  if (response.headers.get('Content-Type')?.includes('text/csv')) {
    if (!response.ok) {
      throw new ApiError('EXPORT_ERROR', 'Export failed', response.status)
    }
    return response as unknown as T
  }

  // All other responses are JSON envelope
  let envelope: AnyEnvelope<T>
  try {
    envelope = await response.json() as AnyEnvelope<T>
  } catch {
    throw new ApiError(
      'PARSE_ERROR',
      `Unexpected non-JSON response from ${path}`,
      response.status,
    )
  }

  return unwrap(envelope, response.status)
}

/**
 * Convenience method shortcuts
 */
export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', json: body }),

  delete: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}
