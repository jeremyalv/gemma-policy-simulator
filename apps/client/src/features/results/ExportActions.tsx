/**
 * ExportActions — three export modes for simulation results.
 *  1. CSV  → direct <a href> download (no fetch, browser handles stream)
 *  2. PDF  → window.print() — print-only CSS in globals.css handles layout
 *  3. Link → Clipboard API copy of current URL
 *
 * CONTRACT: CSV export endpoint is the ONLY endpoint that doesn't use the
 * JSON envelope. Never call .json() on it. Use <a href> only.
 */

import { useState } from 'react'
import { Group, Button, Tooltip, Menu } from '@mantine/core'
import { Download, Printer, Link2, Check } from 'lucide-react'
import { notifications } from '@mantine/notifications'
import { getExportUrl } from '@/api'

interface ExportActionsProps {
  simulationId: string
  compact?: boolean
}

export function ExportActions({ simulationId, compact = false }: ExportActionsProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        notifications.show({
          title: 'Link copied',
          message: 'Results page URL copied to clipboard.',
          color: 'green',
          autoClose: 2000,
        })
      })
      .catch(() => {
        notifications.show({
          title: 'Copy failed',
          message: 'Could not access clipboard. Please copy the URL manually.',
          color: 'yellow',
        })
      })
  }

  function handlePrint() {
    window.print()
  }

  if (compact) {
    return (
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button
            size="sm"
            variant="outline"
            leftSection={<Download size={14} />}
            style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
          >
            Export
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<Download size={14} />}
            component="a"
            href={getExportUrl(simulationId)}
            download={`infinipol-${simulationId}-results.csv`}
          >
            Download CSV
          </Menu.Item>
          <Menu.Item leftSection={<Printer size={14} />} onClick={handlePrint}>
            Export PDF (Print)
          </Menu.Item>
          <Menu.Item
            leftSection={copied ? <Check size={14} /> : <Link2 size={14} />}
            onClick={handleCopyLink}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    )
  }

  return (
    <Group gap="xs">
      <Tooltip label="Download raw responses as CSV" position="top">
        <Button
          size="sm"
          leftSection={<Download size={14} />}
          component="a"
          href={getExportUrl(simulationId)}
          download={`infinipol-${simulationId}-results.csv`}
          style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}
        >
          CSV
        </Button>
      </Tooltip>

      <Tooltip label="Export as PDF via browser print" position="top">
        <Button
          size="sm"
          variant="outline"
          leftSection={<Printer size={14} />}
          onClick={handlePrint}
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
          className="no-print"
        >
          PDF
        </Button>
      </Tooltip>

      <Tooltip label={copied ? 'Copied!' : 'Copy page link'} position="top">
        <Button
          size="sm"
          variant="outline"
          leftSection={copied ? <Check size={14} /> : <Link2 size={14} />}
          onClick={handleCopyLink}
          style={{
            borderColor: copied ? 'var(--color-status-success)' : 'var(--color-border-default)',
            color: copied ? 'var(--color-status-success)' : 'var(--color-text-secondary)',
            transition: 'all 150ms',
          }}
          className="no-print"
        >
          {copied ? 'Copied' : 'Link'}
        </Button>
      </Tooltip>
    </Group>
  )
}
