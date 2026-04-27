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

import { unwrap, ApiError, type AnyEnvelope, type ApiEnvelope, type ApiMeta } from '@/lib/envelope'

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
 * Like apiFetch, but returns { data, meta } instead of just data.
 *
 * Use this when you need to read envelope.meta alongside the response body —
 * e.g. for paginated list endpoints where total/page/limit live in meta.
 * This is the correct alternative to bypassing apiFetch with raw fetch().
 */
export async function apiFetchWithMeta<T>(
  path: string,
  options: FetchOptions = {},
): Promise<{ data: T; meta: ApiMeta }> {
  const { json, idempotencyKey, ...rest } = options

  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : (options as RequestInit).body,
    })
  } catch (err) {
    throw new ApiError('NETWORK_ERROR', `Network request failed: ${(err as Error).message}`, 0)
  }

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

  if (envelope.error !== null) {
    throw new ApiError(
      envelope.error.code,
      envelope.error.message,
      response.status,
      envelope.meta?.request_id,
    )
  }

  if (!response.ok) {
    throw new ApiError('HTTP_ERROR', `Unexpected HTTP ${response.status}`, response.status)
  }

  return {
    data: (envelope as ApiEnvelope<T>).data,
    meta: envelope.meta,
  }
}

/**
 * Convenience method shortcuts
 */
export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  /** GET that returns { data, meta } — for paginated endpoints */
  getWithMeta: <T>(path: string, options?: FetchOptions) =>
    apiFetchWithMeta<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', json: body }),

  delete: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}
