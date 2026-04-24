/**
 * useRunSimulation — mutation for POST /simulations/:id/run
 *
 * On success: invalidates status cache + navigates to progress page.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { runSimulation } from '@/api'
import { notifications } from '@mantine/notifications'
import { SIMULATIONS_QUERY_KEY } from './useSimulations'

export function useRunSimulation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (id: string) => runSimulation(id),

    onSuccess: (_data, id) => {
      // Invalidate list so status shows "running"
      queryClient.invalidateQueries({ queryKey: SIMULATIONS_QUERY_KEY })
      // Navigate to progress view
      navigate(`/simulations/${id}`)
    },

    onError: () => {
      notifications.show({
        title: 'Run failed',
        message: 'Could not start simulation. Please try again.',
        color: 'red',
      })
    },
  })
}
