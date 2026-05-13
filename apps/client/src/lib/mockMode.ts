/**
 * Returns true only when mock mode is explicitly enabled.
 * Sign-off mode defaults to real backend.
 */
export function isMockModeEnabled(envValue: string | undefined): boolean {
  return envValue === 'true'
}
