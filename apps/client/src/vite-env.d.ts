/// <reference types="vite/client" />

// Fontsource packages export CSS — declare them so TS doesn't complain
declare module '@fontsource-variable/source-serif-4'
declare module '@fontsource-variable/ibm-plex-sans'
declare module '@fontsource-variable/jetbrains-mono'

interface ImportMetaEnv {
  /** Base URL of the SIMS backend API. Defaults to '' (same origin). */
  readonly VITE_API_BASE_URL: string

  /**
   * Controls MSW mock mode. Mocks are ACTIVE by default (when absent or any
   * value other than 'false'). Set to 'false' at build time to disable mocks
   * and route requests to VITE_API_BASE_URL instead.
   *
   * Example (CI/CD with real backend):
   *   VITE_USE_MOCKS=false VITE_API_BASE_URL=https://api.example.com vite build
   */
  readonly VITE_USE_MOCKS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
