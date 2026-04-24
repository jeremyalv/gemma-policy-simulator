/**
 * Idempotency key generator.
 *
 * Used for POST /simulations and POST /simulations/{id}/run
 * to prevent duplicate operations on double-click or network retry.
 */

export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID if available (all modern browsers), fallback to timestamp+random
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random hex
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${timestamp}-${random}`
}
