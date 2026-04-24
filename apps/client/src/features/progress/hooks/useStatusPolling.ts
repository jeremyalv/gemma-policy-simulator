/**
 * useStatusPolling — polls GET /simulations/:id/status every 2.5 seconds.
 *
 * Contract rules:
 *  - Poll only while status === 'running'
 *  - Stop immediately on 'completed' or 'failed'
 *  - TanStack Query handles cleanup on unmount automatically
 *  - refetchInterval: 2500ms
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSimulationStatus, type SimulationStatusData } from '@/api'

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
    // Poll every 2.5s — contract spec: 2–3s interval
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2500
    },
    // Keep showing stale data while revalidating (no flicker)
    staleTime: 0,
    // Don't refetch on window focus — we already poll aggressively
    refetchOnWindowFocus: false,
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
    refetch:    query.refetch,
  }
}
