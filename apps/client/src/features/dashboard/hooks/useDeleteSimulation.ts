/**
 * useDeleteSimulation — mutation for DELETE /simulations/:id
 *
 * Performs optimistic removal from the list cache so the UI
 * updates instantly, then rolls back on error.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSimulation, type SimulationListItem } from '@/api'
import { notifications } from '@mantine/notifications'
import { SIMULATIONS_QUERY_KEY } from './useSimulations'

interface CachedList {
  items: SimulationListItem[]
  total: number
}

export function useDeleteSimulation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSimulation(id),

    // ── Optimistic update ────────────────────────────────────────────────────
    onMutate: async (id: string) => {
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: SIMULATIONS_QUERY_KEY })

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<CachedList>(SIMULATIONS_QUERY_KEY)

      // Optimistically remove from cache
      queryClient.setQueryData<CachedList>(SIMULATIONS_QUERY_KEY, (old) => {
        if (!old) return old
        return {
          items: old.items.filter((s) => s.id !== id),
          total: Math.max(0, old.total - 1),
        }
      })

      return { previous }
    },

    // ── Rollback on error ────────────────────────────────────────────────────
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SIMULATIONS_QUERY_KEY, context.previous)
      }
      notifications.show({
        title: 'Delete failed',
        message: 'Could not delete simulation. Please try again.',
        color: 'red',
      })
    },

    // ── Sync with server after success/error ─────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SIMULATIONS_QUERY_KEY })
    },
  })
}
