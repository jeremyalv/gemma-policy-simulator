/**
 * useStatusPolling -- polls GET /simulations/:id/status every 2.5 seconds.
 *
 * Contract rules:
 *  - Poll only while status === 'running'
 *  - Stop immediately on 'completed' or 'failed'
 *  - Stop on any fetch error (no point retrying a not-found)
 *  - TanStack Query handles cleanup on unmount automatically
 *  - refetchInterval: 2500ms
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSimulationStatus, type SimulationStatusData } from '@/api'
import { ApiError } from '@/lib/envelope'

export type StatusErrorKind = 'not_found' | 'other'

function classifyStatusError(error: unknown): StatusErrorKind {
  if (error instanceof ApiError && error.httpStatus === 404) return 'not_found'
  return 'other'
}

interface UseStatusPollingOptions {
  simulationId: string
  /** Auto-redirect to results on completion. Default: true. */
  autoRedirect?: boolean
}

export function useStatusPolling({
  simulationId,
  autoRedirect = true,
}: UseStatusPollingOptions) {
  const navigate = useNavigate()

  const query = useQuery<SimulationStatusData>({
    queryKey: ['simulation-status', simulationId],
    queryFn:  () => getSimulationStatus(simulationId),
    // Poll every 2.5s -- contract spec: 2-3s interval
    refetchInterval: (q) => {
      const status = q.state.data?.status
      // Stop on terminal state
      if (status === 'completed' || status === 'failed') return false
      // Stop on error (avoid hammering a 404)
      if (q.state.error) return false
      return 2500
    },
    // Keep showing stale data while revalidating (no flicker)
    staleTime: 0,
    // Don't refetch on window focus -- we already poll aggressively
    refetchOnWindowFocus: false,
    // Don't retry not-found -- it needs user action
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.httpStatus === 404) return false
      return failureCount < 2
    },
  })

  const status = query.data?.status

  // Auto-redirect to results when completed
  useEffect(() => {
    if (autoRedirect && status === 'completed') {
      navigate(`/simulations/${simulationId}/results`, { replace: true })
    }
  }, [status, autoRedirect, simulationId, navigate])

  return {
    statusData: query.data ?? null,
    isLoading:  query.isLoading,
    isError:    query.isError,
    error:      query.error,
    errorKind:  query.isError ? classifyStatusError(query.error) : null,
    refetch:    query.refetch,
  }
}
