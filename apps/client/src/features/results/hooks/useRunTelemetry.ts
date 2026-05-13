/**
 * useRunTelemetry -- fetches run_telemetry from the status endpoint for a
 * completed simulation.
 *
 * Used by ResultsPage to show the RunQualityBanner when is_partial === true.
 *
 * Design notes:
 *  - Uses the same query key as useStatusPolling, so if the user arrived via
 *    ProgressPage auto-redirect the data is already in the TanStack cache (free).
 *  - staleTime: Infinity because a completed simulation's telemetry is immutable.
 *  - Fails silently — banner is just hidden, not a hard blocker.
 */

import { useQuery } from '@tanstack/react-query'
import { getSimulationStatus, type SimulationStatusData } from '@/api'
import type { components } from '@/api/types.gen'

export type RunTelemetry = components['schemas']['RunTelemetry']

export function useRunTelemetry(simulationId: string) {
  const query = useQuery<SimulationStatusData>({
    queryKey:           ['simulation-status', simulationId],
    queryFn:            () => getSimulationStatus(simulationId),
    staleTime:          Infinity, // completed status is immutable
    refetchOnWindowFocus: false,
    refetchInterval:    false,    // no polling — we just need a snapshot
    retry:              1,
  })

  const telemetry = query.data?.run_telemetry ?? null
  return { runTelemetry: telemetry }
}
