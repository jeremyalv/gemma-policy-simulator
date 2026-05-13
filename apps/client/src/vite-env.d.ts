/// <reference types="vite/client" />

// Fontsource packages export CSS — declare them so TS doesn't complain
declare module '@fontsource-variable/source-serif-4'
declare module '@fontsource-variable/ibm-plex-sans'
declare module '@fontsource-variable/jetbrains-mono'

interface ImportMetaEnv {
  /** Base URL of the SIMS backend API. Defaults to '' (same origin). */
  readonly VITE_API_BASE_URL: string

  /**
   * Controls MSW mock mode. Mocks are DISABLED by default.
   * Set to 'true' to enable mocks explicitly.
   *
   * Example (local mock mode):
   *   VITE_USE_MOCKS=true vite dev
   */
  readonly VITE_USE_MOCKS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
