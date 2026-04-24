/**
 * ConfirmModal — reusable danger confirmation dialog.
 * Uses Mantine's modals system.
 *
 * Usage:
 *   openConfirmModal({ title: 'Delete simulation?', message: '...', onConfirm: () => ... })
 */

import { modals } from '@mantine/modals'
import { Text, Button, Group, Stack } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'

interface OpenConfirmModalOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export function openConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: OpenConfirmModalOptions) {
  modals.open({
    title: (
      <Group gap="xs">
        {danger && <AlertTriangle size={16} color="var(--color-status-error)" />}
        <Text fw={600} size="sm" c="var(--color-text-primary)">{title}</Text>
      </Group>
    ),
    size: 'sm',
    centered: true,
    children: (
      <Stack gap="lg">
        <Text size="sm" c="var(--color-text-secondary)" lh={1.6}>
          {message}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => {
              modals.closeAll()
              onCancel?.()
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            style={{
              backgroundColor: danger
                ? 'var(--color-status-error)'
                : 'var(--color-accent-primary)',
              color: '#fff',
            }}
            onClick={() => {
              modals.closeAll()
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    ),
  })
}
