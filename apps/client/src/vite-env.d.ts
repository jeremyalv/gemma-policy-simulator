/// <reference types="vite/client" />

// Fontsource packages export CSS — declare them so TS doesn't complain
declare module '@fontsource-variable/source-serif-4'
declare module '@fontsource-variable/ibm-plex-sans'
declare module '@fontsource-variable/jetbrains-mono'

interface ImportMetaEnv {
  /** Base URL of the SIMS backend API. Defaults to '' (same origin). */
  readonly VITE_API_BASE_URL: string

  /**
   * Set to 'true' to force MSW mock mode.
   * Mocks are also auto-enabled in dev mode when this var is absent.
   */
  readonly VITE_USE_MOCKS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
