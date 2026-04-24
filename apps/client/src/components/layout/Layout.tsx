/**
 * Main app layout shell.
 * Wraps every page: sticky header → scrollable main → footer.
 *
 * Usage:
 *   export default function SomePage() {
 *     return (
 *       <Layout title="Dashboard">
 *         <YourPageContent />
 *       </Layout>
 *     )
 *   }
 */

import type { ReactNode } from 'react'
import { Box, Container } from '@mantine/core'
import { AppHeader } from './AppHeader'
import { AppFooter } from './AppFooter'

interface LayoutProps {
  children: ReactNode
  /** Max width of the content area. Defaults to 'lg' (1200px). */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | number
  /** Remove horizontal padding (useful for full-bleed pages). */
  fluid?: boolean
}

export function Layout({ children, maxWidth = 'lg', fluid = false }: LayoutProps) {
  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-base)',
      }}
    >
      <AppHeader />

      <Box component="main" style={{ flex: 1 }}>
        {fluid ? (
          <Box p="xl">{children}</Box>
        ) : (
          <Container size={maxWidth} py="xl">
            {children}
          </Container>
        )}
      </Box>

      <AppFooter />
    </Box>
  )
}
