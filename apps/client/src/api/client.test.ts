/**
 * Tests for the apiFetch / apiFetchWithMeta wrappers.
 *
 * R2-B audit flagged client.ts as entirely untested. These tests pin the
 * envelope-unwrapping behaviour and the three error branches:
 *   - NETWORK_ERROR (transport failure)
 *   - PARSE_ERROR (non-JSON body)
 *   - ApiError from a well-formed error envelope
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, apiFetchWithMeta } from './client'
import { ApiError } from '@/lib/envelope'

// Mock global fetch — every test sets it up explicitly.
const originalFetch = globalThis.fetch

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as typeof fetch
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

// ── apiFetch — happy + error branches ───────────────────────────────────────

describe('apiFetch', () => {
  it('unwraps envelope.data on success', async () => {
    mockFetch(async () =>
      jsonResponse({ data: { id: 'sim_1', title: 'P' }, error: null, meta: { request_id: 'req_x' } }),
    )

    const result = await apiFetch<{ id: string; title: string }>('/simulations/sim_1')
    expect(result).toEqual({ id: 'sim_1', title: 'P' })
  })

  it('throws ApiError when envelope.error is present', async () => {
    mockFetch(async () =>
      jsonResponse(
        { data: null, error: { code: 'NOT_FOUND', message: 'gone' }, meta: { request_id: 'req_y' } },
        404,
      ),
    )

    await expect(apiFetch('/simulations/missing')).rejects.toThrow(ApiError)
    try {
      await apiFetch('/simulations/missing')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).code).toBe('NOT_FOUND')
      expect((err as ApiError).httpStatus).toBe(404)
      expect((err as ApiError).requestId).toBe('req_y')
    }
  })

  it('throws PARSE_ERROR when body is not JSON', async () => {
    mockFetch(async () => new Response('<html>500</html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    }))

    try {
      await apiFetch('/simulations')
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).code).toBe('PARSE_ERROR')
      expect((err as ApiError).message).toContain('/simulations')
      expect((err as ApiError).httpStatus).toBe(500)
    }
  })

  it('throws NETWORK_ERROR when fetch itself rejects', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch') })

    try {
      await apiFetch('/simulations')
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).code).toBe('NETWORK_ERROR')
      expect((err as ApiError).message).toContain('Failed to fetch')
      expect((err as ApiError).httpStatus).toBe(0)
    }
  })

  it('sets Idempotency-Key header when provided', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ data: { id: 'x' }, error: null, meta: { request_id: 'r' } }),
    )
    globalThis.fetch = fetchSpy as typeof fetch

    await apiFetch('/simulations', { method: 'POST', json: { x: 1 }, idempotencyKey: 'idem-1' })

    const call = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    const init = call[1]
    const headers = init.headers as Headers
    expect(headers.get('Idempotency-Key')).toBe('idem-1')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ x: 1 }))
  })

})

// ── apiFetchWithMeta — meta exposure ────────────────────────────────────────

describe('apiFetchWithMeta', () => {
  it('returns data + meta on success', async () => {
    mockFetch(async () =>
      jsonResponse({
        data: [{ id: 'sim_1' }],
        error: null,
        meta: { request_id: 'r', total: 42, page: 1, limit: 50 },
      }),
    )

    const { data, meta } = await apiFetchWithMeta<{ id: string }[]>('/simulations')
    expect(data).toEqual([{ id: 'sim_1' }])
    expect(meta.total).toBe(42)
    expect(meta.page).toBe(1)
  })

  it('throws ApiError on envelope error', async () => {
    mockFetch(async () =>
      jsonResponse(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'bad' }, meta: { request_id: 'r' } },
        400,
      ),
    )

    await expect(apiFetchWithMeta('/simulations')).rejects.toThrow(ApiError)
  })
})
