/**
 * useRunSimulation — mutation for POST /simulations/:id/run
 *
 * On success: invalidates status cache + navigates to progress page.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { runSimulation } from '@/api'
import { notifications } from '@mantine/notifications'
import { isBackendDownError, BACKEND_DOWN_MESSAGE } from '@/lib/api-errors'
import { SIMULATIONS_QUERY_KEY } from './useSimulations'

export function useRunSimulation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ id }: { id: string; title?: string }) => runSimulation(id),

    onSuccess: (_data, { id, title }) => {
      // Invalidate list so status shows "running"
      queryClient.invalidateQueries({ queryKey: SIMULATIONS_QUERY_KEY })
      // Navigate to progress view — carry title for display
      navigate(`/simulations/${id}`, { state: { title } })
    },

    onError: (error: unknown) => {
      notifications.show({
        title: 'Run failed',
        message: isBackendDownError(error)
          ? BACKEND_DOWN_MESSAGE
          : 'Could not start the simulation. Please try again.',
        color: 'red',
      })
    },
  })
}
