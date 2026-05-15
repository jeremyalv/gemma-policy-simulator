/**
 * useStatusPolling -- polls GET /simulations/:id/status every 2.5 seconds.
 *
 * Contract rules:
 *  - Poll every 2.5s while status is not a terminal state
 *  - Stop on 'completed' or 'failed' (in data)
 *  - Stop on 404 (simulation does not exist)
 *  - Keep polling on transient errors so the page auto-recovers
 *    (e.g. Service Worker activating after the first request fires)
 *  - Retry up to 4 times per attempt before entering error state
 *  - TanStack Query handles cleanup on unmount automatically
 */

import { useEffect, useState } from 'react'
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

  // Pause polling while the tab is hidden — saves bandwidth, server load,
  // and battery. The first focus event after returning will trigger a
  // refetch via TanStack Query's normal state evaluation.
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  )
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = () => setIsTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const query = useQuery<SimulationStatusData>({
    queryKey: ['simulation-status', simulationId],
    queryFn:  () => getSimulationStatus(simulationId),
    // Poll every 2.5s -- contract spec: 2-3s interval.
    // We deliberately keep polling even in error state so the page
    // auto-recovers from transient failures (e.g. Service Worker
    // activating slightly after the first fetch fires). Only hard
    // terminal states and genuine not-found errors stop polling.
    refetchInterval: (q) => {
      const status = q.state.data?.status
      // Stop on terminal state
      if (status === 'completed' || status === 'failed') return false
      // Pause polling while the tab is hidden
      if (!isTabVisible) return false
      // Stop only for genuine not-found — everything else auto-recovers
      const err = q.state.error
      if (err instanceof ApiError && err.httpStatus === 404) return false
      return 2500
    },
    // Keep showing stale data while revalidating (no flicker)
    staleTime: 0,
    // Don't refetch on window focus -- we already poll aggressively
    refetchOnWindowFocus: false,
    // Retry up to 4 times so transient SW-timing misses self-heal
    // before the error UI is ever shown.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.httpStatus === 404) return false
      return failureCount < 4
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
