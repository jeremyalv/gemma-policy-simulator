/**
 * useCreateSimulation — mutation for POST /simulations
 *
 * Auto-generates an idempotency key per submission to prevent
 * duplicate drafts on network retry. Contract: 201 Created.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createSimulation, type SimulationDraft } from '@/api'
import { generateIdempotencyKey } from '@/lib/idempotency'
import { notifications } from '@mantine/notifications'
import { SIMULATIONS_QUERY_KEY } from '@/features/dashboard/hooks/useSimulations'
import type { CreateSimulationFormValues } from '../schema'

interface SubmitOptions {
  /** If true, redirect to clarification. If false, redirect to run directly. */
  withClarification: boolean
}

export function useCreateSimulation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: ({ values }: { values: CreateSimulationFormValues; options: SubmitOptions }) => {
      // Strip empty filter arrays — don't send `filters: {}` to the API
      const filters = values.filters
        ? Object.fromEntries(
            Object.entries(values.filters).filter(([, v]) =>
              Array.isArray(v) ? v.length > 0 : v != null,
            ),
          )
        : undefined

      return createSimulation(
        {
          title:       values.title,
          policy_text: values.policy_text,
          dataset:     values.dataset,
          sample_size: values.sample_size,
          filters:     Object.keys(filters ?? {}).length > 0 ? filters : undefined,
        },
        generateIdempotencyKey(),
      )
    },

    onSuccess: (sim: SimulationDraft, { options }) => {
      // Invalidate dashboard list so new sim appears immediately
      queryClient.invalidateQueries({ queryKey: SIMULATIONS_QUERY_KEY })

      if (options.withClarification) {
        navigate(`/simulations/${sim.id}/clarify`)
      } else {
        navigate(`/simulations/${sim.id}`)
      }
    },

    onError: (err: Error) => {
      notifications.show({
        title: 'Failed to create simulation',
        message: err.message ?? 'Please check your inputs and try again.',
        color: 'red',
      })
    },
  })

  function submit(values: CreateSimulationFormValues, options: SubmitOptions) {
    mutation.mutate({ values, options })
  }

  return {
    submit,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
