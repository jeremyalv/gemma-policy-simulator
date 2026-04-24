/// <reference types="vite/client" />

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
