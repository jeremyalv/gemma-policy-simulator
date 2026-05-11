/**
 * ThemeProvider — loads institution-config.json at runtime,
 * injects data-theme on <html>, calls initI18n, exposes config via context.
 *
 * institution-config.json uses snake_case keys (matches public JSON convention).
 * The InstitutionConfig type mirrors those keys exactly.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { themes, type ThemeName } from './themes'
import { initI18n } from '@/i18n'

// ── Public shape (snake_case to match JSON file) ──────────────────────────────
export interface InstitutionConfig {
  name: string
  short_name: string
  tagline: string
  logo_url: string
  favicon_url: string
  theme: ThemeName
  locale: string
  currency_symbol: string
  country_code: string
  support_email: string
  homepage_url: string
  features: {
    policy_comparison: boolean
    challenge_mode: boolean
    clarification_mode: boolean
    csv_export: boolean
    dataset_selector: boolean
  }
  default_dataset: string
  footer_note: string
}

const DEFAULT_CONFIG: InstitutionConfig = {
  name: 'InfiniPol',
  short_name: 'InfiniPol',
  tagline: 'Infinite Policy Testing: simulate public response before it goes live.',
  logo_url: '/logos/infinipol-logo.svg',
  favicon_url: '/favicon.ico',
  theme: 'global-default',
  locale: 'en',
  currency_symbol: '$',
  country_code: 'US',
  support_email: '',
  homepage_url: '',
  features: {
    policy_comparison: true,
    challenge_mode: true,
    clarification_mode: true,
    csv_export: true,
    dataset_selector: true,
  },
  default_dataset: 'nemotron_usa',
  footer_note: '',
}

// ── Context ───────────────────────────────────────────────────────────────────
const InstitutionContext = createContext<InstitutionConfig>(DEFAULT_CONFIG)

export function useInstitution(): InstitutionConfig {
  return useContext(InstitutionContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [config, setConfig] = useState<InstitutionConfig>(DEFAULT_CONFIG)
  const [ready, setReady] = useState(false)

  // Load institution-config.json on mount
  useEffect(() => {
    fetch('/institution-config.json')
      .then((res) => {
        if (!res.ok) throw new Error('institution-config.json not found')
        return res.json()
      })
      .then((data: Partial<InstitutionConfig>) => {
        const merged = { ...DEFAULT_CONFIG, ...data }
        setConfig(merged)
        initI18n(merged.locale)
      })
      .catch(() => {
        // Config absent or malformed — use defaults
        initI18n(DEFAULT_CONFIG.locale)
      })
      .finally(() => setReady(true))
  }, [])

  // Sync theme + title to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme)
    document.title = config.name
  }, [config.theme, config.name])

  // Hold render until config is resolved (avoids flash with wrong theme)
  if (!ready) return null

  const mantineTheme = themes[config.theme] ?? themes['global-default']

  return (
    <InstitutionContext.Provider value={config}>
      <MantineProvider theme={mantineTheme}>
        <ModalsProvider>
          <Notifications position="top-right" limit={5} />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </InstitutionContext.Provider>
  )
}
